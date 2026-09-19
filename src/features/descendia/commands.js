const { register } = require('../../handlers/registry')
const { fetchOfficialWorldState } = require('../../services/worldstate')
const { formatBR, formatBRDate } = require('../../lib/text')

const DESCENDIA_TYPES = {
  UNIQUE: 'Battle Kaithes', DT_UNIQUE: 'Battle Kaithes',
  'LOOT CREATURES': 'Gruzzling Plunder', LOOT_CREATURES: 'Gruzzling Plunder', LootCreatures: 'Gruzzling Plunder',
  NETRACELLS: 'Targeted Elimination', Netracells: 'Targeted Elimination',
  BOSS: 'Boss Fight', DT_ASSASSINATION: 'Boss Fight',
  'SABOTAGE HIVE': 'Hive Sabotage', SABOTAGE_HIVE: 'Hive Sabotage', SabotageHive: 'Hive Sabotage', DT_HIVE: 'Hive Sabotage',
  'SABOTAGE DEFENSE': 'Cradle Defense', SabotageDefense: 'Cradle Defense',
  MIMICS: 'Mimic Plunder', Mimics: 'Mimic Plunder',
  'SHRINE DEFENSE': 'Shrine Defense', ShrineDefense: 'Shrine Defense',
  Defense: 'Protoframe Defense', DT_DEFENSE: 'Protoframe Defense',
  DT_INFESTED_SALVAGE: 'Infested Salvage', InfestedSalvage: 'Infested Salvage',
  DT_EXTERMINATE: 'Exterminate', Exterminate: 'Exterminate',
  DT_ALCHEMY: 'Alchemy', Alchemy: 'Alchemy',
  DT_EXCAVATION: 'Excavation', Excavation: 'Excavation',
  'PRESSURE COOKER': 'Pressure Cooker', PressureCooker: 'Pressure Cooker',
  Wisp: 'Wisp', Harrow: 'Harrow', Devil: 'Devil'
}
const DESCENDIA_CHALLENGES = {
  HorseCombatOnly: 'Destroy Hologlobes', VERYTOXIC: 'Energy Leech, Leech and Venomous Eximus Cabal',
  BASICLOOTCREATURES: 'Kill 6 Gruzzlings.', FIREANDICE: 'Arctic, Arson and Blitz Eximus Cabal',
  HARDSHELL: 'Arctic, Energy Leech and Guardian Eximus Cabal', ARCHONBOREAL: 'Archon Boreal',
  GiantRealm: 'Gigantism', Gigantism: 'Gigantism', Sentients: "Tau's Revenge",
  HORDEWEAKPOINTS: 'Weakpoint Horde', 'Weakpoint Horde': 'Weakpoint Horde',
  SHOCKINGLEECH: 'Leech, Shock, and Venomous Eximus Cabal', BASICMIMICS: 'Plunder Roulette',
  PlunderRoulette: 'Plunder Roulette', HeadShotsOnly: 'Only Weak Points Are Vulnerable',
  'Only Weak Points Are Vulnerable': 'Only Weak Points Are Vulnerable',
  JadeGuardian: 'Guardian, Jade Light and Shock Eximus Cabal', UnseenFoes: 'Hidden Threats',
  'Hidden Threats': 'Hidden Threats', PowerHouse: 'Arson, Blitz and Jade Light Eximus Cabal',
  FieryTrail: 'Fire Trails', 'Fire Trails': 'Fire Trails', SpicyKnife: 'Bomb Defusal',
  'Bomb Defusal': 'Bomb Defusal', Wisp: 'Wisp', Harrow: 'Harrow', Devil: 'Devil'
}

function parseWFDate(obj) {
  try {
    if (!obj) return null
    if (typeof obj === 'number') return obj
    if (obj.$date && obj.$date.$numberLong) return Number(obj.$date.$numberLong)
    if (obj.$numberLong) return Number(obj.$numberLong)
    return null
  } catch (e) { return null }
}

function findDescents(obj, depth) {
  if (depth > 8 || !obj || typeof obj !== 'object') return null
  if (Array.isArray(obj.Descents)) return obj.Descents
  if (Array.isArray(obj)) {
    for (const item of obj) { const f = findDescents(item, depth + 1); if (f) return f }
  } else {
    for (const k of Object.keys(obj)) {
      if (k === 'Descents' && Array.isArray(obj[k])) return obj[k]
      const f = findDescents(obj[k], depth + 1); if (f) return f
    }
  }
  return null
}

function getDescendiaFromWS(worldState) {
  const descents = findDescents(worldState, 0)
  if (!Array.isArray(descents) || !descents.length) return null
  return { atual: descents[0], proximas: descents.slice(1, 5), all: descents.slice(0, 5) }
}

function descendiaToken(raw) {
  let s = String(raw == null ? '' : raw).trim()
  if (!s) return ''
  if (s.indexOf('/') !== -1) {
    const parts = s.split('/').filter(Boolean)
    s = parts[parts.length - 1] || s
  }
  return s.replace(/^DT_/, '')
}

function descendiaLookupKeys(raw) {
  const token = descendiaToken(raw)
  if (!token) return []
  const spaced = token.replace(/_/g, ' ')
  const pretty = spaced.replace(/([a-z])([A-Z])/g, '$1 $2')
  const compact = token.replace(/[_\s]/g, '')
  const keys = [raw, token, spaced, pretty, token.toUpperCase(), spaced.toUpperCase(), pretty.toUpperCase(), compact, compact.toUpperCase(), compact.toLowerCase()]
  const seen = {}, out = []
  for (const k of keys) if (k != null && k !== '' && !seen[k]) { seen[k] = true; out.push(k) }
  return out
}

function mapDescendia(dict, raw) {
  for (const k of descendiaLookupKeys(raw)) if (dict[k]) return dict[k]
  const t = descendiaToken(raw)
  if (!t) return '—'
  return t.replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2')
}

const friendlyType = (type) => mapDescendia(DESCENDIA_TYPES, type)
const friendlyChallenge = (ch) => ch == null || ch === '' ? '—' : mapDescendia(DESCENDIA_CHALLENGES, ch)

function formatDescentDetail(title, descent) {
  const start = parseWFDate(descent.Activation)
  const end = parseWFDate(descent.Expiry)
  let t = title + '\n📅 ' + formatBR(start) + ' → ' + formatBR(end) + '\n\n'
  const challenges = (descent.Challenges || []).slice().sort((a, b) => (a.Index || 0) - (b.Index || 0))
  if (!challenges.length) return t + '_No challenges listed._\n'
  challenges.forEach((c, i) => {
    const idx = String(i + 1).padStart(2, '0')
    const typeName = friendlyType(c.Type)
    const mod = friendlyChallenge(c.Challenge)
    const isFrame = /^(Wisp|Harrow|Devil)$/i.test(mod) || /^(Wisp|Harrow|Devil)$/i.test(typeName)
    if (isFrame) t += idx + '. *' + (/^(Wisp|Harrow|Devil)$/i.test(mod) ? mod : typeName) + '*\n'
    else if (!c.Challenge || mod === '—') t += idx + '. *' + typeName + '*\n'
    else t += idx + '. *' + typeName + '* - ' + mod + '\n'
  })
  return t
}

async function handleDescendiaCommand(arg) {
  const ws = await fetchOfficialWorldState()
  const data = getDescendiaFromWS(ws)
  if (!data) return { texts: ['❌ Descendia não encontrada.'] }
  const mode = (arg || '').trim().toLowerCase()

  if (mode === 'all') {
    const texts = [formatDescentDetail('🔥 *DESCENDIA — ATUAL*', data.atual).trim()]
    data.proximas.forEach((d, i) => texts.push(formatDescentDetail('🔜 *DESCENDIA — +' + (i + 1) + '*', d).trim()))
    return { texts }
  }
  const num = parseInt(mode, 10)
  if (num >= 2 && num <= 5) {
    const d = data.proximas[num - 2]
    if (!d) return { texts: ['❌ Rotação +' + (num - 1) + ' não disponível.'] }
    return { texts: [formatDescentDetail('🔜 *DESCENDIA — +' + (num - 1) + '*', d).trim()] }
  }

  const msg1 = formatDescentDetail('🔥 *DESCENDIA — ATUAL*', data.atual).trim()
  let msg2 = '🔜 *PRÓXIMAS ROTAÇÕES*\n\n'
  if (!data.proximas.length) msg2 += '_Nenhuma próxima._'
  else {
    data.proximas.forEach((d, i) => {
      const start = parseWFDate(d.Activation), end = parseWFDate(d.Expiry)
      msg2 += '*' + (i + 1) + '.* ' + formatBRDate(start) + ' → ' + formatBRDate(end) + '\n'
    })
    msg2 += '\n💡 `!descendia 2` detalhe da próxima'
  }
  return { texts: [msg1, msg2] }
}

register(/^!(descendia|descent|devil)(?:\s+(.+))?$/i, async ({ sock, from, match }) => {
  await sock.sendMessage(from, { text: '🔥 Buscando Descendia...' })
  try {
    const result = await handleDescendiaCommand(match[2] || '')
    for (const t of result.texts) {
      await sock.sendMessage(from, { text: t })
      await new Promise((r) => setTimeout(r, 400))
    }
  } catch (e) {
    console.error(e)
    await sock.sendMessage(from, { text: '❌ Erro ao buscar Descendia.' })
  }
})

module.exports = { handleDescendiaCommand }
