const test = require('node:test');
const assert = require('node:assert/strict');
const { pickSlot, DEFAULTS } = require('../services/menuTimeService');

test('before opening, the canteen is closed and morning is next', () => {
  const result = pickSlot(DEFAULTS, 5 * 60 + 59); // 5:59 AM

  assert.equal(result.open, false);
  assert.equal(result.current, null);
  assert.equal(result.next.key, 'morning');
});

test('during morning, afternoon is next', () => {
  const result = pickSlot(DEFAULTS, 10 * 60); // 10:00 AM

  assert.equal(result.open, true);
  assert.equal(result.current.key, 'morning');
  assert.equal(result.next.key, 'afternoon');
});

test('at noon, afternoon becomes the current menu', () => {
  const result = pickSlot(DEFAULTS, 12 * 60); // 12:00 PM

  assert.equal(result.open, true);
  assert.equal(result.current.key, 'afternoon');
  assert.equal(result.next.key, 'evening');
});

test('at closing time, the canteen is closed', () => {
  const result = pickSlot(DEFAULTS, 18 * 60 + 30); // 6:30 PM

  assert.equal(result.open, false);
  assert.equal(result.current, null);
  assert.equal(result.next.key, 'morning');
});
