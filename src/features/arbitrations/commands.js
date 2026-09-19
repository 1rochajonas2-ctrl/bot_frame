const { register } = require('../../handlers/registry')
const { formatTimeLeft, formatBRDate } = require('../../lib/text')
const { loadArbys, loadSpIncursions, loadRegions } = require('./data')
const { getArbyTier, TIER_EMOJI } = require('./tiers')

async function formatArbyMessage() {
  try {
    const arbys = loadArbys()
    const regions = loadRegions()
    const now = Math.floor(Date.now() / 1000)

    let current = null
    const upcoming = [], notables = []

    for (let i = 0; i < arbys.length; i++) {
      const a = arbys[i]
      const nextTs = arbys[i + 1] ? arbys[i + 1].ts : a.ts + 3600
      const info = regions[a.key] || { name: a.key, planet: '?', missionType: '?', faction: '?' }
      const tier = getArbyTier(info.name)
      const entry = { ...info, key: a.key, ts: a.ts, expiry: nextTs, tier, emoji: TIER_EMOJI[tier] || '⚪' }

      if (a.ts <= now && nextTs > now) current = entry
      else if (a.ts > now) {
        upcoming.push(entry)
        if (['S','A'].includes(tier) && notables.length < 6) notables.push(entry)
        if (upcoming.length >= 8) break
      }
    }

    let reply = ''
    if (current) {
      const left = formatTimeLeft(current.expiry * 1000 - Date.now())
      reply += current.emoji + ' *Arbitragem Atual*\n'
      reply += '*' + current.tier + '* ' + current.name + ' (' + current.planet + ')\n'
      reply += 'Tipo: ' + current.missionType + ' - ' + current.faction + '\n'
      reply += '⏳ Expira em: *' + left + '*\n\n'
    } else reply += '❌ Nenhuma arbitragem atual.\n\n'

    if (upcoming.length) {
      reply += '📅 *Próximas*\n'
      for (const u of upcoming.slice(0, 6)) {
        const left = formatTimeLeft(u.ts * 1000 - Date.now())
        reply += u.emoji + ' *' + u.tier + '* ' + u.name + ' (' + u.planet + ') — em ' + left + '\n'
      }
      reply += '\n'
    }
    if (notables.length) {
      reply += '⭐ *Notables (S/A)*\n'
      for (const n of notables) {
        const left = formatTimeLeft(n.ts * 1000 - Date.now())
        reply += n.emoji + ' *' + n.tier + '* ' + n.name + ' (' + n.planet + ') — em ' + left + '\n'
      }
    }
    return reply.trim() || '❌ Não foi possível montar a lista.'
  } catch (err) {
    console.error('Erro arby:', err.message)
    return '❌ Erro ao buscar arbitrations.'
  }
}

async function formatIncursionsMessage() {
  try {
    const list = loadSpIncursions()
    const regions = loadRegions()
    if (!list.length) return '❌ Arquivo SP não disponível.'
    const now = Math.floor(Date.now() / 1000)
    let current = null
    const upcoming = []
    for (let i = 0; i < list.length; i++) {
      const row = list[i]
      const nextTs = list[i + 1] ? list[i + 1].ts : row.ts + 86400
      const nodes = row.nodes.map((key) => {
        const info = regions[key] || { name: key, planet: '?' }
        return info.name + ' (' + info.planet + ')'
      })
      if (row.ts <= now && nextTs > now) current = { ts: row.ts, expiry: nextTs, nodes }
      else if (row.ts > now) { upcoming.push({ ts: row.ts, nodes }); if (upcoming.length >= 4) break }
    }

    let reply = '⚔️ *Incursões Steel Path*\n\n'
    if (current) {
      const left = formatTimeLeft(current.expiry * 1000 - Date.now())
      reply += '🟢 *Atual* (até ' + formatBRDate(current.expiry * 1000) + ')\n'
      reply += '⏳ ' + left + '\n'
      current.nodes.forEach((n, i) => { reply += (i + 1) + '. ' + n + '\n' })
      reply += '\n'
    } else reply += '❌ Nenhuma incursão atual.\n\n'

    if (upcoming.length) {
      reply += '📅 *Próximas*\n'
      upcoming.forEach((u, idx) => {
        const left = formatTimeLeft(u.ts * 1000 - Date.now())
        reply += '\n*' + (idx + 1) + '.* em ' + left + ' (' + formatBRDate(u.ts * 1000) + ')\n'
        u.nodes.slice(0, 6).forEach((n) => { reply += '• ' + n + '\n' })
      })
    }
    return reply.trim()
  } catch (err) {
    console.error('Erro incursao:', err.message)
    return '❌ Erro ao buscar incursões SP.'
  }
}

register(/^!(arby|arbit|arbitragem)$/i, async ({ sock, from }) => {
  await sock.sendMessage(from, { text: '⚔️ Buscando Arbitrations...' })
  await sock.sendMessage(from, { text: await formatArbyMessage() })
})

register(/^!(incursao|incursões|incursoes|spincursion|sp)$/i, async ({ sock, from }) => {
  await sock.sendMessage(from, { text: '🗡️ Buscando Incursões SP...' })
  await sock.sendMessage(from, { text: await formatIncursionsMessage() })
})

module.exports = { formatArbyMessage, formatIncursionsMessage }
