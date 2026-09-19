const { register } = require('../../handlers/registry')
const axios = require('axios')
const { getTopOrders, calcStatsFromOrders } = require('../../services/wfm')
const { toSlug } = require('../../lib/text')

async function getRelic(relicName) {
  try {
    const parts = relicName.trim().toLowerCase().split(/\s+/)
    if (parts.length < 2) return '❌ Use: !relic lith a1'

    const tier = parts[0].charAt(0).toUpperCase() + parts[0].slice(1)
    const name = parts[1].toUpperCase()
    const res = await axios.get('https://drops.warframestat.us/data/relics.json', { timeout: 15000 })
    const relics = Array.isArray(res.data) ? res.data : (res.data.relics || [])

    const byState = {}
    for (const r of relics) if (r.tier === tier && r.relicName === name) byState[r.state] = r
    if (!byState['Intact']) return '❌ Relíquia "' + tier + ' ' + name + '" não encontrada.'

    const relicSlug = tier.toLowerCase() + '_' + name.toLowerCase() + '_relic'
    const relicOrders = await getTopOrders(relicSlug)
    const relicStats = calcStatsFromOrders(relicOrders.sell)

    let reply = '📦 *' + tier + ' ' + name + ' Relic*\n'
    if (relicStats) reply += 'Preço médio: *' + relicStats.avg + 'p* (min ' + relicStats.min + 'p)\n\n'
    else reply += 'Preço: sem ordens online\n\n'

    const items = {}
    const states = ['Intact', 'Flawless', 'Radiant']
    for (const state of states) {
      const relic = byState[state]
      if (!relic || !relic.rewards) continue
      for (const reward of relic.rewards) {
        const key = reward.itemName
        if (!items[key]) items[key] = { name: reward.itemName, rarity: reward.rarity, chanceIntact: null, chances: {} }
        items[key].chances[state] = reward.chance
        if (state === 'Intact') { items[key].rarity = reward.rarity; items[key].chanceIntact = reward.chance }
      }
    }

    reply += '*Drops + Chances:*\n_(I = Intact | F = Flawless | R = Radiant)_\n🟠 Common | 🟡 Uncommon | 🔴 Rare\n\n'
    const list = Object.values(items)
    list.sort((a, b) => (a.chanceIntact != null ? a.chanceIntact : 99) - (b.chanceIntact != null ? b.chanceIntact : 99))

    for (const item of list) {
      let priceText = '—'
      if (item.name.toLowerCase().indexOf('forma') === -1) {
        const orders = await getTopOrders(toSlug(item.name))
        const stats = calcStatsFromOrders(orders.sell)
        priceText = stats ? stats.min + 'p' : '?'
      }
      let emoji = '🟠'
      if (item.chanceIntact != null) {
        if (item.chanceIntact <= 5) emoji = '🔴'
        else if (item.chanceIntact <= 15) emoji = '🟡'
      }
      const cI = item.chances['Intact'] != null ? item.chances['Intact'] + '%' : '-'
      const cF = item.chances['Flawless'] != null ? item.chances['Flawless'] + '%' : '-'
      const cR = item.chances['Radiant'] != null ? item.chances['Radiant'] + '%' : '-'
      reply += emoji + ' *' + item.name + '*\n   I:' + cI + '  F:' + cF + '  R:' + cR + '  → *' + priceText + '*\n'
    }
    return reply.trim()
  } catch (err) {
    console.error(err.message)
    return '❌ Erro ao buscar relíquia.'
  }
}

register(/^!relic\s+(.+)/i, async ({ sock, from, match }) => {
  await sock.sendMessage(from, { text: '📦 Buscando relíquia *' + match[1].trim() + '*...' })
  await sock.sendMessage(from, { text: await getRelic(match[1].trim()) })
})

module.exports = { getRelic }
