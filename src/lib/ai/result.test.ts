// Chạy: node src/lib/ai/result.test.ts
import assert from 'node:assert/strict';
import type { WoundDetection } from '../capture/woundDetect.ts';
import { fromColorDetection } from './result.ts';

const none = fromColorDetection(null, 'm', '1');
assert.deepEqual(none, { found: false, box: null, hull: [], center: null, areaFraction: null, contrast: null, confidence: null, modelId: 'm', modelVersion: '1' });

const base: WoundDetection = { found: false, box: null, hull: [], center: null, areaFraction: 0, contrast: 0, meanLuma: null, clippedFraction: 0, width: 100, height: 100 };
const miss = fromColorDetection(base, 'm', '1');
assert.equal(miss.found, false);
assert.equal(miss.box, null);
assert.equal(miss.areaFraction, null);

const hit: WoundDetection = {
  ...base,
  found: true,
  box: { x: 0.2, y: 0.3, width: 0.4, height: 0.2 },
  hull: [[0.2, 0.3], [0.6, 0.3], [0.6, 0.5]],
  center: { x: 0.4, y: 0.4 },
  areaFraction: 0.05,
  contrast: 12.5,
};
const r = fromColorDetection(hit, 'color_lab_otsu_v1', '1');
assert.equal(r.found, true);
assert.deepEqual(r.box, hit.box);
assert.deepEqual(r.hull, hit.hull);
assert.deepEqual(r.center, hit.center);
assert.equal(r.areaFraction, 0.05);
assert.equal(r.contrast, 12.5);
assert.equal(r.confidence, null);
assert.equal(r.modelId, 'color_lab_otsu_v1');
assert.equal(r.modelVersion, '1');
console.log('ai/result.test: ok');
