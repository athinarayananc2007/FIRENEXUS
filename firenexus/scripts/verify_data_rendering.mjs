import { execSync } from 'child_process';
import { rmSync, mkdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:5173';

const PAGES = [
  { path: '/analytics', name: 'Analytics' },
  { path: '/dashboard', name: 'Dashboard' },
  { path: '/data', name: 'Data Explorer' },
  { path: '/calendar', name: 'Fire Calendar' },
  { path: '/comparison', name: 'Comparison' },
  { path: '/explorer', name: 'Earth Explorer' },
  { path: '/anomaly', name: 'Anomaly Explorer' },
  { path: '/about', name: 'About' },
  { path: '/', name: 'Landing' },
];

function testPage(page) {
  const url = `${BASE_URL}${page.path}`;
  const tempDir = join(tmpdir(), `chk_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`);
  mkdirSync(tempDir, { recursive: true });

  try {
    const is3D = page.path === '/explorer';
    const timeBudget = is3D ? 1500 : 3000;
    const timeout = is3D ? 45000 : 25000;

    const cmd = `"${CHROME_PATH}" --headless=new --no-sandbox --disable-gpu --user-data-dir="${tempDir}" --virtual-time-budget=${timeBudget} --dump-dom "${url}"`;
    const dom = execSync(cmd, { encoding: 'utf-8', timeout, maxBuffer: 30 * 1024 * 1024 });

    const findings = [];

    // Extract cohort string if present
    const cohortMatch = dom.match(/Active Filtered Cohort:\s*([0-9,]+)\s*\/\s*([0-9,]+)/i);
    if (cohortMatch) {
      findings.push(`Cohort: ${cohortMatch[1]} / ${cohortMatch[2]}`);
    }

    // Extract rendering markers if present
    const markersMatch = dom.match(/Rendering:\s*([0-9,]+)\s*active\s*anomaly\s*markers/i);
    if (markersMatch) {
      findings.push(`Map Markers: ${markersMatch[1]}`);
    }

    // Total hotspots or detections
    const totalMatch = dom.match(/([0-9,]+)\s*(?:hotspots|detections|active thermal pixels)/i);
    if (totalMatch) {
      findings.push(`Data points: ${totalMatch[1]}`);
    }

    // Check for "0 / 50" or "0 detections"
    if (dom.includes('0 / 50 detections (0%)')) {
      findings.push('CRITICAL: Empty cohort 0 / 50 detected!');
    }

    // Check for CARTO watermark
    if (dom.includes('API KEY REQUIRED') || dom.includes('carto.com/basemaps/apikey')) {
      findings.push('ERROR: CARTO watermark still found!');
    } else {
      findings.push('Basemap: Clean (Esri)');
    }

    // Check for error boundaries
    if (dom.includes('Module Display Error') || dom.includes('[RouteErrorBoundary]')) {
      findings.push('ERROR: Error boundary triggered!');
    }

    const passed = !findings.some(f => f.startsWith('ERROR') || f.startsWith('CRITICAL'));

    return {
      name: page.name,
      path: page.path,
      passed,
      findings,
      domLength: dom.length,
    };
  } catch (err) {
    return {
      name: page.name,
      path: page.path,
      passed: false,
      findings: [`Execution failed: ${err.message}`],
      domLength: 0,
    };
  } finally {
    try { rmSync(tempDir, { recursive: true, force: true }); } catch {}
  }
}

console.log('Testing data display on all pages...');
const results = [];
for (const p of PAGES) {
  process.stdout.write(`Testing ${p.name} (${p.path})... `);
  const res = testPage(p);
  console.log(res.passed ? 'PASS' : 'FAIL');
  console.log('  Findings:', res.findings.join(' | '));
  results.push(res);
}

const allPassed = results.every(r => r.passed);
console.log('\nFinal Verdict:', allPassed ? 'ALL PAGES PASSED' : 'SOME PAGES FAILED');
process.exit(allPassed ? 0 : 1);
