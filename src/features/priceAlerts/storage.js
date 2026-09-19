const { loadJson, saveJson } = require('../../lib/storage')
const { ALERTS_FILE } = require('../../config/constants')

const EMPTY = { nextId: 1, alerts: [] }

function loadAlerts() {
  const d = loadJson(ALERTS_FILE, null)
  if (!d || typeof d !== 'object') return { ...EMPTY }
  if (!Array.isArray(d.alerts)) d.alerts = []
  if (d.nextId == null) d.nextId = 1
  return d
}
function saveAlerts(d) { saveJson(ALERTS_FILE, d) }

module.exports = { loadAlerts, saveAlerts }
