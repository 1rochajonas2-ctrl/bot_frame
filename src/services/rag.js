const axios = require('axios')
const { retrieveWikiFacts } = require('./wiki')
const { clipText } = require('../lib/text')
const { resolveItemSmart, getTopOrders, calcStatsFromOrders } = require('./wfm')

// ===== STATS ESTRUTURADOS DE ARMA =====
async function retrieveWeaponStats(userMessage) {
  const q = String(userMessage || '')
  if (!/stats?\b|status\b|dano|damage|crit|cr[ií]tico|status chance|cad[eê]ncia|fire rate|precis[aã]o|accuracy|carregador|magazine|recarga|reload|multishot|disparo|ataque/i.test(q)) {
    return null
  }

  let weapon = q.replace(/[?!.,;:]+/g, ' ')
    .replace(/\b(quais?|qual|quem|os?|as?|de|do|da|dos|das|é|e|são|sao|está|esta|status|stats?|da arma|arma|me diz|me fala|fala|diz|mostra|mostrar|ver|quero|saber|warframe|por favor|porfavor|atual|atuais|agora|o|a)\b/gi, ' ')
    .replace(/\s+/g, ' ').trim()

  if (weapon.length < 2 || weapon.length > 60) return null

  try {
    const res = await axios.get(
      'https://api.warframestat.us/items/search/' + encodeURIComponent(weapon),
      { timeout: 15000 }
    )
    const list = Array.isArray(res.data) ? res.data : []
    if (!list.length) return null

    const lower = weapon.toLowerCase()
    let best = list.find((it) => (it.name || '').toLowerCase() === lower)
    if (!best) best = list.find((it) => /Rifle|Pistol|Shotgun|Melee|Archgun|Archmelee|Bow|Throwing|Kitgun|Primary|Secondary/i.test(it.type || ''))
    if (!best) best = list[0]
    if (!best) return null

    const lines = []
    lines.push('Arma: ' + (best.name || weapon))
    if (best.type) lines.push('Tipo: ' + best.type)
    if (best.masteryReq != null) lines.push('Mastery Rank: ' + best.masteryReq)

    const stats = best.stats || {}
    const LABELS = {
      damage: 'Dano total', impact: 'Impact', puncture: 'Puncture', slash: 'Slash',
      heat: 'Heat', cold: 'Cold', electricity: 'Electricity', toxin: 'Toxin',
      viral: 'Viral', corrosive: 'Corrosive', radiation: 'Radiation',
      magnetic: 'Magnetic', gas: 'Gas', blast: 'Blast',
      critChance: 'Crit Chance (%)', critMultiplier: 'Crit Multiplier (x)',
      statusChance: 'Status Chance (%)', fireRate: 'Fire Rate (tiros/s)',
      chargeRate: 'Charge Rate (s)', magazineSize: 'Carregador',
      reloadTime: 'Recarga (s)', accuracy: 'Precisao', multishot: 'Multishot',
      punchThrough: 'Punch Through (m)', range: 'Alcance (m)',
      disposition: 'Disposition (riven)'
    }

    let total = 0
    for (const [key, label] of Object.entries(LABELS)) {
      if (stats[key] == null) continue
      let val = stats[key]
      if (typeof val === 'number' && !Number.isInteger(val)) val = +val.toFixed(2)
      lines.push(label + ': ' + val)
      if (/impact|puncture|slash|heat|cold|electricity|toxin|viral|corrosive|radiation|magnetic|gas|blast/i.test(key)) {
        total += Number(stats[key]) || 0
      }
    }
    if (total > 0 && !stats.damage) lines.push('Dano total (soma): ' + +total.toFixed(2))
    if (lines.length < 4) return null
    return '[STATS DA ARMA — FONTE CONFIRMADA]\n' + lines.join('\n')
  } catch (e) {
    console.error('retrieveWeaponStats:', e.message)
    return null
  }
}

// ===== ORQUESTRADOR =====
async function retrieveWarframeFacts(userMessage) {
  const q = String(userMessage || '').toLowerCase()
  const chunks = []

  try {
    const wsStats = await retrieveWeaponStats(userMessage)
    if (wsStats) chunks.push(wsStats)

    if (/preço|preco|plat|barato|caro|vale a pena|quanto|r0|r10|r5|mod|arcane|item|set\b/.test(q) ||
        /primed |arcane |galvano|umbral|primed_/.test(q)) {
      const itemQ = extractItemQuery(userMessage)
      if (itemQ) {
        try {
          const resolved = await resolveItemSmart(itemQ)
          if (resolved) {
            const name = (resolved.item.i18n && resolved.item.i18n.en && resolved.item.i18n.en.name) || itemQ
            const maxRank = resolved.item.maxRank != null ? resolved.item.maxRank : 0
            const lines = ['Item: ' + name]
            if (maxRank > 0) {
              const o0 = await getTopOrders(resolved.slug, 0)
              const s0 = calcStatsFromOrders(o0.sell)
              const oM = await getTopOrders(resolved.slug, maxRank)
              const sM = calcStatsFromOrders(oM.sell)
              lines.push('R0 min: ' + (s0 ? s0.min + 'p' : '-'))
              lines.push('R' + maxRank + ' min: ' + (sM ? sM.min + 'p' : '-'))
            } else {
              const o = await getTopOrders(resolved.slug)
              const s = calcStatsFromOrders(o.sell)
              lines.push('Min sell: ' + (s ? s.min + 'p' : '-'))
            }
            chunks.push(lines.join('\n'))
          } else {
            chunks.push('Item nao encontrado no WFM: ' + itemQ)
          }
        } catch (e) { console.error('RAG item:', e.message) }
      }
    }
  } catch (err) {
    console.error('RAG retrieve:', err.message)
  }

  try {
    const wiki = await retrieveWikiFacts(userMessage)
    if (wiki) chunks.push(clipText(wiki, 6500))
  } catch (e) { console.error('RAG wiki:', e.message) }

  if (!chunks.length) return null
  return chunks.join('\n\n---\n\n')
}

function extractItemQuery(text) {
  let t = String(text || '').replace(/[?!.,;:]+/g, ' ')
  t = t.replace(/\b(pesquisa|pesquisar|busca|buscar|qual|quais|o|a|os|as|de|do|da|dos|das|um|uma|me|diz|fala|mostra|mostrar|preço|preco|plat|platinum|vale|pena|barato|caro|info|sobre|item|mod|arcane|set|r0|r10|r5|atual|agora|pra|para|por|favor)\b/gi, ' ')
  t = t.replace(/\s+/g, ' ').trim()
  if (t.length < 3) return null
  return t.split(' ').slice(0, 8).join(' ')
}

module.exports = { retrieveWarframeFacts, retrieveWeaponStats, extractItemQuery }
