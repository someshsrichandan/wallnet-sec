const test = require('node:test');
const assert = require('node:assert/strict');

const {
  computeSaltedDigits,
  createChallengePayload,
  detectHoneyPotAttempt,
  normalizePairVegetables,
  normalizePositionPair,
  normalizeSecretLetters,
  normalizeSecretVegetableList,
} = require('../services/visualPassword.service');

const countVisibleSecrets = (payload, secretVegetables) =>
  payload.vegetables.filter((item) => secretVegetables.includes(item.name)).length;

test('normalizeSecretVegetableList validates count and values', () => {
  assert.deepEqual(
    normalizeSecretVegetableList(['Carrot', 'Potato', 'Tomato', 'Onion']),
    ['Carrot', 'Potato', 'Tomato', 'Onion']
  );

  assert.throws(() => normalizeSecretVegetableList(['Carrot', 'Potato']));
});

test('normalizeSecretLetters validates 2 distinct letters', () => {
  assert.deepEqual(normalizeSecretLetters(['x', 'r']), ['X', 'R']);
  assert.throws(() => normalizeSecretLetters(['X', 'X']));
});

test('normalizePositionPair validates one/two unique positions', () => {
  assert.deepEqual(normalizePositionPair([]), []);
  assert.deepEqual(normalizePositionPair([1]), [1]);
  assert.deepEqual(normalizePositionPair([1, 18]), [1, 18]);
  assert.throws(() => normalizePositionPair([1, 1]));
});

test('normalizePairVegetables validates selected pair against secret vegetables', () => {
  assert.deepEqual(
    normalizePairVegetables(['Carrot', 'Tomato'], ['Carrot', 'Potato', 'Tomato', 'Onion']),
    ['Carrot', 'Tomato']
  );
  assert.throws(() =>
    normalizePairVegetables(['Carrot', 'Apple'], ['Carrot', 'Potato', 'Tomato', 'Onion'])
  );
});

test('computeSaltedDigits returns expected digits', () => {
  const result = computeSaltedDigits({ originalNumber: 42, saltValue: 5 });
  assert.equal(result.digitOne, '4');
  assert.equal(result.digitTwo, '7');
});

test('createChallengePayload includes eighteen produce cards with one or more secret entries', () => {
  const secretVegetables = ['Carrot', 'Potato', 'Tomato', 'Onion'];
  const payload = createChallengePayload({
    secretVegetables,
    secretLetters: ['X', 'R'],
    saltValue: 5,
    gridSize: 10,
  });

  assert.equal(payload.vegetables.length, 18);
  assert.equal(payload.alphabetGrid.length, 10);
  assert.ok(payload.alphabetGrid.includes('X'));
  assert.ok(payload.alphabetGrid.includes('R'));
  assert.equal(countVisibleSecrets(payload, secretVegetables), 1);
});

test('createChallengePayload honors fixed position in POSITION_SUM mode', () => {
  const payload = createChallengePayload({
    secretVegetables: ['Carrot', 'Potato', 'Tomato', 'Onion'],
    secretLetters: ['X', 'R'],
    saltValue: 5,
    gridSize: 10,
    formulaMode: 'POSITION_SUM',
    positionPair: [1],
  });

  assert.equal(payload.formulaMode, 'POSITION_SUM');
  assert.deepEqual(
    (payload.formulaHint.positions || []).map((item) => item.index),
    [1]
  );
  const value = Number(`${payload.expectedDigitOne}${payload.expectedDigitTwo}`);
  assert.ok(value <= 99);
  assert.equal(countVisibleSecrets(payload, ['Carrot', 'Potato', 'Tomato', 'Onion']), 1);
});

test('createChallengePayload honors fixed selected pair in PAIR_SUM mode', () => {
  const payload = createChallengePayload({
    secretVegetables: ['Carrot', 'Potato', 'Tomato', 'Onion'],
    secretLetters: ['X', 'R'],
    saltValue: 5,
    gridSize: 10,
    formulaMode: 'PAIR_SUM',
    pairVegetables: ['Carrot', 'Tomato'],
  });

  assert.equal(payload.formulaMode, 'PAIR_SUM');
  assert.deepEqual(payload.formulaHint.pairVegetables, ['Carrot', 'Tomato']);
  assert.equal(countVisibleSecrets(payload, ['Carrot', 'Potato', 'Tomato', 'Onion']), 2);
});

test('createChallengePayload auto-randomizes pair in PAIR_SUM mode when pairVegetables is omitted', () => {
  const secretVegetables = ['Carrot', 'Potato', 'Tomato', 'Onion'];
  const payload = createChallengePayload({
    secretVegetables,
    secretLetters: ['X', 'R'],
    saltValue: 5,
    gridSize: 10,
    formulaMode: 'PAIR_SUM',
  });

  assert.equal(payload.formulaMode, 'PAIR_SUM');
  assert.equal((payload.formulaHint.pairVegetables || []).length, 2);
  for (const name of payload.formulaHint.pairVegetables || []) {
    assert.equal(secretVegetables.includes(name), true);
  }
  assert.equal(countVisibleSecrets(payload, secretVegetables), 2);
});

test('detectHoneyPotAttempt identifies unsalted answer at secret letters', () => {
  assert.equal(
    detectHoneyPotAttempt({
      secretNumber: 84,
      secretLetters: ['X', 'R'],
      inputs: { X: '8', R: '4' },
    }),
    true
  );
});
