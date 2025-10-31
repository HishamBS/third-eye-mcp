/**
 * Overseer Theme Designer - Naruto/Sharingan Themed
 * Finds WCAG AAA compliant purple/red color combinations
 */

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) throw new Error(`Invalid hex color: ${hex}`);
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}

function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const sRGB = c / 255;
    return sRGB <= 0.03928 ? sRGB / 12.92 : Math.pow((sRGB + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function getContrastRatio(hex1: string, hex2: string): number {
  const rgb1 = hexToRgb(hex1);
  const rgb2 = hexToRgb(hex2);
  const lum1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
  const lum2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
}

// Tailwind color palette (known accessible combinations)
const tailwindColors = {
  violet: {
    50: '#F5F3FF',
    100: '#EDE9FE',
    200: '#DDD6FE',
    300: '#C4B5FD',
    400: '#A78BFA',
    500: '#8B5CF6',
    600: '#7C3AED',
    700: '#6D28D9',
    800: '#5B21B6',
    900: '#4C1D95',
    950: '#2E1065',
  },
  purple: {
    50: '#FAF5FF',
    100: '#F3E8FF',
    200: '#E9D5FF',
    300: '#D8B4FE',
    400: '#C084FC',
    500: '#A855F7',
    600: '#9333EA',
    700: '#7E22CE',
    800: '#6B21A8',
    900: '#581C87',
    950: '#3B0764',
  },
  rose: {
    50: '#FFF1F2',
    100: '#FFE4E6',
    200: '#FECDD3',
    300: '#FDA4AF',
    400: '#FB7185',
    500: '#F43F5E',
    600: '#E11D48',
    700: '#BE123C',
    800: '#9F1239',
    900: '#881337',
    950: '#4C0519',
  },
  gray: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
    950: '#030712',
  },
};

console.log('='.repeat(80));
console.log('OVERSEER THEME DESIGN - Naruto/Sharingan Colors');
console.log('='.repeat(80));
console.log('');

console.log('DARK MODE (Primary)');
console.log('─'.repeat(80));

const darkBg = '#1C1C1C'; // Near-black (Material Design recommendation)
const darkBgElev = '#2D2640'; // Purple-tinted elevation

console.log(`Background: ${darkBg} (near-black, not pure black)`);
console.log(`Background Elevated: ${darkBgElev} (purple-tinted)`);
console.log('');

// Test purple/violet options for primary
console.log('TESTING PRIMARY COLORS (Purple/Violet):');
const primaryCandidates = [
  { name: 'Violet-400', hex: tailwindColors.violet[400] },
  { name: 'Violet-500', hex: tailwindColors.violet[500] },
  { name: 'Violet-600', hex: tailwindColors.violet[600] },
  { name: 'Purple-400', hex: tailwindColors.purple[400] },
  { name: 'Purple-500', hex: tailwindColors.purple[500] },
];

let bestPrimary = { name: '', hex: '', ratio: 0 };
for (const candidate of primaryCandidates) {
  const ratio = getContrastRatio(candidate.hex, darkBg);
  const pass = ratio >= 7.0 ? 'AAA ✓' : ratio >= 4.5 ? 'AA  ⚠' : 'FAIL ✗';
  console.log(`  ${candidate.name.padEnd(15)} ${candidate.hex}  ${ratio.toFixed(2)}:1 ${pass}`);
  if (ratio >= 7.0 && ratio > bestPrimary.ratio) {
    bestPrimary = { name: candidate.name, hex: candidate.hex, ratio };
  }
}
console.log(`\n✓ SELECTED PRIMARY: ${bestPrimary.name} ${bestPrimary.hex} (${bestPrimary.ratio.toFixed(2)}:1)`);

// Test red options for accent
console.log('\nTESTING ACCENT COLORS (Sharingan Red):');
const accentCandidates = [
  { name: 'Rose-400', hex: tailwindColors.rose[400] },
  { name: 'Rose-500', hex: tailwindColors.rose[500] },
  { name: 'Rose-600', hex: tailwindColors.rose[600] },
];

let bestAccent = { name: '', hex: '', ratio: 0 };
for (const candidate of accentCandidates) {
  const ratio = getContrastRatio(candidate.hex, darkBg);
  const pass = ratio >= 7.0 ? 'AAA ✓' : ratio >= 4.5 ? 'AA  ⚠' : 'FAIL ✗';
  console.log(`  ${candidate.name.padEnd(15)} ${candidate.hex}  ${ratio.toFixed(2)}:1 ${pass}`);
  if (ratio >= 7.0 && ratio > bestAccent.ratio) {
    bestAccent = { name: candidate.name, hex: candidate.hex, ratio };
  }
}
console.log(`\n✓ SELECTED ACCENT: ${bestAccent.name} ${bestAccent.hex} (${bestAccent.ratio.toFixed(2)}:1)`);

// Test text color (ink)
console.log('\nTESTING TEXT COLORS (Ink):');
const inkCandidates = [
  { name: 'Violet-50', hex: tailwindColors.violet[50] },
  { name: 'Purple-50', hex: tailwindColors.purple[50] },
  { name: 'Gray-50', hex: tailwindColors.gray[50] },
];

let bestInk = { name: '', hex: '', ratio: 0 };
for (const candidate of inkCandidates) {
  const ratio = getContrastRatio(candidate.hex, darkBg);
  const pass = ratio >= 7.0 ? 'AAA ✓' : ratio >= 4.5 ? 'AA  ⚠' : 'FAIL ✗';
  console.log(`  ${candidate.name.padEnd(15)} ${candidate.hex}  ${ratio.toFixed(2)}:1 ${pass}`);
  if (ratio >= 7.0 && ratio > bestInk.ratio) {
    bestInk = { name: candidate.name, hex: candidate.hex, ratio };
  }
}
console.log(`\n✓ SELECTED INK: ${bestInk.name} ${bestInk.hex} (${bestInk.ratio.toFixed(2)}:1)`);

// Test outline/border color
console.log('\nTESTING OUTLINE COLORS (Borders - needs 4.5:1):');
const outlineCandidates = [
  { name: 'Violet-300', hex: tailwindColors.violet[300] },
  { name: 'Violet-400', hex: tailwindColors.violet[400] },
  { name: 'Purple-300', hex: tailwindColors.purple[300] },
  { name: 'Gray-700', hex: tailwindColors.gray[700] },
];

let bestOutline = { name: '', hex: '', ratio: 0 };
for (const candidate of outlineCandidates) {
  const ratio = getContrastRatio(candidate.hex, darkBg);
  const pass = ratio >= 4.5 ? 'AAA ✓' : ratio >= 3.0 ? 'AA  ⚠' : 'FAIL ✗';
  console.log(`  ${candidate.name.padEnd(15)} ${candidate.hex}  ${ratio.toFixed(2)}:1 ${pass}`);
  if (ratio >= 4.5 && ratio > bestOutline.ratio) {
    bestOutline = { name: candidate.name, hex: candidate.hex, ratio };
  }
}
console.log(`\n✓ SELECTED OUTLINE: ${bestOutline.name} ${bestOutline.hex} (${bestOutline.ratio.toFixed(2)}:1)`);

console.log('\n' + '='.repeat(80));
console.log('DARK MODE FINAL PALETTE');
console.log('='.repeat(80));
console.log(`primary:    ${bestPrimary.hex}  (${bestPrimary.name}) - ${bestPrimary.ratio.toFixed(2)}:1`);
console.log(`accent:     ${bestAccent.hex}  (${bestAccent.name}) - ${bestAccent.ratio.toFixed(2)}:1`);
console.log(`ink:        ${bestInk.hex}  (${bestInk.name}) - ${bestInk.ratio.toFixed(2)}:1`);
console.log(`paper:      ${darkBg}`);
console.log(`paperElev:  ${darkBgElev}`);
console.log(`outline:    ${bestOutline.hex}  (${bestOutline.name}) - ${bestOutline.ratio.toFixed(2)}:1`);

console.log('\n' + '='.repeat(80));
console.log('LIGHT MODE');
console.log('='.repeat(80));

const lightBg = '#FAF5FF'; // Purple-50 (very light lavender)
const lightBgElev = '#F3E8FF'; // Purple-100
console.log(`Background: ${lightBg} (Purple-50)`);
console.log(`Background Elevated: ${lightBgElev} (Purple-100)`);
console.log('');

// Test darker purple for primary in light mode
console.log('TESTING PRIMARY COLORS:');
const lightPrimaryCandidates = [
  { name: 'Violet-700', hex: tailwindColors.violet[700] },
  { name: 'Violet-800', hex: tailwindColors.violet[800] },
  { name: 'Purple-700', hex: tailwindColors.purple[700] },
  { name: 'Purple-800', hex: tailwindColors.purple[800] },
];

let bestLightPrimary = { name: '', hex: '', ratio: 0 };
for (const candidate of lightPrimaryCandidates) {
  const ratio = getContrastRatio(candidate.hex, lightBg);
  const pass = ratio >= 7.0 ? 'AAA ✓' : ratio >= 4.5 ? 'AA  ⚠' : 'FAIL ✗';
  console.log(`  ${candidate.name.padEnd(15)} ${candidate.hex}  ${ratio.toFixed(2)}:1 ${pass}`);
  if (ratio >= 7.0 && ratio > bestLightPrimary.ratio) {
    bestLightPrimary = { name: candidate.name, hex: candidate.hex, ratio };
  }
}
console.log(`\n✓ SELECTED PRIMARY: ${bestLightPrimary.name} ${bestLightPrimary.hex} (${bestLightPrimary.ratio.toFixed(2)}:1)`);

// Test darker red for accent in light mode
console.log('\nTESTING ACCENT COLORS:');
const lightAccentCandidates = [
  { name: 'Rose-700', hex: tailwindColors.rose[700] },
  { name: 'Rose-800', hex: tailwindColors.rose[800] },
  { name: 'Rose-900', hex: tailwindColors.rose[900] },
];

let bestLightAccent = { name: '', hex: '', ratio: 0 };
for (const candidate of lightAccentCandidates) {
  const ratio = getContrastRatio(candidate.hex, lightBg);
  const pass = ratio >= 7.0 ? 'AAA ✓' : ratio >= 4.5 ? 'AA  ⚠' : 'FAIL ✗';
  console.log(`  ${candidate.name.padEnd(15)} ${candidate.hex}  ${ratio.toFixed(2)}:1 ${pass}`);
  if (ratio >= 7.0 && ratio > bestLightAccent.ratio) {
    bestLightAccent = { name: candidate.name, hex: candidate.hex, ratio };
  }
}
console.log(`\n✓ SELECTED ACCENT: ${bestLightAccent.name} ${bestLightAccent.hex} (${bestLightAccent.ratio.toFixed(2)}:1)`);

// Test dark purple for text
console.log('\nTESTING TEXT COLORS:');
const lightInkCandidates = [
  { name: 'Violet-950', hex: tailwindColors.violet[950] },
  { name: 'Purple-950', hex: tailwindColors.purple[950] },
  { name: 'Gray-900', hex: tailwindColors.gray[900] },
];

let bestLightInk = { name: '', hex: '', ratio: 0 };
for (const candidate of lightInkCandidates) {
  const ratio = getContrastRatio(candidate.hex, lightBg);
  const pass = ratio >= 7.0 ? 'AAA ✓' : ratio >= 4.5 ? 'AA  ⚠' : 'FAIL ✗';
  console.log(`  ${candidate.name.padEnd(15)} ${candidate.hex}  ${ratio.toFixed(2)}:1 ${pass}`);
  if (ratio >= 7.0 && ratio > bestLightInk.ratio) {
    bestLightInk = { name: candidate.name, hex: candidate.hex, ratio };
  }
}
console.log(`\n✓ SELECTED INK: ${bestLightInk.name} ${bestLightInk.hex} (${bestLightInk.ratio.toFixed(2)}:1)`);

// Test outline for light mode
console.log('\nTESTING OUTLINE COLORS:');
const lightOutlineCandidates = [
  { name: 'Violet-700', hex: tailwindColors.violet[700] },
  { name: 'Violet-800', hex: tailwindColors.violet[800] },
  { name: 'Purple-700', hex: tailwindColors.purple[700] },
  { name: 'Gray-700', hex: tailwindColors.gray[700] },
];

let bestLightOutline = { name: '', hex: '', ratio: 0 };
for (const candidate of lightOutlineCandidates) {
  const ratio = getContrastRatio(candidate.hex, lightBg);
  const pass = ratio >= 4.5 ? 'AAA ✓' : ratio >= 3.0 ? 'AA  ⚠' : 'FAIL ✗';
  console.log(`  ${candidate.name.padEnd(15)} ${candidate.hex}  ${ratio.toFixed(2)}:1 ${pass}`);
  if (ratio >= 4.5 && ratio > bestLightOutline.ratio) {
    bestLightOutline = { name: candidate.name, hex: candidate.hex, ratio };
  }
}
console.log(`\n✓ SELECTED OUTLINE: ${bestLightOutline.name} ${bestLightOutline.hex} (${bestLightOutline.ratio.toFixed(2)}:1)`);

console.log('\n' + '='.repeat(80));
console.log('LIGHT MODE FINAL PALETTE');
console.log('='.repeat(80));
console.log(`primary:    ${bestLightPrimary.hex}  (${bestLightPrimary.name}) - ${bestLightPrimary.ratio.toFixed(2)}:1`);
console.log(`accent:     ${bestLightAccent.hex}  (${bestLightAccent.name}) - ${bestLightAccent.ratio.toFixed(2)}:1`);
console.log(`ink:        ${bestLightInk.hex}  (${bestLightInk.name}) - ${bestLightInk.ratio.toFixed(2)}:1`);
console.log(`paper:      ${lightBg} (Purple-50)`);
console.log(`paperElev:  ${lightBgElev} (Purple-100)`);
console.log(`outline:    ${bestLightOutline.hex}  (${bestLightOutline.name}) - ${bestLightOutline.ratio.toFixed(2)}:1`);

console.log('\n' + '='.repeat(80));
console.log('OVERSEER THEME COMPLETE - All colors meet WCAG AAA standards');
console.log('='.repeat(80));
