const express = require('express');
const router  = express.Router();
const path    = require('path');
const fs      = require('fs');

const DATA_DIR   = path.join(__dirname, '../../data');
const SAMPLE_DIR = path.join(DATA_DIR, 'sample');

function readJSON(name, dir = DATA_DIR) {
  const file = path.join(dir, `${name}.json`);
  if (!fs.existsSync(file)) return null;
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch { return null; }
}

function writeJSON(name, data, dir = DATA_DIR) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${name}.json`), JSON.stringify(data, null, 2));
}

// Health — is data loaded?
router.get('/status', (req, res) => {
  const meta = readJSON('meta');
  res.json({ ready: !!meta, companies: meta?.companies || [] });
});

// Survey / upload metadata
router.get('/meta', (req, res) => {
  const data = readJSON('meta');
  if (!data) return res.status(404).json({ error: 'No data loaded' });
  res.json(data);
});

// Company KPI summary + ranks (used by KPI row & top bar)
router.get('/companies', (req, res) => {
  const data = readJSON('companies');
  if (!data) return res.status(404).json({ error: 'No data loaded' });
  res.json(data);
});

// Full time-series metrics per company (used by all charts)
router.get('/metrics', (req, res) => {
  const data = readJSON('metrics');
  if (!data) return res.status(404).json({ error: 'No data loaded' });
  res.json(data);
});

// Load pre-baked demo data from sample/
router.post('/load-sample', (req, res) => {
  try {
    for (const name of ['meta', 'companies', 'metrics']) {
      const src = readJSON(name, SAMPLE_DIR);
      if (src) writeJSON(name, src);
    }
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Wipe all loaded data
router.post('/reset', (req, res) => {
  for (const name of ['meta', 'companies', 'metrics']) {
    const f = path.join(DATA_DIR, `${name}.json`);
    if (fs.existsSync(f)) fs.unlinkSync(f);
  }
  const uploadsDir = path.join(__dirname, '../../uploads');
  if (fs.existsSync(uploadsDir)) {
    fs.readdirSync(uploadsDir).forEach(f =>
      fs.unlinkSync(path.join(uploadsDir, f))
    );
  }
  res.json({ ok: true });
});

module.exports = router;
