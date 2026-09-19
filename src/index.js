const { ensureData } = require('./bootstrap/ensureData')
const { startBot } = require('./bot/boot')

;(async () => {
  try {
    await ensureData()
    await startBot()
  } catch (e) {
    console.error('FATAL:', e)
    process.exit(1)
  }
})()
