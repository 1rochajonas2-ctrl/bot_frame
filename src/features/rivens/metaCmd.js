const { register } = require('../../handlers/registry')
const { getMetaMessage } = require('./meta')

register(/^!(meta|grol)\s+(.+)/i, async ({ sock, from, match }) => {
  await sock.sendMessage(from, { text: getMetaMessage(match[2].trim()) })
})
register(/^!(meta|grol)$/i, async ({ sock, from }) => {
  await sock.sendMessage(from, { text: getMetaMessage('') })
})
