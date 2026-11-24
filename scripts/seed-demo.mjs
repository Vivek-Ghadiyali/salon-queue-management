import { createInterface } from 'node:readline/promises';
import { writeFile } from 'node:fs/promises';
import { stdin, stdout } from 'node:process';
import { createClient } from '@supabase/supabase-js';

const required = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SALON_DEMO_PROJECT_REF',
  'SALON_DEMO_APP_URL',
  'DEMO_SEED_KEY',
  'DEMO_CUSTOMER_PHONE_1',
  'DEMO_CUSTOMER_PHONE_2',
  'DEMO_CUSTOMER_PHONE_3',
];

function requireEnvironment() {
  const missing = required.filter((name) => !process.env[name]?.trim());
  if (missing.length) throw new Error(`Missing values in .env.demo.local: ${missing.join(', ')}`);
  if (process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SECRET_KEY) {
    throw new Error('Service/secret keys must not use VITE_ variables. Remove them from frontend environment files.');
  }

  const url = new URL(process.env.SUPABASE_URL);
  const ref = url.hostname.endsWith('.supabase.co') ? url.hostname.slice(0, -'.supabase.co'.length) : '';
  if (!ref || ref !== process.env.SALON_DEMO_PROJECT_REF) {
    throw new Error('SUPABASE_URL host must match SALON_DEMO_PROJECT_REF.');
  }

  const appUrl = new URL(process.env.SALON_DEMO_APP_URL);
  if (!['http:', 'https:'].includes(appUrl.protocol)) throw new Error('SALON_DEMO_APP_URL must use HTTP or HTTPS.');

  const phones = [1, 2, 3].map((index) => process.env[`DEMO_CUSTOMER_PHONE_${index}`].trim());
  if (phones.some((phone) => !/^\d{10}$/.test(phone))) {
    throw new Error('Each DEMO_CUSTOMER_PHONE value must contain exactly 10 digits.');
  }
  if (new Set(phones).size !== phones.length) throw new Error('Demo customer phone values must be unique.');
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(process.env.DEMO_SEED_KEY)) {
    throw new Error('DEMO_SEED_KEY must be 1–64 letters, digits, underscores or hyphens.');
  }

  return { ref, appUrl: appUrl.origin, phones };
}

async function confirmProject(ref) {
  if (!stdin.isTTY) throw new Error('Run this command in an interactive terminal to confirm the target project.');
  const flagIndex = process.argv.indexOf('--confirm-project');
  if (flagIndex < 0 || process.argv[flagIndex + 1] !== ref) {
    throw new Error(`Pass --confirm-project ${ref} to confirm the intended project.`);
  }

  console.log(`Demo queue entries will be added to Supabase project: ${ref}`);
  console.log('Existing salon settings, services, barbers, staff accounts, and queue records will be preserved.');
  const prompt = createInterface({ input: stdin, output: stdout });
  try {
    const answer = await prompt.question(`Type "SEED DEMO ${ref}" to continue: `);
    if (answer.trim() !== `SEED DEMO ${ref}`) throw new Error('Project confirmation did not match; no demo data was seeded.');
  } finally {
    prompt.close();
  }
}

async function main() {
  const { ref, appUrl, phones } = requireEnvironment();
  await confirmProject(ref);

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await supabase.rpc('seed_demo_queue_entries', {
    p_seed_key: process.env.DEMO_SEED_KEY,
    p_phone_numbers: phones,
  });
  if (error) throw new Error(`Demo queue setup failed: ${error.message}`);
  if (!Array.isArray(data?.entries) || data.entries.length !== 3
      || data.entries.some((entry) => !entry.access_token || !entry.token || !entry.status)) {
    throw new Error('The database returned an incomplete demo result; private status links were not written.');
  }

  const lines = data.entries.map((entry) => `${entry.token} (${entry.status}) ${appUrl}/status/${entry.access_token}`);
  await writeFile('.demo-status-links.txt', `${lines.join('\n')}\n`, { encoding: 'utf8', mode: 0o600 });
  console.log(`Demo queue is ready (${data.status}). Existing staff accounts and salon records were not changed.`);
  console.log('Private sample status URLs were written to the ignored .demo-status-links.txt file.');
}

try {
  await main();
} catch (error) {
  console.error(`Demo setup stopped: ${error.message}`);
  process.exitCode = 1;
}
