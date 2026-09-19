const { loadRivenAlerts, saveRivenAlerts } = require('./storage')
const { getWeaponMeta } = require('./meta')
const { RIVEN_STAT_LABEL, resolveRivenStat } = require('./stats')
const { getTopWeeklyWeapons } = require('./weekly')
const {
  canUseRivenSnipe, countUserRivenAlerts, getRivenAlertLimit, configHasUser
} = require('../admin/auth')

function parseRivenAlertArgs(raw) {
  const parts = String(raw || '').trim().split(/\s+/).filter(Boolean)
  if (parts.length < 1) return null

  const weapon = parts[0].toLowerCase().replace(/\s+/g, '_')
  let stats = []
  let maxPrice = null
  let useMeta = false
  let minGrade = null
  let minPositives = 2
  let maxPositives = 3

  for (let i = 1; i < parts.length; i++) {
    const p = parts[i].toLowerCase()
    if (p === 'meta' || p === 'god' || p === 'godroll') { useMeta = true; continue }
    if (p === '3p' || p === '3p1n' || p === 'three') { minPositives = 3; maxPositives = 3; continue }
    if (p === '2p' || p === '2p1n') { minPositives = 2; maxPositives = 2; continue }
    if (p === 'grade' || p === 'mingrade') {
      const g = String(parts[i + 1] || '').toUpperCase()
      if (/^(S|\+A|A|-A|\+B|B)$/.test(g)) { minGrade = g; i++ }
      continue
    }
    if (p === 's' && parts.length > 2) { minGrade = 'S'; continue }
    if (p === 'max') {
      const n = parseInt(parts[i + 1], 10)
      if (!isNaN(n)) { maxPrice = n; i++ }
      continue
    }
    if (/^\d+$/.test(p) && i === parts.length - 1) { maxPrice = parseInt(p, 10); continue }
    const url = resolveRivenStat(p)
    if (url) { if (stats.indexOf(url) === -1) stats.push(url) }
    else return { error: 'Stat desconhecido: *' + p + '*\nEx: ms fr cc cd sc dmg | meta | grade S' }
  }

  if (useMeta && !stats.length) {
    const meta = getWeaponMeta(weapon)
    if (meta && meta.must_have && meta.must_have.length) stats = meta.must_have.slice()
  }

  if (!stats.length && !useMeta) {
    return { error: 'Informe stats ou use *meta*.\nEx: !alertariven torid ms cd max 2000' }
  }

  return { weapon, stats, maxPrice, useMeta, minGrade, minPositives, maxPositives }
}

function createRivenAlert(userJid, rawArgs, isAdmFlag) {
  const parsed = parseRivenAlertArgs(rawArgs)
  if (!parsed) {
    return (
      '❌ *Como usar:*\n' +
      '!alertariven <arma> <stats...> [meta] [grade S|+A] [max N] [2p|3p]\n\n' +
      'Ex:\n• !alertariven kohm ms fr max 500\n• !alertariven torid meta max 2500'
    )
  }
  if (parsed.error) return '❌ ' + parsed.error

  const adm = isAdmFlag === true
  if (!canUseRivenSnipe(userJid, adm)) return '❌ Snipe desativado pelo admin.'
  const cur = countUserRivenAlerts(userJid)
  const lim = getRivenAlertLimit(userJid, adm)
  if (!adm && cur >= lim) {
    return '❌ Limite: *' + lim + '*. Você tem ' + cur + '.\nUse `!delalertariven all`.'
  }

  const store = loadRivenAlerts()
  const id = store.nextId++
  const statLabels = (parsed.stats || []).map((s) => RIVEN_STAT_LABEL[s] || s)

  store.alerts.push({
    id, userJid,
    weapon: parsed.weapon,
    stats: parsed.stats || [],
    maxPrice: parsed.maxPrice,
    useMeta: !!parsed.useMeta,
    minGrade: parsed.minGrade || null,
    minPositives: parsed.minPositives != null
      ? parsed.minPositives
      : ((parsed.stats || []).length >= 3 ? 3 : 2),
    maxPositives: parsed.maxPositives != null ? parsed.maxPositives : 3,
    createdAt: new Date().toISOString(),
    notified: []
  })
  saveRivenAlerts(store)

  let reply = '🎯 *RIVEN SNIPER ATIVADO*\n\n'
  reply += 'Arma: ' + parsed.weapon + '\n'
  if (statLabels.length) reply += 'Stats: ' + statLabels.join(', ') + '\n'
  if (parsed.useMeta) reply += 'Filtro: META / GOD ROLL\n'
  if (parsed.minGrade) reply += 'Grade mín: ' + parsed.minGrade + '\n'
  if (parsed.maxPrice != null) reply += 'Máx: ' + parsed.maxPrice + 'p\n'
  const posLabel = parsed.maxPositives === 2 ? 'somente 2P'
    : (parsed.minPositives === 3 || (parsed.stats || []).length >= 3) ? '3P' : '2P ou 3P'
  reply += 'Positivos: ' + posLabel + '\n\n'
  reply += 'ID: #' + id + '\nSó anúncios novos. Checks a cada ~4 min.'
  return reply
}

function listRivenAlerts(userJid) {
  const store = loadRivenAlerts()
  const mine = store.alerts.filter(
    (a) => a.userJid === userJid || configHasUser([a.userJid], userJid)
  )
  if (!mine.length) return '🔔 Sem alertas.\nCrie: !alertariven torid meta max 2500'
  let reply = '🎯 *SEUS RIVEN SNIPERS*\n\n'
  for (const a of mine) {
    const labels = (a.stats || []).map((s) => RIVEN_STAT_LABEL[s] || s)
    reply += '#' + a.id + ' *' + (a.weekDisplay || a.weapon) + '*'
    if (labels.length) reply += ' | ' + labels.join(', ')
    if (a.useMeta) reply += ' | META'
    if (a.minGrade) reply += ' | grade≥' + a.minGrade
    if (a.maxPrice != null) reply += ' | max ' + a.maxPrice + 'p'
    if (a.source === 'week') reply += ' | 📅semana'
    reply += '\n'
  }
  return reply.trim()
}

function deleteRivenAlert(userJid, arg) {
  const store = loadRivenAlerts()
  if (/^all$/i.test(arg)) {
    const before = store.alerts.length
    store.alerts = store.alerts.filter(
      (a) => !(a.userJid === userJid || configHasUser([a.userJid], userJid))
    )
    const removed = before - store.alerts.length
    saveRivenAlerts(store)
    return removed ? '🔕 ' + removed + ' removido(s).' : 'Você não tinha alertas.'
  }
  const id = parseInt(arg, 10)
  if (!id) return '❌ Use: !delalertariven 1  ou  !delalertariven all'
  const idx = store.alerts.findIndex((a) => a.id === id && a.userJid === userJid)
  if (idx === -1) return '❌ Alerta #' + id + ' não encontrado.'
  store.alerts.splice(idx, 1)
  saveRivenAlerts(store)
  return '🔕 Alerta *#' + id + '* removido.'
}

async function createWeekSnipers(userJid, rawArgs, isAdmFlag) {
  const args = String(rawArgs || '').trim().toLowerCase().split(/\s+/).filter(Boolean)

  if (['clear', 'limpar', 'off'].includes(args[0])) {
    const store = loadRivenAlerts()
    const before = store.alerts.length
    store.alerts = store.alerts.filter(
      (a) => !((a.userJid === userJid || configHasUser([a.userJid], userJid)) && a.source === 'week')
    )
    const removed = before - store.alerts.length
    saveRivenAlerts(store)
    return removed ? '✅ Removidos *' + removed + '* sniper(s) da semana.' : 'Você não tinha snipers.'
  }

  const adm = isAdmFlag === true
  if (!canUseRivenSnipe(userJid, adm)) return '❌ Snipe desativado.'
  const cur = countUserRivenAlerts(userJid)
  const lim = getRivenAlertLimit(userJid, adm)
  const room = adm ? 999 : (lim === Infinity ? 999 : Math.max(0, lim - cur))
  if (!adm && room <= 0) return '❌ Limite: *' + lim + '*. Apague alguns.'

  let limit = 10, sortBy = 'price', mult = 10, maxPctOfMax = 60
  let noMax = false, rolled = null, priceMode = 'auto'

  for (let i = 0; i < args.length; i++) {
    const a = args[i]
    if (/^\d+$/.test(a)) limit = Math.min(30, Math.max(1, parseInt(a, 10)))
    else if (a === 'pop' || a === 'popular') sortBy = 'pop'
    else if (a === 'price' || a === 'preco' || a === 'preço') sortBy = 'price'
    else if (a === 'rolled') rolled = true
    else if (a === 'unrolled') rolled = false
    else if (a === 'nomax' || a === 'semmax' || a === 'nolimit') { noMax = true; priceMode = 'nomax' }
    else if (a === 'mult' || a === 'x' || a === 'vezes') {
      const n = parseFloat(args[i + 1])
      if (!isNaN(n) && n >= 1 && n <= 50) { mult = n; priceMode = 'mult'; i++ }
    }
    else if (a === 'maxpct' || a === 'pct') {
      const n = parseInt(args[i + 1], 10)
      if (!isNaN(n) && n > 5 && n <= 100) { maxPctOfMax = n; priceMode = 'maxpct'; i++ }
    }
  }

  if (limit > room) limit = room

  let tops
  try { tops = await getTopWeeklyWeapons(limit, sortBy, rolled) }
  catch (e) { return '❌ Não foi possível carregar rivens semanais.' }
  if (!tops.length) return '❌ Nenhuma arma no ranking semanal.'

  const store = loadRivenAlerts()
  store.alerts = store.alerts.filter((a) => !(a.userJid === userJid && a.source === 'week'))

  const created = []
  let skippedNoMeta = 0
  for (const t of tops) {
    const meta = getWeaponMeta(t.weaponKey)
    const stats = meta && meta.must_have && meta.must_have.length ? meta.must_have.slice() : []
    if (!stats.length) { skippedNoMeta++; continue }

    let maxPrice = null
    if (!noMax && priceMode !== 'nomax') {
      const med = t.median != null && t.median > 0 ? Number(t.median) : null
      const mx = t.max != null && t.max > 0 ? Number(t.max) : null
      if (priceMode === 'mult' && med) maxPrice = Math.round(med * mult)
      else if (priceMode === 'maxpct' && mx) maxPrice = Math.round(mx * (maxPctOfMax / 100))
      else {
        const fromMed = med ? Math.round(med * mult) : 0
        const fromMax = mx ? Math.round(mx * (maxPctOfMax / 100)) : 0
        maxPrice = Math.max(fromMed, fromMax) || null
      }
      if (maxPrice != null && maxPrice < 200) maxPrice = 200
    }

    const id = store.nextId++
    store.alerts.push({
      id, userJid,
      weapon: t.weaponKey, stats, maxPrice,
      useMeta: true, minGrade: null,
      minPositives: 2, maxPositives: 3,
      source: 'week',
      weekDisplay: t.display, weekMedian: t.median, weekMax: t.max,
      createdAt: new Date().toISOString(),
      notified: []
    })
    created.push({ id, display: t.display, maxPrice, median: t.median, max: t.max, hasMeta: true })
  }
  saveRivenAlerts(store)

  let reply = '🎯 *SNIPE WEEK ATIVADO*\n'
  reply += '_Top ' + created.length + ' da semana (DE) — por ' +
    (sortBy === 'pop' ? 'popularidade' : 'preço max') + '_\n'
  if (noMax) reply += 'Max: *sem limite*\n\n'
  else if (priceMode === 'mult') reply += 'Max: *' + mult + '×* mediana\n\n'
  else if (priceMode === 'maxpct') reply += 'Max: *' + maxPctOfMax + '%* do max\n\n'
  else reply += 'Max: auto = maior entre *' + mult + '× med* e *' + maxPctOfMax + '% do max*\n\n'

  for (const c of created) {
    reply += '#' + c.id + ' *' + c.display + '*'
    reply += c.maxPrice != null ? ' ≤' + c.maxPrice + 'p' : ' ≤∞'
    if (c.median != null) reply += ' (med ' + Math.round(c.median) + 'p'
    if (c.max != null) reply += ' / max ' + Math.round(c.max) + 'p)'
    else if (c.median != null) reply += ')'
    if (c.hasMeta) reply += ' · META'
    reply += '\n'
  }
  if (skippedNoMeta) reply += '\n_(' + skippedNoMeta + ' arma(s) sem meta ignoradas)_\n'
  reply += '\n❌ `!snipeweek clear` remove todos'
  return reply.trim()
}

module.exports = {
  parseRivenAlertArgs, createRivenAlert, listRivenAlerts,
  deleteRivenAlert, createWeekSnipers
}
