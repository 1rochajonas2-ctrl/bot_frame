const { register } = require('../../handlers/registry')
const axios = require('axios')
const { getTopOrders, calcStatsFromOrders } = require('../services/wfm')
const { toSlug, formatTimeLeft } = require('../lib/text')

async function getResurgence() {
  try {
    const res = await axios.get('https://api.warframestat.us/pc/vaultTrader', { timeout: 15000 })
    const data = res.data
    if (!data) return '❌ Sem dados.'

    const start = data.activation ? new Date(data.activation).toLocaleString('pt-BR') : '?'
    const end = data.expiry ? new Date(data.expiry).toLocaleString('pt-BR') : '?'
    const left = data.expiry ? formatTimeLeft(new Date(data.expiry).getTime() - Date.now()) : ''

    const warframes = [], weapons = [], sentinels = [], relics = [], cosmetics = []
    const seen = {}
    const pushUnique = (arr, name) => {
      const k = name.toLowerCase()
      if (seen[k]) return
      seen[k] = true
      arr.push(name)
    }
    const titleCase = (s) => s.toLowerCase().split(' ').map((w) => w ? w.charAt(0).toUpperCase() + w.slice(1) : w).join(' ')

    for (const it of data.inventory || []) {
      const name = (it.item || '').trim()
      const un = it.uniqueName || ''
      if (!name && !un) continue
      if (/\/Packages\//i.test(un) || /MegaPrimeVault/i.test(un)) continue
      if (/BobbleHead|ShipDecos/i.test(un)) continue
      if (/pack|bobble head|accessories/i.test(name) && !/armor set|scarf|syandana|plate/i.test(name)) continue

      let clean = name.replace(/\s*\(.*?\)/g, '').replace(/Power Suit/i, '').replace(/Knuckles/i, '').replace(/\bWeapon\b/i, '').replace(/\s+/g, ' ').trim()
      clean = titleCase(clean)

      if (/VoidProjection|void projection/i.test(un + name)) {
        let tier = 'Relic'
        if (/T1/i.test(un + name)) tier = 'Lith'
        else if (/T2/i.test(un + name)) tier = 'Meso'
        else if (/T3/i.test(un + name)) tier = 'Neo'
        else if (/T4/i.test(un + name)) tier = 'Axi'
        pushUnique(relics, tier)
        continue
      }
      if (/Scarves|Syandana|Armor|Skin|Plate|Mask|Wings|Tail|Shoulder/i.test(un) || /scarf|syandana|armor set|plate|mask|wings|tail/i.test(name)) {
        pushUnique(cosmetics, clean)
        continue
      }
      if (/Powersuits\//i.test(un) && !/Sentinel/i.test(un)) {
        if (!/prime/i.test(clean) && /prime/i.test(un)) clean += ' Prime'
        pushUnique(warframes, clean); continue
      }
      if (/Sentinel/i.test(un)) {
        if (!/prime/i.test(clean) && /prime/i.test(un)) clean += ' Prime'
        pushUnique(sentinels, clean); continue
      }
      if (/Weapons\//i.test(un)) {
        if (!/prime/i.test(clean) && /prime/i.test(un)) clean += ' Prime'
        pushUnique(weapons, clean); continue
      }
    }

    let reply = '♻️ *Prime Resurgence (Varzia)*\n📍 ' + (data.location || "Maroo's Bazaar") + '\n🗓️ ' + start + ' → ' + end + '\n'
    if (left) reply += '⏳ ' + left + '\n'

    const section = async (title, arr, withPrice) => {
      if (!arr.length) return ''
      let t = '\n*' + title + ':*\n'
      for (const n of arr) {
        let priceText = ''
        if (withPrice) {
          priceText = ' —'
          try {
            const slugTry = toSlug(n) + '_set'
            let orders = await getTopOrders(slugTry)
            let stats = calcStatsFromOrders(orders.sell)
            if (!stats) { orders = await getTopOrders(toSlug(n)); stats = calcStatsFromOrders(orders.sell) }
            if (stats) priceText = ' → set min *' + stats.min + 'p*'
          } catch (e) {}
          await new Promise((r) => setTimeout(r, 200))
        }
        t += '• *' + n + '*' + priceText + '\n'
      }
      return t
    }

    reply += await section('Warframes', warframes, true)
    reply += await section('Weapons', weapons, true)
    reply += await section('Sentinels', sentinels, true)
    reply += await section('Relics', relics, false)
    reply += await section('Cosmetics', cosmetics, false)
    if (!warframes.length && !weapons.length && !sentinels.length) reply += '\n_Nenhum prime principal._\n'
    return reply.trim()
  } catch (err) {
    console.error(err.message)
    return '❌ Erro ao buscar Ressurgência.'
  }
}

register(/^!(ressurgencia|resurgence|varzia)$/i, async ({ sock, from }) => {
  await sock.sendMessage(from, { text: '♻️ Buscando Resurgence...' })
  await sock.sendMessage(from, { text: await getResurgence() })
})

module.exports = { getResurgence }
