const { loadInvasionAlerts, saveInvasionAlerts } = require('./storage')
const {
  getActiveInvasions, formatInvasion, getInvasionId, invasionContainsReward
} = require('./format')

async function checkInvasionAlerts(sock) {
  const store = loadInvasionAlerts()
  if (!store.alerts.length) return

  const invasions = await getActiveInvasions()
  if (!invasions.length) return

  let changed = false
  for (const alert of store.alerts) {
    if (!Array.isArray(alert.notified)) alert.notified = []
    for (const inv of invasions) {
      if (!invasionContainsReward(inv, alert.rewardKey)) continue
      const invasionId = getInvasionId(inv)
      if (alert.notified.indexOf(invasionId) !== -1) continue
      const msg = '🚨 *ALERTA DE INVASÃO*\n\n🎁 *' + alert.rewardName + '*\n\n' + formatInvasion(inv)
      try {
        await sock.sendMessage(alert.userJid, { text: msg })
        alert.notified.push(invasionId)
        if (alert.notified.length > 20) alert.notified = alert.notified.slice(-20)
        changed = true
      } catch (e) { console.error('Erro invasão:', e.message) }
    }
  }
  if (changed) saveInvasionAlerts(store)
}

module.exports = { checkInvasionAlerts }
