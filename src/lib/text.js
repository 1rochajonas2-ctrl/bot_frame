function clipText(s, max) {
  s = String(s || '').trim()
  if (s.length <= max) return s
  return s.slice(0, max - 20).trim() + '\n...(cortado)'
}

function jidToNumber(jid) {
  return String(jid || '').replace(/@.*$/, '').replace(/\D/g, '')
}

function normalizeWeaponKey(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
}

function normWeaponKeyLoose(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '')
}

function stripAccents(s) {
  return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function formatUptime(ms) {
  const s = Math.floor(ms / 1000)
  const d = Math.floor(s / 86400)
  const h = Math.floor((s % 86400) / 3600)
  const m = Math.floor((s % 3600) / 60)
  if (d > 0) return `${d}d ${h}h ${m}min`
  if (h > 0) return `${h}h ${m}min`
  return `${m}min`
}

function formatTimeLeft(ms) {
  if (ms <= 0) return 'agora'
  const days  = Math.floor(ms / 86400000)
  const hours = Math.floor((ms % 86400000) / 3600000)
  const mins  = Math.floor((ms % 3600000) / 60000)
  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${mins}min`
  return `${mins}min`
}

function formatBR(tsMs) {
  if (!tsMs) return '?'
  return new Date(tsMs).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
}
function formatBRDate(tsMs) {
  if (!tsMs) return '?'
  return new Date(tsMs).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
}
function fmtPlat(n) {
  if (n == null || isNaN(n)) return '—'
  return Math.round(Number(n)).toLocaleString('pt-BR') + 'p'
}

function toSlug(name) {
  return String(name || '').toLowerCase().trim()
    .replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
}

module.exports = {
  clipText, jidToNumber, normalizeWeaponKey, normWeaponKeyLoose,
  stripAccents, formatUptime, formatTimeLeft, formatBR, formatBRDate,
  fmtPlat, toSlug
}
