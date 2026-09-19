const { register } = require('../../handlers/registry')
const { headers } = require('../../config/headers')
const { getTopOrders, calcStatsFromOrders } = require('../../services/wfm')
const { toSlug } = require('../../lib/text')
const { httpGet } = require('../../lib/http')

async function getSetPrice(setName) {
  try {
    const slug = toSlug(setName).replace(/_set$/, '')
    const setSlug = slug + '_set'
    let data = null
    try {
      const res = await httpGet('https://api.warframe.market/v2/item/' + setSlug + '/set', { headers })
      data = res.data && res.data.data ? res.data.data : null
    } catch (e) {
      try {
        const res2 = await httpGet('https://api.warframe.market/v2/item/' + toSlug(setName) + '/set', { headers })
        data = res2.data && res2.data.data ? res2.data.data : null
      } catch (e2) {}
    }
    if (!data) return '❌ Set "' + setName + '" não encontrado.\nEx: !set hildryn prime'

    const items = data.items || (Array.isArray(data) ? data : [data])
    if (!items || !items.length) return '❌ Nenhuma parte encontrada.'

    let reply = '🧩 *Set — ' + setName + '*\n\n'
    let totalMin = 0, hasAll = true, setItem = null

    for (const it of items) {
      const itemSlug = it.slug || ''
      const itemName = (it.i18n && it.i18n.en && it.i18n.en.name) || itemSlug
      const isSetRoot = it.setRoot === true || (itemSlug && itemSlug.indexOf('_set') !== -1)
      const orders = await getTopOrders(itemSlug)
      const stats = calcStatsFromOrders(orders.sell)
      if (isSetRoot) { setItem = { name: itemName, stats }; continue }
      if (stats) {
        reply += '• *' + itemName + '*\n  Min: *' + stats.min + 'p* | Média: ' + stats.avg + 'p\n'
        totalMin += stats.min
      } else {
        reply += '• *' + itemName + '*\n  Sem ordens online\n'
        hasAll = false
      }
      await new Promise((r) => setTimeout(r, 250))
    }
    reply += '\n────────────\n'
    if (hasAll && totalMin > 0) reply += '💰 *Soma das partes (min):* ' + totalMin + 'p\n'
    else reply += '💰 *Soma das partes:* incompleta\n'

    if (setItem) {
      if (setItem.stats) {
        reply += '📦 *Set completo:* *' + setItem.stats.min + 'p* (média ' + setItem.stats.avg + 'p)\n'
        if (hasAll && totalMin > 0) {
          const diff = setItem.stats.min - totalMin
          if (diff > 0) reply += '📉 Mais barato montar: *partes* (economia ' + diff + 'p)'
          else if (diff < 0) reply += '📈 Mais barato comprar: *set* (economia ' + Math.abs(diff) + 'p)'
          else reply += '⚖️ Preço igual'
        }
      } else reply += '📦 *Set completo:* sem ordens online'
    }
    return reply.trim()
  } catch (err) {
    console.error(err.message)
    return '❌ Erro ao buscar set.'
  }
}

register(/^!set\s+(.+)/i, async ({ sock, from, match }) => {
  await sock.sendMessage(from, { text: '🧩 Buscando set *' + match[1].trim() + '*...' })
  await sock.sendMessage(from, { text: await getSetPrice(match[1].trim()) })
})

module.exports = { getSetPrice }
