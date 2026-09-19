const axios = require('axios')
const { INVASIONS_URL } = require('../../config/constants')

function makeProgressBar(percent) {
  const total = 10
  let filled = Math.round((percent / 100) * total)
  if (filled < 0) filled = 0
  if (filled > total) filled = total
  return '█'.repeat(filled) + '░'.repeat(total - filled)
}

function formatRewardSide(side) {
  if (!side || !side.reward) return []
  const reward = side.reward
  const out = []
  for (const it of reward.countedItems || []) {
    const name = it.type || it.key || 'Item'
    const count = it.count != null ? it.count : 1
    out.push(count > 1 ? name + ' x' + count : name)
  }
  for (const i of reward.items || []) if (i) out.push(String(i))
  if (reward.credits) out.push(Number(reward.credits).toLocaleString('pt-BR') + ' credits')
  return out
}

function getAllInvasionRewardNames(inv) {
  const names = []
  names.push(...formatRewardSide(inv.attacker))
  names.push(...formatRewardSide(inv.defender))
  for (const t of inv.rewardTypes || []) names.push(String(t))
  return names
}

function formatInvasion(inv) {
  const attacker = (inv.attacker && (inv.attacker.faction || inv.attacker.factionKey)) || 'Atacante'
  const defender = (inv.defender && (inv.defender.faction || inv.defender.factionKey)) || 'Defensor'
  const node = inv.node || inv.nodeKey || 'Local desconhecido'

  let reply = '⚔️ *INVASÃO ATIVA*\n\n'
  reply += '🔴 *' + attacker + '* vs *' + defender + '*\n📍 ' + node + '\n'

  const completion = inv.completion != null ? Number(inv.completion) : null
  const count = inv.count != null ? Number(inv.count) : null
  const goal = inv.requiredRuns != null ? Number(inv.requiredRuns) : null

  if (completion != null && !isNaN(completion)) {
    const pct = Math.max(0, Math.min(100, Math.round(completion)))
    reply += '📊 ' + pct + '%\n' + makeProgressBar(pct) + '\n'
  } else if (count != null && goal != null && goal > 0) {
    const pct = Math.max(0, Math.min(100, Math.round((Math.abs(count) / goal) * 100)))
    reply += '📊 ' + Math.abs(count).toLocaleString('pt-BR') + ' / ' + goal.toLocaleString('pt-BR') + '\n' +
      makeProgressBar(pct) + ' ' + pct + '%\n'
  }

  const attRewards = formatRewardSide(inv.attacker)
  const defRewards = formatRewardSide(inv.defender)
  if (attRewards.length) {
    reply += '\n🎁 *' + attacker + ':*\n'
    for (const r of attRewards) reply += '• ' + r + '\n'
  }
  if (defRewards.length) {
    reply += '\n🎁 *' + defender + ':*\n'
    for (const r of defRewards) reply += '• ' + r + '\n'
  }
  if (!attRewards.length && !defRewards.length) reply += '\n_Sem recompensa listada._\n'
  return reply.trim()
}

async function getActiveInvasions() {
  try {
    const res = await axios.get(INVASIONS_URL, { timeout: 15000, headers: { Accept: 'application/json' } })
    const list = Array.isArray(res.data) ? res.data : []
    return list.filter((inv) => {
      if (!inv) return false
      if (inv.completed === true) return false
      if (inv.completion != null && Number(inv.completion) >= 100) return false
      return true
    })
  } catch (e) {
    console.error('Erro invasões:', e.message)
    return []
  }
}

async function getInvasionsMessage() {
  const invasions = await getActiveInvasions()
  if (!invasions.length) return '⚔️ *INVASÕES ATIVAS*\n\nNenhuma invasão ativa.'
  let reply = '⚔️ *INVASÕES ATIVAS*\n\n'
  for (const inv of invasions) {
    reply += formatInvasion(inv)
    reply += '\n\n────────────\n\n'
  }
  return reply.trim()
}

function getInvasionId(inv) {
  return inv.id || inv._id || (String(inv.node || '') + '|' + String(inv.activation || ''))
}

function normalizeInvasionReward(text) {
  const value = String(text || '').trim().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  const rewards = {
    catalyst: { key: 'orokin catalyst', name: 'Orokin Catalyst' },
    'orokin catalyst': { key: 'orokin catalyst', name: 'Orokin Catalyst' },
    reactor: { key: 'orokin reactor', name: 'Orokin Reactor' },
    'orokin reactor': { key: 'orokin reactor', name: 'Orokin Reactor' },
    forma: { key: 'forma', name: 'Forma' },
    fieldron: { key: 'fieldron', name: 'Fieldron' },
    detonite: { key: 'detonite', name: 'Detonite Injector' },
    'detonite injector': { key: 'detonite', name: 'Detonite Injector' },
    mutagen: { key: 'mutagen', name: 'Mutagen Mass' },
    'mutagen mass': { key: 'mutagen', name: 'Mutagen Mass' },
    mutalist: { key: 'mutalist', name: 'Mutalist Alad V Nav Coordinate' },
    'nav coordinate': { key: 'mutalist', name: 'Mutalist Alad V Nav Coordinate' }
  }
  return rewards[value] || null
}

function invasionContainsReward(inv, rewardKey) {
  const key = String(rewardKey || '').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  const names = getAllInvasionRewardNames(inv)
  for (const n of names) {
    const clean = String(n).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    if (clean.indexOf(key) !== -1) return true
  }
  return false
}

module.exports = {
  formatInvasion, getActiveInvasions, getInvasionsMessage,
  getInvasionId, normalizeInvasionReward, invasionContainsReward,
  getAllInvasionRewardNames
}
