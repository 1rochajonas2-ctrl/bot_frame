const { register } = require('../../handlers/registry')
const axios = require('axios')
const { formatTimeLeft } = require('../../lib/text')
const { sleep } = require('../../lib/sleep')

function classifyBaroItem(name, uniqueName) {
  const n = String(name || '').toLowerCase()
  const u = String(uniqueName || '').toLowerCase()
  const both = n + ' ' + u
  if (/\brelic\b|voidprojection|void projection/i.test(both)) return 'relics'

  const isCosmetic = /skin|syandana|ephemera|sigil|glyph|diadem|sugatra|ornament|bobble|decoration|armor set|shoulder plate|chest plate|leg plate|kubrow armor|helmet|mask|wings|tail|scarf|palette|banner|poster|luxxum|song item|tarot|motorcycle/i.test(n)
  if (/\/weapons\//i.test(u)) return 'weapons'
  if (!isCosmetic) {
    if (/\b(prisma|vandal|wraith|dex)\b/i.test(n)) return 'weapons'
    if (/\b(skana|machete|glaxion|paris|braton|lato|boltor|soma|vectis|tigris|vulkar|strun|gorgon|grakata|hek|sobek|akbolto|akstiletto|nikana|gram|galatine|orthos|scindo|fragor|kronen|ninkondi|tipedo|reaper|serro|sibear|tekko|zenistar|ohma|mios|caustacyst)\b/i.test(n)) return 'weapons'
  }
  if (isCosmetic) return 'cosmetics'
  if (/\/skins\/|\/cosmetics\/|\/syandana|\/ephemera|\/sigil|\/glyph|shipdecos|bobblehead/i.test(u)) return 'cosmetics'
  if (/\bprimed\b|\barchon\b/i.test(n)) return 'mods'
  if (/smite|expel|convulsion|chilling grasp|slip magazine|ammo mutation|ammo stock|morphic transformer|\bscorch\b|steady hands|heated charge|ice storm|magnum force|lethal torrent|anemic agility|hornet strike|barrel diffusion|pistol pestilence|pathogen rounds|deep freeze|frostbite|pistol gambit|target cracker|hollow point|tactical pump|point blank|\bblaze\b|vicious spread|ravage|seeking force|breach loader|burdened magazine|charged shell|chilling reload|contagious spread|disruptor|flechette|incendiary coat|shell shock|shredder|silent battery|toxic barrage|frigid blast|narrow barrel|lock and load|soft hands|turbo charge|accelerated blast|amalgam|galvanized|umbral|augur/i.test(n)) return 'mods'
  if (/\/mods\//i.test(u)) return 'mods'
  return 'other'
}

async function fetchBaroData() {
  const urls = [
    'https://api.warframestat.us/pc/voidTrader',
    'https://api.warframestat.us/pc/voidTrader?language=en'
  ]
  let lastErr = null
  for (let attempt = 0; attempt < 3; attempt++) {
    for (const u of urls) {
      try {
        const res = await axios.get(u, { timeout: 30000, headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' } })
        if (res.data) return res.data
      } catch (e) { lastErr = e }
    }
    if (attempt < 2) await sleep(1500)
