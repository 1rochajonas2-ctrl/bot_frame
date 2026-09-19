require('dotenv').config()

function required(key) {
  const v = process.env[key]
  if (!v) throw new Error('Missing env var: ' + key)
  return v
}

module.exports = {
  GROQ_API_KEY: required('GROQ_API_KEY'),
  BOT_PHONE: process.env.BOT_PHONE || '5511978458775',
  DATA_ROOT: process.env.DATA_ROOT || './data_runtime',
  ADMIN_NUMBERS: (process.env.ADMIN_NUMBERS || '')
    .split(',').map(s => s.trim()).filter(Boolean),
  CHECK_INTERVAL_MS: parseInt(process.env.CHECK_INTERVAL_MS || '240000', 10)
}
