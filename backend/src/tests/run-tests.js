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

const tests = [
  {
    name: 'normalizeSecretVegetableList accepts exactly 4 supported vegetables',
    fn: () => {
      const vegetables = normalizeSecretVegetableList(['Carrot', 'Potato', 'Tomato', 'Onion']);
      assert.deepEqual(vegetables, ['Carrot', 'Potato', 'Tomato', 'Onion']);
    },
  },
  {
    name: 'normalizeSecretLetters uppercases and validates distinct letters',
    fn: () => {
      assert.deepEqual(normalizeSecretLetters(['x', 'r']), ['X', 'R']);
      assert.throws(() => normalizeSecretLetters(['X', 'X']));
    },
  },
  {
    name: 'normalizePositionPair validates one/two unique cells in 3x6 range',
    fn: () => {
      assert.deepEqual(normalizePositionPair([]), []);
      assert.deepEqual(normalizePositionPair([1]), [1]);
      assert.deepEqual(normalizePositionPair([1, 18]), [1, 18]);
      assert.throws(() => normalizePositionPair([1, 1]));
      assert.throws(() => normalizePositionPair([0, 19]));
    },
  },
  {
    name: 'normalizePairVegetables validates a unique pair from secret vegetables',
    fn: () => {
      assert.deepEqual(
        normalizePairVegetables(['Carrot', 'Tomato'], ['Carrot', 'Potato', 'Tomato', 'Onion']),
        ['Carrot', 'Tomato']
      );
      assert.throws(() =>
        normalizePairVegetables(['Carrot', 'Carrot'], ['Carrot', 'Potato', 'Tomato', 'Onion'])
      );
      assert.throws(() =>
        normalizePairVegetables(['Carrot', 'Apple'], ['Carrot', 'Potato', 'Tomato', 'Onion'])
      );
    },
  },
  {
    name: 'computeSaltedDigits returns two output digits',
    fn: () => {
      const value = computeSaltedDigits({ originalNumber: 42, saltValue: 5 });
      assert.equal(value.digitOne, '4');
      assert.equal(value.digitTwo, '7');
    },
  },
  {
    name: 'createChallengePayload creates eighteen produce cards and expected digits',
    fn: () => {
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
      assert.ok(typeof payload.expectedDigitOne === 'string');
      assert.ok(typeof payload.expectedDigitTwo === 'string');
      assert.equal(countVisibleSecrets(payload, secretVegetables), 1);
    },
  },
  {
    name: 'createChallengePayload uses enrolled fixed position for POSITION_SUM mode',
    fn: () => {
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
      const result = Number(`${payload.expectedDigitOne}${payload.expectedDigitTwo}`);
      assert.ok(result <= 99);
      assert.equal(countVisibleSecrets(payload, ['Carrot', 'Potato', 'Tomato', 'Onion']), 1);
    },
  },
  {
    name: 'createChallengePayload honors selected pair in PAIR_SUM mode',
    fn: () => {
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
      const result = Number(`${payload.expectedDigitOne}${payload.expectedDigitTwo}`);
      assert.ok(result <= 99);
      assert.equal(countVisibleSecrets(payload, ['Carrot', 'Potato', 'Tomato', 'Onion']), 2);
    },
  },
  {
    name: 'createChallengePayload auto-randomizes pair in PAIR_SUM mode when pairVegetables is omitted',
    fn: () => {
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
        assert.ok(secretVegetables.includes(name));
      }
      const result = Number(`${payload.expectedDigitOne}${payload.expectedDigitTwo}`);
      assert.ok(result <= 99);
      assert.equal(countVisibleSecrets(payload, secretVegetables), 2);
    },
  },
  {
    name: 'detectHoneyPotAttempt flags direct unsalted input at secret letters',
    fn: () => {
      const triggered = detectHoneyPotAttempt({
        secretNumber: 42,
        secretLetters: ['X', 'R'],
        inputs: { X: '4', R: '2' },
      });
      assert.equal(triggered, true);
    },
  },
];

const run = async () => {
  let passed = 0;

  for (const test of tests) {
    try {
      await Promise.resolve(test.fn());
      passed += 1;
      console.log(`PASS: ${test.name}`);
    } catch (error) {
      console.error(`FAIL: ${test.name}`);
      console.error(error);
      process.exit(1);
    }
  }

  console.log(`All tests passed (${passed}/${tests.length})`);
};

run();
