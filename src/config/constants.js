const path = require('path')
const fs = require('fs')
const { DATA_ROOT } = require('./env')

const ROOT = path.join(__dirname, '..', '..')
const DATA_DIR = path.join(DATA_ROOT, 'data')

// garante pastas
for (const d of [DATA_ROOT, DATA_DIR]) {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true })
}

function pickFile(...candidates) {
  for (const c of candidates) if (fs.existsSync(c)) return c
  return candidates[candidates.length - 1]
}

module.exports = {
  ROOT,
  DATA_ROOT,
  DATA_DIR,

  // arquivos runtime
  ALERTS_FILE:           path.join(DATA_ROOT, 'alerts.json'),
  INVASION_ALERTS_FILE:  path.join(DATA_ROOT, 'invasion_alerts.json'),
  RIVEN_ALERTS_FILE:     path.join(DATA_ROOT, 'riven_alerts.json'),
  RIVEN_SEEN_FILE:       path.join(DATA_ROOT, 'riven_seen.json'),
  STEAL_SEEN_FILE:       path.join(DATA_ROOT, 'riven_steal_seen.json'),
  WEEKLY_RIVENS_FILE:    path.join(DATA_ROOT, 'weekly_rivens_pc.json'),
  HIGHEST_CACHE_FILE:    path.join(DATA_ROOT, 'highest_cache.json'),
  ADMIN_CONFIG_FILE:     path.join(DATA_ROOT, 'admin_config.json'),
  CHAT_AUTH_DIR:         path.join(DATA_ROOT, 'auth_info'),

  // arquivos estáticos
  ARBYS_FILE:            path.join(DATA_DIR, 'arbys.txt'),
  REGIONS_FILE:          path.join(DATA_DIR, 'regions.json'),
  SP_INCURSIONS_FILE:    path.join(DATA_DIR, 'sp-incursions.txt'),
  BASE_VALUES_FILE:      path.join(ROOT, 'data', 'base_values.json'),
  DISPOSITIONS_FILE:     path.join(ROOT, 'data', 'dispositions.json'),
  RIVEN_META_FILE:       pickFile(
                           path.join(ROOT, 'data', 'riven_meta.json'),
                           path.join(ROOT, 'riven_meta.json')
                         ),

  // URLs
  INVASIONS_URL:         'https://api.warframestat.us/pc/invasions',
  WORLDSTATE_URL:        'https://api.warframe.com/cdn/worldState.php',
  RIVEN_AUCTIONS_URL:    'https://api.warframe.market/v1/auctions/search',
  WEEKLY_RIVENS_URL:     'https://www-static.warframe.com/repos/weeklyRivensPC.json',

  // TTLs
  CHECK_INTERVAL_MS:     require('./env').CHECK_INTERVAL_MS,
  WEEKLY_RIVENS_TTL:     7 * 24 * 60 * 60 * 1000,
  HIGHEST_CATALOG_TTL:   6 * 60 * 60 * 1000,
  HIGHEST_PRICE_TTL:     30 * 60 * 1000,
  HIGHEST_STATS_TTL:     60 * 60 * 1000,
  HIGHEST_REQUEST_DELAY: 350,

  // business
  STEAL_MIN_DISCOUNT:    0.55,
  STEAL_MIN_MEDIAN:      800
}
