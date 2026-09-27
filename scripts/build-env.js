/**
 * Build-time config that Babel inlines into the JS bundle (build plan Task 16). Values come from
 * the shell environment, falling back to `.env` at the repo root (see `.env.example`). The iOS
 * Release build has no Metro to read them from later, so they must exist when it is bundled.
 *
 * Only the names in INLINED are replaced; any other `process.env` read is left alone, which keeps
 * secrets such as the Alpaca key out of the bundle.
 */
const fs = require('fs');
const path = require('path');

const INLINED = ['SUPABASE_URL', 'SUPABASE_ANON_KEY'];

function loadBuildEnv() {
  const file = path.join(__dirname, '..', '.env');
  if (fs.existsSync(file)) {
    // Does not override variables already set in the shell.
    process.loadEnvFile(file);
  }
  return Object.fromEntries(INLINED.map(name => [name, process.env[name]]));
}

module.exports = { INLINED, loadBuildEnv };
