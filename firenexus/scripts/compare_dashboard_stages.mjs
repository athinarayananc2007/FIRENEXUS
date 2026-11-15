import { execSync } from 'child_process';
import { rmSync, mkdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const url = 'http://localhost:5173/dashboard';

const out1 = 'C:\\Users\\ATHI NARAYANAN\\.gemini\\antigravity\\brain\\ea807869-8dae-41e6-ba18-f61aff861162\\dashboard_stage1_initial.png';
const out2 = 'C:\\Users\\ATHI NARAYANAN\\.gemini\\antigravity\\brain\\ea807869-8dae-41e6-ba18-f61aff861162\\dashboard_stage2_after_api.png';

const tempDir = join(tmpdir(), `dash_stage_${Date.now()}`);
mkdirSync(tempDir, { recursive: true });

try {
  // Capture Stage 2 (after API has resolved)
  console.log("Capturing Stage 2 (after API resolution)...");
  const cmd2 = `"${CHROME_PATH}" --headless=new --no-sandbox --disable-gpu --user-data-dir="${tempDir}" --window-size=1440,900 --virtual-time-budget=8000 --screenshot="${out2}" "${url}"`;
  execSync(cmd2, { timeout: 35000 });
  console.log("Stage 2 screenshot saved to:", out2);

  const dom2 = execSync(`"${CHROME_PATH}" --headless=new --no-sandbox --disable-gpu --user-data-dir="${tempDir}" --virtual-time-budget=8000 --dump-dom "${url}"`, { encoding: 'utf-8', timeout: 35000, maxBuffer: 30*1024*1024 });

  console.log("Stage 2 DOM length:", dom2.length);
  // Extract key values from Stage 2
  const matches = [
    dom2.match(/Live API[^<]*/i),
    dom2.match(/Simulated Fallback[^<]*/i),
    dom2.match(/Filtered:\s*([0-9,]+)\s*\/\s*([0-9,]+)/i),
    dom2.match(/([0-9,]+)\s*hotspots/i),
    dom2.match(/([0-9,]+)\s*detections/i),
    dom2.match(/Average Fire Radiative Power[^<]*<[^>]+>([^<]+)/i),
  ];
  console.log("Stage 2 indicators:", matches.map(m => m ? m[0] : null));

} catch (err) {
  console.error("Error:", err);
} finally {
  try { rmSync(tempDir, { recursive: true, force: true }); } catch {}
}
