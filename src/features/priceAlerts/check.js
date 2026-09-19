const { loadAlerts, saveAlerts } = require('./storage')
const { getTopOrders, cheapestSell } = require('../../services/wfm')
const { toSlug } = require('../../lib/text')

function conditionMet(operator, limit, currentPrice) {
  if (currentPrice == null) return false
  if (operator === '<=') return currentPrice <= limit
  if (operator === '>=') return currentPrice >= limit
  if (operator === '=') return currentPrice === limit
  return false
}

async function checkAlerts(sock) {
  const store = loadAlerts()
  if (!store.alerts.length) return
  console.log('🔔 Verificando ' + store.alerts.length + ' alerta(s)...')
  let changed = false

  for (const a of store.alerts) {
    try {
      const orders = await getTopOrders(a.slug, a.rank != null ? a.rank : undefined)
      const best = cheapestSell(orders.sell)
      const current = best ? best.platinum : null
      const met = conditionMet(a.operator, a.price, current)

      if (met && !a.triggered) {
        a.triggered = true
        changed = true
        const seller = (best.user && (best.user.ingameName || best.user.ingame_name)) || 'Desconhecido'
        const rankText = (best.rank != null) ? String(best.rank) : '—'
        let msg = '🚨 *ALERTA DE PREÇO*\n\n🧩 *' + a.itemName + '*'
        if (a.rank != null) msg += ' (Rank ' + a.rank + ')'
        msg += '\n\n💰 Preço: *' + current + 'p*\n🎯 Limite: ' + a.operator + ' ' + a.price + 'p\n\n👤 ' + seller
        msg += '\n📦 Rank: ' + rankText + '\n💻 PC | *ingame*\n\n🔗 https://warframe.market/profile/' + toSlug(seller)
        try { await sock.sendMessage(a.userJid, { text: msg }) } catch (e) { console.error(e.message) }
      } else if (!met && a.triggered) {
        a.triggered = false
        changed = true
      }
      await new Promise((r) => setTimeout(r, 400))
    } catch (e) { console.error('Erro alerta #' + a.id + ':', e.message) }
  }
  if (changed) saveAlerts(store)
}

module.exports = { checkAlerts, conditionMet }
