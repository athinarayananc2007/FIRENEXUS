import { spawn, execSync } from 'child_process';
import { rmSync, mkdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 4173;
const BASE_URL = `http://127.0.0.1:${PORT}`;

const ROUTES = [
  { path: '/', name: 'Landing Page', expectedKeywords: ['FIRENEXUS', 'Global', 'Satellite', 'Active Fire'] },
  { path: '/dashboard', name: 'Dashboard', expectedKeywords: ['Dashboard', 'Telemetry', 'MODIS', 'VIIRS', 'FRP'] },
  { path: '/explorer', name: 'Earth Explorer (3D)', expectedKeywords: ['Earth Explorer', 'Orbit', 'MODIS', 'VIIRS'] },
  { path: '/comparison', name: 'Comparison', expectedKeywords: ['Comparison', 'Harmonization', 'Sensor', 'FRP'] },
  { path: '/calendar', name: 'Fire Calendar', expectedKeywords: ['Calendar', 'Activity', 'MODIS', 'VIIRS'] },
  { path: '/analytics', name: 'Analytics', expectedKeywords: ['Analytics', 'Temporal', 'FRP', 'Distribution'] },
  { path: '/anomaly', name: 'Anomaly Explorer', expectedKeywords: ['Anomaly', 'Detection', 'Outliers', 'Score'] },
  { path: '/data', name: 'Data Explorer', expectedKeywords: ['Data Explorer', 'Observations', 'Filter', 'Table'] },
  { path: '/about', name: 'About & Architecture', expectedKeywords: ['Architecture', 'Harmonization', 'PostGIS', 'NASA FIRMS'] },
];

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer(url, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch {}
    await sleep(300);
  }
  throw new Error(`Server at ${url} failed to respond within ${timeoutMs}ms`);
}

async function main() {
  console.log('====================================================');
  console.log(' FIRENEXUS — Phase 8.8.1 Browser Route Verification');
  console.log('====================================================\n');

  console.log('1. Starting Vite preview server on port ' + PORT + '...');
  const preview = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--host', '127.0.0.1'], {
    cwd: 'firenexus',
    shell: true,
    stdio: 'pipe',
  });

  preview.stdout.on('data', (d) => process.stdout.write('[Vite Preview] ' + d.toString()));
  preview.stderr.on('data', (d) => process.stderr.write('[Vite Preview Error] ' + d.toString()));

  try {
    await waitForServer(BASE_URL);
    console.log('\n✓ Vite preview server is ready and responding at ' + BASE_URL + '\n');

    const results = [];
    let hasFailures = false;

    for (const route of ROUTES) {
      const routeUrl = `${BASE_URL}${route.path}`;
      const tempUserDir = join(tmpdir(), `chrome_verify_${Date.now()}_${Math.random().toString(36).substring(7)}`);
      mkdirSync(tempUserDir, { recursive: true });

      console.log(`Testing route [${route.name}] at ${routeUrl}...`);

      try {
        // Run Chrome with --headless=new and dump the hydrated DOM after allowing scripts to execute
        const chromeCmd = `"${CHROME_PATH}" --headless=new --no-sandbox --disable-gpu --user-data-dir="${tempUserDir}" --virtual-time-budget=4000 --dump-dom "${routeUrl}"`;
        const dom = execSync(chromeCmd, {
          encoding: 'utf-8',
          maxBuffer: 20 * 1024 * 1024,
          timeout: 20000,
        });

        // Validation Checks
        const domLength = dom.length;
        const hasRoot = dom.includes('id="root"');
        const hasErrorBoundaryError = dom.includes('Module Display Error') || dom.includes('[RouteErrorBoundary]');
        const hasUncaughtCrash = dom.includes('Cannot read properties of undefined') || dom.includes('Cannot read properties of null');
        const containsContent = domLength > 1500;

        // Keyword verification
        const matchedKeywords = route.expectedKeywords.filter((k) => dom.toLowerCase().includes(k.toLowerCase()));
        const isRenderValid = hasRoot && !hasErrorBoundaryError && !hasUncaughtCrash && containsContent;

        const result = {
          route: route.path,
          name: route.name,
          status: isRenderValid ? 'PASS' : 'FAIL',
          domLength,
          hasRoot,
          hasErrorBoundaryError,
          hasUncaughtCrash,
          matchedKeywords: `${matchedKeywords.length}/${route.expectedKeywords.length}`,
        };

        results.push(result);

        if (!isRenderValid) {
          hasFailures = true;
          console.error(`  ❌ FAILED: ${route.name}`);
          console.error(`     DOM Length: ${domLength}, ErrorBoundary: ${hasErrorBoundaryError}, UncaughtCrash: ${hasUncaughtCrash}`);
        } else {
          console.log(`  ✓ PASSED: ${route.name} (DOM length: ${domLength} chars, Keywords: ${matchedKeywords.join(', ')})`);
        }
      } catch (err) {
        hasFailures = true;
        console.error(`  ❌ Execution error testing ${route.name}:`, err.message);
        results.push({
          route: route.path,
          name: route.name,
          status: 'ERROR',
          error: err.message,
        });
      } finally {
        try {
          rmSync(tempUserDir, { recursive: true, force: true });
        } catch {}
      }
    }

    console.log('\n====================================================');
    console.log(' BROWSER ROUTE VERIFICATION SUMMARY');
    console.log('====================================================');
    console.table(results);

    if (hasFailures) {
      console.error('\n❌ One or more routes failed verification.');
      process.exit(1);
    } else {
      console.log('\n🎉 ALL 9 ROUTES VERIFIED SUCCESSFULLY IN GOOGLE CHROME!');
    }
  } finally {
    console.log('\nShutting down Vite preview server...');
    preview.kill();
  }
}

main().catch((err) => {
  console.error('Fatal error during verification:', err);
  process.exit(1);
});
