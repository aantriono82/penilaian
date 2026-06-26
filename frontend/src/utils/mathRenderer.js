const DELIMITERS = [
  { left: '$$', right: '$$', display: true },
  { left: '\\[', right: '\\]', display: true },
  { left: '$', right: '$', display: false },
  { left: '\\(', right: '\\)', display: false }
]

function getRenderMathInElement() {
  return typeof window !== 'undefined' ? window.renderMathInElement : null
}

async function waitForRenderer(maxAttempts = 40) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const renderer = getRenderMathInElement()
    if (renderer) return renderer
    await new Promise(resolve => window.setTimeout(resolve, 100))
  }
  return null
}

export async function renderMathInContainer(container) {
  if (!container || typeof window === 'undefined') return

  const renderMathInElement = await waitForRenderer()
  if (!renderMathInElement) return

  renderMathInElement(container, {
    delimiters: DELIMITERS,
    throwOnError: false,
    strict: 'ignore',
    ignoredTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code']
  })
}
