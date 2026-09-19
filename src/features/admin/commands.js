const { register } = require('../../handlers/registry')
const adminState = require('../../state/adminState')
const { chatHistory } = require('../../state/chatHistory')
const { sleep } = require('../../lib/sleep')
const {
  getSenderJid, isAdmin, configHasUser,
  addToConfigList, removeFromConfigList,
  normalizeTargetJid, resolveLidFromNumber
} = require('./auth')
const { loadAdminConfig, saveAdminConfig } = require('./config')
const { adminHelpText, adminStatusMessage, collectKnownJids } = require('./status')
const { loadAlerts, saveAlerts } = require('../priceAlerts/storage')
const { loadRivenAlerts, saveRivenAlerts } = require('../rivens/storage')
const { runAllChecks } = require('../../bot/scheduler')
const { runHighestUpdater } = require('../highest/updater')

// --- Helpers locais ---
const adminOnly = (fn) => async (ctx) => {
  if (!ctx.isAdm) return ctx.sock.sendMessage(ctx.from, { text: '❌ Só admin.' })
  return fn(ctx)
}

// --- Identidade ---
register(/^!meujid$/i, async ({ sock, from, msg }) => {
  const sender = getSenderJid(msg)
  await sock.sendMessage(from, {
    text:
      'from: `' + from + '`\n' +
      'sender: `' + sender + '`\n' +
      'admin? *' + (isAdmin(msg) ? 'SIM' : 'NÃO') + '*'
  })
})

register(/^!lid\s+(\+?\d[\d\s\-()]+)$/i, adminOnly(async ({ sock, from, match }) => {
  await sock.sendMessage(from, { text: '🔍 Consultando WhatsApp...' })
  try {
    const info = await resolveLidFromNumber(sock, match[1])
    if (!info) return sock.sendMessage(from, { text: '❌ Não encontrei.' })
    await sock.sendMessage(from, {
      text: '📇 *Resultado*\n' +
        'JID: `' + (info.jid || '—') + '`\n' +
        'LID: `' + (info.lid || '—') + '`\n' +
        'Exists: *' + (info.exists ? 'sim' : 'não') + '*'
    })
  } catch (e) { await sock.sendMessage(from, { text: '❌ ' + e.message }) }
}))

// --- Menu / Status ---
register(/^!(admin|admins|painel)$/i, adminOnly(async ({ sock, from }) => {
  await sock.sendMessage(from, { text: adminHelpText() })
}))

register(/^!(statusbot|botstatus)$/i, adminOnly(async ({ sock, from }) => {
  await sock.sendMessage(from, { text: await adminStatusMessage() })
}))

register(/^!stats$/i, adminOnly(async ({ sock, from }) => {
  const a = loadAlerts().alerts.length
  const r = loadRivenAlerts().alerts.length
  const jids = collectKnownJids()
  const cfg = loadAdminConfig()
  await sock.sendMessage(from, {
    text:
      '📊 *Stats*\n' +
      'Usuários: *' + jids.length + '*\n' +
      'Alertas preço: *' + a + '*\n' +
      'Alertas riven: *' + r + '*\n' +
      'IA ativas: *' + chatHistory.size + '*\n' +
      'Mutados: *' + cfg.mutedUsers.length + '* | VIP: *' + cfg.vipUsers.length + '*\n' +
      'Riven snipe: *' + (cfg.rivenSnipeEnabled ? 'ON' : 'OFF') + '* (limite ' + cfg.maxRivenAlerts + ')\n' +
      'Cmds sessão: *' + adminState.commandsToday + '*'
  })
}))

register(/^!users$/i, adminOnly(async ({ sock, from }) => {
  const list = collectKnownJids()
  if (!list.length) return sock.sendMessage(from, { text: 'Nenhum JID conhecido.' })
  const chunk = list.slice(0, 50).map((j, i) => `${i + 1}. \`${j}\``).join('\n')
  const extra = list.length > 50 ? '\n_...+' + (list.length - 50) + '_' : ''
  await sock.sendMessage(from, { text: '👥 *Usuários (' + list.length + ')*\n\n' + chunk + extra })
}))

// --- Pause / Resume ---
register(/^!pause$/i, adminOnly(async ({ sock, from }) => {
  adminState.alertsPaused = true
  await sock.sendMessage(from, { text: '⏸ Checks *pausados*.' })
}))
register(/^!resume$/i, adminOnly(async ({ sock, from }) => {
  adminState.alertsPaused = false
  await sock.sendMessage(from, { text: '▶️ Checks *reativados*.' })
}))

// --- Mute global ---
register(/^!mute$/i, adminOnly(async ({ sock, from }) => {
  adminState.botMuted = true
  await sock.sendMessage(from, { text: '🔇 Bot *mutado*.' })
}))
register(/^!unmute$/i, adminOnly(async ({ sock, from }) => {
  adminState.botMuted = false
  await sock.sendMessage(from, { text: '🔊 Bot *desmutado*.' })
}))

// --- Mute user ---
register(/^!muteuser\s+(\S+)/i, adminOnly(async ({ sock, from, match }) => {
  const r = addToConfigList('mutedUsers', match[1].trim())
  await sock.sendMessage(from, { text: (r.ok ? '🔇 ' : '❌ ') + r.msg })
}))
register(/^!unmuteuser\s+(\S+)/i, adminOnly(async ({ sock, from, match }) => {
  const r = removeFromConfigList('mutedUsers', match[1].trim())
  await sock.sendMessage(from, { text: (r.ok ? '🔊 ' : '❌ ') + r.msg })
}))
register(/^!mutelist$/i, adminOnly(async ({ sock, from }) => {
  const mu = loadAdminConfig().mutedUsers
  await sock.sendMessage(from, {
    text: mu.length
      ? '🔇 *Mutados (' + mu.length + ')*\n' + mu.map((x, i) => `${i + 1}. \`${x}\``).join('\n')
      : 'Ninguém mutado individualmente.'
  })
}))

// --- VIP ---
register(/^!vip\s+(\S+)/i, adminOnly(async ({ sock, from, match }) => {
  const r = addToConfigList('vipUsers', match[1].trim())
  await sock.sendMessage(from, { text: (r.ok ? '⭐ ' : '❌ ') + r.msg })
}))
register(/^!unvip\s+(\S+)/i, adminOnly(async ({ sock, from, match }) => {
  const r = removeFromConfigList('vipUsers', match[1].trim())
  await sock.sendMessage(from, { text: (r.ok ? '✅ ' : '❌ ') + r.msg })
}))
register(/^!viplist$/i, adminOnly(async ({ sock, from }) => {
  const vu = loadAdminConfig().vipUsers
  await sock.sendMessage(from, {
    text: vu.length
      ? '⭐ *VIPs (' + vu.length + ')*\n' + vu.map((x, i) => `${i + 1}. \`${x}\``).join('\n')
      : 'Nenhum VIP.'
  })
}))

// --- Riven snipe toggle / limite ---
register(/^!rivensnipe\s+(on|off|ligar|desligar|1|0)$/i, adminOnly(async ({ sock, from, match }) => {
  const cfg = loadAdminConfig()
  const on = /^(on|ligar|1)$/i.test(match[1])
  cfg.rivenSnipeEnabled = on
  saveAdminConfig(cfg)
  await sock.sendMessage(from, {
    text: on ? '✅ Snipe *ligado*.' : '🚫 Snipe *desligado* para não-admins.'
  })
}))

register(/^!rivenlimit\s+(\d+)$/i, adminOnly(async ({ sock, from, match }) => {
  const n = Math.max(1, Math.min(100, parseInt(match[1], 10)))
  const cfg = loadAdminConfig()
  cfg.maxRivenAlerts = n
  saveAdminConfig(cfg)
  await sock.sendMessage(from, { text: '📏 Limite riven: *' + n + '*' })
}))

register(/^!delrivenuser\s+(\S+)/i, adminOnly(async ({ sock, from, match }) => {
  const target = match[1].trim()
  const store = loadRivenAlerts()
  const before = store.alerts.length
  store.alerts = store.alerts.filter((a) => !configHasUser([a.userJid], target))
  const rem = before - store.alerts.length
  saveRivenAlerts(store)
  await sock.sendMessage(from, {
    text: rem ? '🗑️ Removidos *' + rem + '* snipes de `' + target + '`.' : 'Nada encontrado.'
  })
}))

register(/^!delalertauser\s+(\S+)/i, adminOnly(async ({ sock, from, match }) => {
  const target = match[1].trim()
  const store = loadAlerts()
  const before = store.alerts.length
  store.alerts = store.alerts.filter((a) => !configHasUser([a.userJid], target))
  const rem = before - store.alerts.length
  saveAlerts(store)
  await sock.sendMessage(from, {
    text: rem ? '🗑️ Removidos *' + rem + '* alertas de `' + target + '`.' : 'Nada encontrado.'
  })
}))

// --- Blockcmd ---
register(/^!blockcmd\s+(\w+)/i, adminOnly(async ({ sock, from, match }) => {
  const cfg = loadAdminConfig()
  const c = match[1].toLowerCase()
  if (cfg.blockedCommands.indexOf(c) === -1) cfg.blockedCommands.push(c)
  saveAdminConfig(cfg)
  await sock.sendMessage(from, { text: '🚫 `!' + c + '` bloqueado.' })
}))
register(/^!unblockcmd\s+(\w+)/i, adminOnly(async ({ sock, from, match }) => {
  const cfg = loadAdminConfig()
  const c = match[1].toLowerCase()
  cfg.blockedCommands = (cfg.blockedCommands || []).filter((x) => x !== c)
  saveAdminConfig(cfg)
  await sock.sendMessage(from, { text: '✅ `!' + c + '` liberado.' })
}))
register(/^!blocklist$/i, adminOnly(async ({ sock, from }) => {
  const bl = loadAdminConfig().blockedCommands || []
  await sock.sendMessage(from, {
    text: bl.length
      ? '🚫 Bloqueados: ' + bl.map((x) => '!' + x).join(', ')
      : 'Nenhum comando bloqueado.'
  })
}))

// --- Apagar msg do bot ---
register(/^!(del|apagar|delete)$/i, adminOnly(async ({ sock, from, msg }) => {
  const ctx = msg.message && msg.message.extendedTextMessage && msg.message.extendedTextMessage.contextInfo
  const quotedId = ctx && ctx.stanzaId
  if (!quotedId) return sock.sendMessage(from, { text: '❌ Responda a uma msg do *bot* com `!del`.' })
  try {
    await sock.sendMessage(from, {
      delete: {
        remoteJid: from,
        fromMe: true,
        id: quotedId,
        participant: (ctx && ctx.participant) || undefined
      }
    })
  } catch (e) { await sock.sendMessage(from, { text: '❌ ' + e.message }) }
}))

// --- Forçar checks ---
register(/^!forcacheck$/i, adminOnly(async ({ sock, from }) => {
  await sock.sendMessage(from, { text: '⏳ Rodando checks...' })
  const wasPaused = adminState.alertsPaused
  adminState.alertsPaused = false
  try {
    await runAllChecks(sock)
    await sock.sendMessage(from, { text: '✅ Checks OK.' })
  } catch (e) {
    await sock.sendMessage(from, { text: '❌ ' + e.message })
  }
  adminState.alertsPaused = wasPaused
}))

register(/^!highestnow$/i, adminOnly(async ({ sock, from }) => {
  await sock.sendMessage(from, { text: '🏆 Iniciando Highest...' })
  runHighestUpdater()
    .then(() => sock.sendMessage(from, { text: '✅ Highest terminou.' }).catch(() => {}))
    .catch((e) => sock.sendMessage(from, { text: '❌ ' + e.message }).catch(() => {}))
}))

// --- Limpar histórico IA ---
register(/^!limparhist(?:\s+(.+))?$/i, adminOnly(async ({ sock, from, match }) => {
  const target = match[1] ? normalizeTargetJid(match[1].trim()) : null
  if (target) {
    const had = chatHistory.has(target)
    chatHistory.delete(target)
    await sock.sendMessage(from, {
      text: had ? '🧹 Limpo: `' + target + '`.' : 'Nada para limpar.'
    })
  } else {
    const n = chatHistory.size
    chatHistory.clear()
    await sock.sendMessage(from, { text: '🧹 Histórico IA limpo (*' + n + '*) conversas.' })
  }
}))

// --- Alertas admin ---
register(/^!alertasall$/i, adminOnly(async ({ sock, from }) => {
  const store = loadAlerts()
  if (!store.alerts.length) return sock.sendMessage(from, { text: 'Nenhum alerta de preço.' })
  const lines = store.alerts.slice(0, 40).map(
    (a) => '#' + a.id + ' ' + (a.itemName || a.slug) + ' ' + a.operator + a.price + 'p → `' + a.userJid + '`'
  )
  const more = store.alerts.length > 40 ? '\n_...+' + (store.alerts.length - 40) + '_' : ''
  await sock.sendMessage(from, {
    text: '🔔 *Alertas preço (' + store.alerts.length + ')*\n\n' + lines.join('\n') + more
  })
}))

register(/^!rivenall$/i, adminOnly(async ({ sock, from }) => {
  const rs = loadRivenAlerts()
  if (!rs.alerts.length) return sock.sendMessage(from, { text: 'Nenhum alerta riven.' })
  const lines = rs.alerts.slice(0, 40).map(
    (a) => '#' + a.id + ' *' + a.weapon + '*' +
      (a.maxPrice != null ? ' ≤' + a.maxPrice + 'p' : '') +
      ' → `' + a.userJid + '`'
  )
  const more = rs.alerts.length > 40 ? '\n_...+' + (rs.alerts.length - 40) + '_' : ''
  await sock.sendMessage(from, {
    text: '🔫 *Alertas riven (' + rs.alerts.length + ')*\n\n' + lines.join('\n') + more
  })
}))

register(/^!delalertaall$/i, adminOnly(async ({ sock, from }) => {
  const st = loadAlerts()
  const removed = st.alerts.length
  st.alerts = []
  saveAlerts(st)
  await sock.sendMessage(from, { text: '🗑️ Removidos *' + removed + '* alertas.' })
}))

register(/^!delrivenall$/i, adminOnly(async ({ sock, from }) => {
  const rst = loadRivenAlerts()
  const removed = rst.alerts.length
  rst.alerts = []
  saveRivenAlerts(rst)
  await sock.sendMessage(from, { text: '🗑️ Removidos *' + removed + '* alertas riven.' })
}))

// --- Say / BC ---
register(/^!say\s+(.+)/is, adminOnly(async ({ sock, from, match }) => {
  const rest = match[1].trim()
  const parts = rest.split(/\s+/)
  const maybeJid = normalizeTargetJid(parts[0])
  let dest, body
  if (maybeJid && parts.length >= 2) {
    dest = maybeJid
    body = parts.slice(1).join(' ')
  } else {
    dest = from
    body = rest
  }
  if (!body) return sock.sendMessage(from, { text: '❌ Uso: `!say <texto>` ou `!say <numero> <texto>`' })
  try {
    await sock.sendMessage(dest, { text: body })
    if (dest !== from) await sock.sendMessage(from, { text: '✅ Enviado para `' + dest + '`.' })
  } catch (e) { await sock.sendMessage(from, { text: '❌ ' + e.message }) }
}))

register(/^!bc\s+(.+)/is, adminOnly(async ({ sock, from, match }) => {
  const body = match[1].trim()
  const targets = collectKnownJids().filter((j) => j.indexOf('@g.us') === -1)
  if (!targets.length) return sock.sendMessage(from, { text: 'Nenhum destinatário.' })
  await sock.sendMessage(from, { text: '📢 Enviando para *' + targets.length + '*...' })
  let ok = 0, fail = 0
  for (const t of targets) {
    try { await sock.sendMessage(t, { text: body }); ok++ }
    catch (e) { fail++ }
    await sleep(400)
  }
  await sock.sendMessage(from, { text: '📢 BC: *' + ok + '* ok, *' + fail + '* falha.' })
}))

// --- Eval ---
register(/^!eval\s+([\s\S]+)/i, adminOnly(async ({ sock, from, match }) => {
  try {
    const result = await Promise.resolve(eval(match[1]))
    let out = typeof result === 'string' ? result : JSON.stringify(result, null, 2)
    if (out == null) out = String(result)
    await sock.sendMessage(from, { text: '```\n' + String(out).slice(0, 3000) + '\n```' })
  } catch (e) { await sock.sendMessage(from, { text: '❌ Eval: ' + e.message }) }
}))
