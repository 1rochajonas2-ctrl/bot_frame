const { register } = require('../../handlers/registry')
const { HIGHEST_CATEGORIES } = require('./catalog')
const { loadHighestCache, runHighestUpdater } = require('./updater')

function formatHighestMenu() {
  let reply = '🏆 *HIGHEST — RANKING DE PREÇOS*\n\n'
  for (const key in HIGHEST_CATEGORIES) reply += key + '️⃣ ' + HIGHEST_CATEGORIES[key].label + '\n'
  reply += '\nUse: `!highest 2` ou `!highest 2 2` (categoria + página)'
  return reply
}

function formatHighestRanking(catNum, page) {
  const catKey = HIGHEST_CATEGORIES[catNum]
  if (!catKey) return '❌ Categoria inválida. Use `!highest`.'
  const cache = loadHighestCache()
  const priceEntry = cache.prices[catKey.id]
  if (!priceEntry || !priceEntry.items || !priceEntry.items.length) {
    runHighestUpdater().catch((e) => console.error('Highest:', e.message))
    return '⏳ *Coletando dados...* Tente em alguns minutos.'
  }
  const items = priceEntry.items
  const perPage = 10
  const totalPages = Math.ceil(items.length / perPage)
  const p = Math.max(1, Math.min(page, totalPages))
  const start = (p - 1) * perPage
  const slice = items.slice(start, start + perPage)

  let reply = '🏆 *HIGHEST — ' + catKey.label + '*\n_Página ' + p + '/' + totalPages + ' | ' + items.length + ' itens_\n\n'
  for (let i = 0; i < slice.length; i++) {
    const item = slice[i]
    const stats = (cache.stats && cache.stats[item.slug]) || {}
    const vol90 = stats.vol90d != null ? stats.vol90d.toLocaleString('pt-BR') : '—'
    const vol48 = stats.vol48h != null ? stats.vol48h.toLocaleString('pt-BR') : '—'
    reply += (start + i + 1) + '. *' + item.name + '* — ' + item.price + 'p\n   📊 90d: ' + vol90 + ' | 48h: ' + vol48 + '\n\n'
  }
  if (totalPages > 1) reply += '💡 `!highest ' + catNum + ' ' + (p + 1) + '` próxima'
  return reply.trim()
}

register(/^!highest(?:\s+(\d+))?(?:\s+(\d+))?$/i, async ({ sock, from, match }) => {
  if (!match[1]) return sock.sendMessage(from, { text: formatHighestMenu() })
  const catNum = parseInt(match[1], 10)
  const page = match[2] ? parseInt(match[2], 10) : 1
  await sock.sendMessage(from, { text: '🏆 Consultando ranking...' })
  await sock.sendMessage(from, { text: formatHighestRanking(catNum, page) })
})

module.exports = { formatHighestMenu, formatHighestRanking }
