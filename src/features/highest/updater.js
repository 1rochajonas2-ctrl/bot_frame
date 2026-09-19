const { loadJson, saveJson } = require('../../lib/storage')
const { httpGet } = require('../../lib/http')
const { WFM_HEADERS } = require('../../config/headers')
const {
  HIGHEST_CACHE_FILE, HIGHEST_CATALOG_TTL, HIGHEST_PRICE_TTL,
  HIGHEST_STATS_TTL, HIGHEST_REQUEST_DELAY
} = require('../../config/constants')
const {
  HIGHEST_CATEGORIES, fetchHighestCatalog, classifyHighestItems
} = require('./catalog')

let highestLock = false

function loadHighestCache() {
  const empty = { catalog: null, prices: {}, stats: {}, updated: null }
  const raw = loadJson(HIGHEST_CACHE_FILE, null)
  if (!raw || typeof raw !== 'object') return empty
  if (!raw.prices || typeof raw.prices !== 'object') raw.prices = {}
  if (!raw.stats || typeof raw.stats !== 'object') raw.stats = {}
  if (raw.catalog === undefined) raw.catalog = null
  return raw
}
function saveHighestCache(d) { saveJson(HIGHEST_CACHE_FILE, d) }

async function fetchHighestPrice(slug, rank) {
  try {
    let url = 'https://api.warframe.market/v2/orders/item/' + slug + '/top'
    if (rank !== undefined && rank !== null && rank !== 'max') url += '?rank=' + rank
    const res = await httpGet(url, { timeout: 15000, headers: WFM_HEADERS })
    const sell = (res.data && res.data.data && res.data.data.sell) ? res.data.data.sell : []
    if (!sell.length) return null
    const ingame = sell.filter((o) => o.user && o.user.status === 'ingame')
    const pool = ingame.length ? ingame : sell
    let min = Infinity
    for (const o of pool) if (o.platinum != null && o.platinum < min) min = o.platinum
    return min === Infinity ? null : min
  } catch (e) { return null }
}

async function fetchHighestStats(slug) {
  try {
    const res = await httpGet('https://api.warframe.market/v1/items/' + slug + '/statistics', {
      timeout: 15000, headers: WFM_HEADERS
    })
    const payload = res.data && res.data.payload ? res.data.payload : {}
    const closed = payload.statistics_closed || {}
    let vol48 = 0, vol90 = 0
    for (const r of closed['48hours'] || []) vol48 += (r.volume || 0)
    for (const r of closed['90days'] || []) vol90 += (r.volume || 0)
    return { vol48h: vol48, vol90d: vol90 }
  } catch (e) { return null }
}

async function runHighestUpdater() {
  if (highestLock) { console.log('⏳ Highest já em execução'); return }
  highestLock = true
  console.log('🚀 Highest iniciado')
  try {
    const cache = loadHighestCache()

    const needsCatalog = !cache.catalog || !cache.catalog.classified || !cache.catalog.items ||
      !cache.catalog.items.length ||
      (Date.now() - (cache.catalog.lastUpdate || 0)) > HIGHEST_CATALOG_TTL

    if (needsCatalog) {
      const catalog = await fetchHighestCatalog()
      if (catalog.length) {
        const classified = classifyHighestItems(catalog)
        cache.catalog = { lastUpdate: Date.now(), items: catalog, classified }
        saveHighestCache(cache)
      }
    } else if (cache.catalog && cache.catalog.items && cache.catalog.items.length && !cache.catalog.classified) {
      cache.catalog.classified = classifyHighestItems(cache.catalog.items)
      saveHighestCache(cache)
    }

    if (!cache.catalog || !cache.catalog.classified) { console.log('❌ sem catálogo'); return }

    for (const cat of Object.keys(cache.catalog.classified)) {
      const items = cache.catalog.classified[cat] || []
      if (!items.length) continue

      const priceEntry = cache.prices[cat] || { lastUpdate: 0, items: [] }
      if (priceEntry.items && priceEntry.items.length && (Date.now() - priceEntry.lastUpdate < HIGHEST_PRICE_TTL)) continue

      console.log('🔄 ' + cat + ' (' + items.length + ')...')
      const prices = []
      const catCfg = HIGHEST_CATEGORIES[Object.keys(HIGHEST_CATEGORIES).find((k) => HIGHEST_CATEGORIES[k].id === cat)]
      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        const rank = catCfg && catCfg.rank === 'max' ? item.maxRank : (catCfg ? catCfg.rank : undefined)
        const price = await fetchHighestPrice(item.slug, rank)
        if (price != null) prices.push({ slug: item.slug, name: item.name, price, rank })
        if ((i + 1) % 50 === 0) {
          cache.prices[cat] = { lastUpdate: Date.now(), items: prices.slice().sort((a,b) => b.price - a.price), partial: true }
          saveHighestCache(cache)
        }
        await new Promise((r) => setTimeout(r, HIGHEST_REQUEST_DELAY))
      }
      prices.sort((a, b) => b.price - a.price)
      cache.prices[cat] = { lastUpdate: Date.now(), items: prices, partial: false }
      saveHighestCache(cache)

      for (const item of prices.slice(0, 100)) {
        const s = cache.stats[item.slug]
        if (s && (Date.now() - s.lastUpdate) < HIGHEST_STATS_TTL) continue
        const stats = await fetchHighestStats(item.slug)
        if (stats) cache.stats[item.slug] = { ...stats, lastUpdate: Date.now() }
        await new Promise((r) => setTimeout(r, HIGHEST_REQUEST_DELAY))
      }
      saveHighestCache(cache)
    }
    console.log('✅ Highest completo')
  } catch (e) {
    console.error('Highest updater:', e.message)
  } finally {
    highestLock = false
  }
}

module.exports = { runHighestUpdater, loadHighestCache, saveHighestCache, fetchHighestPrice, fetchHighestStats }
