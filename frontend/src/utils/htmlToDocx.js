import { Paragraph, TextRun, ImageRun, HeadingLevel, AlignmentType } from 'docx'
import { parseMixedLatexToDocxChildren } from './latexToDocxMath.js'

/**
 * Fetch image URL → ArrayBuffer
 */
async function fetchImageAsBuffer(url) {
  const fullUrl = url.startsWith('/') ? window.location.origin + url : url
  const res = await fetch(fullUrl)
  if (!res.ok) throw new Error(`Gagal fetch gambar: ${url}`)
  return await res.arrayBuffer()
}

/**
 * Detect image MIME type from buffer
 */
function getMimeType(buffer) {
  const bytes = new Uint8Array(buffer.slice(0, 4))
  if (bytes[0] === 0x89 && bytes[1] === 0x50) return 'image/png'
  if (bytes[0] === 0xFF && bytes[1] === 0xD8) return 'image/jpeg'
  if (bytes[0] === 0x47 && bytes[1] === 0x49) return 'image/gif'
  return 'image/png'
}

/**
 * Convert data URI → ArrayBuffer
 */
function dataUriToBuffer(dataUri) {
  const base64 = dataUri.split(',')[1]
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes.buffer
}

/**
 * Parse inline HTML node → array of TextRun / ImageRun
 * Handles: text, <strong>, <em>, <u>, <s>, <code>, <img>, <br>
 */
async function inlineToRuns(node) {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent
    return text ? parseMixedLatexToDocxChildren(text, value => new TextRun({ text: value })) : []
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return []

  const tag = node.tagName

  // Image → ImageRun
  if (tag === 'IMG') {
    const src = node.getAttribute('src')
    if (!src) return []
    try {
      let buffer
      if (src.startsWith('data:')) {
        buffer = dataUriToBuffer(src)
      } else {
        buffer = await fetchImageAsBuffer(src)
      }
      const mimeType = getMimeType(buffer)
      return [new ImageRun({
        data: buffer,
        transformation: { width: 400, height: 300 },
        type: mimeType
      })]
    } catch (err) {
      console.warn('Gagal embed gambar ke DOCX:', src, err)
      return [new TextRun({ text: `[Gambar: ${src}]`, italics: true, color: '999999' })]
    }
  }

  // Line break
  if (tag === 'BR') {
    return [new TextRun({ break: 1 })]
  }

  // Recurse children with formatting
  const runs = []
  for (const child of node.childNodes) {
    const childRuns = await inlineToRuns(child)
    // Apply formatting
    if (tag === 'STRONG' || tag === 'B') childRuns.forEach(r => { if (r instanceof TextRun) r.root[1].bold = true })
    if (tag === 'EM' || tag === 'I') childRuns.forEach(r => { if (r instanceof TextRun) r.root[1].italics = true })
    if (tag === 'U') childRuns.forEach(r => { if (r instanceof TextRun) r.root[1].underline = {} })
    if (tag === 'S' || tag === 'STRIKE') childRuns.forEach(r => { if (r instanceof TextRun) r.root[1].strike = true })
    if (tag === 'CODE') childRuns.forEach(r => { if (r instanceof TextRun) r.root[1].font = { name: 'Consolas' } })
    runs.push(...childRuns)
  }
  return runs
}

/**
 * Convert block HTML element → array of { runs, options }
 * Returns plain objects instead of Paragraph instances for easier merging
 */
async function blockToStructures(el) {
  const tag = el.tagName

  // Heading
  if (['H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(tag)) {
    const level = parseInt(tag[1])
    const headingMap = {
      1: HeadingLevel.HEADING_1, 2: HeadingLevel.HEADING_2,
      3: HeadingLevel.HEADING_3, 4: HeadingLevel.HEADING_4,
      5: HeadingLevel.HEADING_5, 6: HeadingLevel.HEADING_6
    }
    return [{ runs: await inlineToRuns(el), options: { heading: headingMap[level] || HeadingLevel.HEADING_4 } }]
  }

  // Paragraph
  if (tag === 'P') {
    return [{ runs: await inlineToRuns(el), options: {} }]
  }

  // Horizontal rule
  if (tag === 'HR') {
    return [{ runs: [new TextRun({ text: '─'.repeat(60), color: 'CCCCCC' })], options: { alignment: AlignmentType.CENTER } }]
  }

  // Bullet list
  if (tag === 'UL') {
    const items = []
    for (const li of el.children) {
      if (li.tagName === 'LI') {
        const runs = await inlineToRuns(li)
        items.push({ runs: [new TextRun({ text: '• ' }), ...runs], options: { indent: { left: 360 } } })
      }
    }
    return items
  }

  // Ordered list
  if (tag === 'OL') {
    const items = []
    let num = 1
    for (const li of el.children) {
      if (li.tagName === 'LI') {
        const runs = await inlineToRuns(li)
        items.push({ runs: [new TextRun({ text: `${num}. ` }), ...runs], options: { indent: { left: 360 } } })
        num++
      }
    }
    return items
  }

  // Blockquote
  if (tag === 'BLOCKQUOTE') {
    const runs = await inlineToRuns(el)
    return [{ runs: [new TextRun({ text: '│ ', color: '999999' }), ...runs], options: { indent: { left: 360 } } }]
  }

  // Pre/code block
  if (tag === 'PRE') {
    const text = el.textContent
    return [{ runs: [new TextRun({ text, font: { name: 'Consolas' }, size: 18 })], options: { indent: { left: 360 } } }]
  }

  // Recurse
  const items = []
  for (const child of el.childNodes) {
    if (child.nodeType === Node.TEXT_NODE) {
      const text = child.textContent.trim()
      if (text) items.push({ runs: [new TextRun({ text })], options: {} })
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      items.push(...await blockToStructures(child))
    }
  }
  return items
}

/**
 * Convert HTML string → array of { runs, options } structures
 * Use with buildDocxParagraphs() to create final Paragraph objects
 */
export async function htmlToDocxStructures(html) {
  if (!html) return []

  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  const body = doc.body

  const structures = []
  for (const child of body.childNodes) {
    if (child.nodeType === Node.TEXT_NODE) {
      const text = child.textContent.trim()
      if (text) structures.push({ runs: [new TextRun({ text })], options: {} })
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      structures.push(...await blockToStructures(child))
    }
  }
  return structures
}

/**
 * Build Paragraph array from structures, with optional indent override
 * @param {Array} structures - from htmlToDocxStructures
 * @param {object} overrideOptions - e.g. { indent: { left: 360 } }
 */
export function buildDocxParagraphs(structures, overrideOptions = {}) {
  return structures.map(s => new Paragraph({
    children: s.runs,
    ...s.options,
    ...overrideOptions
  }))
}

/**
 * Convert HTML → plain text
 */
export function htmlToPlainText(html) {
  if (!html) return ''
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  return doc.body.textContent || ''
}
