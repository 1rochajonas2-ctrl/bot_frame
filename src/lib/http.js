const axios = require('axios')
const { sleep } = require('./sleep')

// cooldown GLOBAL de 429 (antes era por módulo, agora centralizado)
let cooldownUntil = 0

async function httpGet(url, opts = {}) {
  const now = Date.now()
  if (now < cooldownUntil) await sleep(cooldownUntil - now)

  try {
    return await axios.get(url, { timeout: 20000, ...opts })
  } catch (e) {
    const status = e.response && e.response.status
    if (status === 429 || /rate.?limit|too many/i.test(e.message || '')) {
      const retry = e.response && e.response.headers && e.response.headers['retry-after']
      let wait = retry ? parseInt(retry, 10) * 1000 : 20000
      if (isNaN(wait) || wait < 10000) wait = 20000
      if (wait > 60000) wait = 60000
      cooldownUntil = Date.now() + wait
      console.log(`⏳ http: cooldown 429 por ${Math.round(wait / 1000)}s`)
    }
    throw e
  }
}

function isInCooldown() { return Date.now() < cooldownUntil }
function cooldownLeft()  { return Math.max(0, cooldownUntil - Date.now()) }

module.exports = { httpGet, isInCooldown, cooldownLeft }
