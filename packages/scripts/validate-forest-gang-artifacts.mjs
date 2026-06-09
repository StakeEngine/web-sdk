import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

const rootDir = path.resolve(new URL('..', import.meta.url).pathname);
const libraryDir = path.join(rootDir, 'apps/forest-gang/library');
const publishDir = path.join(libraryDir, 'publish_files');
const configsDir = path.join(libraryDir, 'configs');

const config = JSON.parse(fs.readFileSync(path.join(configsDir, 'config.json'), 'utf8'));
const index = JSON.parse(fs.readFileSync(path.join(publishDir, 'index.json'), 'utf8'));

const tmpDir = path.join(rootDir, '.tmp-forest-gang-validate');
fs.mkdirSync(tmpDir, { recursive: true });

const results = [];

for (const shelf of config.bookShelfConfig) {
  const modeIndex = index.modes.find((mode) => mode.name === shelf.name);
  assert.ok(modeIndex, `index mode exists: ${shelf.name}`);

  const lookupPath = path.join(publishDir, modeIndex.weights);
  const lookupRows = fs
    .readFileSync(lookupPath, 'utf8')
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [id, weight, payout] = line.split(',').map(Number);
      return { id, weight, payout };
    });

  const zstPath = path.join(publishDir, modeIndex.events);
  const jsonlPath = path.join(tmpDir, `${shelf.name}.jsonl`);
  execFileSync('zstd', ['-q', '-d', '-f', zstPath, '-o', jsonlPath]);
  const books = fs
    .readFileSync(jsonlPath, 'utf8')
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));

  const booksById = new Map(books.map((book) => [book.id, book]));
  const totalWeight = lookupRows.reduce((sum, row) => sum + row.weight, 0);
  const weightedPayout = lookupRows.reduce((sum, row) => sum + row.weight * row.payout, 0);
  const empiricalRtp = weightedPayout / totalWeight / 100 / shelf.cost;

  for (const row of lookupRows) {
    assert.ok(booksById.has(row.id), `${shelf.name} lookup id exists: ${row.id}`);
    assert.equal(booksById.get(row.id).payoutMultiplier, row.payout, `${shelf.name} payout matches lookup for id ${row.id}`);
  }

  results.push({
    mode: shelf.name,
    books: books.length,
    lookupRows: lookupRows.length,
    totalWeight,
    empiricalRtp: Number(empiricalRtp.toFixed(6)),
    configRtp: shelf.rtp,
  });
}

console.log(JSON.stringify({ ok: true, results }, null, 2));
