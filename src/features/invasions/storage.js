const { loadJson, saveJson } = require('../../lib/storage')
const { INVASION_ALERTS_FILE } = require('../../config/constants')

const EMPTY = { nextId: 1, alerts: [] }

function loadInvasionAlerts() {
  const d = loadJson(INVASION_ALERTS_FILE, null)
  if (!d || typeof d !== 'object') return { ...EMPTY }
  if (!Array.isArray(d.alerts)) d.alerts = []
  if (d.nextId == null) d.nextId = 1
  return d
}
function saveInvasionAlerts(d) { saveJson(INVASION_ALERTS_FILE, d) }

module.exports = { loadInvasionAlerts, saveInvasionAlerts }
