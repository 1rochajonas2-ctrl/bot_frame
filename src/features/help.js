const { register } = require('../handlers/registry')

function getHelp() {
  return '🤖 *Comandos do Bot*\n\n' +
    '📊 *!p <item>* — preço\n' +
    '🧩 *!set <nome>* — partes + set\n' +
    '📦 *!relic <tier> <nome>* — drops da relíquia\n' +
    '📍 *!drops <item>* — onde dropa\n' +
    '👤 *!perfil <nome>* — perfil WFM\n\n' +
    '🕳️ *!fissuras* | 🎯 *!fissfarm*\n' +
    '🎯 *!sortie* | 👑 *!archon*\n' +
    '🧪 *!archimedea* | 📅 *!eventos* | 📡 *!nightwave*\n' +
    '🌿 *!cetus* | ❄️ *!vallis* | ☣️ *!deimos*\n\n' +
    '♻️ *!ressurgencia* | 🛸 *!baro*\n' +
    '📅 *!calendario* / *!1999*\n' +
    '⚔️ *!arby* | 🗡️ *!incursao* | 🔥 *!descendia* [2-5|all]\n\n' +
    '🌌 *!zariman* | 🧪 *!lab* | 🏙️ *!hex*\n' +
    '🗺️ *!bounty cetus|fortuna|deimos*\n\n' +
    '⚔️ *!invasoes*\n' +
    '🔫 *!riven <arma>* — preço oficial\n' +
    '🏆 *!highest* [cat] [página]\n' +
    '📐 *!grade <link|id>* — grade + meta\n' +
    '🎯 *!meta <arma>* / *!grol <arma>*\n' +
    '🏆 *!rivendb* [N] [pop] [rolled]\n' +
    '📜 *!acrithis*\n\n' +
    '🔔 *!alertainvasao <item>*\n' +
    '🔔 *!alerta item <=40*\n' +
    '🎯 *!alertariven <arma> [stats] [meta] [max N]*\n' +
    '📅 *!snipeweek* [N] [pop|price]\n\n' +
    '📜 *!i <item>* | 🧠 *!g <pergunta>* | 🧹 *!limpar*\n' +
    '❓ *!ajuda*'
}

register(/^!(ajuda|h|help)$/i, async ({ sock, from }) => {
  await sock.sendMessage(from, { text: getHelp() })
})

module.exports = { getHelp }
