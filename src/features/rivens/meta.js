const fs = require('fs')
const { RIVEN_META_FILE } = require('../../config/constants')
const { normalizeWeaponKey } = require('../../lib/text')

let cache = null

function loadRivenMeta() {
  if (cache) return cache
  try {
    cache = JSON.parse(fs.readFileSync(RIVEN_META_FILE, 'utf8'))
  } catch (e) {
    console.error('riven_meta.json:', e.message)
    cache = {}
  }
  return cache
}

function getWeaponMeta(weaponUrlName) {
  const meta = loadRivenMeta()
  const key = normalizeWeaponKey(weaponUrlName)
  if (meta[key]) return meta[key]
  const stripped = key.replace(/^(kuva_|tenet_|prime_)/, '')
  if (stripped !== key && meta[stripped]) return meta[stripped]
  const keys = Object.keys(meta)
  for (const k of keys) {
    if (k === key || k.endsWith('_' + key) || key.endsWith('_' + k)) return meta[k]
  }
  return null
}

function analyzeRivenMeta(weaponUrlName, attrs) {
  const meta = getWeaponMeta(weaponUrlName)
  if (!meta) {
    return {
      hasMeta: false, label: null,
      mustHaveHit: 0, mustHaveTotal: 0,
      priorityHit: 0, priorityTotal: 0,
      score: 0, mustHave: [], priority: [],
      raw: null, display: weaponUrlName
    }
  }

  const positive = {}
  for (const a of attrs || []) {
    if (a.positive !== false) positive[a.url_name] = true
  }

  const must = meta.must_have || []
  const prio = meta.priority || []
  let mustHit = 0
  for (const m of must) if (positive[m]) mustHit++
  let prioHit = 0
  for (const p of prio) if (positive[p]) prioHit++

  let score = 0
  if (must.length) score += (mustHit / must.length) * 60
  prio.forEach((p, j) => { if (positive[p]) score += Math.max(2, 12 - j * 1.5) })

  let label = 'MEH'
  if (mustHit === must.length && must.length > 0) {
    if (prioHit >= 3 || score >= 85) label = 'GOD ROLL'
    else if (prioHit >= 2 || score >= 70) label = 'META'
    else label = 'BOM'
  } else if (mustHit > 0) {
    label = 'PARCIAL'
  }

  return {
    hasMeta: true, label,
    mustHaveHit: mustHit, mustHaveTotal: must.length,
    priorityHit: prioHit, priorityTotal: prio.length,
    score: Math.round(score),
    mustHave: must, priority: prio,
    raw: meta.raw_text || null,
    display: meta.display || weaponUrlName
  }
}

function formatMetaBlock(analysis) {
  const { RIVEN_STAT_LABEL } = require('./stats')
  if (!analysis || !analysis.hasMeta) return '_Sem meta cadastrada para esta arma._\n'
  let reply = '🎯 *Análise Meta (' + analysis.display + ')*\n'
  reply += '*' + analysis.label + '*  ·  score ' + analysis.score + '\n'
  reply += 'Must-have: *' + analysis.mustHaveHit + '/' + analysis.mustHaveTotal + '*'
  if (analysis.mustHaveTotal) {
    const mh = analysis.mustHave.map((s) => RIVEN_STAT_LABEL[s] || s).join(', ')
    reply += '  (' + mh + ')'
  }
  reply += '\n'
  reply += 'Priority: *' + analysis.priorityHit + '/' + Math.min(analysis.priorityTotal, 5) + '*'
  if (analysis.priority && analysis.priority.length) {
    const top = analysis.priority.slice(0, 5).map((s) => RIVEN_STAT_LABEL[s] || s).join(' › ')
    reply += '\n  ' + top
  }
  reply += '\n'
  if (analysis.raw) reply += 'Formato: `' + analysis.raw + '`\n'
  return reply
}

function getMetaMessage(weaponName) {
  const { RIVEN_STAT_LABEL } = require('./stats')
  if (!weaponName || !String(weaponName).trim()) {
    return (
      '❌ *Como usar:*\n!meta <arma>\n!grol <arma>\n\n' +
      'Ex: !meta torid\n!grol burston\n!meta kuva kohm'
    )
  }
  const key = normalizeWeaponKey(weaponName)
  const meta = getWeaponMeta(key)
  if (!meta) {
    return '❌ Meta não encontrada para *' + weaponName + '*.\nVerifique o nome (ex: torid, burston, kuva_bramma).'
  }

  let reply = '🎯 *META ROLL — ' + (meta.display || weaponName) + '*\n\n'
  reply += '*Obrigatórias (must-have):*\n'
  const must = meta.must_have || []
  if (!must.length) reply += '_nenhuma_\n'
  for (const m of must) reply += '• ' + (RIVEN_STAT_LABEL[m] || m) + '\n'
  reply += '\n*Prioridade (nessa ordem):*\n'
  const prio = meta.priority || []
  prio.forEach((p, j) => { reply += (j + 1) + '. ' + (RIVEN_STAT_LABEL[p] || p) + '\n' })
  if (meta.raw_text) reply += '\n*Formato original:*\n`' + meta.raw_text + '`\n'
  reply += '\n💡 `!grade <link>` analisa um anúncio + meta\n'
  return reply.trim()
}

module.exports = {
  loadRivenMeta, getWeaponMeta, analyzeRivenMeta,
  formatMetaBlock, getMetaMessage
}
