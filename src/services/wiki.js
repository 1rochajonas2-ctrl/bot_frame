const axios = require('axios')
const { clipText } = require('../lib/text')

async function retrieveWikiFacts(userMessage) {
  try {
    const query = String(userMessage || '').trim()
    if (!query) return null

    let search = query
      .replace(/[?!.,;:]+/g, ' ')
      .replace(/\b(qual|quais|quem|como|onde|quando|porque|por que|história|historia|sobre|me|diz|fala|explique|explica|mostrar|mostra|warframe|no|na|do|da|dos|das|o|a|os|as|um|uma|forma|maneira|jeito|pegar|conseguir|obter|consigo|posso|fazer|faz|para|pra|por|com|em|drop|chance|taxa|custo|quanto|quantas|montar|monta|comprar|compra|vendedor|loja|onde|farmar|farm|r5|rank|máximo|maximo)\b/gi, ' ')
      .replace(/\s+/g, ' ').trim()

    if (search.length < 3) search = query
    const originalSearch = query

    const searchUrl = 'https://wiki.warframe.com/api.php?' + new URLSearchParams({
      action: 'query', list: 'search', srsearch: search, srlimit: '5',
      format: 'json', origin: '*'
    })

    let res = await axios.get(searchUrl, { timeout: 15000 })
    let results = res.data && res.data.query && res.data.query.search

    if (!results || !results.length) {
      const fallbackUrl = 'https://wiki.warframe.com/api.php?' + new URLSearchParams({
        action: 'query', list: 'search', srsearch: originalSearch,
        srlimit: '5', format: 'json', origin: '*'
      })
      res = await axios.get(fallbackUrl, { timeout: 15000 })
      results = res.data && res.data.query && res.data.query.search
    }
    if (!results || !results.length) return null

    const acquisitionQuestion = /\b(conseguir|obter|pegar|drop|chance|taxa|custo|quanto|quantas|montar|comprar|vendedor|loja|farmar|farm|r5|rank|máximo|maximo|como|onde|fazer|upar)\b/i.test(query)

    let pageTitle = results[0].title
    const normalizedQuery = query.toLowerCase()
    const exact = results.find((r) => {
      const t = String(r.title || '').toLowerCase()
      return normalizedQuery.includes(t) || t.includes(normalizedQuery)
    })
    if (exact) pageTitle = exact.title

    const pageUrl = 'https://wiki.warframe.com/api.php?' + new URLSearchParams({
      action: 'parse', page: pageTitle, prop: 'wikitext', format: 'json', origin: '*'
    })
    const pageRes = await axios.get(pageUrl, { timeout: 15000 })
    const wikitext = pageRes.data && pageRes.data.parse && pageRes.data.parse.wikitext && pageRes.data.parse.wikitext['*']
    if (!wikitext) return null

    let text = String(wikitext)
      .replace(/\{\{[^{}]*\}\}/g, ' ')
      .replace(/<ref[^>]*>[\s\S]*?<\/ref>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\[\[([^|\]]+)\|([^\]]+)\]\]/g, '$2')
      .replace(/\[\[([^\]]+)\]\]/g, '$1')
      .replace(/\{\{[^]*?\}\}/g, ' ')
      .replace(/'''?/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/\s+/g, ' ').trim()
    if (!text) return null

    let extraFacts = ''
    if (acquisitionQuestion) {
      try {
        const extraUrl = 'https://wiki.warframe.com/api.php?' + new URLSearchParams({
          action: 'query', list: 'search', srsearch: '"' + pageTitle + '"',
          srlimit: '5', format: 'json', origin: '*'
        })
        const er = await axios.get(extraUrl, { timeout: 15000 })
        const eRes = er.data && er.data.query && er.data.query.search
        if (eRes && eRes.length) extraFacts = eRes.map((r) => r.title).filter(Boolean).join(', ')
      } catch (e) {}
    }

    text = clipText(text, acquisitionQuestion ? 8000 : 6000)
    let output = 'Fonte: WARFRAME Wiki\nPágina: ' + pageTitle + '\n'
    if (acquisitionQuestion) {
      output += 'Tipo de pergunta: obtenção/drop/custo/rank\n'
      if (extraFacts) output += 'Páginas relacionadas: ' + extraFacts + '\n'
    }
    output += 'Conteúdo:\n' + text
    return output
  } catch (e) {
    console.error('RAG wiki:', e.message)
    return null
  }
}

async function getWikiExtract(query) {
  try {
    const url = 'https://wiki.warframe.com/api.php?' + new URLSearchParams({
      action: 'query', generator: 'search', gsrsearch: query, gsrlimit: '1',
      prop: 'extracts', explaintext: '1', exsectionformat: 'plain',
      redirects: '1', format: 'json', origin: '*'
    })
    const res = await axios.get(url, { timeout: 15000 })
    const pages = res.data && res.data.query && res.data.query.pages
    if (!pages) return null
    const firstKey = Object.keys(pages)[0]
    if (!firstKey) return null
    const page = pages[firstKey]
    if (!page || !page.extract || page.extract.length < 40) return null
    return { title: page.title, extract: page.extract }
  } catch (e) {
    console.error('getWikiExtract:', e.message)
    return null
  }
}

module.exports = { retrieveWikiFacts, getWikiExtract }
