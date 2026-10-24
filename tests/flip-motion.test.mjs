import assert from 'node:assert/strict';
import test from 'node:test';
import { clamp01, smoothstep01, tileProgress, requestedScene } from '../src/lib/flip-motion.ts';

function sampleGrid(progress, rows, cols) {
  return Array.from({ length: rows * cols }, (_, index) =>
    tileProgress(progress, Math.floor(index / cols), index % cols, rows, cols),
  );
}

test('clamp and easing have bounded, finite endpoints', () => {
  for (const [input, expected] of [[-Infinity, 0], [-1, 0], [0, 0], [0.5, 0.5], [1, 1], [2, 1], [Infinity, 1], [NaN, 0]]) {
    assert.equal(clamp01(input), expected);
    assert.equal(smoothstep01(input), expected);
  }
  assert.equal(smoothstep01(0.25), 0.15625);
  assert.equal(smoothstep01(0.75), 0.84375);
});

for (const [rows, cols] of [[3, 6], [6, 6]]) {
  test(`${rows}×${cols}: the wave stays front-facing until 0.12 and completes at 0.82`, () => {
    for (const progress of [-1, 0, 0.12]) assert(sampleGrid(progress, rows, cols).every((value) => value === 0));
    for (const progress of [0.82, 1, 2]) assert(sampleGrid(progress, rows, cols).every((value) => value === 1));
    assert.equal(tileProgress(0.54, 0, 0, rows, cols), 1, 'first tile completes after its 0.42 interval');
    assert.equal(tileProgress(0.4, rows - 1, cols - 1, rows, cols), 0, 'last tile starts after the complete 0.28 stagger');
  });

  test(`${rows}×${cols}: midpoint shows the weighted diagonal stagger`, () => {
    const grid = sampleGrid(0.47, rows, cols);
    assert(new Set(grid).size > 2);
    assert(grid[0] > grid.at(-1));
    assert(grid[cols - 1] < grid[(rows - 1) * cols], 'horizontal travel delays the wave more than vertical travel');
    assert(grid.every((value) => value > 0 && value < 1));
  });

  test(`${rows}×${cols}: every tile is monotonic and stays finite`, () => {
    let previous = sampleGrid(0, rows, cols);
    for (let step = 1; step <= 1000; step += 1) {
      const current = sampleGrid(step / 1000, rows, cols);
      current.forEach((value, index) => {
        assert(Number.isFinite(value));
        assert(value >= previous[index] && value <= 1);
      });
      previous = current;
    }
  });

  test(`${rows}×${cols}: reverse sampling produces exactly the same frames`, () => {
    const positions = [0, 0.12, 0.19, 0.4, 0.47, 0.61, 0.82, 1];
    const forward = positions.map((progress) => sampleGrid(progress, rows, cols));
    const reverse = [...positions].reverse().map((progress) => sampleGrid(progress, rows, cols)).reverse();
    assert.deepEqual(reverse, forward);
  });
}

test('single-axis grids and malformed numeric inputs never produce NaN', () => {
  assert(Math.abs(tileProgress(0.33, 0, 0, 1, 1) - 0.5) < Number.EPSILON);
  assert.equal(tileProgress(0.47, 0, 5, 1, 6), tileProgress(0.47, 0, 5, 6, 6));
  assert.equal(tileProgress(0.47, 5, 0, 6, 1), tileProgress(0.47, 5, 0, 6, 6));
  for (const value of [NaN, Infinity, -Infinity, -10, 0, 1]) {
    for (const args of [[value, 0, 0, 3, 6], [0.47, value, value, 3, 6], [0.47, 0, 0, value, value]]) {
      const result = tileProgress(...args);
      assert(Number.isFinite(result));
      assert(result >= 0 && result <= 1);
    }
  }
});


test('first tiny vertical gesture selects a scene; further downward gestures remain native', () => {
  for (const delta of [0.1, 1, 6, 180]) assert.equal(requestedScene(0, delta), 1);
  for (const delta of [-0.1, -1, -6, -180]) assert.equal(requestedScene(1, delta), 0);
  for (const delta of [0.1, 6, 180]) assert.equal(requestedScene(1, delta), null);
  for (const delta of [-0.1, -6, -180]) assert.equal(requestedScene(0, delta), null);
  for (const delta of [0, NaN, Infinity, -Infinity]) assert.equal(requestedScene(0, delta), null);
});
