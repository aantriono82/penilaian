import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx'
import { htmlToDocxStructures, buildDocxParagraphs } from '../htmlToDocx.js'

/**
 * Export "Default" — dokumen ujian standar (kop + soal + opsi + kunci).
 * Refactor dari logic yang sebelumnya inline di ExportView.vue.
 *
 * @param {object} args
 * @param {Array} args.soal - soal hasil filter
 * @param {object} args.layout - { title, institution, subject, grade, semester, duration, instructions, showPembahasan, showKunci, startNumber }
 * @param {object} args.options - { showPembahasan?, showKunci?, startNumber? } (override dari layout)
 * @returns {Promise<Blob>}
 */
export async function exportDefaultDocx({ soal, layout, options = {} }) {
  const showPembahasan = options.showPembahasan ?? layout?.showPembahasan ?? false
  const showKunci = options.showKunci ?? layout?.showKunci ?? false
  const startNumber = options.startNumber ?? layout?.startNumber ?? 1

  const children = []

  // ── Header ──
  if (layout.institution) {
    children.push(new Paragraph({ text: layout.institution, heading: HeadingLevel.HEADING_2, alignment: AlignmentType.CENTER }))
  }
  children.push(new Paragraph({ text: layout.title || 'SOAL UJIAN', heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER }))
  const meta = [
    layout.subject && `Mata Pelajaran: ${layout.subject}`,
    layout.grade && `Kelas: ${layout.grade}`,
    layout.duration && `Waktu: ${layout.duration} menit`
  ].filter(Boolean).join('   |   ')
  if (meta) children.push(new Paragraph({ text: meta, alignment: AlignmentType.CENTER }))
  children.push(new Paragraph({ text: '' }))

  // ── Petunjuk ──
  if (layout.instructions) {
    children.push(new Paragraph({ children: [new TextRun({ text: 'Petunjuk Umum:', bold: true })] }))
    children.push(new Paragraph({ text: layout.instructions }))
    children.push(new Paragraph({ text: '' }))
  }

  // ── Soal ──
  for (let idx = 0; idx < soal.length; idx++) {
    const s = soal[idx]
    const num = startNumber + idx

    if (s.stimulus_content) {
      children.push(new Paragraph({ children: [new TextRun({ text: 'Stimulus', bold: true })] }))
      const stimulusStructs = await htmlToDocxStructures(s.stimulus_content)
      children.push(...buildDocxParagraphs(stimulusStructs, { indent: { left: 240 } }))
      children.push(new Paragraph({ text: '' }))
    }

    const pertanyaanStructs = await htmlToDocxStructures(s.pertanyaan)
    if (pertanyaanStructs.length > 0) {
      const first = pertanyaanStructs[0]
      first.runs.unshift(new TextRun({ text: `${num}. `, bold: true }))
      children.push(...buildDocxParagraphs(pertanyaanStructs))
    } else {
      children.push(new Paragraph({ children: [new TextRun({ text: `${num}. `, bold: true })] }))
    }

    // Opsi PG/PGK
    if (s.opsi?.length && ['pg', 'pgk'].includes(s.jenis)) {
      for (const o of s.opsi) {
        const opsiStructs = await htmlToDocxStructures(o.teks)
        if (opsiStructs.length > 0) {
          opsiStructs[0].runs.unshift(new TextRun({ text: `${o.label}. ` }))
          children.push(...buildDocxParagraphs(opsiStructs, { indent: { left: 360 } }))
        } else {
          children.push(new Paragraph({ text: `    ${o.label}.`, indent: { left: 360 } }))
        }
      }
    }

    // Isian
    if (s.jenis === 'isian') {
      children.push(new Paragraph({ text: '    Jawaban: ___________________________', indent: { left: 360 } }))
    }

    // Pembahasan
    if (showPembahasan && s.pembahasan) {
      const pembahasanStructs = await htmlToDocxStructures(s.pembahasan)
      children.push(new Paragraph({
        children: [new TextRun({ text: 'Pembahasan: ', bold: true })],
        indent: { left: 360 }
      }))
      children.push(...buildDocxParagraphs(pembahasanStructs, { indent: { left: 540 } }))
    }

    children.push(new Paragraph({ text: '' }))
  }

  // ── Kunci Jawaban ──
  if (showKunci) {
    const pgSoal = soal.filter(s => ['pg', 'pgk'].includes(s.jenis))
    if (pgSoal.length > 0) {
      children.push(new Paragraph({ text: '' }))
      children.push(new Paragraph({ children: [new TextRun({ text: 'KUNCI JAWABAN', bold: true })] }))
      const kunci = pgSoal.map((s, i) => {
        const sIdx = soal.indexOf(s)
        return `${startNumber + sIdx}. ${s.opsi?.find(o => o.is_benar)?.label || '-'}`
      }).join('   ')
      children.push(new Paragraph({ text: kunci }))
    }
  }

  const doc = new Document({
    sections: [{
      properties: { page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
      children
    }]
  })

  return Packer.toBlob(doc)
}
