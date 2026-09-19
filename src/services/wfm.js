const { httpGet } = require('../lib/http')
const { headers } = require('../config/headers')
const { toSlug } = require('../lib/text')

async function getItemInfo(slug) {
  try {
    const res = await httpGet('https://api.warframe.market/v2/item/' + slug, { headers })
    return res.data && res.data.data ? res.data.data : null
  } catch (e) { return null }
}

async function resolveItem(itemName) {
  const base = toSlug(itemName)
  const candidates = [base]
  if (base.indexOf('blueprint') === -1) candidates.push(base + '_blueprint')
  if (base.endsWith('_blueprint')) candidates.push(base.replace(/_blueprint$/, ''))
  const seen = {}, unique = []
  for (const c of candidates) if (!seen[c]) { seen[c] = true; unique.push(c) }
  for (const u of unique) {
    const item = await getItemInfo(u)
    if (item) return { item, slug: u }
  }
  return null
}

async function resolveItemSmart(raw) {
  if (!raw) return null
  const tries = [String(raw).trim()]
  const base = tries[0]
  tries.push(base.replace(/\bprined\b/gi, 'primed'))
  tries.push(base.replace(/\bprime\b/gi, 'primed'))
  tries.push(base.replace(/\bprimed\b/gi, 'prime'))
  if (!/\s/.test(base) && /flow|continuity|pressure|reach|fury|chamber/i.test(base)) {
    tries.push('primed ' + base)
  }
  const seen = {}
  for (const t of tries) {
    const key = t.toLowerCase()
    if (!t || seen[key]) continue
    seen[key] = true
    try { const r = await resolveItem(t); if (r) return r } catch (e) {}
  }
  return null
}

async function getTopOrders(slug, rank) {
  try {
    let url = 'https://api.warframe.market/v2/orders/item/' + slug + '/top'
    if (rank !== undefined && rank !== null) url += '?rank=' + rank
    const res = await httpGet(url, { headers })
    const sell = (res.data && res.data.data && res.data.data.sell) ? res.data.data.sell : []
    const buy = (res.data && res.data.data && res.data.data.buy) ? res.data.data.buy : []
    return { sell, buy }
  } catch (e) { return { sell: [], buy: [] } }
}

function calcStatsFromOrders(orders) {
  const prices = (orders || []).map((o) => o.platinum).filter((p) => p > 0)
  if (!prices.length) return null
  const sum = prices.reduce((a, b) => a + b, 0)
  return {
    avg: (sum / prices.length).toFixed(1),
    min: Math.min(...prices),
    max: Math.max(...prices),
    count: prices.length
  }
}

function cheapestSell(orders) {
  const sells = (orders || []).filter((o) => {
    if (!(o.platinum > 0)) return false
    const status = (o.user && o.user.status) ? o.user.status : ''
    return status === 'ingame'
  })
  if (!sells.length) return null
  sells.sort((a, b) => a.platinum - b.platinum)
  return sells[0]
}

module.exports = {
  getItemInfo, resolveItem, resolveItemSmart,
  getTopOrders, calcStatsFromOrders, cheapestSell
}
