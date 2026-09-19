// singleton do socket pra ser acessado em qualquer lugar sem passar por parâmetro
let _sock = null
module.exports = {
  setSock: (s) => { _sock = s },
  getSock: () => _sock
}
