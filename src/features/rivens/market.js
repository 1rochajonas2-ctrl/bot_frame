const { register } = require('../../handlers/registry')
const {
  ensureWeeklyRivens, findWeeklyRivenEntries, formatWeeklySide
} = require('./weekly')

async function getRivenMarketMessage(rawWeapon) {
  let weapon = String(rawWeapon || '').trim()
  if (!weapon) {
    return (
      '❌ *Como usar:*\n!riven <arma>\n!riven <arma> rolled\n!riven <arma> unrolled\n\n' +
      'Ex: !riven kohm\n!riven kuva brakk rolled'
    )
  }

  let filter = null
  const parts = weapon.split(/\s+/)
  const last = parts[parts.length - 1].toLowerCase()
  if (last === 'rolled' || last === 'rerolled') { filter = true; parts.pop(); weapon = parts.join(' ') }
  else if (last === 'unrolled' || last === 'unroll') { filter = false; parts.pop(); weapon = parts.join(' ') }

  try {
    const list = await ensureWeeklyRivens()
    const hits = findWeeklyRivenEntries(list, weapon)
    if (!hits.length) return '❌ Nenhuma entrada para *' + weapon + '*.'

    let unrolled = null, rolled = null
    let displayName = hits[0].compatibility
    const itemType = hits[0].itemType || ''
    for (const h of hits) {
      if (h.rerolled) rolled = h; else unrolled = h
      if (h.compatibility) displayName = h.compatibility
    }

    let reply = '🔫 *' + displayName + '*\n'
    if (itemType) reply += '_' + itemType + '_\n\n'

    if (filter === true) reply += formatWeeklySide(rolled, 'Rolled')
    else if (filter === false) reply += formatWeeklySide(unrolled, 'Unrolled')
    else {
      reply += formatWeeklySide(unrolled, 'Unrolled')
      reply += '\n'
      reply += formatWeeklySide(rolled, 'Rolled')
    }
    return reply.trim()
  } catch (e) {
    console.error('!riven:', e.message)
    return '❌ Erro ao buscar dados de riven.'
  }
}

register(/^!riven(?:\s+(.+))?$/i, async ({ sock, from, match }) => {
  await sock.sendMessage(from, { text: '🔫 Consultando mercado de riven...' })
  await sock.sendMessage(from, { text: await getRivenMarketMessage(match[1] || '') })
})

module.exports = { getRivenMarketMessage }
