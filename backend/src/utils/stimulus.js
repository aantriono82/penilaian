export const VALID_STIMULUS_TYPES = ['none', 'text', 'image', 'table', 'diagram', 'graph'];

function stripHtml(html = '') {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function analyzeStimulusContent(rawContent = '') {
  const textContent = stripHtml(rawContent);
  const hasSvg = /<(svg)\b|data:image\/svg\+xml|src=["'][^"']+\.svg(?:\?[^"']*)?["']/i.test(rawContent);
  const hasImage = /<(img|figure|canvas)\b/i.test(rawContent);
  const hasTable = /<table\b/i.test(rawContent);
  const hasVisualMarkup = hasSvg || hasImage || hasTable;
  const hasContent = Boolean(rawContent) && (Boolean(textContent) || hasVisualMarkup);

  return { textContent, hasSvg, hasImage, hasTable, hasVisualMarkup, hasContent };
}

function fallbackStimulusType(analysis) {
  if (analysis.hasTable) return 'table';
  if (analysis.hasSvg) return 'diagram';
  if (analysis.hasImage) return 'image';
  return 'text';
}

export function normalizeStimulus(stimulusType, stimulusContent, options = {}) {
  const mode = options.mode || 'manual';
  const rawContent = typeof stimulusContent === 'string' ? stimulusContent.trim() : '';
  const analysis = analyzeStimulusContent(rawContent);

  if (!analysis.hasContent) {
    return {
      stimulus_type: 'none',
      stimulus_content: null,
      warnings: []
    };
  }

  const requestedType = VALID_STIMULUS_TYPES.includes(stimulusType) ? stimulusType : fallbackStimulusType(analysis);
  const warnings = [];
  const invalidMessages = {
    image: 'Stimulus gambar harus berisi elemen visual seperti <img>, <figure>, <canvas>, atau SVG.',
    table: 'Stimulus tabel harus berisi elemen <table>.',
    diagram: 'Stimulus diagram sebaiknya berisi visual. SVG paling disarankan untuk diagram.',
    graph: 'Stimulus grafik sebaiknya berisi visual. SVG paling disarankan untuk grafik.'
  };

  if (requestedType === 'table' && !analysis.hasTable) {
    if (mode === 'manual') throw new Error(invalidMessages.table);
    warnings.push(invalidMessages.table);
  }

  if (['image', 'diagram', 'graph'].includes(requestedType) && !analysis.hasVisualMarkup) {
    if (mode === 'manual') throw new Error(invalidMessages[requestedType]);
    warnings.push(invalidMessages[requestedType]);
  }

  if (['diagram', 'graph'].includes(requestedType) && !analysis.hasSvg) {
    warnings.push(`Stimulus ${requestedType === 'diagram' ? 'diagram' : 'grafik'} tidak memakai SVG. Tetap disimpan, tetapi SVG lebih disarankan.`);
  }

  let normalizedType = requestedType;
  if (mode !== 'manual') {
    if (requestedType === 'table' && !analysis.hasTable) normalizedType = fallbackStimulusType(analysis);
    if (['image', 'diagram', 'graph'].includes(requestedType) && !analysis.hasVisualMarkup) normalizedType = fallbackStimulusType(analysis);
  }

  if (normalizedType === 'none') normalizedType = fallbackStimulusType(analysis);

  return {
    stimulus_type: normalizedType,
    stimulus_content: rawContent,
    warnings
  };
}
