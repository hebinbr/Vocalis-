import express, { Request, Response } from 'express';
import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const PYTHON_PORT = process.env.PYTHON_BACKEND_PORT || 5001;

// Spawn Python backend process
let pythonProcess: ChildProcess | null = null;
let isShuttingDown = false;

function startPythonBackend() {
  if (isShuttingDown) return;
  const backendScript = path.join(__dirname, 'backend', 'server.py');
  console.log(`[Vocalis] Launching Python backend: python3 ${backendScript}`);
  
  pythonProcess = spawn('python3', [backendScript], {
    env: { ...process.env, PYTHON_BACKEND_PORT: String(PYTHON_PORT) },
    stdio: ['ignore', 'inherit', 'inherit']
  });

  pythonProcess.on('error', (err) => {
    console.error('[Vocalis] Failed to start Python backend:', err);
  });

  pythonProcess.on('exit', (code, signal) => {
    console.log(`[Vocalis] Python backend exited with code ${code}, signal ${signal}`);
    if (!isShuttingDown) {
      console.log('[Vocalis] Restarting Python backend in 1s...');
      setTimeout(startPythonBackend, 1000);
    }
  });
}

startPythonBackend();

// Clean up child process on exit
process.on('SIGINT', () => {
  isShuttingDown = true;
  if (pythonProcess) pythonProcess.kill('SIGINT');
  process.exit(0);
});
process.on('SIGTERM', () => {
  isShuttingDown = true;
  if (pythonProcess) pythonProcess.kill('SIGTERM');
  process.exit(0);
});

// Parse JSON request bodies
app.use(express.json());

// Proxy API requests to Python SQLite backend with resilient retry
app.all('/api/*', async (req: Request, res: Response) => {
  const pythonUrl = `http://127.0.0.1:${PYTHON_PORT}${req.originalUrl}`;
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const fetchOptions: RequestInit = {
        method: req.method,
        headers: {
          'Content-Type': req.headers['content-type'] || 'application/json',
          'Connection': 'close',
        },
      };

      if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
        fetchOptions.body = JSON.stringify(req.body);
      }

      const pyRes = await fetch(pythonUrl, fetchOptions);
      const contentType = pyRes.headers.get('content-type') || 'application/json';
      res.status(pyRes.status);
      res.setHeader('Content-Type', contentType);

      const data = await pyRes.text();
      return res.send(data);
    } catch (err: any) {
      if (attempt < maxAttempts) {
        // Wait 150ms and retry
        await new Promise((resolve) => setTimeout(resolve, 150));
      } else {
        console.error(`[Vocalis Proxy Error] Failed to reach Python backend at ${pythonUrl} after ${maxAttempts} attempts:`, err.message);
        return res.status(502).json({
          error: 'Backend Python em inicialização ou indisponível',
          details: err.message
        });
      }
    }
  }
});

// Setup Vite middleware in dev or static files in production
async function setupFrontend() {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`[Vocalis] Server running on http://0.0.0.0:${PORT}`);
  });
}

setupFrontend();
