const { loadJson, saveJson } = require('../../lib/storage')
const { ADMIN_CONFIG_FILE } = require('../../config/constants')

function defaultAdminConfig() {
  return {
    mutedUsers: [],
    vipUsers: [],
    rivenSnipeEnabled: true,
    maxRivenAlerts: 10,
    maxRivenAlertsVip: 30,
    blockedCommands: []
  }
}

function loadAdminConfig() {
  const raw = loadJson(ADMIN_CONFIG_FILE, null)
  if (!raw || typeof raw !== 'object') return defaultAdminConfig()
  const base = defaultAdminConfig()
  for (const k in base) if (raw[k] === undefined) raw[k] = base[k]
  if (!Array.isArray(raw.mutedUsers)) raw.mutedUsers = []
  if (!Array.isArray(raw.vipUsers)) raw.vipUsers = []
  if (!Array.isArray(raw.blockedCommands)) raw.blockedCommands = []
  return raw
}

function saveAdminConfig(cfg) {
  saveJson(ADMIN_CONFIG_FILE, cfg)
}

module.exports = { defaultAdminConfig, loadAdminConfig, saveAdminConfig }
