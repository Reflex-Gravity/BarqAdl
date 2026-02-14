const fs = require('fs');
const path = require('path');
const supabase = require('./supabase');

const DATA_DIR = path.join(__dirname, '../../data');

const ensureDataDir = () => {
  const dirs = [DATA_DIR, path.join(DATA_DIR, 'skills')];
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
};

// --- Sync API (same interface as before, JSON files as local cache) ---

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

  // Async write-through to Supabase (fire-and-forget)
  supabase.upsertDocument(filename, data).catch(() => {});
};

const appendToLog = (filename, entry) => {
  ensureDataDir();
  const filePath = path.join(DATA_DIR, filename);
  let log = [];
  if (fs.existsSync(filePath)) {
    log = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  }
  const entryWithTimestamp = { ...entry, timestamp: new Date().toISOString() };
  log.push(entryWithTimestamp);
  fs.writeFileSync(filePath, JSON.stringify(log, null, 2), 'utf-8');

  // Async insert to Supabase (fire-and-forget)
  supabase.insertLogEntry(filename, entryWithTimestamp).catch(() => {});
};

// --- Startup: sync between Supabase and local JSON files ---

const initDatabase = async () => {
  const client = supabase.getClient();
  if (!client) {
    console.log('[DB] No Supabase configured, using local JSON files only');
    return false;
  }

  try {
    // Verify tables exist
    const tablesReady = await supabase.initTables();
    if (!tablesReady) return false;

    console.log('[DB] Supabase connected');

    // Check if Supabase already has data
    const docs = await supabase.getAllDocuments();

    if (docs.length > 0) {
      // Supabase has data -> pull into local JSON files (Supabase is source of truth)
      console.log(`[DB] Loading ${docs.length} documents from Supabase`);
      ensureDataDir();
      for (const doc of docs) {
        const filePath = path.join(DATA_DIR, doc.key);
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(filePath, JSON.stringify(doc.data, null, 2), 'utf-8');
      }

      // Also load log entries
      const logNames = await supabase.getAllLogNames();
      for (const logName of logNames) {
        const entries = await supabase.getLogEntries(logName);
        if (entries && entries.length > 0) {
          const filePath = path.join(DATA_DIR, logName);
          fs.writeFileSync(filePath, JSON.stringify(entries, null, 2), 'utf-8');
        }
      }

      console.log('[DB] Supabase -> local sync complete');
    } else {
      // Supabase is empty -> seed from local JSON files
      console.log('[DB] Supabase is empty, seeding from local data');
      await seedSupabase();
    }

    console.log('[DB] Supabase integration ready');
    return true;
  } catch (err) {
    console.error('[DB] Supabase init failed, falling back to JSON files:', err.message);
    return false;
  }
};

// Push all local JSON data to Supabase (first-time seed)
const seedSupabase = async () => {
  ensureDataDir();

  // Push document files
  const docFiles = ['strategies.json', 'registry.json'];
  const skillsDir = path.join(DATA_DIR, 'skills');
  const skillFiles = fs.existsSync(skillsDir)
    ? fs.readdirSync(skillsDir).filter(f => f.endsWith('.json')).map(f => `skills/${f}`)
    : [];

  for (const file of [...docFiles, ...skillFiles]) {
    const data = readJSON(file);
    if (data) {
      await supabase.upsertDocument(file, data);
      console.log(`[DB] Seeded ${file}`);
    }
  }

  // Push log files
  const logFiles = ['improvement-log.json', 'feedback-log.json'];
  for (const logFile of logFiles) {
    const entries = readJSON(logFile);
    if (entries && Array.isArray(entries)) {
      for (const entry of entries) {
        await supabase.insertLogEntry(logFile, entry);
      }
      console.log(`[DB] Seeded ${entries.length} entries from ${logFile}`);
    }
  }
};

// Initialize data directory on load
ensureDataDir();

module.exports = { readJSON, writeJSON, appendToLog, initDatabase, DATA_DIR };
