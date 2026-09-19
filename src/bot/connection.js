const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys')
const pino = require('pino')
const { CHAT_AUTH_DIR } = require('../config/constants')
const { BOT_PHONE } = require('../config/env')

async function createConnection() {
  const auth = await useMultiFileAuthState(CHAT_AUTH_DIR)
  const sock = makeWASocket({
    auth: auth.state,
    logger: pino({ level: 'silent' })
  })
  sock.ev.on('creds.update', auth.saveCreds)
  return { sock, DisconnectReason }
}

module.exports = { createConnection }
