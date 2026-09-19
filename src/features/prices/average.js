const { register } = require('../../handlers/registry')
const { resolveItem, getTopOrders, calcStatsFromOrders } = require('../../services/wfm')

async function getAveragePrice(itemName) {
  try {
    const resolved = await resolveItem(itemName)
    if (!resolved) return '❌ Item "' + itemName + '" não encontrado.'
    const item = resolved.item, slug = resolved.slug
    const name = (item.i18n && item.i18n.en && item.i18n.en.name) || itemName
    const maxRank = item.maxRank || 0
    let reply = '📊 *' + name + '* (PC)\n\n'

    if (maxRank > 0) {
      const rank0 = await getTopOrders(slug, 0)
      const rankMax = await getTopOrders(slug, maxRank)
      const s0 = calcStatsFromOrders(rank0.sell)
      const sM = calcStatsFromOrders(rankMax.sell)
      if (s0) reply += '🔹 *Rank 0*\nMédia: *' + s0.avg + 'p* | Min: ' + s0.min + 'p\nOrdens: ' + s0.count + '\n\n'
      else reply += '🔹 *Rank 0*: Nenhuma ordem online\n\n'
      if (sM) reply += '🔸 *Rank ' + maxRank + '*\nMédia: *' + sM.avg + 'p* | Min: ' + sM.min + 'p\nOrdens: ' + sM.count
      else reply += '🔸 *Rank ' + maxRank + '*: Nenhuma ordem online'
    } else {
      const orders = await getTopOrders(slug)
      const sS = calcStatsFromOrders(orders.sell)
      const sB = calcStatsFromOrders(orders.buy)
      if (!sS && !sB) return '❌ Nenhuma ordem online para *' + name + '*.'
      if (sS) reply += '🟢 *Vendendo (online)*\nMédia: *' + sS.avg + 'p*\nMin: ' + sS.min + 'p | Max: ' + sS.max + 'p\nOrdens: ' + sS.count + '\n\n'
      if (sB) reply += '🔵 *Comprimando (online)*\nMédia: *' + sB.avg + 'p*\nMin: ' + sB.min + 'p | Max: ' + sB.max + 'p\nOrdens: ' + sB.count
    }
    return reply.trim()
  } catch (err) {
    console.error(err.message)
    return '❌ Erro ao consultar preço.'
  }
}

register(/^!p\s+(.+)/i, async ({ sock, from, match }) => {
  await sock.sendMessage(from, { text: '🔍 Buscando *' + match[1].trim() + '*...' })
  await sock.sendMessage(from, { text: await getAveragePrice(match[1].trim()) })
})

module.exports = { getAveragePrice }
