import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const HANGUL = /[\u1100-\u11ff\u3130-\u318f\uac00-\ud7af]/u;
const FORBIDDEN = [
  /PWA reality/i,
  /\bFounder QA\b/i,
  /\bnative\b/i,
  /native share/i,
  /share[- ]sheet/i,
  /Apple Developer/i,
  /roadmap/i,
  /test capture/i,
  /native direction/i,
  /PWA limits/i,
  /limitations?/i,
  /can come later/i,
  /calendar save comes later/i,
  /prototype/i,
  /closed beta/i,
  /maker-facing/i
];

const uiFiles = [
  'src/App.tsx',
  'src/components/AlarmSelector.tsx',
  'src/components/BottomNav.tsx',
  'src/components/AppHeader.tsx',
  'src/components/BrandMark.tsx',
  'src/components/CaptureCandidateCard.tsx',
  'src/components/EventExportPanel.tsx',
  'src/components/NowCard.tsx',
  'src/components/TaskCard.tsx',
  'src/components/TaskEditor.tsx',
  'src/components/UpcomingPanel.tsx',
  'src/lib/brand.ts',
  'src/data/sampleTasks.ts',
  'public/manifest.webmanifest',
  'index.html'
];
const textExtensions = new Set(['.ts', '.tsx', '.css', '.html', '.webmanifest', '.svg', '.json', '.md']);
const requiredPaths = [
  'src/components/AppHeader.tsx',
  'src/components/BrandMark.tsx',
  'src/lib/brand.ts',
  'public/icon.svg',
  'public/apple-touch-icon.png',
  'public/icon-192.png',
  'public/icon-512.png'
];

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      return walk(fullPath);
    }

    return [fullPath];
  });
}

function relative(filePath) {
  return path.relative(ROOT, filePath).replaceAll('\\', '/');
}

function read(relativePath) {
  return readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function isTextFile(filePath) {
  return textExtensions.has(path.extname(filePath).toLowerCase());
}

const issues = [];

for (const filePath of walk(path.join(ROOT, 'src'))) {
  const rel = relative(filePath);

  if (HANGUL.test(readFileSync(filePath, 'utf8'))) {
    issues.push(`Hangul found in ${rel}`);
  }
}

for (const filePath of walk(path.join(ROOT, 'public'))) {
  if (!isTextFile(filePath)) {
    continue;
  }

  const rel = relative(filePath);
  const contents = readFileSync(filePath, 'utf8');

  if (HANGUL.test(contents)) {
    issues.push(`Hangul found in ${rel}`);
  }
}

if (HANGUL.test(read('index.html'))) {
  issues.push('Hangul found in index.html');
}

for (const filePath of uiFiles) {
  const contents = read(filePath);

  for (const pattern of FORBIDDEN) {
    if (pattern.test(contents)) {
      issues.push(`Forbidden internal phrase matched ${pattern} in ${filePath}`);
    }
  }
}

const styles = read('src/styles.css');

if (!/\.bottom-nav\s*\{[\s\S]*?position:\s*fixed;/m.test(styles)) {
  issues.push('The .bottom-nav CSS block must include position: fixed.');
}

for (const filePath of requiredPaths) {
  if (!existsSync(path.join(ROOT, filePath))) {
    issues.push(`Required launch file is missing: ${filePath}`);
  }
}

const manifest = JSON.parse(read('public/manifest.webmanifest'));

if (manifest.name !== "What's Next") {
  issues.push(`Manifest name must be "What's Next" but was "${manifest.name ?? 'missing'}".`);
}

if (issues.length > 0) {
  console.error('UI readiness checks failed:\n');
  issues.forEach((issue) => console.error(`- ${issue}`));
  process.exit(1);
}

const checkedFiles = uiFiles.length + walk(path.join(ROOT, 'src')).length + walk(path.join(ROOT, 'public')).length + 1;
console.log(`UI readiness checks passed across ${checkedFiles} files.`);
