import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, ShadingType, AlignmentType, BorderStyle
} from 'docx'
import { htmlToDocxStructures } from '../htmlToDocx.js'
import { EXO_TYPE, getKunciLabel, getKunciTeks } from './index.js'

const FONT = { name: 'Calibri' }
const SZ = 18 // 9pt (sesuai template asli ExoCBT)

const NO_BORDER = {
  top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
}

// Warna shading per grup baris (sesuai template asli)
const SH_YELLOW = 'FFF2CC'  // TS, KD
const SH_GREEN  = 'E2EFD9'  // KJ, ABS
const SH_BLUE   = 'DEEAF6'  // nomor soal

/**
 * Paragraf dari HTML string — aman di table cell.
 * Heading options di-drop (invalid di dalam cell).
 */
async function htmlToCellParagraphs(html, opts = {}) {
  const structs = await htmlToDocxStructures(html)
  if (structs.length === 0) {
    return [new Paragraph({ children: [new TextRun({ text: '', font: FONT, size: SZ })], ...opts })]
  }
  return structs.map(s => {
    const { heading, alignment, ...safeOpts } = s.options || {}
    return new Paragraph({ children: s.runs, ...safeOpts, ...opts })
  })
}

function mkRun(text, extra = {}) {
  return new TextRun({ text, font: FONT, size: SZ, ...extra })
}

/** Cell key (kolom kiri) — tidak bold (beda dari ZenCBT) */
function keyCell(text, fill = SH_YELLOW) {
  return new TableCell({
    width: { size: 466, type: WidthType.DXA },
    shading: { type: ShadingType.CLEAR, fill, color: 'auto' },
    margins: { top: 40, bottom: 40, left: 80, right: 80 },
    children: [new Paragraph({ children: [mkRun(text)] })]
  })
}

/** Cell value (kolom kanan) */
function valueCell(children, fill = null) {
  const opts = {
    margins: { top: 40, bottom: 40, left: 80, right: 80 },
    children
  }
  if (fill) opts.shading = { type: ShadingType.CLEAR, fill, color: 'auto' }
  return new TableCell(opts)
}

/** Row dengan key + value plain string */
function row(key, value, keyFill = SH_YELLOW, valFill = null) {
  return new TableRow({
    children: [
      keyCell(key, keyFill),
      valueCell([new Paragraph({ children: [mkRun(String(value ?? ''))] })], valFill)
    ]
  })
}

/** Row dengan key + value dari HTML */
async function rowHtml(key, html, keyFill = SH_YELLOW, valFill = null) {
  return new TableRow({
    children: [
      keyCell(key, keyFill),
      valueCell(await htmlToCellParagraphs(html), valFill)
    ]
  })
}

/**
 * Bangun 1 tabel ExoCBT Template 2 untuk 1 soal.
 */
async function buildSoalTable(soal, nomor) {
  const rows = []
  const kode = EXO_TYPE[soal.jenis] || 'PG'

  // ── Baris 1-2: TS (kode tipe), KD ──
  rows.push(row('TS', kode, SH_YELLOW, SH_YELLOW))
  rows.push(row('KD', '', SH_YELLOW, SH_YELLOW)) // SekulKit tidak punya KD

  // ── Baris 3-4: KJ, ABS ──
  let kj = ''
  let abs = ''

  switch (soal.jenis) {
    case 'pg':
    case 'pgk': {
      kj = (getKunciLabel(soal.opsi) || '').replace(/,\s*/g, ',') // "A" atau "A,B,C"
      abs = 'Y' // template asli ExoCBT: PGX selalu ABS=Y
      break
    }
    case 'isian': {
      kj = getKunciTeks(soal.opsi) || ''
      break
    }
    case 'essay': {
      // ESY: KJ = rujukan jawaban (pembahasan jika ada)
      kj = soal.pembahasan || getKunciTeks(soal.opsi) || ''
      break
    }
    case 'menjodohkan': {
      const opsi = soal.opsi || []
      kj = opsi.map((_, i) => {
        const letter = String.fromCharCode(65 + i)
        return `${letter}1-${letter}2`
      }).join(', ')
      abs = 'Y'
      break
    }
    case 'benar_salah': {
      kj = '' // BNR tidak pakai KJ tunggal
      abs = 'Y'
      break
    }
  }

  rows.push(row('KJ', kj, SH_GREEN, SH_GREEN))
  rows.push(row('ABS', abs, SH_GREEN, SH_GREEN))

  // ── Baris 5: nomor → pertanyaan ──
  rows.push(await rowHtml(`${nomor}.`, soal.pertanyaan, SH_BLUE))

  // ── Baris berikutnya: sesuai jenis ──
  switch (soal.jenis) {
    case 'pg':
    case 'pgk': {
      for (const o of soal.opsi || []) {
        rows.push(await rowHtml(o.label, o.teks))
      }
      break
    }
    case 'isian': {
      // SKT: tidak ada opsi, hanya pertanyaan
      break
    }
    case 'essay': {
      // ESY: tidak ada opsi
      break
    }
    case 'benar_salah': {
      // BNR: baris "Y/N" → pernyataan
      const benarOpt = (soal.opsi || []).find(o => o.is_benar)
      const isBenar = benarOpt ? (benarOpt.label === 'Benar' || benarOpt.label !== 'Salah') : false
      rows.push(await rowHtml(isBenar ? 'Y' : 'N', soal.pertanyaan))
      break
    }
    case 'menjodohkan': {
      // JD: A1→label, A2→teks, B1→label, B2→teks, ...
      for (let i = 0; i < (soal.opsi || []).length; i++) {
        const o = soal.opsi[i]
        const letter = String.fromCharCode(65 + i)
        rows.push(await rowHtml(`${letter}1`, o.label))
        rows.push(await rowHtml(`${letter}2`, o.teks))
      }
      break
    }
  }

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: NO_BORDER,
    rows
  })
}

/**
 * Export ExoCBT Template 2: setiap soal = 1 tabel 2-kolom (Key|Value).
 * Kolom kiri: key (TS, KD, KJ, ABS, nomor, A/B/C...).
 * Kolom kanan: value.
 *
 * Shading: TS/KD = kuning, KJ/ABS = hijau, nomor = biru, opsi = clear.
 * Font: Calibri 9pt, kolom kiri tidak bold.
 */
export async function exportExoCbt({ soal, layout, options = {} }) {
  const startNumber = options.startNumber ?? layout?.startNumber ?? 1

  const children = []

  // Header opsional (bukan bagian format wajib ExoCBT)
  if (layout?.institution || layout?.title) {
    if (layout.institution) {
      children.push(new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: layout.institution, bold: true, font: FONT, size: SZ + 4 })]
      }))
    }
    if (layout.title) {
      children.push(new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: layout.title, bold: true, font: FONT, size: SZ + 4 })]
      }))
    }
    children.push(new Paragraph({ children: [new TextRun({ text: '', font: FONT, size: SZ })] }))
    children.push(new Paragraph({ children: [new TextRun({ text: '', font: FONT, size: SZ })] }))
  }

  for (let i = 0; i < soal.length; i++) {
    const table = await buildSoalTable(soal[i], startNumber + i)
    children.push(table)
    // Pemisah: 1 paragraf kosong antar tabel
    children.push(new Paragraph({ children: [new TextRun({ text: '', font: FONT, size: SZ })] }))
  }

  const doc = new Document({
    sections: [{
      properties: { page: { margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 } } },
      children
    }]
  })

  return Packer.toBlob(doc)
}
