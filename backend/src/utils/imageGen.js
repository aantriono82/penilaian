// =====================
// Placeholder Image Generator
// AI image generation dihapus — user bikin gambar sendiri
// =====================

const PLACEHOLDER_URL = '/placeholder.png';

export async function generateImage(imagePrompt, mata_pelajaran = '') {
  // Selalu balikin placeholder — user bikin gambar sendiri
  return PLACEHOLDER_URL;
}

export function shouldGenerateImage(soalData) {
  return soalData.need_image === true && typeof soalData.image_prompt === 'string' && soalData.image_prompt.trim().length > 5;
}
