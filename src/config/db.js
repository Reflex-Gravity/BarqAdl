const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../../data');

const ensureDataDir = () => {
  const dirs = [DATA_DIR, path.join(DATA_DIR, 'skills')];
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
};

const readJSON = (filename) => {
  const filePath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw);
};

const writeJSON = (filename, data) => {
  ensureDataDir();
  const filePath = path.join(DATA_DIR, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
};

const appendToLog = (filename, entry) => {
  ensureDataDir();
  const filePath = path.join(DATA_DIR, filename);
  let log = [];
  if (fs.existsSync(filePath)) {
    log = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  }
  log.push({ ...entry, timestamp: new Date().toISOString() });
  fs.writeFileSync(filePath, JSON.stringify(log, null, 2), 'utf-8');
};

// Initialize data directory on load
ensureDataDir();

module.exports = { readJSON, writeJSON, appendToLog, DATA_DIR };
