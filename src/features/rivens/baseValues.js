const fs = require('fs')
const { BASE_VALUES_FILE } = require('../../config/constants')

let cache = null

function loadBaseValues() {
  if (cache) return cache
  cache = JSON.parse(fs.readFileSync(BASE_VALUES_FILE, 'utf8'))
  return cache
}

module.exports = { loadBaseValues }
