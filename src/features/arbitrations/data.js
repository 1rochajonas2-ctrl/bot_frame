const fs = require('fs')
const { ARBYS_FILE, SP_INCURSIONS_FILE, REGIONS_FILE } = require('../../config/constants')

function loadArbys() {
  const lines = fs.readFileSync(ARBYS_FILE, 'utf8').trim().split('\n')
  return lines.map((line) => {
    const [ts, key] = line.split(',')
    return { ts: parseInt(ts, 10), key: (key || '').trim() }
  }).filter((x) => x.ts && x.key)
}

function loadSpIncursions() {
  if (!fs.existsSync(SP_INCURSIONS_FILE)) return []
  const lines = fs.readFileSync(SP_INCURSIONS_FILE, 'utf8').trim().split('\n')
  return lines.map((line) => {
    const [ts, nodes] = line.split(';')
    return {
      ts: parseInt(ts, 10),
      nodes: (nodes || '').split(',').map((s) => s.trim()).filter(Boolean)
    }
  }).filter((x) => x.ts && x.nodes.length)
}

function loadRegions() { return JSON.parse(fs.readFileSync(REGIONS_FILE, 'utf8')) }

function resolveNodeName(nodeKey, withType) {
  try {
    if (!nodeKey) return '?'
    if (!fs.existsSync(REGIONS_FILE)) return String(nodeKey)
    const regions = loadRegions()
    const info = regions[nodeKey]
    if (!info) return String(nodeKey)
    let name = info.name || nodeKey
    if (info.planet && info.planet !== '?') name += ' (' + info.planet + ')'
    if (withType) {
      const raw = String(info.missionType || '').trim()
      if (raw && raw !== '?') {
        const typeMap = {
          SURVIVAL: 'Survival', EXTERMINATION: 'Exterminate', EXTERMINATE: 'Exterminate',
          ASSASSINATION: 'Assassination', DEFENSE: 'Defense', MOBILE_DEFENSE: 'Mobile Defense',
          CAPTURE: 'Capture', RESCUE: 'Rescue', SABOTAGE: 'Sabotage', SPY: 'Spy',
          HIJACK: 'Hijack', EXCAVATION: 'Excavation', DISRUPTION: 'Disruption',
          ALCHEMY: 'Alchemy', VOID_CASCADE: 'Void Cascade', VOID_FLOOD: 'Void Flood',
          VOID_ARMAGEDDON: 'Void Armageddon', HELL_SCRUB: 'Hell-Scrub',
          LEGACYTE_HARVEST: 'Legacyte Harvest', MIRROR_DEFENSE: 'Mirror Defense'
        }
        const nice = typeMap[raw] || raw.replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2')
        name += ' — ' + nice
      }
    }
    return name
  } catch (e) { return String(nodeKey) }
}

module.exports = { loadArbys, loadSpIncursions, loadRegions, resolveNodeName }
