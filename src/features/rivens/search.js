const { httpGet, isInCooldown } = require('../../lib/http')
const { sleep } = require('../../lib/sleep')
const { RIVEN_AUCTIONS_URL } = require('../../config/constants')

async function searchRivenAuctions(weapon, positiveStats, opts = {}) {
  if (isInCooldown()) {
    // deixa o httpGet esperar sozinho
  }
  try {
    const params = {
      type: 'riven',
      weapon_url_name: String(weapon || '').toLowerCase(),
      sort_by: opts.sortBy || 'price_asc'
    }
    if (positiveStats && positiveStats.length) {
      params.positive_stats = positiveStats.join(',')
    }
    const res = await httpGet(RIVEN_AUCTIONS_URL, {
      headers: {
        Platform: 'pc',
        Language: 'en',
        Accept: 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Origin: 'https://warframe.market',
        Referer: 'https://warframe.market/auctions',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      params
    })
    return (res.data && res.data.payload && res.data.payload.auctions) || []
  } catch (e) {
    console.error('searchRivenAuctions:', e.response ? e.response.status : e.message)
    return []
  }
}

async function searchRivenAuctionsBroad(weapon, positiveStats) {
  const seen = {}
  const out = []
  const add = (list) => {
    for (const a of list || []) {
      if (!a || !a.id || seen[a.id]) continue
      seen[a.id] = true
      out.push(a)
    }
  }

  if (isInCooldown()) return []

  add(await searchRivenAuctions(weapon, positiveStats, { sortBy: 'price_asc' }))
  if (isInCooldown()) return out

  if (positiveStats && positiveStats.length >= 2) {
    await sleep(800)
    if (isInCooldown()) return out
    add(await searchRivenAuctions(weapon, [positiveStats[0]], { sortBy: 'price_asc' }))

    if (isInCooldown()) return out
    try {
      await sleep(800)
      if (isInCooldown()) return out
      add(await searchRivenAuctions(weapon, positiveStats, { sortBy: 'created' }))
    } catch (e) {}
  }
  return out
}

module.exports = { searchRivenAuctions, searchRivenAuctionsBroad }
