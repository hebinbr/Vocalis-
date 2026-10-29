import express, { Request, Response } from 'express';
import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { sqliteService } from './src/server/sqliteService.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const PYTHON_PORT = process.env.PYTHON_BACKEND_PORT || 5001;

// Spawn Python backend process if python3 is available in environment
let pythonProcess: ChildProcess | null = null;
let isPythonAvailable = false;
let isShuttingDown = false;

function startPythonBackend() {
  if (isShuttingDown) return;
  const backendScript = path.join(__dirname, 'backend', 'server.py');
  
  try {
    console.log(`[Vocalis] Launching Python backend: python3 ${backendScript}`);
    pythonProcess = spawn('python3', [backendScript], {
      env: { ...process.env, PYTHON_BACKEND_PORT: String(PYTHON_PORT) },
      stdio: ['ignore', 'inherit', 'inherit']
    });

    pythonProcess.on('error', (err) => {
      console.warn('[Vocalis] Python3 not available in this container environment, utilizing high-performance native SQLite engine:', err.message);
      isPythonAvailable = false;
    });

    pythonProcess.on('exit', (code, signal) => {
      console.log(`[Vocalis] Python backend process exited with code ${code}, signal ${signal}`);
      isPythonAvailable = false;
      if (!isShuttingDown) {
        setTimeout(startPythonBackend, 3000);
      }
    });

    // Check if Python becomes healthy
    setTimeout(async () => {
      try {
        const ping = await fetch(`http://127.0.0.1:${PYTHON_PORT}/api/status`, { signal: AbortSignal.timeout(1000) });
        if (ping.ok) {
          isPythonAvailable = true;
          console.log('[Vocalis] Python SQLite backend verified online.');
        }
      } catch {
        // Fallback engine remains active
      }
    }, 1500);

  } catch (err: any) {
    console.warn('[Vocalis] Could not launch Python process:', err.message);
    isPythonAvailable = false;
  }
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

// Serve static images and assets with multiple route aliases so images NEVER 404 in dev or production
app.use('/images', express.static(path.join(__dirname, 'public', 'images')));
app.use('/assets/images', express.static(path.join(__dirname, 'public', 'images')));
app.use('/src/assets/images', express.static(path.join(__dirname, 'src', 'assets', 'images')));
app.use('/src/assets', express.static(path.join(__dirname, 'src', 'assets')));
app.use('/public', express.static(path.join(__dirname, 'public')));

// Node.js SQLite Internal Router for immediate execution and bulletproof failover
function handleNativeSqliteRoute(req: Request, res: Response): boolean {
  const urlPath = req.path.replace(/\/$/, '');
  const method = req.method;

  try {
    if (method === 'GET') {
      if (urlPath === '/api/status' || urlPath === '/api/health') {
        res.json(sqliteService.getStatus());
        return true;
      }
      if (urlPath === '/api/patient') {
        const userId = req.query.user_id ? Number(req.query.user_id) : undefined;
        res.json(sqliteService.getPatient(userId) || {});
        return true;
      }
      if (urlPath === '/api/exercises') {
        res.json(sqliteService.getExercises());
        return true;
      }
      if (urlPath === '/api/logs') {
        const userId = req.query.user_id ? Number(req.query.user_id) : undefined;
        res.json(sqliteService.getLogs(userId));
        return true;
      }
      if (urlPath === '/api/reminders') {
        const userId = req.query.user_id ? Number(req.query.user_id) : undefined;
        res.json(sqliteService.getReminders(userId));
        return true;
      }
      if (urlPath === '/api/progress/stats') {
        const userId = req.query.user_id ? Number(req.query.user_id) : undefined;
        res.json(sqliteService.getProgressStats(userId));
        return true;
      }
      if (urlPath === '/api/security/audit') {
        res.json(sqliteService.getSecurityAudit());
        return true;
      }
      if (urlPath === '/api/therapist/dashboard') {
        const therapistId = req.query.therapist_id ? Number(req.query.therapist_id) : 1;
        res.json(sqliteService.getTherapistDashboardData(therapistId));
        return true;
      }
    }

    if (method === 'POST') {
      if (urlPath === '/api/auth/register') {
        const r = sqliteService.registerUser(req.body);
        res.status(r.status).json(r.body);
        return true;
      }
      if (urlPath === '/api/auth/login') {
        const r = sqliteService.loginUser(req.body);
        res.status(r.status).json(r.body);
        return true;
      }
      if (urlPath === '/api/auth/activate') {
        const userId = Number(req.body?.user_id);
        const r = sqliteService.activatePatientWithCode(userId, req.body?.code);
        res.status(r.status).json(r.body);
        return true;
      }
      if (urlPath === '/api/therapist/generate-code') {
        const therapistId = Number(req.body?.therapist_id || 1);
        const code = sqliteService.createAccessCode(therapistId, req.body?.patient_name, req.body?.patient_email);
        res.status(201).json({ success: true, code });
        return true;
      }
      if (urlPath === '/api/logs') {
        const userId = req.body?.user_id ? Number(req.body.user_id) : undefined;
        const result = sqliteService.addLog(req.body, userId);
        res.status(201).json(result);
        return true;
      }
      if (urlPath === '/api/reminders') {
        const userId = req.body?.user_id ? Number(req.body.user_id) : undefined;
        const result = sqliteService.addReminder(req.body, userId);
        res.status(201).json(result);
        return true;
      }
    }

    if (method === 'PUT') {
      if (urlPath === '/api/patient') {
        const userId = req.body?.user_id ? Number(req.body.user_id) : undefined;
        res.json(sqliteService.updatePatient(req.body, userId));
        return true;
      }
      if (urlPath.startsWith('/api/reminders/')) {
        const id = Number(urlPath.split('/').pop());
        res.json(sqliteService.updateReminder(id, req.body));
        return true;
      }
    }

    if (method === 'DELETE') {
      if (urlPath.startsWith('/api/logs/')) {
        const id = Number(urlPath.split('/').pop());
        res.json(sqliteService.deleteLog(id));
        return true;
      }
      if (urlPath.startsWith('/api/reminders/')) {
        const id = Number(urlPath.split('/').pop());
        res.json(sqliteService.deleteReminder(id));
        return true;
      }
    }
  } catch (err: any) {
    console.error(`[Vocalis SQLite Error] Error handling ${method} ${urlPath}:`, err);
    res.status(500).json({ error: 'Erro interno no banco de dados SQLite', details: err.message });
    return true;
  }

  return false;
}

// Proxy API requests with seamless automatic fallback to native SQLite engine
app.all('/api/*', async (req: Request, res: Response) => {
  const pythonUrl = `http://127.0.0.1:${PYTHON_PORT}${req.originalUrl}`;

  // If Python backend is alive, try proxying with timeout
  if (isPythonAvailable) {
    try {
      const fetchOptions: RequestInit = {
        method: req.method,
        headers: {
          'Content-Type': req.headers['content-type'] || 'application/json',
          'Connection': 'close',
        },
        signal: AbortSignal.timeout(1200)
      };

      if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
        fetchOptions.body = JSON.stringify(req.body);
      }

      const pyRes = await fetch(pythonUrl, fetchOptions);
      if (pyRes.ok || pyRes.status < 500) {
        const contentType = pyRes.headers.get('content-type') || 'application/json';
        res.status(pyRes.status);
        res.setHeader('Content-Type', contentType);
        const data = await pyRes.text();
        return res.send(data);
      }
    } catch {
      // Python timed out or dropped connection, proceed to resilient native SQLite handling
    }
  }

  // Handle transparently with native SQLite engine
  const handled = handleNativeSqliteRoute(req, res);
  if (!handled) {
    res.status(404).json({ error: 'Endpoint não encontrado' });
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
    // Ensure dist directory exists
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    } else {
      console.warn('[Vocalis] dist directory not found; please build first with `npm run build`.');
    }
  }

  app.listen(PORT, () => {
    console.log(`[Vocalis] Server running on http://0.0.0.0:${PORT}`);
  });
}

setupFrontend();
