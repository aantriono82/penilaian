import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, ShadingType, AlignmentType, BorderStyle
} from 'docx'
import { htmlToDocxStructures } from '../htmlToDocx.js'
import { ZEN_TYPE, getKunciLabel, getKunciTeks } from './index.js'

const FONT = { name: 'Times New Roman' }
const SZ = 20 // 10pt

const NO_BORDER = {
  top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
}

/**
 * Cell paragraf dari HTML string — aman dipakai dalam table cell.
 * Heading options di-drop (heading invalid di dalam cell), formatting inline dipertahankan.
 */
async function htmlToCellParagraphs(html, opts = {}) {
  const structs = await htmlToDocxStructures(html)
  if (structs.length === 0) {
    return [new Paragraph({ children: [new TextRun({ text: '', font: FONT, size: SZ })], ...opts })]
  }
  // drop heading options (invalid di dalam table cell), keep inline formatting
  return structs.map(s => {
    const { heading, alignment, ...safeOpts } = s.options || {}
    return new Paragraph({ children: s.runs, ...safeOpts, ...opts })
  })
}

function keyCell(text) {
  return new TableCell({
    width: { size: 2591, type: WidthType.DXA },
    shading: { type: ShadingType.CLEAR, fill: 'FFF2CC', color: 'auto' },
    margins: { top: 40, bottom: 40, left: 80, right: 80 },
    children: [new Paragraph({
      children: [new TextRun({ text, bold: true, font: FONT, size: SZ })]
    })]
  })
}

function valueCell(children) {
  return new TableCell({
    margins: { top: 40, bottom: 40, left: 80, right: 80 },
    children
  })
}

/** Row dengan key string + value plain string */
function row(key, value) {
  return new TableRow({
    children: [
      keyCell(key),
      valueCell([new Paragraph({
        children: [new TextRun({ text: String(value ?? ''), font: FONT, size: SZ })]
      })])
    ]
  })
}

/** Row dengan key string + value HTML (multi-paragraf, inline image support) */
async function rowHtml(key, html) {
  return new TableRow({
    children: [
      keyCell(key),
      valueCell(await htmlToCellParagraphs(html))
    ]
  })
}

/**
 * Bangun 1 tabel ZenCBT untuk 1 soal.
 */
async function buildSoalTable(soal, nomor) {
  const rows = []

  // No (penanda)
  rows.push(row('No', nomor))
  // Tipe
  rows.push(row('Tipe', ZEN_TYPE[soal.jenis] || soal.jenis))
  if (soal.stimulus_content) rows.push(await rowHtml('Stimulus', soal.stimulus_content))
  // Teks (HTML)
  rows.push(await rowHtml('Teks', soal.pertanyaan))

  switch (soal.jenis) {
    case 'pg':
    case 'pgk': {
      // Opsi A, B, C...
      for (const o of soal.opsi || []) {
        rows.push(await rowHtml(o.label, o.teks))
      }
      // KJ
      rows.push(row('KJ', getKunciLabel(soal.opsi) || '-'))
      // Parsial untuk PGK
      if (soal.jenis === 'pgk') {
        const isPartial = (soal.opsi || []).filter(o => o.is_benar).length > 1
        rows.push(row('Parsial', isPartial ? 'Y' : 'N'))
      }
      break
    }
    case 'isian': {
      // KJ = jawaban benar (label "Kunci"). Alternatif dipisah "|"
      rows.push(row('KJ', getKunciTeks(soal.opsi) || '-'))
      break
    }
    case 'essay': {
      // KJ opsional, sebagai rubrik → pakai pembahasan jika ada
      const rubrik = soal.pembahasan || getKunciTeks(soal.opsi)
      if (rubrik) rows.push(await rowHtml('KJ', rubrik))
      break
    }
    case 'benar_salah': {
      // Best-effort: Atiga Asesmen simpan 1 pernyataan + 2 opsi (Benar/Salah).
      // Map ke format matriks Zen: kolom_jawaban=Benar,Salah; P1=pernyataan; KJ1=benar.
      rows.push(row('kolom_jawaban', 'Benar, Salah'))
      rows.push(row('input_type', 'radio'))
      const pernyataan = soal.pertanyaan
      rows.push(await rowHtml('P1', pernyataan))
      const benarOpt = (soal.opsi || []).find(o => o.is_benar)
      const kj = benarOpt?.label === 'Benar' || benarOpt?.label === 'Salah'
        ? benarOpt.label
        : (benarOpt ? 'Benar' : 'Salah')
      rows.push(row('KJ1', kj))
      break
    }
    case 'menjodohkan': {
      // Best-effort: Atiga Asesmen tidak punya struktur pasangan yang jelas.
      // Asumsi: opsi adalah pasangan label→teks. P1/KJ1 = pasangan ke-1, dst.
      const pilihan = (soal.opsi || []).map(o => o.label).join(', ')
      rows.push(row('Pilihan', pilihan || '-'))
      for (let i = 0; i < (soal.opsi || []).length; i++) {
        const o = soal.opsi[i]
        rows.push(await rowHtml(`P${i + 1}`, o.label))
        rows.push(row(`KJ${i + 1}`, o.teks))
      }
      break
    }
  }

  // Field umum
  rows.push(row('Bobot', soal.skor ?? 1))
  if (soal.pembahasan) rows.push(await rowHtml('Pembahasan', soal.pembahasan))
  rows.push(row('Tingkat_Kesulitan', soal.tingkat_kesulitan || 'sedang'))

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: NO_BORDER,
    rows
  })
}

/**
 * Export ZenCBT: setiap soal = 1 tabel 2-kolom (Key|Value).
 * Antar tabel dipisahkan paragraf kosong.
 */
export async function exportZenCbt({ soal, layout, options = {} }) {
  const startNumber = options.startNumber ?? layout?.startNumber ?? 1

  const children = []

  // Judul atas (opsional, tidak wajib di format Zen)
  if (layout?.institution) {
    children.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: layout.institution, bold: true, font: FONT, size: SZ + 4 })]
    }))
  }
  if (layout?.title) {
    children.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: layout.title, bold: true, font: FONT, size: SZ + 4 })]
    }))
    children.push(new Paragraph({ children: [new TextRun({ text: '', font: FONT, size: SZ })] }))
  }

  for (let i = 0; i < soal.length; i++) {
    const table = await buildSoalTable(soal[i], startNumber + i)
    children.push(table)
    // Pemisah: minimal 1 baris kosong antar tabel
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
