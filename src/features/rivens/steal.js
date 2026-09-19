const axios = require('axios')
const { loadJson, saveJson } = require('../../lib/storage')
const {
  STEAL_SEEN_FILE, STEAL_MIN_DISCOUNT, STEAL_MIN_MEDIAN
} = require('../../config/constants')
const { getTopWeeklyWeapons, getOfficialRivenMedian } = require('./weekly')
const { searchRivenAuctions } = require('./search')
const { getWeaponMeta, analyzeRivenMeta, formatMetaBlock } = require('./meta')
const { findDisposition, resolveRivenCategory, getConfigKey, gradeOneStat } = require('./disposition')
const { RIVEN_STAT_LABEL } = require('./stats')
const { loadRivenAlerts } = require('./storage')
const { isInCooldown } = require('../../lib/http')
const { sleep } = require('../../lib/sleep')
const { fmtPlat } = require('../../lib/text')

const STEAL_SCAN_WEAPONS_FALLBACK = [
  'torid', 'kuva_bramma', 'kuva_zarr', 'phenmor', 'laetum', 'felarx', 'kuva_heck',
  'burston', 'braton', 'soma', 'tenora', 'acceltra', 'nataruk', 'phantasma',
  'kuva_nukor', 'epitaph', 'tenet_cycron', 'kuva_kohm', 'stahlta', 'trumna'
]

let stealLock = false

function loadStealSeen() {
  const d = loadJson(STEAL_SEEN_FILE, { ids: [], updated: null })
  if (!Array.isArray(d.ids)) d.ids = []
  return d
}
function saveStealSeen(d) { saveJson(STEAL_SEEN_FILE, d) }

function loadStealSubscribers() {
  const jids = {}
  for (const a of loadRivenAlerts().alerts) jids[a.userJid] = true
  return Object.keys(jids)
}

async function formatStealMessage(auction, medianInfo) {
  const item = auction.item || {}
  const weapon = item.weapon_url_name || '?'
  const name = (item.name || '').replace(/-/g, ' ')
  let title = weapon.replace(/_/g, ' ')
  if (name) title += ' ' + name
  title = title.replace(/\b\w/g, (c) => c.toUpperCase())

  const price = auction.buyout_price != null ? auction.buyout_price : auction.starting_price
  const seller = (auction.owner && (auction.owner.ingame_name || auction.owner.slug)) || '?'
  const status = (auction.owner && auction.owner.status) || '?'
  const median = medianInfo && medianInfo.median
  const diff = median && price != null ? Math.round(((price - median) / median) * 100) : null

  let reply = '💎 *RIVEN ROUBADO DETECTADO*\n\n'
  reply += '🔫 *' + title + '*\n'
  reply += '💰 *' + (price != null ? price + 'p' : '?') + '*'
  if (median != null) reply += '  (mediana *' + fmtPlat(median) + '*)'
  if (diff != null) reply += '\n📉 *' + diff + '% abaixo da mediana*'
  reply += '\n👤 ' + seller + ' (' + status + ')\n\n'

  const attrs = item.attributes || []
  const analysis = analyzeRivenMeta(weapon, attrs)
  reply += formatMetaBlock(analysis)

  reply += '*Stats:*\n'
  const disp = findDisposition(weapon)
  const disposition = disp ? disp.disposition : null
  const category = resolveRivenCategory(disp ? disp.type : 'Rifle')
  const configKey = getConfigKey(attrs)
  for (const a of attrs) {
    const sign = a.positive === false ? '' : '+'
    const label = RIVEN_STAT_LABEL[a.url_name] || a.url_name
    let line = '• ' + sign + a.value + ' ' + label
    if (disposition != null) {
      const g = gradeOneStat(a, category, disposition, configKey)
      if (g.grade) {
        const devStr = (g.dev >= 0 ? '+' : '') + g.dev.toFixed(1) + '%'
        line += ' → *' + g.grade + '* (' + devStr + ')'
      }
    }
    reply += line + '\n'
  }
  reply += '\n🔗 https://warframe.market/auction/' + auction.id + '\n'
  reply += '💬 `/w ' + seller + ' hi` — *age rápido*'
  return reply.trim()
}

async function checkRivenSteals(sock) {
  if (stealLock) return
  stealLock = true
  try {
    if (isInCooldown()) return

    const subs = loadStealSubscribers()
    if (!subs.length) return

    const seen = loadStealSeen()
    const seenSet = {}
    for (const id of seen.ids) seenSet[id] = true

    let scanList = STEAL_SCAN_WEAPONS_FALLBACK.slice()
    try {
      const weekTops = await getTopWeeklyWeapons(20, 'price', null)
      if (weekTops && weekTops.length) {
        const merged = []
        const seenW = {}
        for (const wt of weekTops) if (!seenW[wt.weaponKey]) { seenW[wt.weaponKey] = true; merged.push(wt.weaponKey) }
        for (const fk of STEAL_SCAN_WEAPONS_FALLBACK) if (!seenW[fk]) { seenW[fk] = true; merged.push(fk) }
        scanList = merged.slice(0, 10)
      }
    } catch (e) { console.error('steal week tops:', e.message) }

    let found = 0
    for (const weapon of scanList) {
      if (isInCooldown()) break

      const meta = getWeaponMeta(weapon)
      const positiveStats = meta && meta.must_have ? meta.must_have.slice(0, 2) : []
      const auctions = await searchRivenAuctions(weapon, positiveStats)
      console.log('💎 steal scan ' + weapon + ': ' + auctions.length)

      if (isInCooldown()) break

      for (const auction of auctions) {
        if (!auction || !auction.id || seenSet[auction.id]) continue
        if (auction.closed) continue
        if (auction.item && auction.item.type && auction.item.type !== 'riven') continue

        const price = auction.buyout_price != null ? auction.buyout_price : auction.starting_price
        if (price == null || price <= 0) continue

        let off = null
        try { off = await getOfficialRivenMedian(weapon) } catch (e) {}
        if (!off || off.median == null || off.median < STEAL_MIN_MEDIAN) continue

        const ratio = price / off.median
        if (ratio > (1 - STEAL_MIN_DISCOUNT)) continue

        const attrs = (auction.item && auction.item.attributes) || []
        const analysis = analyzeRivenMeta(weapon, attrs)
        if (analysis.hasMeta && analysis.mustHaveHit < analysis.mustHaveTotal) continue
        if (analysis.hasMeta && (analysis.label === 'MEH' || analysis.label === 'PARCIAL')) continue

        seenSet[auction.id] = true
        seen.ids.push(auction.id)
        found++

        const msg = await formatStealMessage(auction, off)
        for (const s of subs) {
          try { await sock.sendMessage(s, { text: msg }) }
          catch (e) { console.error('steal send:', e.message) }
        }
      }
      await sleep(2500)
    }

    if (seen.ids.length > 200) seen.ids = seen.ids.slice(-200)
    seen.updated = new Date().toISOString()
    saveStealSeen(seen)
    console.log('💎 Steal detector: ' + found + ' roubado(s)')
  } catch (e) {
    console.error('Steal detector:', e.message)
  } finally {
    stealLock = false
  }
}

module.exports = { checkRivenSteals }
