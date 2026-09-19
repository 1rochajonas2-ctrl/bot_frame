const { register } = require('../../handlers/registry')
const { httpGet } = require('../../lib/http')
const { headers } = require('../../config/headers')
const { toSlug } = require('../../lib/text')

async function getProfile(username) {
  try {
    const slug = toSlug(username)
    const res = await httpGet('https://api.warframe.market/v2/user/' + slug, { headers })
    const user = res.data && res.data.data ? res.data.data : null
    if (!user) return '❌ Jogador "' + username + '" não encontrado.'

    let sellCount = 0, buyCount = 0
    try {
      const oRes = await httpGet('https://api.warframe.market/v2/orders/user/' + slug, { headers })
      const orders = oRes.data && oRes.data.data ? oRes.data.data : []
      for (const o of orders) {
        if (o.type === 'sell') sellCount++
        if (o.type === 'buy') buyCount++
      }
    } catch (e) {}

    let achievementsText = 'Nenhum'
    try {
      const aRes = await httpGet('https://api.warframe.market/v2/achievements/user/' + slug, { headers })
      const achs = aRes.data && aRes.data.data ? aRes.data.data : []
      if (achs.length > 0) {
        achievementsText = achs.map((a) =>
          (a.i18n && a.i18n.en && a.i18n.en.name) || a.slug || 'Achievement'
        ).join(', ')
      }
    } catch (e) {}

    const statusEmoji = user.status === 'online' ? '🟢' : user.status === 'ingame' ? '🟡' : '⚫'

    let activityText = 'Nenhuma'
    if (user.activity) {
      const actType = user.activity.type || ''
      const actDetails = user.activity.details || ''
      if (actType && actType !== 'UNKNOWN') {
        activityText = actType
        if (actDetails && actDetails !== 'unknown') activityText += ' — ' + actDetails
      } else if (actDetails && actDetails !== 'unknown') activityText = actDetails
    }

    let lastSeen = 'Desconhecido'
    if (user.lastSeen) {
      const d = new Date(user.lastSeen)
      lastSeen = d.toLocaleString('pt-BR')
      const diff = Math.floor((Date.now() - d.getTime()) / 60000)
      if (diff < 1) lastSeen += ' (agora)'
      else if (diff < 60) lastSeen += ' (há ' + diff + ' min)'
      else if (diff < 1440) lastSeen += ' (há ' + Math.floor(diff / 60) + ' h)'
      else lastSeen += ' (há ' + Math.floor(diff / 1440) + ' dias)'
    }

    let about = 'Nenhuma descrição'
    if (user.about) about = user.about.replace(/<[^>]+>/g, '').replace(/&hellip;/g, '...').replace(/&ldquo;|&rdquo;/g, '"').replace(/&amp;/g, '&').trim()

    let reply = statusEmoji + ' *' + user.ingameName + '*\n\n'
    reply += '📌 *Status:* ' + user.status + '\n'
    reply += '🎮 *Activity:* ' + activityText + '\n'
    reply += '💻 *Plataforma:* ' + (user.platform || 'pc').toUpperCase() + '\n'
    reply += '🔄 *Crossplay:* ' + (user.crossplay ? 'Sim' : 'Não') + '\n'
    reply += '⭐ *Reputação:* ' + user.reputation + '\n'
    reply += '📈 *Mastery Rank:* ' + (user.masteryRank != null ? user.masteryRank : '?') + '\n'
    reply += '👑 *Tier:* ' + (user.tier ? user.tier.charAt(0).toUpperCase() + user.tier.slice(1) : 'Nenhum') + '\n'
    reply += '🕒 *Last seen:* ' + lastSeen + '\n'
    reply += '📦 *Ordens:* ' + sellCount + ' venda | ' + buyCount + ' compra\n'
    reply += '🏅 *Achievements:* ' + achievementsText + '\n\n'
    reply += '📝 *Sobre:*\n' + about.slice(0, 400)
    if (about.length > 400) reply += '...'
    reply += '\n\n🔗 https://warframe.market/profile/' + (user.slug || slug)
    return reply
  } catch (err) {
    console.error(err.message)
    return '❌ Erro ao buscar perfil.'
  }
}

register(/^!perfil\s+(.+)/i, async ({ sock, from, match }) => {
  await sock.sendMessage(from, { text: '👤 Buscando perfil de *' + match[1].trim() + '*...' })
  await sock.sendMessage(from, { text: await getProfile(match[1].trim()) })
})

module.exports = { getProfile }
