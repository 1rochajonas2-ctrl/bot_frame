const fs = require('fs')
const { DISPOSITIONS_FILE } = require('../../config/constants')
const { loadBaseValues } = require('./baseValues')

let dispCache = null

function loadDispositions() {
  if (dispCache) return dispCache
  const list = JSON.parse(fs.readFileSync(DISPOSITIONS_FILE, 'utf8'))
  const map = {}
  for (const w of list) {
    if (!w || !w.name) continue
    map[String(w.name).toLowerCase()] = w
  }
  dispCache = map
  return dispCache
}

function findDisposition(weaponUrlName) {
  const map = loadDispositions()
  const key = String(weaponUrlName || '').replace(/_/g, ' ').toLowerCase().trim()
  if (map[key]) return map[key]
  const compact = key.replace(/\s+/g, ' ')
  if (map[compact]) return map[compact]
  const keys = Object.keys(map)
  for (const k of keys) {
    if (k.replace(/\s+/g, '') === key.replace(/\s+/g, '')) return map[k]
  }
  return null
}

function resolveRivenCategory(weaponType) {
  const bv = loadBaseValues()
  const t = String(weaponType || '')
  if (bv.type_to_category && bv.type_to_category[t]) return bv.type_to_category[t]
  if (/shotgun/i.test(t)) return 'Shotgun'
  if (/pistol|secondary|throwing/i.test(t)) return 'Pistol'
  if (/arch.?gun/i.test(t)) return 'Archgun'
  if (/melee|zaw|arch.?melee/i.test(t)) return 'Melee'
  return 'Rifle'
}

function getConfigKey(attrs) {
  let pos = 0, neg = 0
  for (const a of attrs || []) {
    if (a.positive === false) neg++; else pos++
  }
  if (pos === 2 && neg === 0) return '2P'
  if (pos === 2 && neg === 1) return '2P1N'
  if (pos === 3 && neg === 0) return '3P'
  if (pos === 3 && neg === 1) return '3P1N'
  if (pos >= 3) return neg ? '3P1N' : '3P'
  return neg ? '2P1N' : '2P'
}

function letterGrade(dev) {
  if (dev >= 9.5) return 'S'
  if (dev >= 7.5) return '+A'
  if (dev >= 5.5) return 'A'
  if (dev >= 3.5) return '-A'
  if (dev >= 1.5) return '+B'
  if (dev >= -1.5) return 'B'
  if (dev >= -3.5) return '-B'
  if (dev >= -5.5) return '+C'
  if (dev >= -7.5) return 'C'
  if (dev >= -9.5) return '-C'
  return 'F'
}

const WFM_TO_BASE_STAT = {
  multishot: 'Multishot',
  critical_chance: 'Critical Chance',
  critical_damage: 'Critical Damage',
  'base_damage_/_melee_damage': 'Damage',
  status_chance: 'Status Chance',
  status_duration: 'Status Duration',
  'fire_rate_/_attack_speed': 'Fire Rate / Attack Speed',
  reload_speed: 'Reload Speed',
  magazine_capacity: 'Magazine Capacity',
  ammo_maximum: 'Ammo Maximum',
  punch_through: 'Punch Through',
  projectile_speed: 'Projectile Speed',
  recoil: 'Weapon Recoil',
  zoom: 'Zoom',
  impact: 'Impact Damage',
  puncture: 'Puncture Damage',
  slash: 'Slash Damage',
  cold: 'Cold Damage', cold_damage: 'Cold Damage',
  heat: 'Heat Damage', heat_damage: 'Heat Damage',
  electricity: 'Electricity Damage', electricity_damage: 'Electricity Damage', electric_damage: 'Electricity Damage',
  toxin: 'Toxin Damage', toxin_damage: 'Toxin Damage',
  damage_vs_corpus: 'Damage vs. Corpus',
  damage_vs_grineer: 'Damage vs. Grineer',
  damage_vs_infested: 'Damage vs. Infested',
  range: 'Range',
  initial_combo: 'Initial Combo',
  combo_duration: 'Combo Duration',
  heavy_attack_efficiency: 'Heavy Attack Efficiency',
  finisher_damage: 'Finisher Damage',
  slide_attack_critical_chance: 'Critical Chance for Slide Attack',
  chance_to_gain_combo_count: 'Chance to Gain Combo Count',
  additional_combo_count_chance: 'Additional Combo Count Chance'
}

function gradeOneStat(attr, category, disposition, configKey) {
  const { RIVEN_STAT_LABEL } = require('./stats')
  const bv = loadBaseValues()
  const baseName = WFM_TO_BASE_STAT[attr.url_name]
  if (!baseName || !bv.stats[baseName]) {
    return {
      label: RIVEN_STAT_LABEL[attr.url_name] || attr.url_name,
      value: attr.value,
      positive: attr.positive !== false,
      grade: null, dev: null, note: 'sem base'
    }
  }
  const entry = bv.stats[baseName]
  const base = entry[category]
  if (base == null) {
    return {
      label: baseName, value: attr.value,
      positive: attr.positive !== false,
      grade: null, dev: null, note: 'não rola nesta categoria'
    }
  }
  const mults = bv.count_multipliers[configKey] || bv.count_multipliers['3P1N']
  const isPos = attr.positive !== false
  let mult = isPos ? mults.positive : mults.negative
  if (mult == null) mult = isPos ? 1 : -0.75
  const expected = base * disposition * Math.abs(mult)
  let actual = Number(attr.value)
  if (!isPos) actual = Math.abs(actual)
  const dev = expected ? ((actual - expected) / expected) * 100 : 0
  return {
    label: baseName, value: attr.value, positive: isPos,
    grade: letterGrade(dev), dev, expected, unit: entry.unit || '%'
  }
}

module.exports = {
  loadDispositions, findDisposition, resolveRivenCategory,
  getConfigKey, letterGrade, gradeOneStat, WFM_TO_BASE_STAT
}
