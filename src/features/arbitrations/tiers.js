const ARBY_TIERS = {
  'Tyana Pass': 'S', 'Alator': 'S', 'Callisto': 'S', 'Xini': 'S', 'Cytherean': 'S',
  'Munio': 'A', 'Seimeni': 'A', 'Cinxia': 'A', 'Casta': 'A', 'Oestrus': 'A', 'Hyf': 'A',
  'Larzac': 'B', 'Sechura': 'B', 'Hydron': 'B', 'Helene': 'B', 'Ose': 'B', 'Akkad': 'B',
  'Kala-azar': 'B', 'Odin': 'B', 'Mithra': 'B', 'Belenus': 'B', 'Taranis': 'B',
  'Coba': 'C', 'Spear': 'C', 'Kadesh': 'C', 'Paimon': 'C', 'Lith': 'C', 'Stephano': 'C',
  'Tessera': 'C', 'Outer Terminus': 'C',
  'Umbriel': 'D', 'Cerberus': 'D', 'Lares': 'D', 'Sangeru': 'D', 'Sinai': 'D',
  'Gulliver': 'D', 'Romula': 'D', 'Proteus': 'D', 'Io': 'D', 'Stöfler': 'D', 'Gaia': 'D',
  'Terrorem': 'Special', 'Ani': 'Special', 'Mot': 'Special', 'Kappa': 'Special',
  'Ur': 'Special', 'Laomedeia': 'Special', 'Apollo': 'Special', 'Ganymede': 'Special'
}
const TIER_EMOJI = { S: '🔵', A: '🟢', B: '🟡', C: '🟠', D: '🟤', F: '🔴', Special: '🟣' }

function getArbyTier(nodeName) {
  if (!nodeName) return 'F'
  const lower = nodeName.toLowerCase()
  for (const [name, tier] of Object.entries(ARBY_TIERS)) {
    if (lower.includes(name.toLowerCase())) return tier
  }
  return 'F'
}

module.exports = { ARBY_TIERS, TIER_EMOJI, getArbyTier }
