const { register } = require('../../handlers/registry')
const { fetchWS } = require('../../services/wfstat')
const { formatTimeLeft, formatDaysLeft } = require('../../lib/text')
const axios = require('axios')

// ===== Sortie =====
async function getSortie() {
  try {
    const s = await fetchWS('sortie')
    if (!s) return '❌ Sortie indisponível.'
    const left = s.expiry ? formatTimeLeft(new Date(s.expiry).getTime() - Date.now()) : '?'
    let reply = '🎯 *Sortie*\nBoss: *' + (s.boss || '?') + '* | ' + (s.faction || '') + '\n⏳ ' + left + '\n\n'
    for (let i = 0; i < (s.variants || []).length; i++) {
      const v = s.variants[i]
      reply += (i + 1) + '. *' + (v.missionType || '?') + '*\n   ' + (v.node || '?') + '\n   ⚠️ ' + (v.modifier || '—') + '\n'
    }
    return reply.trim()
  } catch (err) { return '❌ Erro ao buscar sortie.' }
}

// ===== Archon =====
async function getArchon() {
  try {
    const s = await fetchWS('archonHunt')
    if (!s) return '❌ Archon indisponível.'
    const left = s.expiry ? formatTimeLeft(new Date(s.expiry).getTime() - Date.now()) : '?'
    let reply = '👑 *Archon Hunt*\nBoss: *' + (s.boss || '?') + '* | ' + (s.faction || '') + '\n⏳ ' + left + '\n\n'
    for (let i = 0; i < (s.missions || []).length; i++) {
      const m = s.missions[i]
      reply += (i + 1) + '. *' + (m.type || m.typeKey || '?') + '*\n   ' + (m.node || '?') + '\n'
    }
    return reply.trim()
  } catch (err) { return '❌ Erro ao buscar Archon Hunt.' }
}

// ===== Archimedea =====
async function getArchimedea() {
  try {
    const list = await fetchWS('archimedeas')
    if (!list || !list.length) return '❌ Nenhuma Archimedea ativa.'
    let reply = '🧪 *Archimedea*\n\n'
    for (const a of list) {
      const left = a.expiry ? formatTimeLeft(new Date(a.expiry).getTime() - Date.now()) : '?'
      reply += '*' + (a.typeKey || a.type || 'Archimedea').replace(/_/g, ' ') + '*\n⏳ ' + left + '\n'
      const missions = a.missions || []
      for (let j = 0; j < missions.length; j++) {
        const m = missions[j]
        reply += (j + 1) + '. *' + (m.missionType || '?') + '* (' + (m.faction || '') + ')\n'
        if (m.deviation && m.deviation.name) reply += '   📌 ' + m.deviation.name + '\n'
        for (const r of m.risks || []) reply += '   ⚠️ ' + (r.name || r.key || '') + (r.isHard ? ' (Hard)' : '') + '\n'
      }
      reply += '\n'
    }
    return reply.trim()
  } catch (err) { return '❌ Erro ao buscar Archimedea.' }
}

// ===== Events =====
async function getEvents() {
  try {
    const list = await fetchWS('events')
    if (!list || !list.length) return '📅 Nenhum evento ativo.'
    let reply = '📅 *Eventos ativos*\n\n', shown = 0
    for (const e of list) {
      const exp = e.expiry ? new Date(e.expiry).getTime() : 0
      if (exp && exp < Date.now()) continue
      const left = exp ? formatTimeLeft(exp - Date.now()) : '?'
      reply += '• *' + (e.description || e.tag || 'Evento') + '*\n'
      if (e.node) reply += '  📍 ' + e.node + '\n'
      if (e.faction) reply += '  🏷️ ' + e.faction + '\n'
      reply += '  ⏳ ' + left + '\n\n'
      if (++shown >= 10) break
    }
    return shown ? reply.trim() : '📅 Nenhum evento ativo.'
  } catch (err) { return '❌ Erro ao buscar eventos.' }
}

// ===== Nightwave =====
async function getNightwave() {
  try {
    const nw = await fetchWS('nightwave')
    if (!nw) return '❌ Nightwave indisponível.'
    const left = nw.expiry ? formatTimeLeft(new Date(nw.expiry).getTime() - Date.now()) : '?'
    let reply = '📡 *Nightwave*\nSeason: *' + (nw.season != null ? nw.season : '?') + '* | Phase: ' + (nw.phase != null ? nw.phase : '?') + '\n⏳ ' + left + '\n\n*Desafios ativos:*\n'
    const ch = nw.activeChallenges || []
    if (!ch.length) reply += '_Nenhum listado._'
    for (const c of ch) {
      const tag = c.isDaily ? '📅' : (c.isElite ? '💀' : '⭐')
      const cLeft = c.expiry ? formatTimeLeft(new Date(c.expiry).getTime() - Date.now()) : ''
      reply += tag + ' *' + (c.title || 'Desafio') + '*\n   ' + (c.desc || '') + '\n   🏅 ' + (c.reputation || '?') + ' rep'
      if (cLeft) reply += ' | ⏳ ' + cLeft
      reply += '\n'
    }
    return reply.trim()
  } catch (err) { return '❌ Erro ao buscar Nightwave.' }
}

// ===== Cycles =====
async function getCycle(kind) {
  try {
    const map = { cetus: 'cetusCycle', vallis: 'vallisCycle', deimos: 'cambionCycle' }
    const titles = { cetus: '🌿 Cetus', vallis: '❄️ Orb Vallis', deimos: '☣️ Cambion Drift' }
    const data = await fetchWS(map[kind])
    if (!data) return '❌ Ciclo indisponível.'
    const left = data.timeLeft || (data.expiry ? formatTimeLeft(new Date(data.expiry).getTime() - Date.now()) : '?')
    let state = data.state || '?'
    if (kind === 'cetus') state = data.isDay ? '☀️ Dia' : '🌙 Noite'
    if (kind === 'vallis') state = data.isWarm ? '🔥 Quente' : '❄️ Frio'
    if (kind === 'deimos') {
      if (/fass/i.test(state)) state = '🟠 Fass'
      else if (/vome/i.test(state)) state = '🔵 Vome'
    }
    return titles[kind] + '\nEstado: *' + state + '*\n⏳ Resta: *' + left + '*'
  } catch (err) { return '❌ Erro ao buscar ciclo.' }
}

// ===== Calendar 1999 =====
async function getCalendar() {
  try {
    const res = await axios.get('https://api.warframestat.us/pc/calendar', { timeout: 15000 })
    const data = res.data
    if (!data || !data.days) return '❌ Calendário 1999 indisponível.'
    const left = data.expiry ? formatTimeLeft(new Date(data.expiry).getTime() - Date.now()) : '?'
    let reply = '📅 *Calendário 1999*\n⏳ Season termina em: *' + left + '*\n\n'
    let shown = 0
    for (const day of data.days || []) {
      if (!day.events || !day.events.length) continue
      const date = day.date ? new Date(day.date).toLocaleDateString('pt-BR') : '?'
      reply += '*' + date + '*\n'
      for (const ev of day.events) {
        if (ev.type === 'To Do' && ev.challenge) reply += '✅ *To Do:* ' + ev.challenge.title + '\n   ' + (ev.challenge.description || '') + '\n'
        else if (ev.type === 'Big Prize!' && ev.reward) reply += '🎁 *Prêmio:* ' + ev.reward + '\n'
        else if (ev.type === 'Override' && ev.upgrade) reply += '⚙️ *Override:* ' + ev.upgrade.title + '\n   ' + (ev.upgrade.description || '') + '\n'
      }
      reply += '\n'
      if (++shown >= 8) break
    }
    if (!shown) reply += '_Nenhum evento listado._'
    return reply.trim()
  } catch (err) { return '❌ Erro ao buscar Calendário 1999.' }
}

// ===== Incarnon Circuit =====
const INCARNON_EPOCH_UTC = Date.UTC(2026, 8, 15)
const INCARNON_EPOCH_INDEX = 2
const INCARNON_ROTATIONS = [
  { letter: 'A', weapons: ['Braton', 'Lato', 'Skana', 'Paris', 'Kunai'] },
  { letter: 'B', weapons: ['Boar', 'Gammacor', 'Angstrum', 'Gorgon', 'Anku'] },
  { letter: 'C', weapons: ['Bo', 'Latron', 'Furis', 'Furax', 'Strun'] },
  { letter: 'D', weapons: ['Lex', 'Magistar', 'Boltor', 'Bronco', 'Ceramic Dagger'] },
  { letter: 'E', weapons: ['Torid', 'Dual Toxocyst', 'Dual Ichor', 'Miter', 'Atomos'] },
  { letter: 'F', weapons: ['Ack & Brunt', 'Soma', 'Vasto', 'Nami Solo', 'Burston'] },
  { letter: 'G', weapons: ['Zylok', 'Sibear', 'Dread', 'Despair', 'Hate'] },
  { letter: 'H', weapons: ['Dera', 'Sybaris', 'Cestra', 'Sicarus', 'Okina'] },
  { letter: 'I', weapons: ['Vectis', 'Stug', 'Ballistica', 'Destreza', 'Obex'] }
]

function formatDaysLeft(ms) {
  if (ms <= 0) return 'agora'
  const d = Math.floor(ms / 86400000)
  const h = Math.floor((ms % 86400000) / 3600000)
  if (d <= 0) return h + 'h'
  if (d === 1) return '1 dia'
  if (d < 28) return d + ' dias'
  const m = Math.round(d / 30)
  return m <= 1 ? '1 mês' : m + ' meses'
}

function formatIncarnonMessage() {
  const now = Date.now()
  const weekMs = 7 * 24 * 60 * 60 * 1000
  const weeksSince = Math.floor((now - INCARNON_EPOCH_UTC) / weekMs)
  let idx = (INCARNON_EPOCH_INDEX + weeksSince) % INCARNON_ROTATIONS.length
  if (idx < 0) idx += INCARNON_ROTATIONS.length
  const nextReset = INCARNON_EPOCH_UTC + (weeksSince + 1) * weekMs
  const left = nextReset - now
  const cur = INCARNON_ROTATIONS[idx]

  let reply = '⚡ *Circuit — Incarnons — Week ' + cur.letter + '*\n\n'
  reply += '*Ativo*\n' + cur.weapons.join(', ') + '\n'
  reply += 'Rotaciona: *' + formatDaysLeft(left) + '*\n\n*Próximas*\n'
  for (let i = 1; i < INCARNON_ROTATIONS.length; i++) {
    const r = INCARNON_ROTATIONS[(idx + i) % INCARNON_ROTATIONS.length]
    reply += 'em *' + formatDaysLeft(left + (i - 1) * weekMs) + '* — ' + r.weapons.join(', ') + '\n'
  }
  return reply.trim()
}

// ===== Registros =====
register(/^!sortie$/i, async ({ sock, from }) => {
  await sock.sendMessage(from, { text: '🎯 Buscando sortie...' })
  await sock.sendMessage(from, { text: await getSortie() })
})
register(/^!archon$/i, async ({ sock, from }) => {
  await sock.sendMessage(from, { text: '👑 Buscando Archon...' })
  await sock.sendMessage(from, { text: await getArchon() })
})
register(/^!(archimedea|archmedea)$/i, async ({ sock, from }) => {
  await sock.sendMessage(from, { text: '🧪 Buscando Archimedea...' })
  await sock.sendMessage(from, { text: await getArchimedea() })
})
register(/^!(eventos|events)$/i, async ({ sock, from }) => {
  await sock.sendMessage(from, { text: '📅 Buscando eventos...' })
  await sock.sendMessage(from, { text: await getEvents() })
})
register(/^!nightwave$/i, async ({ sock, from }) => {
  await sock.sendMessage(from, { text: '📡 Buscando Nightwave...' })
  await sock.sendMessage(from, { text: await getNightwave() })
})
register(/^!cetus$/i, async ({ sock, from }) => {
  await sock.sendMessage(from, { text: await getCycle('cetus') })
})
register(/^!vallis$/i, async ({ sock, from }) => {
  await sock.sendMessage(from, { text: await getCycle('vallis') })
})
register(/^!(deimos|cambion)$/i, async ({ sock, from }) => {
  await sock.sendMessage(from, { text: await getCycle('deimos') })
})
register(/^!(calendario|calendar|1999)$/i, async ({ sock, from }) => {
  await sock.sendMessage(from, { text: '📅 Buscando...' })
  await sock.sendMessage(from, { text: await getCalendar() })
})
register(/^!(incarnon|incarnons|circuit|circuito)$/i, async ({ sock, from }) => {
  await sock.sendMessage(from, { text: formatIncarnonMessage() })
})

module.exports = {
  getSortie, getArchon, getArchimedea, getEvents, getNightwave,
  getCycle, getCalendar, formatIncarnonMessage
}
