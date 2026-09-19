const adminState = require('../../state/adminState')
const { formatUptime } = require('../../lib/text')
const { loadAdminConfig } = require('./config')
const { loadAlerts } = require('../priceAlerts/storage')
const { loadRivenAlerts } = require('../rivens/storage')
const { loadInvasionAlerts } = require('../invasions/storage')
const { chatHistory } = require('../../state/chatHistory')

function adminHelpText() {
  return (
    '🔐 *PAINEL ADMIN*\n\n' +
    '*Identidade*\n' +
    '• `!meujid` — seu JID/LID\n' +
    '• `!lid <numero>` — achar JID/LID pelo número\n\n' +
    '*Mute*\n' +
    '• `!mute` / `!unmute` — mute GLOBAL\n' +
    '• `!muteuser <num|jid>` / `!unmuteuser`\n' +
    '• `!mutelist`\n\n' +
    '*Riven sniper*\n' +
    '• `!rivensnipe on|off`\n' +
    '• `!rivenlimit <n>`\n' +
    '• `!vip <num|jid>` / `!unvip` / `!viplist`\n' +
    '• `!rivenall` / `!delrivenall`\n' +
    '• `!delrivenuser <num|jid>`\n\n' +
    '*Alertas preço*\n' +
    '• `!alertasall` / `!delalertaall`\n' +
    '• `!delalertauser <num|jid>`\n\n' +
    '*Controle*\n' +
    '• `!pause` / `!resume`\n' +
    '• `!forcacheck` / `!highestnow`\n' +
    '• `!statusbot` / `!stats` / `!users`\n' +
    '• `!say [destino] <texto>` / `!bc <texto>`\n' +
    '• `!blockcmd <nome>` / `!unblockcmd` / `!blocklist`\n' +
    '• `!del <respondendo>` — apaga msg do bot\n' +
    '• `!limparhist` [jid]\n' +
    '• `!eval <js>`\n' +
    '• `!admin` — este menu'
  )
}

async function adminStatusMessage() {
  const mem = process.memoryUsage()
  const rss = (mem.rss / 1024 / 1024).toFixed(1)
  const heap = (mem.heapUsed / 1024 / 1024).toFixed(1)
  const alerts = loadAlerts()
  const rivens = loadRivenAlerts()
  const cfg = loadAdminConfig()
  const inv = loadInvasionAlerts()

  let reply = '🤖 *STATUS DO BOT*\n\n'
  reply += '⏱ Uptime: *' + formatUptime(Date.now() - adminState.startedAt) + '*\n'
  reply += '🧠 RAM: *' + rss + ' MB* (heap ' + heap + ' MB)\n'
  reply += '💬 Históricos IA: *' + chatHistory.size + '*\n'
  reply += '🔔 Alertas preço: *' + alerts.alerts.length + '*\n'
  reply += '🔫 Alertas riven: *' + rivens.alerts.length + '*\n'
  if (inv && inv.alerts) reply += '⚔️ Alertas invasão: *' + inv.alerts.length + '*\n'
  reply += '📊 Cmds (sessão): *' + adminState.commandsToday + '*\n\n'
  reply += '⏸ Checks: *' + (adminState.alertsPaused ? 'PAUSADOS' : 'ativos') + '*\n'
  reply += '🔇 Mute global: *' + (adminState.botMuted ? 'SIM' : 'não') + '*\n'
  reply += '🚫 Mutados: *' + cfg.mutedUsers.length + '*\n'
  reply += '⭐ VIPs: *' + cfg.vipUsers.length + '*\n'
  reply += '🔫 Riven snipe (não-admin): *' + (cfg.rivenSnipeEnabled ? 'ON' : 'OFF') + '*\n'
  reply += '📏 Limite riven: *' + cfg.maxRivenAlerts + '* (VIP ' + cfg.maxRivenAlertsVip + ')\n'
  if (adminState.lastCheckAt) {
    reply += '🕐 Último check: *' + new Date(adminState.lastCheckAt).toLocaleString('pt-BR') + '*\n'
  }
  if (adminState.lastCheckError) {
    reply += '⚠️ Último erro: ' + String(adminState.lastCheckError).slice(0, 120) + '\n'
  }
  return reply.trim()
}

function collectKnownJids() {
  const set = {}
  try { loadAlerts().alerts.forEach((a) => { if (a.userJid) set[a.userJid] = true }) } catch (e) {}
  try { loadRivenAlerts().alerts.forEach((a) => { if (a.userJid) set[a.userJid] = true }) } catch (e) {}
  try { loadInvasionAlerts().alerts.forEach((a) => { if (a.userJid) set[a.userJid] = true }) } catch (e) {}
  chatHistory.forEach((_v, k) => { set[k] = true })
  return Object.keys(set)
}

module.exports = { adminHelpText, adminStatusMessage, collectKnownJids }
