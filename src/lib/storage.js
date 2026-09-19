const fs = require('fs')
const path = require('path')

function loadJson(file, fallback) {
  try {
    if (!fs.existsSync(file)) return fallback
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch (e) {
    console.error('[storage] load', path.basename(file), e.message)
    return fallback
  }
}

function saveJson(file, data) {
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true })
    fs.writeFileSync(file, JSON.stringify(data, null, 2))
  } catch (e) {
    console.error('[storage] save', path.basename(file), e.message)
  }
}

module.exports = { loadJson, saveJson }
