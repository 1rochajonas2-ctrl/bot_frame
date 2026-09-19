const axios = require('axios')
const fs = require('fs')
const {
  DATA_DIR, ARBYS_FILE, SP_INCURSIONS_FILE, REGIONS_FILE
} = require('../config/constants')

async function ensureData() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })

  if (!fs.existsSync(ARBYS_FILE)) {
    console.log('📥 Baixando arbys.txt...')
    const res = await axios.get('https://browse.wf/arbys.txt', { responseType: 'text', timeout: 60000 })
    fs.writeFileSync(ARBYS_FILE, res.data)
  }

  if (!fs.existsSync(SP_INCURSIONS_FILE)) {
    console.log('📥 Baixando sp-incursions.txt...')
    try {
      const res = await axios.get('https://browse.wf/sp-incursions.txt', { responseType: 'text', timeout: 60000 })
      fs.writeFileSync(SP_INCURSIONS_FILE, res.data)
    } catch (e) { console.error('sp-incursions:', e.message) }
  }

  if (!fs.existsSync(REGIONS_FILE)) {
    console.log('📥 Baixando regiões...')
    const [regionsRes, dictRes] = await Promise.all([
      axios.get('https://browse.wf/warframe-public-export-plus/ExportRegions.json', { timeout: 60000 }),
      axios.get('https://browse.wf/warframe-public-export-plus/dict.en.json', { timeout: 60000 })
    ])
    const regions = regionsRes.data
    const dict = dictRes.data
    const map = {}
    for (const [key, r] of Object.entries(regions)) {
      const nameKey = r.name || ''
      const sysKey  = r.systemName || ''
      const name    = dict[nameKey] || nameKey.split('/').pop() || key
      const planet  = dict[sysKey] || sysKey.split('/').pop() || '?'
      map[key] = {
        name,
        planet,
        missionType: (r.missionType || '').replace('MT_', ''),
        faction: (r.faction || '').replace('FC_', '')
      }
    }
    fs.writeFileSync(REGIONS_FILE, JSON.stringify(map))
  }
  console.log('✅ Dados locais prontos.')
}

module.exports = { ensureData }
