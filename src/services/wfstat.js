const axios = require('axios')
const { sleep } = require('../lib/sleep')

async function fetchWS(path) {
  const urls = [
    'https://api.warframestat.us/pc/' + path,
    'https://api.warframestat.us/pc/' + path + '?language=en'
  ]
  let lastErr = null
  for (let attempt = 0; attempt < 3; attempt++) {
    for (const u of urls) {
      try {
        const res = await axios.get(u, {
          timeout: 30000,
          headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' }
        })
        if (res.data != null) return res.data
      } catch (e) { lastErr = e }
    }
    if (attempt < 2) await sleep(1500)
  }
  throw lastErr || new Error('fetchWS: ' + path)
}

module.exports = { fetchWS }
