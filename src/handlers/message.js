const { resolve } = require('./registry')
const { isAdmin, isUserMuted, getSenderJid } = require('../features/admin/auth')
const { loadAdminConfig } = require('../features/admin/config')
const adminState = require('../state/adminState')
const { canUseRivenSnipe } = require('../features/admin/auth')

// auto-registra TODAS as features. Adicione um require por feature nova.
require('../features/admin/commands')
require('../features/ai/commands')
require('../features/prices/average')
require('../features/prices/set')
require('../features/prices/relic')
require('../features/prices/drops')
require('../features/prices/profile')
require('../features/prices/itemInfo')
require('../features/world/fissures')
require('../features/world/sortie')
require('../features/world/archon')
require('../features/world/archimedea')
require('../features/world/events')
require('../features/world/nightwave')
require('../features/world/cycles')
require('../features/world/calendar')
require('../features/world/incarnon')
require('../features/arbitrations/commands')
require('../features/descendia/commands')
require('../features/bounties/oracle')
require('../features/bounties/landscape')
require('../features/baro/commands')
require('../features/resurgence')
require('../features/acrithis')
require('../features/invasions/commands')
require('../features/priceAlerts/commands')
require('../features/rivens/market')
require('../features/rivens/gradeCmd')
require('../features/rivens/metaCmd')
require('../features/rivens/rankings')
require('../features/rivens/alerts')
require('../features/highest/commands')

function setupMessageHandler(sock) {
  sock.ev.on('messages.upsert', async (m) => {
    const msg = m.messages[0]
    if (!msg.message || msg.key.fromMe) return

    let text = (
      msg.message.conversation ||
      (msg.message.extendedTextMessage && msg.message.extendedTextMessage.text) ||
      ''
    ).trim()
    if (text.startsWith('/')) text = '!' + text.slice(1)
    if (!text.startsWith('!')) return

    const from = msg.key.remoteJid
    const senderJid = getSenderJid(msg)
    const isAdm = isAdmin(msg)

    // mutes
    if (!isAdm && isUserMuted(senderJid)) return
    if (adminState.botMuted && !isAdm) return

    // comandos bloqueados
    if (!isAdm) {
      const cmdName = text.slice(1).split(/\s+/)[0].toLowerCase()
      const blocked = loadAdminConfig().blockedCommands || []
      if (blocked.indexOf(cmdName) !== -1) {
        return sock.sendMessage(from, { text: '❌ Comando desativado pelo admin.' })
      }
      // trava snipe riven
      if (/^!(alertariven|snipeweek|alertasriven|delalertariven)\b/i.test(text)
          && !canUseRivenSnipe(senderJid, false)) {
        return sock.sendMessage(from, { text: '❌ Snipe de riven desativado pelo admin.' })
      }
    }

    if (isAdm) adminState.commandsToday++

    const route = resolve(text)
    if (!route) return

    if (route.admin && !isAdm) {
      return sock.sendMessage(from, { text: '❌ Só admin.' })
    }

    try {
      await route.handler({ sock, msg, from, senderJid, isAdm, text, match: route.match })
    } catch (e) {
      console.error('[handler:' + route.name + ']', e)
      try { await sock.sendMessage(from, { text: '❌ ' + e.message }) } catch {}
    }
  })
}

module.exports = { setupMessageHandler }
