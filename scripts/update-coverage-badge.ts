#!/usr/bin/env bun

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const PROJECT_ROOT = resolve(import.meta.dir, '..');
const COVERAGE_FILE = resolve(PROJECT_ROOT, 'coverage', 'coverage-summary.json');
const BADGE_PATH = resolve(PROJECT_ROOT, 'docs', 'badges', 'coverage.svg');

function readCoverage(): number {
  if (!existsSync(COVERAGE_FILE)) {
    throw new Error(`Coverage summary not found at ${COVERAGE_FILE}. Run pnpm test:coverage first.`);
  }

  const summary = JSON.parse(readFileSync(COVERAGE_FILE, 'utf-8'));
  const statements = summary.total?.statements?.pct;
  if (typeof statements !== 'number') {
    throw new Error('Unable to read statements coverage from coverage-summary.json');
  }

  return Math.round(statements * 10) / 10;
}

function coverageColor(pct: number): string {
  if (pct >= 95) return '#2ecc71';
  if (pct >= 90) return '#27ae60';
  if (pct >= 80) return '#f1c40f';
  return '#e74c3c';
}

function makeBadge(pct: number): string {
  const label = 'coverage';
  const pctText = `${pct.toFixed(1)}%`;
  const color = coverageColor(pct);

  const labelWidth = 75;
  const valueWidth = 80;
  const totalWidth = labelWidth + valueWidth;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="20" role="img" aria-label="${label}: ${pctText}">
  <title>${label}: ${pctText}</title>
  <linearGradient id="smooth" x2="0" y2="100%">
    <stop offset="0" stop-color="#eee" stop-opacity=".7"/>
    <stop offset=".1" stop-color="#fff" stop-opacity=".1"/>
    <stop offset=".9" stop-opacity=".3"/>
    <stop offset="1" stop-opacity=".5"/>
  </linearGradient>
  <mask id="round">
    <rect width="${totalWidth}" height="20" rx="3" fill="#fff"/>
  </mask>
  <g mask="url(#round)">
    <rect width="${labelWidth}" height="20" fill="#555"/>
    <rect x="${labelWidth}" width="${valueWidth}" height="20" fill="${color}"/>
    <rect width="${totalWidth}" height="20" fill="url(#smooth)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="11">
    <text x="${labelWidth / 2}" y="15" fill="#010101" fill-opacity=".3">${label}</text>
    <text x="${labelWidth / 2}" y="14">${label}</text>
    <text x="${labelWidth + valueWidth / 2}" y="15" fill="#010101" fill-opacity=".3">${pctText}</text>
    <text x="${labelWidth + valueWidth / 2}" y="14">${pctText}</text>
  </g>
</svg>`;
}

try {
  const pct = readCoverage();
  const badge = makeBadge(pct);
  writeFileSync(BADGE_PATH, badge);
  console.log(`✅ Coverage badge updated (${pct.toFixed(1)}%) → ${BADGE_PATH}`);
} catch (error) {
  console.error('❌ Failed to update coverage badge:', error instanceof Error ? error.message : error);
  process.exit(1);
}
