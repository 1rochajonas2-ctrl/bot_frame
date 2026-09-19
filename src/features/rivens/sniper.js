const { loadRivenAlerts, saveRivenAlerts } = require('./storage')
const { searchRivenAuctions, searchRivenAuctionsBroad } = require('./search')
const { getWeaponMeta, analyzeRivenMeta, formatMetaBlock } = require('./meta')
const {
  findDisposition, resolveRivenCategory, getConfigKey, gradeOneStat, gradeRank
} = require('./disposition')
const { RIVEN_STAT_LABEL } = require('./stats')
const { getOfficialRivenMedian } = require('./weekly')
const { hasSeenRiven, markSeenRiven } = require('./seen')
const { sleep } = require('../../lib/sleep')
const { fmtPlat } = require('../../lib/text')

function rivenMatchesAlert(auction, alert) {
  if (!auction || !auction.item) return false
  if (auction.closed) return false
  if (auction.item.type && auction.item.type !== 'riven') return false

  const weapon = (auction.item.weapon_url_name || '').toLowerCase()
  if (weapon !== alert.weapon) return false

  const price = auction.buyout_price != null ? auction.buyout_price : auction.starting_price
  if (alert.maxPrice != null && price != null && price > alert.maxPrice) return false

  const attrs = auction.item.attributes || []
  const positiveNames = {}
  for (const a of attrs) if (a.positive !== false) positiveNames[a.url_name] = true

  for (const s of alert.stats || []) if (!positiveNames[s]) return false

  let posCount = 0, negCount = 0
  for (const a of attrs) { if (a.positive === false) negCount++; else posCount++ }
  const minPos = alert.minPositives != null ? alert.minPositives : 2
  const maxPos = alert.maxPositives != null ? alert.maxPositives : 3
  if (posCount < minPos || posCount > maxPos) return false

  if (alert.useMeta) {
    const analysis = analyzeRivenMeta(weapon, attrs)
    if (!analysis.hasMeta) return false
    if (analysis.mustHaveHit < analysis.mustHaveTotal) return false
    if (analysis.label === 'MEH' || analysis.label === 'PARCIAL') return false
  }

  if (alert.minGrade) {
    const disp = findDisposition(weapon)
    if (!disp || disp.disposition == null) return false
    const category = resolveRivenCategory(disp.type)
    const configKey = getConfigKey(attrs)
    let best = -1
    for (const a of attrs) {
      if (a.positive === false) continue
      const g = gradeOneStat(a, category, disp.disposition, configKey)
      if (g.grade) best = Math.max(best, gradeRank(g.grade))
    }
    if (best < gradeRank(alert.minGrade)) return false
  }
  return true
}

async function formatRivenAuctionMessage(auction, alert) {
  const item = auction.item || {}
  const weapon = item.weapon_url_name || alert.weapon
  const name = (item.name || '').replace(/-/g, ' ')
  let title = weapon.replace(/_/g, ' ')
  if (name) title += ' ' + name
  title = title.replace(/\b\w/g, (c) => c.toUpperCase())

  const price = auction.buyout_price != null ? auction.buyout_price : auction.starting_price
  const seller = (auction.owner && (auction.owner.ingame_name || auction.owner.slug)) || '?'
  const status = (auction.owner && auction.owner.status) || '?'
  const direct = auction.is_direct_sell ? 'Direct' : 'Auction'

  let reply = '🚨 *ALERTA DE RIVEN*\n\n'
  reply += '🔫 *' + title + '*\n'
  reply += '💰 *' + (price != null ? price + 'p' : '?') + '* | ' + direct + '\n'
  reply += '👤 ' + seller + ' (' + status + ')\n'

  try {
    const off = await getOfficialRivenMedian(weapon)
    if (off && off.median != null) {
      reply += '📊 Mediana oficial: *' + fmtPlat(off.median) + '*'
      reply += off.rerolled ? ' (rolled)' : ' (unrolled)'
      reply += '\n'
      if (price != null && off.median > 0) {
        const diff = Math.round(((price - off.median) / off.median) * 100)
        if (diff <= -15) reply += '🔥 *Abaixo da mediana (' + diff + '%)*\n'
        else if (diff >= 30) reply += '⚠️ Acima da mediana (+' + diff + '%)\n'
      }
    }
  } catch (e) {}

  reply += '\n*Stats:*\n'
  const attrs = item.attributes || []
  const disp = findDisposition(weapon)
  const disposition = disp ? disp.disposition : null
  const category = resolveRivenCategory(disp ? disp.type : 'Rifle')
  const configKey = getConfigKey(attrs)
  if (disposition != null) reply += '_' + configKey + ' · dispo ' + disposition + '_\n'

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
  reply += '\n'

  try {
    const analysis = analyzeRivenMeta(weapon, attrs)
    reply += formatMetaBlock(analysis)
  } catch (e) {}

  reply += '\n🔗 https://warframe.market/auction/' + auction.id + '\n'
  reply += '💬 `/w ' + seller + ' hi`\n'
  return reply.trim()
}

async function checkRivenAlerts(sock) {
  const store = loadRivenAlerts()
  console.log('🔫 checkRivenAlerts: ' + store.alerts.length + ' alerta(s)')
  if (!store.alerts.length) return

  const byWeapon = {}
  for (const a of store.alerts) {
    const wKey = String(a.weapon || '').toLowerCase()
    if (!byWeapon[wKey]) byWeapon[wKey] = []
    byWeapon[wKey].push(a)
  }

  let changed = false
  for (const weapon of Object.keys(byWeapon)) {
    const alerts = byWeapon[weapon]
    const statsForSearch = []
    const seenStat = {}
    for (const a of alerts) for (const s of a.stats || []) {
      if (!seenStat[s]) { seenStat[s] = true; statsForSearch.push(s) }
    }
    const anyMeta = alerts.some((a) => a.useMeta || a.source === 'week')
    const auctions = anyMeta
      ? await searchRivenAuctionsBroad(weapon, statsForSearch)
      : await searchRivenAuctions(weapon, statsForSearch)
    console.log('🔫 "' + weapon + '": ' + auctions.length + (anyMeta ? ' [broad]' : ''))

    for (const alert of alerts) {
      if (!Array.isArray(alert.notified)) alert.notified = []
      const candidates = []

      for (const auction of auctions) {
        if (!auction || !auction.id) continue
        const aid = String(auction.id)
        if (!rivenMatchesAlert(auction, alert)) continue
        if (alert.notified.indexOf(aid) !== -1) continue
        if (hasSeenRiven(alert.userJid, aid)) {
          alert.notified.push(aid); changed = true; continue
        }

        const createdMs = auction.created ? new Date(auction.created).getTime() : 0
        const alertMs = alert.createdAt ? new Date(alert.createdAt).getTime() : 0
        if (createdMs && alertMs && createdMs < alertMs) {
          alert.notified.push(aid); markSeenRiven(alert.userJid, aid)
          changed = true; continue
        }
        candidates.push(auction)
      }

      candidates.sort((a, b) => new Date(b.created || 0) - new Date(a.created || 0))
      if (!candidates.length) continue

      const top = candidates[0]
      const topId = String(top.id)
      if (hasSeenRiven(alert.userJid, topId) || alert.notified.indexOf(topId) !== -1) {
        for (const c of candidates) {
          const cid = String(c.id)
          if (alert.notified.indexOf(cid) === -1) alert.notified.push(cid)
          markSeenRiven(alert.userJid, cid)
        }
        changed = true
        continue
      }
      try {
        const msg = await formatRivenAuctionMessage(top, alert)
        await sock.sendMessage(alert.userJid, { text: msg })
        alert.notified.push(topId)
        markSeenRiven(alert.userJid, topId)
        for (let k = 1; k < candidates.length; k++) {
          const cid = String(candidates[k].id)
          if (alert.notified.indexOf(cid) === -1) alert.notified.push(cid)
          markSeenRiven(alert.userJid, cid)
        }
        if (alert.notified.length > 80) alert.notified = alert.notified.slice(-80)
        changed = true
        saveRivenAlerts(store)
      } catch (e) { console.error('Erro envio riven:', e.message) }
    }
    await sleep(400)
  }
  if (changed) saveRivenAlerts(store)
}

module.exports = { checkRivenAlerts, rivenMatchesAlert, formatRivenAuctionMessage }
