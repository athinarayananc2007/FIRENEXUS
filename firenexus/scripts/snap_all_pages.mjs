import { execSync } from 'child_process';
import { rmSync, mkdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const brainDir = 'C:\\Users\\ATHI NARAYANAN\\.gemini\\antigravity\\brain\\ea807869-8dae-41e6-ba18-f61aff861162';

const routes = [
  { name: 'dashboard', path: '/dashboard', height: 1800 },
  { name: 'calendar', path: '/calendar', height: 1600 },
  { name: 'comparison', path: '/comparison', height: 1800 },
  { name: 'analytics', path: '/analytics', height: 1800 },
  { name: 'data', path: '/data', height: 1600 },
  { name: 'explorer', path: '/explorer', height: 1200 },
  { name: 'anomaly', path: '/anomaly', height: 1600 },
  { name: 'about', path: '/about', height: 1600 },
  { name: 'landing', path: '/', height: 1200 },
];

for (const r of routes) {
  const url = `http://localhost:5173${r.path}`;
  const outPath = join(brainDir, `verify_${r.name}.png`);
  const tempDir = join(tmpdir(), `snap_${r.name}_${Date.now()}`);
  mkdirSync(tempDir, { recursive: true });

  try {
    console.log(`Capturing ${r.name} from ${url}...`);
    const cmd = `"${CHROME_PATH}" --headless=new --no-sandbox --disable-gpu --user-data-dir="${tempDir}" --window-size=1440,${r.height} --virtual-time-budget=6000 --screenshot="${outPath}" "${url}"`;
    execSync(cmd, { timeout: 30000 });
    console.log(`Saved screenshot for ${r.name} to ${outPath}`);
  } catch (err) {
    console.error(`Failed to capture ${r.name}:`, err.message);
  } finally {
    try { rmSync(tempDir, { recursive: true, force: true }); } catch {}
  }
}
