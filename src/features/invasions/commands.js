const { register } = require('../../handlers/registry')
const { loadInvasionAlerts, saveInvasionAlerts } = require('./storage')
const {
  getInvasionsMessage, normalizeInvasionReward
} = require('./format')

function toggleInvasionAlert(userJid, rawReward) {
  const reward = normalizeInvasionReward(rawReward)
  if (!reward) {
    return '❌ Recompensa não reconhecida.\n\nUse:\ncatalyst\nreactor\nforma\nfieldron\ndetonite\nmutagen\nmutalist'
  }
  const store = loadInvasionAlerts()
  const idx = store.alerts.findIndex((a) => a.userJid === userJid && a.rewardKey === reward.key)

  if (idx !== -1) {
    store.alerts.splice(idx, 1)
    saveInvasionAlerts(store)
    return '🔕 *ALERTA DESATIVADO*\n\n🎁 ' + reward.name
  }
  const id = store.nextId++
  store.alerts.push({
    id, userJid, rewardKey: reward.key, rewardName: reward.name,
    createdAt: new Date().toISOString(), notified: []
  })
  saveInvasionAlerts(store)
  return '🔔 *ALERTA ATIVADO*\n\n🎁 *' + reward.name + '*\n\nO bot avisará quando aparecer.'
}

function listInvasionAlerts(userJid) {
  const store = loadInvasionAlerts()
  const mine = store.alerts.filter((a) => a.userJid === userJid)
  if (!mine.length) return '🔔 *ALERTAS DE INVASÃO*\n\nNenhum.\nAtive: !alertainvasao catalyst'
  let reply = '🔔 *SEUS ALERTAS DE INVASÃO*\n\n'
  for (const a of mine) reply += '🟢 #' + a.id + ' *' + a.rewardName + '*\n'
  return reply.trim()
}

function deleteInvasionAlert(userJid, arg) {
  const store = loadInvasionAlerts()
  if (/^all$/i.test(arg)) {
    const before = store.alerts.length
    store.alerts = store.alerts.filter((a) => a.userJid !== userJid)
    const removed = before - store.alerts.length
    saveInvasionAlerts(store)
    return removed ? '🔕 ' + removed + ' removido(s).' : 'Você não tinha alertas.'
  }
  const id = parseInt(arg, 10)
  if (!id) return '❌ Use: !delalertainvasao 1  ou  all'
  const idx = store.alerts.findIndex((a) => a.id === id && a.userJid === userJid)
  if (idx === -1) return '❌ #' + id + ' não encontrado.'
  store.alerts.splice(idx, 1)
  saveInvasionAlerts(store)
  return '🔕 #' + id + ' removido.'
}

register(/^!invasoes$/i, async ({ sock, from }) => {
  await sock.sendMessage(from, { text: '⚔️ Buscando invasões...' })
  await sock.sendMessage(from, { text: await getInvasionsMessage() })
})

register(/^!alertainvasao\s+(.+)/i, async ({ sock, from, match }) => {
  await sock.sendMessage(from, { text: toggleInvasionAlert(from, match[1].trim()) })
})

register(/^!alertasinvasao$/i, async ({ sock, from }) => {
  await sock.sendMessage(from, { text: listInvasionAlerts(from) })
})

register(/^!delalertainvasao\s+(.+)/i, async ({ sock, from, match }) => {
  await sock.sendMessage(from, { text: deleteInvasionAlert(from, match[1].trim()) })
})

module.exports = { toggleInvasionAlert, listInvasionAlerts, deleteInvasionAlert }
