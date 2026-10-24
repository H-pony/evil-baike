import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, copyFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import matter from 'gray-matter';

test('editor scaffolds create safe drafts and never overwrite existing work', async () => {
  const root = await mkdtemp(join(tmpdir(), 'archive-scaffold-'));
  try {
    await mkdir(join(root, 'scripts'));
    const script = join(root, 'scripts/new-entry.mjs');
    await copyFile(new URL('../scripts/new-entry.mjs', import.meta.url), script);
    for (const [kind, folder] of [['event', 'events'], ['person', 'people'], ['organization', 'organizations']]) {
      const result = spawnSync(process.execPath, [script, kind, '--id=audit-draft'], { encoding: 'utf8' });
      assert.equal(result.status, 0, result.stderr);
      const path = join(root, 'src/content', folder, 'audit-draft.md');
      const original = await readFile(path, 'utf8');
      const { data } = matter(original);
      assert.equal(data.status, 'draft');
      assert.ok(data.summary.trim().length >= 10);
      assert.deepEqual(data.sources, []);
      assert.equal(data.notes, undefined);
      assert.equal(data.dateEnd, undefined);
      const duplicate = spawnSync(process.execPath, [script, kind, '--id=audit-draft'], { encoding: 'utf8' });
      assert.notEqual(duplicate.status, 0);
      assert.equal(await readFile(path, 'utf8'), original);
    }
    assert.notEqual(spawnSync(process.execPath, [script, 'event', '--id=../escape']).status, 0);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
