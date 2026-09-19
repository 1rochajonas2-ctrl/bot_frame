const axios = require('axios')
const { GROQ_API_KEY } = require('../config/env')
const { clipText } = require('../lib/text')
const { chatHistory } = require('../state/chatHistory')
const { retrieveWarframeFacts } = require('./rag')

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_MODEL = 'openai/gpt-oss-120b'
const WA_MAX_CHARS = 3500

const WF_KNOWLEDGE = {
  'farmar platina': [
    'Platina NAO dropa em missao. So se obtem comprando com dinheiro real OU trocando itens.',
    'Metodo 1: abra reliquias, junte partes Prime, venda SETS no warframe.market.',
    'Metodo 2: venda mods (Corrupted, Nightmare, Galvanized, Primed, Augment).',
    'Metodo 3: venda Arcanes (Eidolons, Fissures, sindicatos).',
    'Metodo 4: venda Riven rerolados (god rolls valem milhares).',
    'Pre-requisitos: MR2 + 2FA (TennoGuard) ativado.'
  ],
  'riven': [
    'Riven e um mod especial por arma. 2 positivos OU 3 positivos + 1 negativo.',
    'Reroll custa Kuva (Siphon, Flood, Lich, Sortie).',
    'Kuva NAO e negociavel. Voce vende o Riven ja rolado.'
  ],
  'prime': [
    'Partes Prime vem de reliquias em Void Fissures.',
    'Set completo vale mais que partes soltas.',
    'Vaulted = saiu do drop normal, vale mais.'
  ],
  'baro': [
    "Baro Ki'Teer a cada 2 semanas por 48h num Relay.",
    'Vende com Ducats + Credits (NUNCA platinum nem Void Traces).'
  ],
  'kuva': ['Kuva NAO e negociavel. So rerola Riven.'],
  'endo': ['Endo NAO e negociavel. Upa mods.'],
  'trocar': ['MR2+ e TennoGuard. Trade no Dojo ou Bazaar da Maroo.']
}

function getKnowledgeFor(message) {
  const q = String(message || '').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  const hits = [], seen = {}
  for (const [key, facts] of Object.entries(WF_KNOWLEDGE)) {
    if (q.includes(key)) {
      for (const f of facts) if (!seen[f]) { seen[f] = true; hits.push(f) }
    }
  }
  return hits.length ? '[FATOS CONFIRMADOS]\n- ' + hits.join('\n- ') : null
}

async function askAI(userJid, userMessage) {
  try {
    if (!GROQ_API_KEY || GROQ_API_KEY === 'COLE_SUA_CHAVE_GROQ_AQUI') {
      return 'Chave da Groq nao configurada.'
    }

    const facts = await retrieveWarframeFacts(userMessage)
    const knowledge = getKnowledgeFor(userMessage)

    const parts = []
    if (knowledge) parts.push(knowledge)
    if (facts) parts.push('[DADOS ATUALIZADOS — fonte prioritária]\n' + facts)

    const augmented = parts.length
      ? parts.join('\n\n---\n\n') + '\n\n[PERGUNTA]\n' + userMessage
      : userMessage

    let history = chatHistory.get(userJid) || []
    history.push({ role: 'user', content: augmented })
    if (history.length > 6) history = history.slice(-6)

    const response = await axios.post(
      GROQ_API_URL,
      {
        model: GROQ_MODEL,
        messages: [
          {
            role: 'system',
            content:
              'Voce e o assistente do bot de WhatsApp "Wm_bot" sobre Warframe (PC). ' +
              'Responda SEMPRE em portugues brasileiro, direto (max 2000 chars).\n\n' +
              'REGRAS DE VERDADE:\n' +
              '- Kuva NAO e negociavel. Só rerola Riven.\n' +
              '- Endo NAO e negociavel. Só upa mods.\n' +
              '- Void Traces servem para REFINAR reliquias.\n' +
              "- Baro vende com Ducats + Credits.\n" +
              '- Trade requer MR2+ e TennoGuard (2FA).\n' +
              '- Platinum NAO dropa. So se compra ou troca.\n\n' +
              'STATS DE ARMA:\n' +
              '- Use SOMENTE [STATS DA ARMA — FONTE CONFIRMADA].\n' +
              '- Se nao existir, diga "tente !i <arma>".\n\n' +
              'COMPORTAMENTO:\n' +
              '- [FATOS CONFIRMADOS] = base obrigatoria.\n' +
              '- [DADOS ATUALIZADOS] = fonte prioritária.\n' +
              '- NUNCA invente numeros/nomes.'
          },
          ...history
        ],
        temperature: 0.2,
        max_tokens: 600
      },
      {
        headers: { Authorization: 'Bearer ' + GROQ_API_KEY, 'Content-Type': 'application/json' },
        timeout: 45000
      }
    )

    let aiReply = (response.data && response.data.choices && response.data.choices[0] &&
      response.data.choices[0].message && response.data.choices[0].message.content &&
      response.data.choices[0].message.content.trim()) || 'Resposta vazia.'
    aiReply = clipText(aiReply, WA_MAX_CHARS)

    history[history.length - 1] = { role: 'user', content: userMessage }
    history.push({ role: 'assistant', content: aiReply })
    chatHistory.set(userJid, history)

    return aiReply
  } catch (err) {
    console.error('Groq:', err.response && err.response.data ? err.response.data : err.message)
    if (err.response && err.response.status === 429) return 'Limite da Groq atingido.'
    return 'Erro ao conversar com a IA.'
  }
}

module.exports = { askAI }
