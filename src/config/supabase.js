const { createClient } = require('@supabase/supabase-js');

let supabase = null;

function getClient() {
  if (supabase) return supabase;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    return null;
  }

  supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return supabase;
}

// --- json_documents table ---

async function upsertDocument(key, data) {
  const client = getClient();
  if (!client) return;

  try {
    const { error } = await client
      .from('json_documents')
      .upsert({ key, data, updated_at: new Date().toISOString() }, { onConflict: 'key' });

    if (error) throw error;
  } catch (err) {
    console.error(`[Supabase] Upsert failed for "${key}":`, err.message);
  }
}

async function getDocument(key) {
  const client = getClient();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from('json_documents')
      .select('data')
      .eq('key', key)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
    return data ? data.data : null;
  } catch (err) {
    console.error(`[Supabase] Read failed for "${key}":`, err.message);
    return null;
  }
}

async function getAllDocuments() {
  const client = getClient();
  if (!client) return [];

  try {
    const { data, error } = await client
      .from('json_documents')
      .select('key, data');

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('[Supabase] getAllDocuments failed:', err.message);
    return [];
  }
}

// --- log_entries table ---

async function insertLogEntry(logName, entryData) {
  const client = getClient();
  if (!client) return;

  try {
    const { error } = await client
      .from('log_entries')
      .insert({ log_name: logName, data: entryData });

    if (error) throw error;
  } catch (err) {
    console.error(`[Supabase] Log insert failed for "${logName}":`, err.message);
  }
}

async function getLogEntries(logName) {
  const client = getClient();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from('log_entries')
      .select('data')
      .eq('log_name', logName)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return (data || []).map(r => r.data);
  } catch (err) {
    console.error(`[Supabase] Log read failed for "${logName}":`, err.message);
    return null;
  }
}

async function getAllLogNames() {
  const client = getClient();
  if (!client) return [];

  try {
    // Supabase doesn't have DISTINCT via SDK, so fetch all and dedupe
    const { data, error } = await client
      .from('log_entries')
      .select('log_name');

    if (error) throw error;
    return [...new Set((data || []).map(r => r.log_name))];
  } catch (err) {
    console.error('[Supabase] getAllLogNames failed:', err.message);
    return [];
  }
}

// --- Table initialization (checks if tables exist, logs status) ---

async function initTables() {
  const client = getClient();
  if (!client) return false;

  try {
    // Try querying both tables to verify they exist
    const { error: docErr } = await client
      .from('json_documents')
      .select('key')
      .limit(1);

    const { error: logErr } = await client
      .from('log_entries')
      .select('id')
      .limit(1);

    if (docErr || logErr) {
      console.error('[Supabase] Tables not found. Please create them in the Supabase SQL Editor:');
      console.error(TABLE_SQL);
      return false;
    }

    console.log('[Supabase] Tables verified');
    return true;
  } catch (err) {
    console.error('[Supabase] Table check failed:', err.message);
    return false;
  }
}

// SQL for creating tables (run once in Supabase SQL Editor)
const TABLE_SQL = `
-- Run this in the Supabase SQL Editor (https://supabase.com/dashboard/project/kipumxmeelzjhwkmysup/sql)
CREATE TABLE IF NOT EXISTS json_documents (
  key TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS log_entries (
  id BIGSERIAL PRIMARY KEY,
  log_name TEXT NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_log_entries_name ON log_entries(log_name);
CREATE INDEX IF NOT EXISTS idx_log_entries_created ON log_entries(created_at);
`;

module.exports = {
  getClient,
  initTables,
  upsertDocument,
  getDocument,
  insertLogEntry,
  getLogEntries,
  getAllDocuments,
  getAllLogNames,
  TABLE_SQL,
};
