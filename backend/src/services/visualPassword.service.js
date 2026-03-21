const { createHash, randomInt } = require("crypto");

const HttpError = require("../utils/httpError");

const SESSION_TTL_MS = 5 * 60 * 1000;
const MAX_FAILED_ATTEMPTS_BEFORE_LOCK = 3;
const DEFAULT_SALT_VALUE = 5;
const MIN_SALT_VALUE = 3;
const MAX_SALT_VALUE = 7;
const MIN_GRID_SIZE = 9;
const MAX_GRID_SIZE = 12;
const CHALLENGE_VISIBLE_COUNT = 18;
const CHALLENGE_COLUMNS = 6;
const MIN_VEGETABLE_NUMBER = 10;
const MAX_VEGETABLE_NUMBER = 99;
const SUM_MODE_MIN_NUMBER = 10;
const SUM_MODE_MAX_NUMBER = 49;

const FORMULA_MODE = Object.freeze({
  SALT_ADD: "SALT_ADD",
  POSITION_SUM: "POSITION_SUM",
  PAIR_SUM: "PAIR_SUM",
});

const ALPHABET_MODE = Object.freeze({
  SEQUENTIAL: "SEQUENTIAL",
  RANDOM: "RANDOM",
});

const CATALOG_TYPE = Object.freeze({
  VEGETABLE: "VEGETABLE",
  CRICKETER: "CRICKETER",
  BOLLYWOOD: "BOLLYWOOD",
});

const SUPPORTED_FORMULA_MODES = Object.values(FORMULA_MODE);
const SUPPORTED_ALPHABET_MODES = Object.values(ALPHABET_MODE);
const SUPPORTED_CATALOG_TYPES = Object.values(CATALOG_TYPE);
const WIKIPEDIA_SUMMARY_BASE_URL =
  "https://en.wikipedia.org/api/rest_v1/page/summary/";

const VEGETABLE_CATALOG = Object.freeze([
  "Carrot",
  "Potato",
  "Tomato",
  "Onion",
  "Cabbage",
  "Cauliflower",
  "Broccoli",
  "Spinach",
  "Peas",
  "Corn",
  "Pumpkin",
  "Cucumber",
  "Radish",
  "Beetroot",
  "Bell Pepper",
  "Chili",
  "Eggplant",
  "Okra",
  "Lettuce",
  "Zucchini",
  "Turnip",
  "Celery",
  "Garlic",
  "Ginger",
  "Mushroom",
  "Sweet Potato",
  "Asparagus",
  "Artichoke",
  "Apple",
  "Banana",
  "Orange",
  "Mango",
  "Grapes",
  "Papaya",
  "Pineapple",
  "Guava",
  "Pear",
  "Peach",
  "Plum",
  "Kiwi",
  "Pomegranate",
  "Watermelon",
  "Muskmelon",
  "Strawberry",
  "Blueberry",
  "Raspberry",
  "Blackberry",
  "Cherry",
  "Avocado",
  "Lemon",
  "Lime",
  "Coconut",
  "Dragon Fruit",
  "Fig",
]);

const CRICKETER_CATALOG = Object.freeze([
  "Virat Kohli",
  "Rohit Sharma",
  "MS Dhoni",
  "Sachin Tendulkar",
  "Rahul Dravid",
  "Sourav Ganguly",
  "Yuvraj Singh",
  "Jasprit Bumrah",
  "Hardik Pandya",
  "Ravindra Jadeja",
  "Ravichandran Ashwin",
  "Shikhar Dhawan",
  "Suresh Raina",
  "KL Rahul",
  "Shubman Gill",
  "Rishabh Pant",
  "Mohammed Shami",
  "Irfan Pathan",
  "Harbhajan Singh",
  "Anil Kumble",
  "Kapil Dev",
  "Sunil Gavaskar",
  "Virender Sehwag",
  "Gautam Gambhir",
  "Ajinkya Rahane",
  "Bhuvneshwar Kumar",
  "Ishan Kishan",
  "Yashasvi Jaiswal",
  "Mohammed Siraj",
  "Kuldeep Yadav",
  "Axar Patel",
  "Washington Sundar",
  "Arshdeep Singh",
  "Suryakumar Yadav",
  "Ruturaj Gaikwad",
  "Sanju Samson",
  "Prithvi Shaw",
  "Dinesh Karthik",
  "Robin Uthappa",
  "Murali Vijay",
  "Zaheer Khan",
  "Ashish Nehra",
  "VVS Laxman",
  "Cheteshwar Pujara",
  "Umesh Yadav",
  "Navdeep Saini",
  "Mayank Agarwal",
  "Manoj Tiwary",
  "Ambati Rayudu",
  "Deepak Chahar",
  "Shardul Thakur",
  "Yuzvendra Chahal",
  "Varun Chakravarthy",
  "Nitish Kumar Reddy",
]);

const BOLLYWOOD_CATALOG = Object.freeze([
  "Shah Rukh Khan",
  "Amitabh Bachchan",
  "Salman Khan",
  "Aamir Khan",
  "Ranbir Kapoor",
  "Ranveer Singh",
  "Hrithik Roshan",
  "Akshay Kumar",
  "Ajay Devgn",
  "Saif Ali Khan",
  "Vicky Kaushal",
  "Rajkummar Rao",
  "Ayushmann Khurrana",
  "Varun Dhawan",
  "Sidharth Malhotra",
  "Tiger Shroff",
  "Kartik Aaryan",
  "John Abraham",
  "Emraan Hashmi",
  "Nawazuddin Siddiqui",
  "Irrfan Khan",
  "Anil Kapoor",
  "Rishi Kapoor",
  "Sanjay Dutt",
  "Sunny Deol",
  "Bobby Deol",
  "Madhuri Dixit",
  "Deepika Padukone",
  "Alia Bhatt",
  "Katrina Kaif",
  "Priyanka Chopra",
  "Kareena Kapoor",
  "Karishma Kapoor",
  "Rani Mukerji",
  "Kajol",
  "Juhi Chawla",
  "Aishwarya Rai",
  "Anushka Sharma",
  "Kiara Advani",
  "Shraddha Kapoor",
  "Vidya Balan",
  "Taapsee Pannu",
  "Kriti Sanon",
  "Sara Ali Khan",
  "Janhvi Kapoor",
  "Bhumi Pednekar",
  "Sonam Kapoor",
  "Parineeti Chopra",
  "Disha Patani",
  "Yami Gautam",
  "Huma Qureshi",
  "Radhika Apte",
  "Mrunal Thakur",
  "Triptii Dimri",
]);

const CATALOG_BY_TYPE = Object.freeze({
  [CATALOG_TYPE.VEGETABLE]: VEGETABLE_CATALOG,
  [CATALOG_TYPE.CRICKETER]: CRICKETER_CATALOG,
  [CATALOG_TYPE.BOLLYWOOD]: BOLLYWOOD_CATALOG,
});
const PERSON_IMAGE_CACHE = new Map();

const normalizeCatalogItemName = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();
const normalizeLetter = (value) =>
  String(value || "")
    .trim()
    .toUpperCase();

const normalizeCatalogType = (value) => {
  const normalized = String(value || CATALOG_TYPE.VEGETABLE)
    .trim()
    .toUpperCase();

  if (!SUPPORTED_CATALOG_TYPES.includes(normalized)) {
    throw new HttpError(
      400,
      `catalogType must be one of: ${SUPPORTED_CATALOG_TYPES.join(", ")}`,
    );
  }

  return normalized;
};

const getCatalogItemsByType = (catalogType = CATALOG_TYPE.VEGETABLE) => {
  const resolvedType = normalizeCatalogType(catalogType);
  return CATALOG_BY_TYPE[resolvedType] || VEGETABLE_CATALOG;
};

const shuffle = (items = []) => {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(0, index + 1);
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
};

const pickRandomSubset = (items = [], size = 0) => {
  if (size <= 0) {
    return [];
  }

  if (size >= items.length) {
    return [...items];
  }

  return shuffle(items).slice(0, size);
};

const getCanonicalCatalogItem = (
  value,
  catalogType = CATALOG_TYPE.VEGETABLE,
) => {
  const normalized = normalizeCatalogItemName(value);
  if (!normalized) {
    return null;
  }

  return (
    getCatalogItemsByType(catalogType).find(
      (item) => normalizeCatalogItemName(item) === normalized,
    ) || null
  );
};

const normalizeSecretVegetableList = (
  value,
  catalogType = CATALOG_TYPE.VEGETABLE,
) => {
  const input =
    Array.isArray(value) ? value : (
      String(value || "")
        .split(/[\,|/]+/)
        .map((item) => item.trim())
        .filter(Boolean)
    );

  if (!Array.isArray(input) || input.length !== 4) {
    throw new HttpError(400, "secretVegetables must contain exactly 4 items");
  }

  const normalized = input.map((item) => {
    const resolved = getCanonicalCatalogItem(item, catalogType);
    if (!resolved) {
      throw new HttpError(400, `${item} is not supported in selected catalog`);
    }
    return resolved;
  });

  const unique = [...new Set(normalized)];
  if (unique.length !== 4) {
    throw new HttpError(400, "secretVegetables must contain 4 unique items");
  }

  return unique;
};

const normalizePairVegetables = (
  value,
  secretVegetables = [],
  catalogType = CATALOG_TYPE.VEGETABLE,
) => {
  if (value === undefined || value === null || value === "") {
    return [];
  }

  const input =
    Array.isArray(value) ? value : (
      String(value || "")
        .split(/[\,|/]+/)
        .map((item) => item.trim())
        .filter(Boolean)
    );

  if (!Array.isArray(input) || input.length !== 2) {
    throw new HttpError(400, "pairVegetables must contain exactly 2 items");
  }

  const normalized = input.map((item) => {
    const resolved = getCanonicalCatalogItem(item, catalogType);
    if (!resolved) {
      throw new HttpError(400, `${item} is not supported in selected catalog`);
    }
    return resolved;
  });

  if (new Set(normalized).size !== 2) {
    throw new HttpError(400, "pairVegetables must contain 2 unique items");
  }

  if (
    Array.isArray(secretVegetables) &&
    secretVegetables.length > 0 &&
    normalized.some((item) => !secretVegetables.includes(item))
  ) {
    throw new HttpError(
      400,
      "pairVegetables must be selected from secretVegetables",
    );
  }

  return normalized;
};

const normalizeSecretLetters = (letters) => {
  if (!Array.isArray(letters) || letters.length !== 2) {
    throw new HttpError(400, "secretLetters must contain exactly 2 letters");
  }

  const normalized = letters.map((letter, index) => {
    const upper = normalizeLetter(letter);
    if (!/^[A-Z]$/.test(upper)) {
      throw new HttpError(
        400,
        `secretLetters[${index}] must be one uppercase letter`,
      );
    }
    return upper;
  });

  if (normalized[0] === normalized[1]) {
    throw new HttpError(400, "secretLetters must contain distinct letters");
  }

  return normalized;
};

const normalizeFormulaMode = (value) => {
  const normalized = String(value || FORMULA_MODE.SALT_ADD)
    .trim()
    .toUpperCase();

  if (!SUPPORTED_FORMULA_MODES.includes(normalized)) {
    throw new HttpError(
      400,
      `formulaMode must be one of: ${SUPPORTED_FORMULA_MODES.join(", ")}`,
    );
  }

  return normalized;
};

const normalizeAlphabetMode = (value) => {
  const normalized = String(value || ALPHABET_MODE.SEQUENTIAL)
    .trim()
    .toUpperCase();

  if (!SUPPORTED_ALPHABET_MODES.includes(normalized)) {
    throw new HttpError(
      400,
      `alphabetMode must be one of: ${SUPPORTED_ALPHABET_MODES.join(", ")}`,
    );
  }

  return normalized;
};

const normalizeSaltValue = (value, fallback = DEFAULT_SALT_VALUE) => {
  const candidate = Number.isInteger(Number(value)) ? Number(value) : fallback;

  if (
    !Number.isInteger(candidate) ||
    candidate < MIN_SALT_VALUE ||
    candidate > MAX_SALT_VALUE
  ) {
    throw new HttpError(
      400,
      `saltValue must be an integer between ${MIN_SALT_VALUE} and ${MAX_SALT_VALUE}`,
    );
  }

  return candidate;
};

const normalizePositionPair = (value) => {
  if (value === undefined || value === null || value === "") {
    return [];
  }

  if (Array.isArray(value) && value.length === 0) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new HttpError(
      400,
      "positionPair must be an array of board positions",
    );
  }

  if (value.length < 1 || value.length > 2) {
    throw new HttpError(400, "positionPair must contain 1 or 2 positions");
  }

  const normalized = value.map((item, index) => {
    const parsed = Number(item);
    if (
      !Number.isInteger(parsed) ||
      parsed < 1 ||
      parsed > CHALLENGE_VISIBLE_COUNT
    ) {
      throw new HttpError(
        400,
        `positionPair[${index}] must be an integer between 1 and ${CHALLENGE_VISIBLE_COUNT}`,
      );
    }
    return parsed;
  });

  if (new Set(normalized).size !== normalized.length) {
    throw new HttpError(400, "positionPair positions must be different");
  }

  return normalized;
};

const generateUniqueTwoDigitNumbers = ({
  count,
  min = MIN_VEGETABLE_NUMBER,
  max = MAX_VEGETABLE_NUMBER,
  exclude = [],
}) => {
  const lower = Math.max(
    MIN_VEGETABLE_NUMBER,
    Number(min) || MIN_VEGETABLE_NUMBER,
  );
  const upper = Math.min(
    MAX_VEGETABLE_NUMBER,
    Number(max) || MAX_VEGETABLE_NUMBER,
  );

  if (lower > upper) {
    throw new HttpError(
      500,
      "Unable to generate number pool for challenge generation",
    );
  }

  const excludeSet = new Set(
    exclude.filter((value) => Number.isInteger(value)),
  );
  const pool = [];
  for (let value = lower; value <= upper; value += 1) {
    if (!excludeSet.has(value)) {
      pool.push(value);
    }
  }

  if (count > pool.length) {
    throw new HttpError(
      500,
      "Not enough two-digit numbers available for challenge generation",
    );
  }

  return pickRandomSubset(pool, count);
};

const computeTwoDigitOutput = (value) => {
  if (!Number.isInteger(value) || value < 0 || value > 99) {
    throw new HttpError(
      500,
      "Expected output value must remain in two-digit range",
    );
  }

  const twoDigits = String(value).padStart(2, "0");
  return {
    value,
    digitOne: twoDigits[0],
    digitTwo: twoDigits[1],
  };
};

const computeSaltedDigits = ({ originalNumber, saltValue }) => {
  const salted = originalNumber + saltValue;
  return computeTwoDigitOutput(salted);
};

const createAlphabetGrid = ({
  secretLetters,
  size,
  mode = ALPHABET_MODE.SEQUENTIAL,
}) => {
  const normalizedSize = Math.max(
    MIN_GRID_SIZE,
    Math.min(MAX_GRID_SIZE, Number(size) || 10),
  );
  const alphabet = Array.from({ length: 26 }, (_, index) =>
    String.fromCharCode(65 + index),
  );
  const normalizedMode = normalizeAlphabetMode(mode);

  if (normalizedMode === ALPHABET_MODE.SEQUENTIAL) {
    const selected = new Set(secretLetters);
    for (const letter of alphabet) {
      if (selected.size >= normalizedSize) {
        break;
      }
      selected.add(letter);
    }

    return [...selected].sort();
  }

  const remaining = alphabet.filter(
    (letter) => !secretLetters.includes(letter),
  );
  const randomLetters = pickRandomSubset(
    remaining,
    normalizedSize - secretLetters.length,
  );
  return shuffle([...secretLetters, ...randomLetters]);
};

const getFallbackCatalogImageUrl = (label) => {
  const safeLabel =
    String(label || "Item")
      .replace(/[^a-zA-Z0-9 ]/g, "")
      .slice(0, 24) || "Item";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="220" viewBox="0 0 320 220"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#fef3c7"/><stop offset="100%" stop-color="#fcd34d"/></linearGradient></defs><rect width="320" height="220" fill="url(#g)"/><rect x="10" y="10" width="300" height="200" rx="14" fill="#fff7ed" stroke="#fb923c"/><text x="160" y="112" text-anchor="middle" font-family="Arial, sans-serif" font-size="25" font-weight="700" fill="#7c2d12">${safeLabel}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

const IMAGE_API_ALIAS = Object.freeze({
  "Bell Pepper": "Green Pepper",
  Chili: "Chilli",
  Eggplant: "Aubergine",
  Mushroom: "Mushrooms",
  "Sweet Potato": "Sweet Potatoes",
  Turnip: "Turnips",
  Zucchini: "Courgettes",
  "Dragon Fruit": "Dragonfruit",
});

const getCatalogImageUrl = (itemName, catalogType = CATALOG_TYPE.VEGETABLE) => {
  const normalized = String(itemName || "").trim();
  const resolvedCatalogType = normalizeCatalogType(catalogType);
  if (!normalized) {
    return getFallbackCatalogImageUrl(itemName);
  }

  if (
    resolvedCatalogType === CATALOG_TYPE.CRICKETER ||
    resolvedCatalogType === CATALOG_TYPE.BOLLYWOOD
  ) {
    return getFallbackCatalogImageUrl(itemName);
  }

  const ingredientName = IMAGE_API_ALIAS[normalized] || normalized;
  return `https://www.themealdb.com/images/ingredients/${encodeURIComponent(ingredientName)}.png`;
};

const getWikipediaTitleCandidates = (name, catalogType) => {
  if (catalogType === CATALOG_TYPE.CRICKETER) {
    return [name, `${name} (cricketer)`, `${name} (Indian cricketer)`];
  }

  if (catalogType === CATALOG_TYPE.BOLLYWOOD) {
    return [
      name,
      `${name} (actor)`,
      `${name} (actress)`,
      `${name} (Indian actor)`,
      `${name} (Indian actress)`,
    ];
  }

  return [name];
};

const fetchWikipediaImage = async (title) => {
  const response = await fetch(
    `${WIKIPEDIA_SUMMARY_BASE_URL}${encodeURIComponent(title)}`,
    {
      headers: {
        "user-agent": "visual-password-app/1.0 (catalog image resolver)",
        accept: "application/json",
      },
    },
  );

  if (!response.ok) {
    return "";
  }

  const data = await response.json();
  if (data?.thumbnail?.source) {
    return data.thumbnail.source;
  }

  if (data?.originalimage?.source) {
    return data.originalimage.source;
  }

  return "";
};

const resolveCatalogImageUrl = async (
  itemName,
  catalogType = CATALOG_TYPE.VEGETABLE,
) => {
  const resolvedCatalogType = normalizeCatalogType(catalogType);
  if (resolvedCatalogType === CATALOG_TYPE.VEGETABLE) {
    return getCatalogImageUrl(itemName, resolvedCatalogType);
  }

  const key = `${resolvedCatalogType}:${String(itemName || "")
    .trim()
    .toLowerCase()}`;
  if (PERSON_IMAGE_CACHE.has(key)) {
    return PERSON_IMAGE_CACHE.get(key);
  }

  const candidates = getWikipediaTitleCandidates(itemName, resolvedCatalogType);
  for (const title of candidates) {
    try {
      const resolved = await fetchWikipediaImage(title);
      if (resolved) {
        PERSON_IMAGE_CACHE.set(key, resolved);
        return resolved;
      }
    } catch {
      // Try next title candidate.
    }
  }

  const fallback = getCatalogImageUrl(itemName, resolvedCatalogType);
  PERSON_IMAGE_CACHE.set(key, fallback);
  return fallback;
};

const buildChallengeProduceNames = ({
  secretVegetables,
  catalogItems = VEGETABLE_CATALOG,
  excludeVegetables = secretVegetables,
  visibleCount = CHALLENGE_VISIBLE_COUNT,
}) => {
  if (visibleCount < secretVegetables.length) {
    throw new HttpError(
      500,
      "Challenge visible count is smaller than enrolled secret vegetables",
    );
  }

  const blocked = new Set(excludeVegetables);
  const decoys = pickRandomSubset(
    catalogItems.filter(
      (item) => !blocked.has(item) && !secretVegetables.includes(item),
    ),
    visibleCount - secretVegetables.length,
  );

  return shuffle([...secretVegetables, ...decoys]);
};

const toBoardPosition = (index) => ({
  index: index + 1,
  row: Math.floor(index / CHALLENGE_COLUMNS) + 1,
  col: (index % CHALLENGE_COLUMNS) + 1,
});

const buildPairCandidatesForTarget = ({
  targetSum,
  usedNumbers = new Set(),
}) => {
  const pairs = [];
  for (
    let first = SUM_MODE_MIN_NUMBER;
    first <= SUM_MODE_MAX_NUMBER;
    first += 1
  ) {
    const second = targetSum - first;
    if (
      second <= first ||
      second < SUM_MODE_MIN_NUMBER ||
      second > SUM_MODE_MAX_NUMBER
    ) {
      continue;
    }
    if (usedNumbers.has(first) || usedNumbers.has(second)) {
      continue;
    }
    pairs.push([first, second]);
  }

  return pairs;
};

const assignNumbersForEqualSumPairs = ({ count, keyIndices, decoyIndices }) => {
  if (keyIndices.length !== 2 || decoyIndices.length !== 2) {
    throw new HttpError(
      500,
      "Two key indices and two decoy indices are required",
    );
  }

  for (let attempt = 0; attempt < 300; attempt += 1) {
    const targetSum = randomInt(30, 100);
    const keyPairOptions = buildPairCandidatesForTarget({ targetSum });
    if (!keyPairOptions.length) {
      continue;
    }

    const keyPair = keyPairOptions[randomInt(0, keyPairOptions.length)];
    const usedForDecoys = new Set(keyPair);
    const decoyPairOptions = buildPairCandidatesForTarget({
      targetSum,
      usedNumbers: usedForDecoys,
    });
    if (!decoyPairOptions.length) {
      continue;
    }

    const decoyPair = decoyPairOptions[randomInt(0, decoyPairOptions.length)];
    const numbers = Array.from({ length: count }, () => 0);

    numbers[keyIndices[0]] = keyPair[0];
    numbers[keyIndices[1]] = keyPair[1];
    numbers[decoyIndices[0]] = decoyPair[0];
    numbers[decoyIndices[1]] = decoyPair[1];

    const usedNumbers = [...new Set([...keyPair, ...decoyPair])];
    const remainingIndices = Array.from(
      { length: count },
      (_, index) => index,
    ).filter(
      (index) => !keyIndices.includes(index) && !decoyIndices.includes(index),
    );

    const remainingNumbers = generateUniqueTwoDigitNumbers({
      count: remainingIndices.length,
      min: SUM_MODE_MIN_NUMBER,
      max: SUM_MODE_MAX_NUMBER,
      exclude: usedNumbers,
    });

    remainingIndices.forEach((index, order) => {
      numbers[index] = remainingNumbers[order];
    });

    return {
      numbers,
      targetSum,
    };
  }

  throw new HttpError(500, "Unable to generate equal-sum challenge numbers");
};

const countPairsWithSum = (vegetables, targetSum) => {
  let count = 0;
  for (let first = 0; first < vegetables.length; first += 1) {
    for (let second = first + 1; second < vegetables.length; second += 1) {
      if (vegetables[first].number + vegetables[second].number === targetSum) {
        count += 1;
      }
    }
  }
  return count;
};

const createChallengePayload = ({
  secretVegetables,
  secretLetters,
  saltValue,
  gridSize,
  formulaMode = FORMULA_MODE.SALT_ADD,
  alphabetMode = ALPHABET_MODE.SEQUENTIAL,
  catalogType = CATALOG_TYPE.VEGETABLE,
  positionPair = [],
  pairVegetables = [],
}) => {
  const resolvedFormulaMode = normalizeFormulaMode(formulaMode);
  const resolvedAlphabetMode = normalizeAlphabetMode(alphabetMode);
  const resolvedCatalogType = normalizeCatalogType(catalogType);
  const resolvedPositionPair =
    resolvedFormulaMode === FORMULA_MODE.POSITION_SUM ?
      normalizePositionPair(positionPair)
    : [];
  const resolvedPairVegetables =
    (
      resolvedFormulaMode === FORMULA_MODE.PAIR_SUM &&
      Array.isArray(pairVegetables) &&
      pairVegetables.length > 0
    ) ?
      normalizePairVegetables(
        pairVegetables,
        secretVegetables,
        resolvedCatalogType,
      )
    : [];

  let selectedPairVegetables = [];
  let visibleSecretVegetables = [];
  if (resolvedFormulaMode === FORMULA_MODE.PAIR_SUM) {
    selectedPairVegetables =
      resolvedPairVegetables.length === 2 ?
        resolvedPairVegetables
      : pickRandomSubset(secretVegetables, 2);
    if (selectedPairVegetables.length !== 2) {
      throw new HttpError(500, "Unable to choose pair-sum vegetables");
    }
    visibleSecretVegetables = selectedPairVegetables;
  } else {
    visibleSecretVegetables = pickRandomSubset(secretVegetables, 1);
    if (visibleSecretVegetables.length !== 1) {
      throw new HttpError(500, "Unable to choose visible secret vegetable");
    }
  }

  const challengeProduce = buildChallengeProduceNames({
    secretVegetables: visibleSecretVegetables,
    catalogItems: getCatalogItemsByType(resolvedCatalogType),
    excludeVegetables: secretVegetables,
  });

  const chosenSecretVegetable =
    visibleSecretVegetables[randomInt(0, visibleSecretVegetables.length)];
  const chosenSecretIndex = challengeProduce.indexOf(chosenSecretVegetable);
  if (chosenSecretIndex < 0) {
    throw new HttpError(
      500,
      "Unable to place selected secret vegetable in challenge",
    );
  }

  let numbers = [];
  let selectedSecretVegetable = chosenSecretVegetable;
  let selectedSecretNumber = 0;
  let targetNumber = 0;
  let formulaHint = {};

  if (resolvedFormulaMode === FORMULA_MODE.SALT_ADD) {
    const safeMax = 99 - saltValue;
    numbers = generateUniqueTwoDigitNumbers({
      count: challengeProduce.length,
      min: MIN_VEGETABLE_NUMBER,
      max: safeMax,
    });

    selectedSecretNumber = numbers[chosenSecretIndex];
    targetNumber = selectedSecretNumber + saltValue;
    formulaHint = {
      saltValue,
      secretVegetable: selectedSecretVegetable,
    };
  } else if (resolvedFormulaMode === FORMULA_MODE.PAIR_SUM) {
    const keyIndices = selectedPairVegetables.map((name) =>
      challengeProduce.indexOf(name),
    );
    if (keyIndices.some((index) => index < 0)) {
      throw new HttpError(
        500,
        "Pair-sum vegetables were not found in challenge board",
      );
    }

    const nonKeyIndices = Array.from(
      { length: challengeProduce.length },
      (_, index) => index,
    ).filter((index) => !keyIndices.includes(index));
    const decoyIndices = pickRandomSubset(nonKeyIndices, 2);
    if (decoyIndices.length !== 2) {
      throw new HttpError(500, "Unable to generate decoy pair positions");
    }

    const sumData = assignNumbersForEqualSumPairs({
      count: challengeProduce.length,
      keyIndices,
      decoyIndices,
    });

    numbers = sumData.numbers;
    targetNumber = sumData.targetSum;
    selectedSecretVegetable = selectedPairVegetables[0];
    selectedSecretNumber = numbers[keyIndices[0]];
    formulaHint = {
      pairVegetables: selectedPairVegetables,
      decoyPairCount: 1,
      targetSum: sumData.targetSum,
    };
  } else {
    const positionIndex =
      resolvedPositionPair.length >= 1 ?
        resolvedPositionPair[0] - 1
      : randomInt(0, challengeProduce.length);

    if (positionIndex < 0 || positionIndex >= challengeProduce.length) {
      throw new HttpError(500, "Unable to generate position-sum key index");
    }

    numbers = generateUniqueTwoDigitNumbers({
      count: challengeProduce.length,
      min: SUM_MODE_MIN_NUMBER,
      max: SUM_MODE_MAX_NUMBER,
    });

    selectedSecretVegetable = chosenSecretVegetable;
    selectedSecretNumber = numbers[chosenSecretIndex];
    targetNumber = selectedSecretNumber + numbers[positionIndex];
    formulaHint = {
      secretVegetable: selectedSecretVegetable,
      positions: [toBoardPosition(positionIndex)],
    };
  }

  const vegetables = challengeProduce.map((name, index) => ({
    name,
    number: numbers[index],
    imageUrl: getCatalogImageUrl(name, resolvedCatalogType),
  }));

  const pairCountForTarget = countPairsWithSum(vegetables, targetNumber);
  const normalizedFormulaHint = {
    ...formulaHint,
    totalPairsForTarget: pairCountForTarget,
  };

  const digits = computeTwoDigitOutput(targetNumber);
  const alphabetGrid = createAlphabetGrid({
    secretLetters,
    size: gridSize,
    mode: resolvedAlphabetMode,
  });

  return {
    vegetables,
    alphabetGrid,
    selectedSecretVegetable,
    selectedSecretNumber,
    expectedDigitOne: digits.digitOne,
    expectedDigitTwo: digits.digitTwo,
    formulaMode: resolvedFormulaMode,
    catalogType: resolvedCatalogType,
    formulaHint: normalizedFormulaHint,
  };
};

/**
 * Regenerate random numbers for an existing challenge board (same items,
 * new numbers) so that every page-load shows different values.
 *
 * Returns the fields that need to be persisted back on the session.
 */
const regenerateChallengeNumbers = ({
  vegetables,
  selectedSecretVegetable,
  saltValue,
  formulaMode,
  formulaHint = {},
}) => {
  const resolvedFormulaMode = normalizeFormulaMode(formulaMode);
  const count = vegetables.length;
  const secretIndex = vegetables.findIndex(
    (v) => v.name === selectedSecretVegetable,
  );
  if (secretIndex < 0) {
    throw new HttpError(
      500,
      "Secret vegetable not found on board during number regeneration",
    );
  }

  let numbers = [];
  let selectedSecretNumber = 0;
  let targetNumber = 0;
  let newFormulaHint = { ...formulaHint };

  if (resolvedFormulaMode === FORMULA_MODE.SALT_ADD) {
    const safeMax = 99 - saltValue;
    numbers = generateUniqueTwoDigitNumbers({
      count,
      min: MIN_VEGETABLE_NUMBER,
      max: safeMax,
    });
    selectedSecretNumber = numbers[secretIndex];
    targetNumber = selectedSecretNumber + saltValue;
    newFormulaHint = {
      ...newFormulaHint,
      saltValue,
      secretVegetable: selectedSecretVegetable,
    };
  } else if (resolvedFormulaMode === FORMULA_MODE.PAIR_SUM) {
    const pairVegetables = formulaHint.pairVegetables || [];
    const keyIndices = pairVegetables.map((name) =>
      vegetables.findIndex((v) => v.name === name),
    );
    if (keyIndices.some((idx) => idx < 0)) {
      throw new HttpError(
        500,
        "Pair-sum vegetables not found on board during number regeneration",
      );
    }

    const nonKeyIndices = Array.from({ length: count }, (_, i) => i).filter(
      (i) => !keyIndices.includes(i),
    );
    const decoyIndices = pickRandomSubset(nonKeyIndices, 2);
    if (decoyIndices.length !== 2) {
      throw new HttpError(
        500,
        "Unable to pick decoy pair positions during number regeneration",
      );
    }

    const sumData = assignNumbersForEqualSumPairs({
      count,
      keyIndices,
      decoyIndices,
    });
    numbers = sumData.numbers;
    targetNumber = sumData.targetSum;
    selectedSecretNumber = numbers[keyIndices[0]];
    newFormulaHint = {
      ...newFormulaHint,
      pairVegetables,
      decoyPairCount: 1,
      targetSum: sumData.targetSum,
    };
  } else {
    // POSITION_SUM
    const positions = formulaHint.positions || [];
    const positionIndex =
      positions.length >= 1 ? positions[0].index - 1 : randomInt(0, count);
    numbers = generateUniqueTwoDigitNumbers({
      count,
      min: SUM_MODE_MIN_NUMBER,
      max: SUM_MODE_MAX_NUMBER,
    });
    selectedSecretNumber = numbers[secretIndex];
    targetNumber = selectedSecretNumber + numbers[positionIndex];
    newFormulaHint = {
      ...newFormulaHint,
      secretVegetable: selectedSecretVegetable,
      positions: [toBoardPosition(positionIndex)],
    };
  }

  // Convert Mongoose subdocuments to plain objects before spreading
  const updatedVegetables = vegetables.map((v, i) => {
    const plain = typeof v.toObject === "function" ? v.toObject() : v;
    return {
      name: plain.name,
      imageUrl: plain.imageUrl || "",
      number: numbers[i],
    };
  });
  const pairCount = countPairsWithSum(updatedVegetables, targetNumber);
  newFormulaHint.totalPairsForTarget = pairCount;

  const digits = computeTwoDigitOutput(targetNumber);

  return {
    vegetables: updatedVegetables,
    selectedSecretNumber,
    expectedDigitOne: digits.digitOne,
    expectedDigitTwo: digits.digitTwo,
    formulaHint: newFormulaHint,
  };
};

const createRequestFingerprint = (req) => {
  const forwardedFor = req.get("x-forwarded-for") || "";
  const raw = `${req.ip || ""}|${forwardedFor}|${req.get("user-agent") || ""}`;
  return createHash("sha256").update(raw).digest("hex");
};

const buildPartnerRedirectUrl = (callbackUrl, payload = {}) => {
  if (!callbackUrl) {
    return "";
  }

  const url = new URL(callbackUrl);
  for (const [key, value] of Object.entries(payload)) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }

  return url.toString();
};

const getNormalizedDigit = (value) => {
  if (value === undefined || value === null) {
    return "";
  }

  const normalized = String(value).trim();
  return /^[0-9]$/.test(normalized) ? normalized : "";
};

const normalizeAlphabetInput = (value) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new HttpError(
      400,
      "inputs must be an object keyed by alphabet letters",
    );
  }

  return value;
};

const assertForceFilledGrid = ({ alphabetGrid, inputs }) => {
  for (const letter of alphabetGrid) {
    const digit = getNormalizedDigit(inputs[letter]);
    if (!digit) {
      throw new HttpError(
        400,
        "All alphabet boxes must be filled with one digit",
      );
    }
  }
};

const detectHoneyPotAttempt = ({ secretNumber, secretLetters, inputs }) => {
  const original = String(secretNumber).padStart(2, "0");
  const [letterOne, letterTwo] = secretLetters;
  const first = getNormalizedDigit(inputs[letterOne]);
  const second = getNormalizedDigit(inputs[letterTwo]);
  return first === original[0] && second === original[1];
};

const buildShuffledKeypadLayout = () =>
  shuffle(["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"]);

module.exports = {
  ALPHABET_MODE,
  CATALOG_TYPE,
  CHALLENGE_COLUMNS,
  CHALLENGE_VISIBLE_COUNT,
  CRICKETER_CATALOG,
  DEFAULT_SALT_VALUE,
  FORMULA_MODE,
  BOLLYWOOD_CATALOG,
  MAX_FAILED_ATTEMPTS_BEFORE_LOCK,
  MAX_SALT_VALUE,
  MIN_SALT_VALUE,
  SESSION_TTL_MS,
  VEGETABLE_CATALOG,
  assertForceFilledGrid,
  buildPartnerRedirectUrl,
  buildShuffledKeypadLayout,
  computeSaltedDigits,
  createChallengePayload,
  createRequestFingerprint,
  detectHoneyPotAttempt,
  getCatalogImageUrl,
  getCatalogItemsByType,
  getNormalizedDigit,
  normalizeAlphabetInput,
  normalizeAlphabetMode,
  normalizeCatalogType,
  normalizeFormulaMode,
  normalizePairVegetables,
  normalizePositionPair,
  normalizeSaltValue,
  normalizeSecretLetters,
  normalizeSecretVegetableList,
  regenerateChallengeNumbers,
  resolveCatalogImageUrl,
};
