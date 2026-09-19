const { register } = require('../../handlers/registry')
const { httpGet } = require('../../lib/http')
const {
  findDisposition, resolveRivenCategory, getConfigKey, gradeOneStat
} = require('./disposition')
const { RIVEN_STAT_LABEL } = require('./stats')
const { analyzeRivenMeta, formatMetaBlock } = require('./meta')
const { getOfficialRivenMedian } = require('./weekly')
const { fmtPlat } = require('../../lib/text')

function extractAuctionId(input) {
  const s = String(input || '').trim()
  const m = s.match(/auction\/([a-f0-9]+)/i)
  if (m) return m[1]
  if (/^[a-f0-9]{20,}$/i.test(s)) return s
  return null
}

async function fetchAuctionById(id) {
  const res = await httpGet('https://api.warframe.market/v1/auctions/entry/' + id, {
    headers: {
      Platform: 'pc', Language: 'en', Accept: 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Origin: 'https://warframe.market',
      Referer: 'https://warframe.market/'
    }
  })
  return res.data && res.data.payload && res.data.payload.auction
}

async function getRivenGradeMessage(rawInput) {
  const id = extractAuctionId(rawInput)
  if (!id) {
    return (
      '❌ *Como usar:*\n!grade <link do auction>\n!grade <id>\n\n' +
      'Ex: !grade https://warframe.market/auction/6a8e1d5e51f7f208aa0db472'
    )
  }
  try {
    const auction = await fetchAuctionById(id)
    if (!auction || !auction.item) return '❌ Anúncio não encontrado.'

    const item = auction.item
    const weapon = item.weapon_url_name || '?'
    const rivenName = (item.name || '').replace(/-/g, ' ')
    const attrs = item.attributes || []
    const price = auction.buyout_price != null ? auction.buyout_price : auction.starting_price
    const seller = (auction.owner && (auction.owner.ingame_name || auction.owner.slug)) || '?'
    const status = (auction.owner && auction.owner.status) || '?'
    const rank = item.mod_rank != null ? item.mod_rank : '?'
    const rerolls = item.re_rolls != null ? item.re_rolls : '?'
    const mr = item.mastery_level != null ? item.mastery_level : '?'

    const disp = findDisposition(weapon)
    const disposition = disp ? disp.disposition : null
    const wType = disp ? disp.type : 'Rifle'
    const category = resolveRivenCategory(wType)
    const configKey = getConfigKey(attrs)

    let title = weapon.replace(/_/g, ' ')
    if (rivenName) title += ' ' + rivenName
    title = title.replace(/\b\w/g, (c) => c.toUpperCase())

    let reply = '🔫 *' + title + '*\n'
    if (disposition != null) {
      reply += 'Disposition: *' + disposition + '* | ' + configKey + ' | ' + category + '\n'
    } else {
      reply += 'Disposition: *?* | ' + configKey + ' | ' + category + '\n'
      reply += '_Arma não encontrada em dispositions.json_\n'
    }
    reply += 'Rank *' + rank + '* | Rerolls *' + rerolls + '* | MR *' + mr + '*\n'
    reply += '💰 *' + (price != null ? price + 'p' : '?') + '* | ' + seller + ' (' + status + ')\n\n'
    reply += '*Stats:*\n'

    for (const a of attrs) {
      const g = disposition != null
        ? gradeOneStat(a, category, disposition, configKey)
        : {
            label: RIVEN_STAT_LABEL[a.url_name] || a.url_name,
            value: a.value, positive: a.positive !== false,
            grade: null, dev: null
          }
      const sign = g.positive ? '+' : ''
      let line = '• ' + sign + g.value + ' ' + g.label
      if (g.grade) {
        const devStr = (g.dev >= 0 ? '+' : '') + g.dev.toFixed(1) + '%'
        line += ' → *' + g.grade + '* (' + devStr + ')'
      } else if (g.note) line += ' _(' + g.note + ')_'
      reply += line + '\n'
    }

    const analysis = analyzeRivenMeta(weapon, attrs)
    reply += '\n' + formatMetaBlock(analysis)

    try {
      const off = await getOfficialRivenMedian(weapon)
      if (off && off.median != null) {
        reply += '\n📊 Mediana oficial: *' + fmtPlat(off.median) + '*'
        if (price != null && off.median > 0) {
          const diff = Math.round(((price - off.median) / off.median) * 100)
          reply += ' | Anúncio: ' + (diff >= 0 ? '+' : '') + diff + '% vs mediana'
        }
        reply += '\n'
      }
    } catch (e) {}

    reply += '\n🔗 https://warframe.market/auction/' + id
    return reply.trim()
  } catch (e) {
    console.error('!grade:', e.message)
    return '❌ Erro ao buscar/analisar o anúncio.'
  }
}

register(/^!grade\s+(.+)/i, async ({ sock, from, match }) => {
  await sock.sendMessage(from, { text: '📐 Calculando grade...' })
  await sock.sendMessage(from, { text: await getRivenGradeMessage(match[1].trim()) })
})

module.exports = { getRivenGradeMessage, extractAuctionId, fetchAuctionById }
