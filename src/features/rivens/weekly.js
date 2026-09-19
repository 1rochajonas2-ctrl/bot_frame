const fs = require('fs')
const axios = require('axios')
const {
  WEEKLY_RIVENS_FILE, WEEKLY_RIVENS_URL, WEEKLY_RIVENS_TTL
} = require('../../config/constants')
const { normWeaponKeyLoose, fmtPlat } = require('../../lib/text')

function parseWeeklyRivensText(raw) {
  try { return JSON.parse(raw) }
  catch (e) {
    try { return eval('(' + raw + ')') }
    catch (e2) {
      console.error('Parse weekly rivens:', e2.message)
      return []
    }
  }
}

async function ensureWeeklyRivens() {
  try {
    if (fs.existsSync(WEEKLY_RIVENS_FILE)) {
      const st = fs.statSync(WEEKLY_RIVENS_FILE)
      if (Date.now() - st.mtimeMs < WEEKLY_RIVENS_TTL) {
        const cached = parseWeeklyRivensText(fs.readFileSync(WEEKLY_RIVENS_FILE, 'utf8'))
        if (Array.isArray(cached) && cached.length) return cached
      }
    }
  } catch (e) {}

  const res = await axios.get(WEEKLY_RIVENS_URL, {
    timeout: 30000, responseType: 'text',
    transformResponse: [(d) => d],
    headers: { 'User-Agent': 'Mozilla/5.0', Accept: '*/*' }
  })
  const text = typeof res.data === 'string' ? res.data : String(res.data)
  const data = parseWeeklyRivensText(text)
  if (!Array.isArray(data) || !data.length) throw new Error('weekly rivens vazio')
  fs.writeFileSync(WEEKLY_RIVENS_FILE, text)
  return data
}

function findWeeklyRivenEntries(list, weaponQuery) {
  const q = normWeaponKeyLoose(weaponQuery)
  if (!q) return []
  const exact = [], soft = []
  for (const row of list) {
    const name = row.compatibility
    if (!name) continue
    const key = normWeaponKeyLoose(name)
    if (key === q) exact.push(row)
    else if (key.indexOf(q) !== -1 || q.indexOf(key) !== -1) soft.push(row)
  }
  return exact.length ? exact : soft
}

function formatWeeklySide(row, title) {
  if (!row) return '• *' + title + ':* sem dados na semana\n'
  let lines = '• *' + title + '*\n'
  lines += '  Média: *' + fmtPlat(row.avg) + '*'
  if (row.median != null) lines += ' | Mediana: *' + fmtPlat(row.median) + '*'
  lines += '\n'
  lines += '  Min–Max: ' + fmtPlat(row.min) + ' – ' + fmtPlat(row.max) + '\n'
  if (row.stddev != null) lines += '  Desvio: ' + fmtPlat(row.stddev) + '\n'
  if (row.pop != null) lines += '  Pop: ' + row.pop + '\n'
  return lines
}

async function getOfficialRivenMedian(weapon) {
  try {
    const list = await ensureWeeklyRivens()
    const hits = findWeeklyRivenEntries(list, weapon)
    if (!hits.length) return null
    let rolled = null, unrolled = null
    for (const h of hits) {
      if (h.rerolled) rolled = h
      else unrolled = h
    }
    const row = rolled || unrolled
    if (!row) return null
    return {
      median: row.median != null ? row.median : row.avg,
      avg: row.avg, min: row.min, max: row.max,
      rerolled: !!row.rerolled, name: row.compatibility
    }
  } catch (e) { return null }
}

async function getTopWeeklyWeapons(limit, sortBy, rolled) {
  const list = await ensureWeeklyRivens()
  if (!list.length) return []

  let filtered = list
  if (rolled === true) filtered = list.filter((r) => r.rerolled === true)
  if (rolled === false) filtered = list.filter((r) => r.rerolled === false)

  const sortField = sortBy === 'pop' ? 'pop' : 'max'
  filtered = filtered.slice().sort((a, b) => (b[sortField] || 0) - (a[sortField] || 0))

  const seen = {}
  const out = []
  for (const r of filtered) {
    if (out.length >= limit) break
    const display = r.compatibility || '?'
    const key = require('../../lib/text').normalizeWeaponKey(display)
    if (!key || seen[key]) continue
    seen[key] = true
    out.push({
      weaponKey: key, display,
      max: r.max, median: r.median, avg: r.avg,
      pop: r.pop, rerolled: r.rerolled
    })
  }
  return out
}

async function getTopRivensMessage(limit = 10, rolled = null, sortBy = 'price') {
  try {
    const list = await ensureWeeklyRivens()
    if (!list.length) return '❌ Dados semanais indisponíveis.'

    let filtered = list
    if (rolled === true) filtered = list.filter((r) => r.rerolled === true)
    if (rolled === false) filtered = list.filter((r) => r.rerolled === false)

    const sortField = sortBy === 'pop' ? 'pop' : 'max'
    filtered.sort((a, b) => (b[sortField] || 0) - (a[sortField] || 0))

    const top = filtered.slice(0, limit)
    const modeLabel = sortBy === 'pop' ? '🔥 *MAIS POPULARES*' : '💰 *MAIORES PREÇOS*'

    let reply = `🏆 ${modeLabel} — RIVENS DA SEMANA (PC)\n`
    reply += rolled === true ? '_(Rolled)_\n' :
             rolled === false ? '_(Unrolled)_\n' : '_(Rolled + Unrolled)_\n'
    reply += '\n'

    top.forEach((r, i) => {
      const weapon = (r.compatibility || '?').replace(/\b\w/g, (c) => c.toUpperCase())
      const max = fmtPlat(r.max)
      const avg = fmtPlat(r.avg)
      const med = r.median != null ? fmtPlat(r.median) : '—'
      const pop = r.pop != null ? r.pop.toLocaleString('pt-BR') : '—'
      const rolledTag = r.rerolled ? '🔁 Rolled' : '📦 Unrolled'

      if (sortBy === 'pop') {
        reply += `${i + 1}. *${weapon}* — 🔥 ${pop} vendas\n`
        reply += `   ${rolledTag} | Max: ${max} | Média: ${avg} | Mediana: ${med}\n`
      } else {
        reply += `${i + 1}. *${weapon}* — 💰 ${max}\n`
        reply += `   ${rolledTag} | Mediana: ${med} | Média: ${avg} | Pop: ${pop} vendas\n`
      }
    })

    reply += '\n💡 `!rivendb top 20` · `!rivendb pop` · `!rivendb rolled`'
    reply += '\n🎯 `!snipeweek` — sniper nas top armas da semana'
    return reply.trim()
  } catch (e) {
    console.error('!rivendb:', e.message)
    return '❌ Erro ao buscar ranking de rivens.'
  }
}

module.exports = {
  parseWeeklyRivensText, ensureWeeklyRivens,
  findWeeklyRivenEntries, formatWeeklySide,
  getOfficialRivenMedian, getTopWeeklyWeapons, getTopRivensMessage
}
