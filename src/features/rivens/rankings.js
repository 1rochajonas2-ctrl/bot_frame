const { register } = require('../../handlers/registry')
const { getTopRivensMessage } = require('./weekly')

register(/^!rivendb(?:\s+(pop|top|rolled|unrolled|\d+))*$/i, async ({ sock, from, text }) => {
  await sock.sendMessage(from, { text: '🏆 Consultando ranking semanal...' })

  const args = text.toLowerCase().split(/\s+/).slice(1)
  let limit = 10, rolledFilter = null, sortBy = 'price'
  for (const a of args) {
    if (/^\d+$/.test(a)) limit = parseInt(a, 10)
    else if (a === 'rolled') rolledFilter = true
    else if (a === 'unrolled') rolledFilter = false
    else if (a === 'pop' || a === 'popular') sortBy = 'pop'
    else if (a === 'price' || a === 'preco' || a === 'preço') sortBy = 'price'
  }
  await sock.sendMessage(from, { text: await getTopRivensMessage(limit, rolledFilter, sortBy) })
})
