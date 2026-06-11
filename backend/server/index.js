const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const uploadRouter = require('./routes/upload');
const dataRouter   = require('./routes/data');
const aiRouter     = require('./routes/ai');

const app  = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));

app.use('/api', uploadRouter);
app.use('/api', dataRouter);
app.use('/api', aiRouter);

// Serve React build in production
if (process.env.NODE_ENV === 'production') {
  const dist = path.join(__dirname, '../../frontend/dist');
  app.use(express.static(dist));
  app.get('*', (req, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.listen(PORT, () => console.log(`FD server → http://localhost:${PORT}`));
