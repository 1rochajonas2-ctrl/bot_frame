const { DisconnectReason } = require('@whiskeysockets/baileys')
const { createConnection } = require('./connection')
const { setupMessageHandler } = require('../handlers/message')
const { startScheduler } = require('./scheduler')
const { BOT_PHONE } = require('../config/env')
const { setSock } = require('../state/socket')

async function startBot() {
  const { sock } = await createConnection()
  setSock(sock)

  sock.ev.on('connection.update', async (update) => {
    if (update.qr && !sock.authState.creds.registered) {
      const code = await sock.requestPairingCode(BOT_PHONE)
      console.log('\n🔑 CÓDIGO DE PAREAMENTO:', code, '\n')
    }
    if (update.connection === 'open') {
      console.log('✅ Bot conectado!')
      startScheduler(sock)
    }
    if (update.connection === 'close') {
      const code =
        update.lastDisconnect &&
        update.lastDisconnect.error &&
        update.lastDisconnect.error.output &&
        update.lastDisconnect.error.output.statusCode
      if (code !== DisconnectReason.loggedOut) {
        console.log('🔄 Reconectando...')
        startBot()
      }
    }
  })

  setupMessageHandler(sock)
  return sock
}

module.exports = { startBot }
