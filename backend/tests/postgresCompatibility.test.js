import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const rootPkgPath = path.resolve(process.cwd(), 'package.json');
const pkg = JSON.parse(fs.readFileSync(rootPkgPath, 'utf8'));

test('project includes PostgreSQL runtime dependency', () => {
  assert.ok(pkg.dependencies && pkg.dependencies.pg, 'pg dependency is required for PostgreSQL support');
});
