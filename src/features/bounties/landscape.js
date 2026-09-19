// src/features/bounties/landscape.js
const { register } = require('../../handlers/registry')
const axios = require('axios')
const { formatTimeLeft } = require('../../lib/text')

async function formatLocationBounty(place) {
  try {
    const res = await axios.get('https://api.warframestat.us/pc/syndicateMissions', { timeout: 15000 })
    const data = Array.isArray(res.data) ? res.data : []
    const map = {
      cetus: { key: 'Ostrons', title: '🌿 Cetus / Ostron' },
      fortuna: { key: 'Solaris United', title: '❄️ Fortuna / Solaris' },
      deimos: { key: 'Entrati', title: '☣️ Deimos / Entrati' }
    }
    const cfg = map[place]
    if (!cfg) return '❌ Use: !bounty cetus | fortuna | deimos'
    const block = data.find((s) => s.syndicate === cfg.key)
    if (!block || !block.jobs || !block.jobs.length) return '❌ Sem bounties ativas para ' + place + '.'
    const left = block.expiry ? formatTimeLeft(new Date(block.expiry).getTime() - Date.now()) : '?'
    let reply = cfg.title + '\n⏳ Ciclo: ' + left + '\n\n'
    block.jobs.forEach((j, i) => {
      const levels = Array.isArray(j.enemyLevels) ? j.enemyLevels.join('–') : '?'
      reply += (i + 1) + '. *' + (j.type || 'Bounty') + '*\n   📍 Nível ' + levels + '\n'
    })
    return reply.trim()
  } catch (err) {
    console.error(err.message)
    return '❌ Erro ao buscar bounties.'
  }
}

register(/^!bounty\s+(cetus|fortuna|deimos|ostron|solaris|entrati|holdfasts?|zariman|cavia|lab|sanctum|hex|hollvania)$/i,
  async ({ sock, from, match }) => {
    const p = match[1].toLowerCase()
    await sock.sendMessage(from, { text: '🗺️ Buscando bounties...' })
    const { formatOracleCycle } = require('./oracle')
    if (['cetus','ostron'].includes(p)) return sock.sendMessage(from, { text: await formatLocationBounty('cetus') })
    if (['fortuna','solaris'].includes(p)) return sock.sendMessage(from, { text: await formatLocationBounty('fortuna') })
    if (['deimos','entrati'].includes(p)) return sock.sendMessage(from, { text: await formatLocationBounty('deimos') })
    if (['holdfasts','holdfast','zariman'].includes(p)) return sock.sendMessage(from, { text: await formatOracleCycle('zariman') })
    if (['cavia','lab','sanctum'].includes(p)) return sock.sendMessage(from, { text: await formatOracleCycle('lab') })
    if (['hex','hollvania'].includes(p)) return sock.sendMessage(from, { text: await formatOracleCycle('hex') })
  })

module.exports = { formatLocationBounty }
