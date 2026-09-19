const { register } = require('../../handlers/registry')
const axios = require('axios')

async function getDrops(query) {
  try {
    const q = query.trim()
    if (!q) return '❌ Use: !drops hildryn prime'
    const res = await axios.get('https://api.warframestat.us/drops/search/' + encodeURIComponent(q), { timeout: 20000 })
    const data = res.data
    if (!data || !data.length) return '❌ Nenhum drop para "' + q + '".'

    const filtered = []
    for (const d of data) {
      const place = d.place || ''
      if (/\(Exceptional\)|\(Flawless\)|\(Radiant\)/i.test(place)) continue
      filtered.push(d)
    }
    const useList = filtered.length ? filtered : data

    let isRelicHeavy = 0
    for (let i = 0; i < Math.min(useList.length, 20); i++) {
      if (/relic/i.test(useList[i].place || '')) isRelicHeavy++
    }

    let reply = '📍 *Drops — ' + q + '*\n\n'
    if (isRelicHeavy >= 5) {
      const byPart = {}
      for (const row of useList) {
        const item = row.item || '?'
        if (!byPart[item]) byPart[item] = []
        byPart[item].push({ place: row.place, chance: row.chance, rarity: row.rarity })
      }
      const parts = Object.keys(byPart).slice(0, 8)
      for (const part of parts) {
        reply += '🧩 *' + part + '*\n'
        const rels = byPart[part].slice().sort((a, b) => (b.chance || 0) - (a.chance || 0))
        for (let r = 0; r < rels.length && r < 6; r++) {
          reply += '  • ' + rels[r].place + ' — ' + (rels[r].chance != null ? rels[r].chance + '%' : '?')
          if (rels[r].rarity) reply += ' (' + rels[r].rarity + ')'
          reply += '\n'
        }
        if (rels.length > 6) reply += '  _...+' + (rels.length - 6) + '_\n'
        reply += '\n'
      }
      reply += '💡 `!relic lith x1` para chances I/F/R + preços'
    } else {
      useList.sort((a, b) => (b.chance || 0) - (a.chance || 0))
      const max = Math.min(useList.length, 20)
      for (let n = 0; n < max; n++) {
        const d = useList[n]
        reply += '• *' + (d.place || '?') + '*\n  ' + (d.item || q) + ' — ' + (d.chance != null ? d.chance + '%' : '?')
        if (d.rarity) reply += ' (' + d.rarity + ')'
        reply += '\n'
      }
      if (useList.length > max) reply += '\n_... e mais ' + (useList.length - max) + ' locais_'
    }
    return reply.trim()
  } catch (err) {
    console.error(err.message)
    return '❌ Erro ao buscar drops.'
  }
}

register(/^!drops\s+(.+)/i, async ({ sock, from, match }) => {
  await sock.sendMessage(from, { text: '📍 Buscando drops de *' + match[1].trim() + '*...' })
  await sock.sendMessage(from, { text: await getDrops(match[1].trim()) })
})

module.exports = { getDrops }
