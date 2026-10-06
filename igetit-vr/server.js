const http = require('http');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env
function loadEnv() {
  const envPaths = [
    path.join(__dirname, '.env'),
    path.join(process.cwd(), '.env'),
    path.join(__dirname, '..', '.env')
  ];

  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      try {
        const content = fs.readFileSync(envPath, 'utf8');
        content.split('\n').forEach((line) => {
          const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
          if (m) {
            const key = m[1];
            let val = m[2].trim();
            // Strip outer quotes if present
            if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
              val = val.slice(1, -1);
            }
            if (!process.env[key]) {
              process.env[key] = val;
            }
          }
        });
        break;
      } catch (err) {
        console.warn('Could not read .env file:', err.message);
      }
    }
  }
}
loadEnv();

const { generate } = require('./agent/generate');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2'
};

// Security boundary: Only ui/, parsers/, and output/ are publicly served.
// prompts/ and agent/ are strictly private server modules.
const ROOTS = ['ui', 'parsers', 'output'];

const send = (res, code, body, type = 'application/json') => {
  res.writeHead(code, {
    'Content-Type': type,
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY'
  });
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
};

const server = http.createServer(async (req, res) => {
  // CORS / Pre-flight
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Health / Config info endpoint
  if (req.method === 'GET' && req.url === '/api/health') {
    const hasAnthropic = Boolean(process.env.ANTHROPIC_API_KEY);
    const hasGemini = Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);
    send(res, 200, {
      status: 'ok',
      service: 'iGETIT VR Experience Generator',
      liveAiConfigured: hasAnthropic || hasGemini,
      provider: hasAnthropic ? 'anthropic' : hasGemini ? 'gemini' : 'local-extraction'
    });
    return;
  }

  // Core Generation Endpoint
  if (req.method === 'POST' && req.url === '/api/generate') {
    let bytesReceived = 0;
    const chunks = [];

    for await (const chunk of req) {
      bytesReceived += chunk.length;
      if (bytesReceived > 40e6) {
        return send(res, 413, { error: 'Upload exceeds 40MB limit' });
      }
      chunks.push(chunk);
    }

    try {
      const payload = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      const result = await generate(payload);
      send(res, 200, result);
    } catch (err) {
      console.error('[Generate Route Error]', err);
      send(res, err.status || 500, { error: err.message || 'Generation failed' });
    }
    return;
  }

  // Static File Serving
  let pathname = decodeURIComponent(req.url.split('?')[0]);
  if (pathname === '/' || pathname === '') {
    pathname = '/ui/index.html';
  }

  const filePath = path.normalize(path.join(__dirname, pathname));
  const isAllowed = ROOTS.some((dir) => filePath.startsWith(path.join(__dirname, dir) + path.sep));

  if (!isAllowed || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    return send(res, 404, 'File not found', 'text/plain');
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME[ext] || 'application/octet-stream';
  send(res, 200, fs.readFileSync(filePath), contentType);
});

const PORT = parseInt(process.env.PORT || '3000', 10);
server.listen(PORT, () => {
  console.log(`[iGETIT VR] Server running at http://localhost:${PORT}`);
  console.log(`[iGETIT VR] Hidden Master AR/VR prompt loaded from prompts/master.prompt.txt`);
});
