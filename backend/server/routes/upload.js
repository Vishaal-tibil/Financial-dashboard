const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const { spawn } = require('child_process');

const UPLOADS_DIR = path.join(__dirname, '../../uploads');
const DATA_DIR    = path.join(__dirname, '../../data');

if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
if (!fs.existsSync(DATA_DIR))    fs.mkdirSync(DATA_DIR,    { recursive: true });

const storage = multer.diskStorage({
  destination: UPLOADS_DIR,
  filename: (req, file, cb) => cb(null, `${Date.now()}_${file.originalname}`),
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/\.(xlsx|xls)$/i.test(file.originalname)) cb(null, true);
    else cb(new Error('Only .xlsx / .xls files are allowed'));
  },
});

function sse(res, event, data) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

router.post('/upload', upload.single('file'), (req, res) => {
  res.setHeader('Content-Type',  'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection',    'keep-alive');
  res.flushHeaders();

  if (!req.file) {
    sse(res, 'error', { message: 'No file received' });
    return res.end();
  }

  sse(res, 'progress', { stage: 'uploading', message: 'File received — starting parse…', pct: 10 });

  const script = path.join(__dirname, '../../preprocess/extract.py');
  const py = spawn('python', [script, req.file.path, DATA_DIR, req.file.originalname]);
  let stderr = '';

  py.stdout.on('data', chunk => {
    chunk.toString().trim().split('\n').forEach(line => {
      try { sse(res, 'progress', JSON.parse(line)); } catch {}
    });
  });

  py.stderr.on('data', d => { stderr += d.toString(); });

  py.on('close', code => {
    if (code === 0) {
      sse(res, 'ready', { message: 'Data ready', pct: 100 });
    } else {
      const msg = stderr.trim().split('\n').pop() || 'Processing failed';
      sse(res, 'error', { message: msg });
    }
    res.end();
  });
});

module.exports = router;
