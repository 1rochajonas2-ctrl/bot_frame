const { register } = require('../../handlers/registry')
const { askAI } = require('../../services/groq')
const { chatHistory } = require('../../state/chatHistory')

register(/^!g\s+(.+)/i, async ({ sock, from, match }) => {
  await sock.sendMessage(from, { text: '🧠 Pensando...' })
  const resposta = await askAI(from, match[1].trim())
  await sock.sendMessage(from, { text: String(resposta || '❌ Sem resposta.') })
})

register(/^!limpar$/i, async ({ sock, from }) => {
  chatHistory.delete(from)
  await sock.sendMessage(from, { text: '🧹 Histórico limpo.' })
})
