const { register } = require('../../handlers/registry')
const { fetchWS } = require('../../services/wfstat')
const { formatTimeLeft } = require('../../lib/text')

async function getFissures() {
  try {
    const list = await fetchWS('fissures')
    if (!list || !list.length) return '❌ Nenhuma fissura ativa.'
    const normal = [], steel = []
    for (const f of list) f.isHard ? steel.push(f) : normal.push(f)
    const sortTier = (a, b) => (a.tierNum || 0) - (b.tierNum || 0)
    normal.sort(sortTier); steel.sort(sortTier)

    const block = (title, arr) => {
      let t = title + '\n'
      if (!arr.length) return t + '_Nenhuma_\n'
      for (const f of arr) {
        const left = f.expiry ? formatTimeLeft(new Date(f.expiry).getTime() - Date.now()) : '?'
        t += '• *' + (f.tier || '?') + '* — ' + (f.missionType || '?') + '\n'
        t += '  ' + (f.node || '?') + ' | ' + (f.enemy || '') + '\n  ⏳ ' + left + '\n'
      }
      return t
    }

    let reply = '🕳️ *Fissuras ativas*\n\n'
    reply += block('*Normais*', normal) + '\n'
    reply += block('⚔️ *Steel Path*', steel)
    return reply.trim()
  } catch (err) {
    console.error(err.message)
    return '❌ Erro ao buscar fissuras.'
  }
}

const FISS_INTEREST_DEFENSE = ['helene','hydron','casta','stephano','io','seimeni','belenus','taranis','hyf','outer terminus','tessera']
const FISS_INTEREST_EXTERMINATE = ['mariana','e prime','oxomoco']

function matchFissNode(node, list) {
  const n = String(node || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  return list.some((s) => n.indexOf(s) !== -1)
}
const isDefenseMission = (t) => /defense|defesa/i.test(String(t || ''))
const isExterminateMission = (t) => /exterminat|exterm[ií]nio/i.test(String(t || ''))
const isCascadeMission = (t) => /cascade|void cascade/i.test(String(t || ''))

function sortExterminatePriority(arr) {
  const priority = (node) => {
    const n = String(node || '').toLowerCase()
    if (/mariana/i.test(n)) return 0
    if (/e prime/i.test(n)) return 1
    if (/oxomoco/i.test(n)) return 2
    return 10
  }
  return arr.slice().sort((a, b) => {
    const pa = priority(a.node), pb = priority(b.node)
    if (pa !== pb) return pa - pb
    return (a.tierNum || 0) - (b.tierNum || 0)
  })
}

async function getInterestingFissures() {
  try {
    const list = await fetchWS('fissures')
    if (!list || !list.length) return '❌ Nenhuma fissura ativa.'

    const normalDef = [], normalEx = [], steelDef = [], steelEx = [], steelCascade = []
    for (const f of list) {
      const node = f.node || '', type = f.missionType || '', isSteel = !!f.isHard
      if (isDefenseMission(type) && matchFissNode(node, FISS_INTEREST_DEFENSE)) {
        (isSteel ? steelDef : normalDef).push(f)
      } else if (isExterminateMission(type)) {
        (isSteel ? steelEx : normalEx).push(f)
      } else if (isSteel && isCascadeMission(type)) {
        steelCascade.push(f)
      }
    }
    const sortTier = (a, b) => (a.tierNum || 0) - (b.tierNum || 0)
    normalDef.sort(sortTier); steelDef.sort(sortTier)
    const sNEx = sortExterminatePriority(normalEx)
    const sSEx = sortExterminatePriority(steelEx)
    steelCascade.sort(sortTier)

    const blockItems = (arr) => {
      if (!arr.length) return '_Nenhuma_\n'
      let t = ''
      for (const f of arr) {
        const left = f.expiry ? formatTimeLeft(new Date(f.expiry).getTime() - Date.now()) : '?'
        t += '• *' + (f.tier || '?') + '* — ' + (f.missionType || '?') + '\n'
        t += '  ' + (f.node || '?') + ' | ' + (f.enemy || '') + '\n  ⏳ ' + left + '\n'
      }
      return t
    }

    const hasAny = normalDef.length || sNEx.length || steelDef.length || sSEx.length || steelCascade.length
    if (!hasAny) return '🕳️ *Fissuras de Interesse*\n\n_Nenhuma no momento._'

    let reply = '🕳️ *Fissuras de Interesse*\n\n'
    reply += '*Normais*\n*Defesa*\n' + blockItems(normalDef)
    reply += '\n*Extermínio*\n' + blockItems(sNEx)
    reply += '\n⚔️ *Steel Path*\n*Defesa*\n' + blockItems(steelDef)
    reply += '\n*Extermínio*\n' + blockItems(sSEx)
    if (steelCascade.length) reply += '\n*Void Cascade*\n' + blockItems(steelCascade)
    return reply.trim()
  } catch (err) {
    console.error(err.message)
    return '❌ Erro ao buscar fissuras de interesse.'
  }
}

register(/^!(fissuras|fissura|fissures)$/i, async ({ sock, from }) => {
  await sock.sendMessage(from, { text: '🕳️ Buscando fissuras...' })
  await sock.sendMessage(from, { text: await getFissures() })
})
register(/^!(fissfarm|fendas|farmfiss|interesse)$/i, async ({ sock, from }) => {
  await sock.sendMessage(from, { text: '🕳️ Buscando...' })
  await sock.sendMessage(from, { text: await getInterestingFissures() })
})

module.exports = { getFissures, getInterestingFissures }
