import { exportDefaultDocx } from './defaultDocx.js'
import { exportZenCbt } from './zenCbt.js'
import { exportExoCbt } from './exoCbt.js'

/**
 * Mapping jenis Atiga Asesmen → kode ExoCBT (TS marker)
 */
export const EXO_TYPE = {
  pg: 'PG',
  pgk: 'PGX',
  essay: 'ESY',
  isian: 'SKT',
  benar_salah: 'BNR',
  menjodohkan: 'JD'
}

/**
 * Mapping jenis Atiga Asesmen → Tipe ZenCBT
 */
export const ZEN_TYPE = {
  pg: 'pg',
  pgk: 'pgk',
  essay: 'essay',
  isian: 'isian',
  benar_salah: 'matriks',
  menjodohkan: 'menjodohkan'
}

/**
 * Jenis yang di-map "bersih" (1:1) ke format CBT.
 * Yang lain (benar_salah, menjodohkan) di-map best-effort.
 */
export const FULLY_SUPPORTED = ['pg', 'pgk', 'essay', 'isian']

/**
 * Dispatch export DOCX sesuai format yang dipilih.
 *
 * @param {object} args
 * @param {'default'|'zen'|'exo'} args.format
 * @param {Array} args.soal - daftar soal hasil filter (dengan opsi)
 * @param {object} args.layout - konfigurasi kop/petunjuk/dst
 * @param {object} args.options - opsi tambahan (startNumber, showKunci, showPembahasan)
 * @returns {Promise<Blob>} docx blob
 */
export async function exportDocx({ format, soal, layout, options }) {
  switch (format) {
    case 'zen':
      return exportZenCbt({ soal, layout, options })
    case 'exo':
      return exportExoCbt({ soal, layout, options })
    case 'default':
    default:
      return exportDefaultDocx({ soal, layout, options })
  }
}

/**
 * Ambil label jawaban benar dari daftar opsi.
 * - PG: "A"
 * - PGK: "A, C, E"
 *
 * @param {Array} opsi - daftar opsi dengan { label, is_benar }
 * @returns {string}
 */
export function getKunciLabel(opsi) {
  if (!opsi?.length) return ''
  const benar = opsi.filter(o => o.is_benar).map(o => o.label)
  return benar.join(', ')
}

/**
 * Ambil teks jawaban benar pertama (untuk isian/essay yang kuncinya
 * disimpan sebagai opsi dengan label "Kunci").
 */
export function getKunciTeks(opsi) {
  if (!opsi?.length) return ''
  const benar = opsi.find(o => o.is_benar) || opsi.find(o => o.label === 'Kunci')
  return benar?.teks || ''
}
