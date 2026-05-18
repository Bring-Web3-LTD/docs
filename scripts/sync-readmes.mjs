#!/usr/bin/env node
/**
 * Fetches README files from external repos and writes them into docs/.
 * Add or edit entries in SOURCES to sync more files.
 */
import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SOURCES = [
  {
    url: 'https://raw.githubusercontent.com/Bring-Web3-LTD/cashbackPortal/main/README.md',
    dest: 'docs/cashback-portal.md',
    sourceUrl: 'https://github.com/Bring-Web3-LTD/cashbackPortal',
  },
  {
    url: 'https://raw.githubusercontent.com/Bring-Web3-LTD/chromeExtension/main/extension-files/bringweb3-sdk/README.md',
    dest: 'docs/bringweb3-sdk.md',
    sourceUrl: 'https://github.com/Bring-Web3-LTD/chromeExtension/tree/main/extension-files/bringweb3-sdk',
  },
];

const repoRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));

async function syncOne({ url, dest, sourceUrl }) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
  }
  const body = await res.text();
  const banner =
    `<!-- AUTO-GENERATED FILE. DO NOT EDIT. -->\n` +
    `<!-- Synced from: ${sourceUrl} -->\n` +
    `<!-- Source: ${url} -->\n\n`;
  const outPath = resolve(repoRoot, dest);
  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, banner + body, 'utf8');
  console.log(`Wrote ${dest} (${body.length} bytes)`);
}

const results = await Promise.allSettled(SOURCES.map(syncOne));
const failed = results.filter((r) => r.status === 'rejected');
if (failed.length) {
  for (const f of failed) console.error(f.reason);
  process.exit(1);
}
