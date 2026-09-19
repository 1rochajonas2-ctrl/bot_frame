const { loadJson, saveJson } = require('../../lib/storage')
const { RIVEN_SEEN_FILE } = require('../../config/constants')

function loadRivenSeen() {
  const d = loadJson(RIVEN_SEEN_FILE, {})
  return d && typeof d === 'object' ? d : {}
}
function saveRivenSeen(d) { saveJson(RIVEN_SEEN_FILE, d) }

function hasSeenRiven(userJid, auctionId) {
  if (!auctionId) return false
  const list = loadRivenSeen()[userJid] || []
  return list.indexOf(String(auctionId)) !== -1
}
function markSeenRiven(userJid, auctionId) {
  if (!userJid || !auctionId) return
  const id = String(auctionId)
  const store = loadRivenSeen()
  if (!store[userJid]) store[userJid] = []
  if (store[userJid].indexOf(id) === -1) {
    store[userJid].push(id)
    if (store[userJid].length > 400) store[userJid] = store[userJid].slice(-400)
    saveRivenSeen(store)
  }
}

module.exports = { loadRivenSeen, saveRivenSeen, hasSeenRiven, markSeenRiven }
