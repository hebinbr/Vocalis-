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

function startPythonBackend() {
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
  });
}

startPythonBackend();

// Clean up child process on exit
process.on('SIGINT', () => {
  if (pythonProcess) pythonProcess.kill('SIGINT');
  process.exit(0);
});
process.on('SIGTERM', () => {
  if (pythonProcess) pythonProcess.kill('SIGTERM');
  process.exit(0);
});

// Parse JSON request bodies
app.use(express.json());

// Proxy API requests to Python SQLite backend
app.all('/api/*', async (req: Request, res: Response) => {
  const pythonUrl = `http://127.0.0.1:${PYTHON_PORT}${req.originalUrl}`;
  try {
    const fetchOptions: RequestInit = {
      method: req.method,
      headers: {
        'Content-Type': req.headers['content-type'] || 'application/json',
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
    res.send(data);
  } catch (err: any) {
    console.error(`[Vocalis Proxy Error] Failed to reach Python backend at ${pythonUrl}:`, err.message);
    res.status(502).json({
      error: 'Backend Python em inicialização ou indisponível',
      details: err.message
    });
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
