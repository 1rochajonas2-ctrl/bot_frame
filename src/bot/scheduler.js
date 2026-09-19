const { CHECK_INTERVAL_MS } = require('../config/constants')
const adminState = require('../state/adminState')
const { sleep } = require('../lib/sleep')

const { checkAlerts } = require('../features/priceAlerts/check')
const { checkInvasionAlerts } = require('../features/invasions/check')
const { checkRivenAlerts } = require('../features/rivens/sniper')
const { checkRivenSteals } = require('../features/rivens/steal')

let running = false

async function runAllChecks(sock) {
  if (adminState.alertsPaused) return
  if (running) return
  running = true
  try {
    adminState.lastCheckAt = Date.now()
    adminState.lastCheckError = null

    try { await checkAlerts(sock) }       catch (e) { console.error('checkAlerts:', e.message) }
    await sleep(2000)
    try { await checkInvasionAlerts(sock) } catch (e) { console.error('checkInvasionAlerts:', e.message) }
    await sleep(2000)
    try { await checkRivenAlerts(sock) }  catch (e) { console.error('checkRivenAlerts:', e.message) }
    await sleep(2000)
    try { await checkRivenSteals(sock) }  catch (e) { console.error('checkRivenSteals:', e.message) }
  } catch (e) {
    adminState.lastCheckError = e.message
  } finally {
    running = false
  }
}

let interval = null

function startScheduler(sock) {
  if (interval) return
  interval = setInterval(() => {
    runAllChecks(sock).catch(e => console.error('runAllChecks:', e.message))
  }, CHECK_INTERVAL_MS)

  // primeira passagem escalonada
  setTimeout(() => checkAlerts(sock).catch(() => {}), 30000)
  setTimeout(() => checkInvasionAlerts(sock).catch(() => {}), 32000)
  setTimeout(() => checkRivenAlerts(sock).catch(() => {}), 34000)
  setTimeout(() => checkRivenSteals(sock).catch(() => {}), 180000)

  // Highest em segundo plano
  const { runHighestUpdater } = require('../features/highest/updater')
  setTimeout(() => runHighestUpdater().catch(e => console.error('Highest:', e.message)), 60000)
}

module.exports = { startScheduler, runAllChecks }
