const routes = []

/**
 * @param {RegExp} regex
 * @param {(ctx) => Promise<void>} handler
 * @param {{admin?: boolean, name?: string}} opts
 */
function register(regex, handler, opts = {}) {
  routes.push({
    regex,
    handler,
    admin: !!opts.admin,
    name: opts.name || regex.source.slice(0, 30)
  })
}

function resolve(text) {
  for (const r of routes) {
    const m = text.match(r.regex)
    if (m) return { ...r, match: m }
  }
  return null
}

module.exports = { register, resolve, routes }
