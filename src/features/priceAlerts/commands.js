const { register } = require('../../handlers/registry')
const { loadAlerts, saveAlerts } = require('./storage')
const { resolveItem } = require('../../services/wfm')

function parseAlertArgs(raw) {
  let text = raw.trim()
  let rank = null
  const rankMatch = text.match(/\brank\s+(\d+)\b/i)
  if (rankMatch) { rank = parseInt(rankMatch[1], 10); text = text.replace(/\brank\s+\d+\b/i, '').trim() }
  let m = text.match(/^(.+?)\s*(<=|>=|=)\s*(\d+)\s*$/i)
  if (m) return { itemName: m[1].trim(), operator: m[2], price: parseInt(m[3], 10), rank }
  m = text.match(/^(.+?)\s+(\d+)\s*$/)
  if (m) return { itemName: m[1].trim(), operator: '<=', price: parseInt(m[2], 10), rank }
  return null
}

async function createAlert(userJid, rawArgs) {
  const parsed = parseAlertArgs(rawArgs)
  if (!parsed) {
    return '❌ *Como usar:*\n!alerta <item> [rank X] <=40\n\nEx:\n• !alerta hildryn prime set <=40\n• !alerta primed flow rank 10 <=70'
  }
  const resolved = await resolveItem(parsed.itemName)
  if (!resolved) return '❌ Item "' + parsed.itemName + '" não encontrado.'
  const displayName = (resolved.item.i18n && resolved.item.i18n.en && resolved.item.i18n.en.name) || parsed.itemName

  const store = loadAlerts()
  const id = store.nextId++
  store.alerts.push({
    id, userJid, itemName: displayName, slug: resolved.slug,
    operator: parsed.operator, price: parsed.price, rank: parsed.rank,
    triggered: false, createdAt: new Date().toISOString()
  })
  saveAlerts(store)

  const rankText = parsed.rank !== null ? ' rank ' + parsed.rank : ''
  return '🔔 *ALERTA CRIADO*\n\nItem: *' + displayName + '*' + rankText +
    '\nCondição: ' + parsed.operator + ' *' + parsed.price + 'p*\nID: *#' + id + '*'
}

function listAlerts(userJid) {
  const store = loadAlerts()
  const mine = store.alerts.filter((a) => a.userJid === userJid)
  if (!mine.length) return '🔔 Sem alertas.\nCrie: !alerta item <=40'
  let reply = '🔔 *SEUS ALERTAS*\n\n'
  for (const a of mine) {
    const icon = a.operator === '>=' ? '🔵' : '🟢'
    const rankText = a.rank != null ? ' rank ' + a.rank : ''
    reply += '#' + a.id + ' ' + icon + ' *' + a.itemName + '*' + rankText + ' ' + a.operator + ' ' + a.price + 'p\n'
  }
  return reply.trim()
}

function deleteAlert(userJid, arg) {
  const store = loadAlerts()
  if (/^all$/i.test(arg)) {
    const before = store.alerts.length
    store.alerts = store.alerts.filter((a) => a.userJid !== userJid)
    const removed = before - store.alerts.length
    saveAlerts(store)
    return removed ? '✅ ' + removed + ' removido(s).' : 'Você não tinha alertas.'
  }
  const id = parseInt(arg, 10)
  if (!id) return '❌ Use: !delalerta 17  ou  !delalerta all'
  const idx = store.alerts.findIndex((a) => a.id === id && a.userJid === userJid)
  if (idx === -1) return '❌ Alerta #' + id + ' não encontrado.'
  store.alerts.splice(idx, 1)
  saveAlerts(store)
  return '✅ Alerta *#' + id + '* removido.'
}

register(/^!alerta\s+(.+)/i, async ({ sock, from, match }) => {
  await sock.sendMessage(from, { text: await createAlert(from, match[1].trim()) })
})

register(/^!alertas$/i, async ({ sock, from }) => {
  await sock.sendMessage(from, { text: listAlerts(from) })
})

register(/^!delalerta\s+(.+)/i, async ({ sock, from, match }) => {
  await sock.sendMessage(from, { text: deleteAlert(from, match[1].trim()) })
})

module.exports = { createAlert, listAlerts, deleteAlert, parseAlertArgs }
