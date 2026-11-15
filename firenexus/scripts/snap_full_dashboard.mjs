import { execSync } from 'child_process';
import { rmSync, mkdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const url = 'http://localhost:5173/dashboard';

const outFull = 'C:\\Users\\ATHI NARAYANAN\\.gemini\\antigravity\\brain\\ea807869-8dae-41e6-ba18-f61aff861162\\dashboard_fullpage_after_api.png';

const tempDir = join(tmpdir(), `dash_full_${Date.now()}`);
mkdirSync(tempDir, { recursive: true });

try {
  console.log("Capturing full page screenshot...");
  // Use a tall viewport to capture everything
  const cmd = `"${CHROME_PATH}" --headless=new --no-sandbox --disable-gpu --user-data-dir="${tempDir}" --window-size=1440,3200 --virtual-time-budget=8000 --screenshot="${outFull}" "${url}"`;
  execSync(cmd, { timeout: 45000 });
  console.log("Full screenshot saved to:", outFull);
} catch (err) {
  console.error(err);
} finally {
  try { rmSync(tempDir, { recursive: true, force: true }); } catch {}
}
