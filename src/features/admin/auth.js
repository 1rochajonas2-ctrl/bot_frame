const { ADMIN_NUMBERS } = require('../../config/env')
const { jidToNumber } = require('../../lib/text')
const { loadAdminConfig, saveAdminConfig } = require('./config')
const { loadRivenAlerts } = require('../rivens/storage')

function getSenderJid(msg) {
  if (msg.key && msg.key.participant) return msg.key.participant
  if (msg.participant) return msg.participant
  if (msg.key && msg.key.participantAlt) return msg.key.participantAlt
  if (msg.key && msg.key.remoteJid) return msg.key.remoteJid
  return null
}

function isAdmin(jidOrMsg) {
  let jid = jidOrMsg
  if (jidOrMsg && typeof jidOrMsg === 'object' && jidOrMsg.key) {
    jid = getSenderJid(jidOrMsg)
  }
  const raw = String(jid || '')
  const num = jidToNumber(raw)
  if (!num && !raw) return false
  return ADMIN_NUMBERS.some((a) => {
    const aNum = String(a).replace(/\D/g, '')
    if (!aNum) return false
    if (num && (num === aNum || num.endsWith(aNum) || aNum.endsWith(num))) return true
    if (raw.indexOf(aNum) !== -1) return true
    if (raw === a || raw === aNum + '@lid' || raw === aNum + '@s.whatsapp.net') return true
    return false
  })
}

function identityKeys(jid) {
  const raw = String(jid || '')
  const num = jidToNumber(raw)
  const keys = [raw]
  if (num) keys.push(num)
  return keys
}

function configHasUser(list, jid) {
  const keys = identityKeys(jid)
  return (list || []).some((entry) => {
    const e = String(entry)
    const eNum = jidToNumber(e)
    return keys.some((k) =>
      k === e || k === eNum ||
      (eNum && (String(k).endsWith(eNum) || eNum.endsWith(String(k))))
    )
  })
}

function isUserMuted(jid) {
  return configHasUser(loadAdminConfig().mutedUsers, jid)
}

function isVip(jid) {
  return configHasUser(loadAdminConfig().vipUsers, jid)
}

function normalizeTargetJid(raw) {
  const s = String(raw || '').trim()
  if (!s) return null
  if (s.indexOf('@') !== -1) return s
  const num = s.replace(/\D/g, '')
  if (num.length < 10) return null
  if (num.length >= 14) return num + '@lid'
  return num + '@s.whatsapp.net'
}

function addToConfigList(listName, jidOrNum) {
  const cfg = loadAdminConfig()
  const entry = String(jidOrNum).trim()
  if (!entry) return { ok: false, msg: 'Alvo vazio' }
  if (!cfg[listName]) cfg[listName] = []
  if (configHasUser(cfg[listName], entry)) return { ok: false, msg: 'Já estava na lista.' }
  cfg[listName].push(entry)
  saveAdminConfig(cfg)
  return { ok: true, msg: 'Adicionado: `' + entry + '`' }
}

function removeFromConfigList(listName, jidOrNum) {
  const cfg = loadAdminConfig()
  const entry = String(jidOrNum).trim()
  const before = (cfg[listName] || []).length
  cfg[listName] = (cfg[listName] || []).filter(
    (e) => !configHasUser([e], entry) && e !== entry
  )
  saveAdminConfig(cfg)
  const removed = before - cfg[listName].length
  return removed
    ? { ok: true, msg: 'Removido (' + removed + ').' }
    : { ok: false, msg: 'Não estava na lista.' }
}

function countUserRivenAlerts(userJid) {
  try {
    return loadRivenAlerts().alerts.filter(
      (a) => configHasUser([a.userJid], userJid) || a.userJid === userJid
    ).length
  } catch (e) { return 0 }
}

function getRivenAlertLimit(userJid, isAdm) {
  if (isAdm === true || isAdmin(userJid)) return Infinity
  const cfg = loadAdminConfig()
  if (isVip(userJid)) return cfg.maxRivenAlertsVip || 30
  return cfg.maxRivenAlerts != null ? cfg.maxRivenAlerts : 10
}

function canUseRivenSnipe(userJid, isAdm) {
  if (isAdm) return true
  return loadAdminConfig().rivenSnipeEnabled !== false
}

async function resolveLidFromNumber(sock, phone) {
  const num = String(phone || '').replace(/\D/g, '')
  if (!num) return null
  const tries = [num, num + '@s.whatsapp.net']
  if (!num.startsWith('55') && num.length <= 11) tries.push('55' + num)
  for (const t of tries) {
    try {
      const res = await sock.onWhatsApp(t)
      if (Array.isArray(res) && res.length && res[0]) {
        const r = res[0]
        if (r.exists === false) continue
        return { jid: r.jid || null, lid: r.lid || null, exists: r.exists !== false }
      }
    } catch (e) {}
  }
  return null
}

module.exports = {
  getSenderJid, isAdmin, configHasUser,
  isUserMuted, isVip, normalizeTargetJid,
  addToConfigList, removeFromConfigList,
  countUserRivenAlerts, getRivenAlertLimit, canUseRivenSnipe,
  resolveLidFromNumber
}
