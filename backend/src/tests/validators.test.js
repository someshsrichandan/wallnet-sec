const test = require('node:test');
const assert = require('node:assert/strict');

const {
  assertEmail,
  assertOptionalString,
  assertRequiredString,
  parsePagination,
} = require('../utils/validators');

test('assertRequiredString trims and validates bounds', () => {
  const value = assertRequiredString('name', '  Team Alpha  ', { min: 2, max: 20 });
  assert.equal(value, 'Team Alpha');
});

test('assertOptionalString returns empty for missing value', () => {
  assert.equal(assertOptionalString('notes', undefined), '');
});

test('assertEmail lowercases and validates email format', () => {
  const email = assertEmail('Test@Example.com');
  assert.equal(email, 'test@example.com');
});

test('parsePagination returns defaults when no query provided', () => {
  const result = parsePagination({}, { defaultPage: 1, defaultLimit: 20 });
  assert.deepEqual(result, { page: 1, limit: 20, skip: 0 });
});
