import assert from 'node:assert/strict'
import { test } from 'node:test'

import { boundsOf, duration, fillOpacity, ordinal, pointsAttr, serverNow } from '../src/lib/territory'

test('bounds cover every polygon plus the margin', () => {
  const b = boundsOf([{ polygon: [[0, 0], [100, 0], [100, 50]] }, { polygon: [[-20, 10], [-20, 90], [0, 90]] }], 10)
  assert.deepEqual(b, { minX: -30, minZ: -10, width: 140, height: 110 })
  assert.equal(boundsOf([]).width, 200)
})

test('points attribute is x,z pairs', () => {
  assert.equal(pointsAttr([[1, 2], [3.5, -4]]), '1,2 3.5,-4')
})

test('duration matches the in-game popups', () => {
  assert.equal(duration(7_500_000), '2h 5m')
  assert.equal(duration((3 * 24 + 4) * 3_600_000), '3d 4h')
  assert.equal(duration(40_000), '40s')
  assert.equal(duration(-5), '0s')
})

test('ordinals', () => {
  assert.deepEqual([1, 2, 3, 4, 11, 12, 13, 21, 22].map(ordinal), ['1st', '2nd', '3rd', '4th', '11th', '12th', '13th', '21st', '22nd'])
})

test('held zones are more opaque than neutral ones, and the clock follows the server', () => {
  assert.ok(fillOpacity('held') > fillOpacity('neutral'))
  assert.equal(serverNow({ server_time: '2026-10-18T00:00:00Z' }, 1000, 3500), Date.parse('2026-10-18T00:00:02.500Z'))
})
