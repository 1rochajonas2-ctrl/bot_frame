const { loadJson, saveJson } = require('../../lib/storage')
const { RIVEN_ALERTS_FILE } = require('../../config/constants')

const EMPTY = { nextId: 1, alerts: [] }

function loadRivenAlerts() {
  const d = loadJson(RIVEN_ALERTS_FILE, null)
  if (!d || typeof d !== 'object') return { ...EMPTY }
  if (!Array.isArray(d.alerts)) d.alerts = []
  if (d.nextId == null) d.nextId = 1
  return d
}

function saveRivenAlerts(data) {
  saveJson(RIVEN_ALERTS_FILE, data)
}

module.exports = { loadRivenAlerts, saveRivenAlerts }
