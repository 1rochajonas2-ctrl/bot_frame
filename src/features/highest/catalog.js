const { httpGet } = require('../../lib/http')
const { WFM_HEADERS } = require('../../config/headers')

const HIGHEST_CATEGORIES = {
  1: { id: 'prime_sets',       label: 'Prime Sets',               type: 'set' },
  2: { id: 'mods_maxed',       label: 'Mods (Maxed)',             type: 'mod',    rank: 'max' },
  3: { id: 'mods_unranked',    label: 'Mods (Unranked)',          type: 'mod',    rank: 0 },
  4: { id: 'primed_maxed',     label: 'Primed/Archon (Maxed)',    type: 'primed', rank: 'max' },
  5: { id: 'primed_unranked',  label: 'Primed/Archon (Unranked)', type: 'primed', rank: 0 },
  6: { id: 'arcanes_maxed',    label: 'Arcanes (Maxed)',          type: 'arcane', rank: 'max' },
  7: { id: 'arcanes_unranked', label: 'Arcanes (Unranked)',       type: 'arcane', rank: 0 },
  8: { id: 'warframe_sets',    label: 'Warframes (Prime Sets)',   type: 'warframe_set' },
  9: { id: 'augments',         label: 'Augments',                 type: 'augment' }
}

function normalizeHighestCatalogItem(item) {
  if (!item || typeof item !== 'object') return null
  const slug = (item.slug || item.url_name || '').toLowerCase()
  if (!slug) return null
  const name = (item.i18n && item.i18n.en && item.i18n.en.name) || item.item_name || item.name || slug
  const maxRank = item.maxRank != null ? item.maxRank : (item.mod_max_rank != null ? item.mod_max_rank : 0)
  const tags = item.tags || []
  return { slug, maxRank, tags, i18n: { en: { name } } }
}

async function fetchHighestCatalog() {
  const urls = ['https://api.warframe.market/v2/items', 'https://api.warframe.market/v1/items']
  for (const url of urls) {
    try {
      console.log('📦 Highest: catálogo ' + url)
      const res = await httpGet(url, { timeout: 45000, headers: WFM_HEADERS })
      let raw = []
      if (res.data && res.data.data && Array.isArray(res.data.data)) raw = res.data.data
      else if (res.data && res.data.payload && Array.isArray(res.data.payload.items)) raw = res.data.payload.items
      else if (Array.isArray(res.data)) raw = res.data

      const items = []
      for (const r of raw) { const n = normalizeHighestCatalogItem(r); if (n) items.push(n) }
      if (items.length) return items
    } catch (e) {
      console.error('Highest catálogo (' + url + '):', e.response ? e.response.status : e.message)
    }
  }
  return []
}

const WARFRAMES = ['Ash','Atlas','Banshee','Baruuk','Chroma','Ember','Equinox','Excalibur','Frost','Gara','Garuda','Gauss','Grendel','Harrow','Hildryn','Hydroid','Inaros','Ivara','Khora','Limbo','Loki','Mag','Mesa','Mirage','Nekros','Nezha','Nidus','Nova','Nyx','Oberon','Octavia','Protea','Revenant','Rhino','Saryn','Sevagoth','Titania','Trinity','Valkyr','Vauban','Volt','Wisp','Wukong','Yareli','Zephyr']
function isWarframePrimeSet(name) {
  const lower = name.toLowerCase()
  return WARFRAMES.some((w) => lower.includes(w.toLowerCase()))
}

function isArcaneItem(slug, name, tags) {
  const s = String(slug || '').toLowerCase()
  const n = String(name || '').toLowerCase()
  const t = (tags || []).map((x) => String(x).toLowerCase())
  if (t.indexOf('arcane') !== -1) return true
  if (/\barcane\b/.test(n) || s.startsWith('arcane_')) return true
  if (s.startsWith('magus_') || /\bmagus\b/.test(n)) return true
  if (s.startsWith('virtuos_') || /\bvirtuos\b/.test(n)) return true
  if (s.startsWith('pax_') || /\bpax\b/.test(n)) return true
  if (s.startsWith('theorem_') || /\btheorem\b/.test(n)) return true
  if (s.startsWith('exodia_') || /\bexodia\b/.test(n)) return true
  if (s.startsWith('primary_') || /^primary\s/.test(n)) return true
  if (s.startsWith('secondary_') || /^secondary\s/.test(n)) return true
  if (s.startsWith('melee_') || /^melee\s/.test(n)) return true
  if (s.startsWith('shotgun_') || /^shotgun\s/.test(n)) return true
  if (s.startsWith('sniper_') || /^sniper\s/.test(n)) return true
  if (s.startsWith('kitgun_') || /^kitgun\s/.test(n)) return true
  if (s.startsWith('moa_') || /^moa\s/.test(n)) return true
  return false
}

function classifyHighestItems(catalog) {
  const result = {}
  for (const key in HIGHEST_CATEGORIES) result[HIGHEST_CATEGORIES[key].id] = []

  for (const item of catalog) {
    const slug = (item.slug || '').toLowerCase()
    const name = (item.i18n && item.i18n.en && item.i18n.en.name) ? item.i18n.en.name : slug
    if (!slug) continue
    const tags = item.tags || []

    if (isArcaneItem(slug, name, tags)) {
      result.arcanes_maxed.push({ slug, name, maxRank: item.maxRank || 0 })
      result.arcanes_unranked.push({ slug, name, maxRank: item.maxRank || 0 })
      continue
    }
    if (slug.includes('augment') || /\baugment\b/i.test(name) || tags.indexOf('augment') !== -1) {
      result.augments.push({ slug, name, maxRank: item.maxRank || 0 }); continue
    }
    if (slug.startsWith('primed_') || slug.startsWith('archon_') || /\bprimed\b/i.test(name) || /\barchon\b/i.test(name)) {
      result.primed_maxed.push({ slug, name, maxRank: item.maxRank || 0 })
      result.primed_unranked.push({ slug, name, maxRank: item.maxRank || 0 })
      continue
    }
    if (slug.endsWith('_set') && /\bprime\b/i.test(name)) {
      result.prime_sets.push({ slug, name, maxRank: 0 })
      if (isWarframePrimeSet(name)) result.warframe_sets.push({ slug, name, maxRank: 0 })
      continue
    }
    if (tags.indexOf('mod') !== -1) {
      result.mods_maxed.push({ slug, name, maxRank: item.maxRank || 0 })
      result.mods_unranked.push({ slug, name, maxRank: item.maxRank || 0 })
    }
  }
  return result
}

module.exports = {
  HIGHEST_CATEGORIES, normalizeHighestCatalogItem,
  fetchHighestCatalog, classifyHighestItems, isArcaneItem, isWarframePrimeSet
}
