const axios = require('axios')

async function fetchOfficialWorldState() {
  const urls = [
    'https://api.warframe.com/cdn/worldState.php',
    'https://content.warframe.com/dynamic/worldState.php'
  ]
  let lastErr = null
  for (const url of urls) {
    try {
      const res = await axios.get(url, {
        timeout: 25000,
        headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json,text/plain,*/*' },
        transformResponse: [(d) => {
          if (typeof d === 'object') return d
          try { return JSON.parse(d) } catch { return d }
        }]
      })
      if (res.data && typeof res.data === 'object') return res.data
    } catch (e) { lastErr = e }
  }
  throw lastErr || new Error('WorldState indisponível')
}

module.exports = { fetchOfficialWorldState }
