const canvas = document.getElementById('systemCanvas');
const ctx = canvas.getContext('2d');

const seedInput = document.getElementById('seedInput');
const planetCountInput = document.getElementById('planetCountInput');
const planetCountValue = document.getElementById('planetCountValue');
const orbitSpeedInput = document.getElementById('orbitSpeedInput');
const orbitSpeedValue = document.getElementById('orbitSpeedValue');
const systemSummary = document.getElementById('systemSummary');
const stellarMetrics = document.getElementById('stellarMetrics');
const planetFocus = document.getElementById('planetFocus');
const planetCards = document.getElementById('planetCards');
const pauseBtn = document.getElementById('pauseBtn');
const terrestrialBtn = document.getElementById('terrestrialBtn');
const toggle3DBtn = document.getElementById('toggle3DBtn');
const galaxyBtn = document.getElementById('galaxyBtn');
const savePresetBtn = document.getElementById('savePresetBtn');
const exportBtn = document.getElementById('exportBtn');
const presetSelect = document.getElementById('presetSelect');

const STORAGE_KEY = 'starSystemGenerator.presets';

let activeSystem = null;
let selectedPlanetIndex = null;
let animationFrameId = null;
let orbitSpeedMultiplier = Number(orbitSpeedInput.value) || 0.8;
let paused = false;
let terrestrialRequired = false;
let isGalaxyView = false;
let is3DView = false;
let lastTimestamp = 0;
let threeRenderer = null;
let threeScene = null;
let threeCamera = null;
let threeObjects = [];

const starCatalog = [
  { name: 'Red Dwarf', className: 'M', spectralType: 'M5V', description: 'Cool main-sequence star', color: '#ffb38a', temperature: 3200, mass: 0.12, luminosity: 0.0005, diameter: 0.12 },
  { name: 'Yellow Dwarf', className: 'G', spectralType: 'G2V', description: 'Solar-type main-sequence star', color: '#ffe9a3', temperature: 5800, mass: 1, luminosity: 1, diameter: 1 },
  { name: 'Orange Giant', className: 'K', spectralType: 'K1III', description: 'Warm evolved giant star', color: '#ff9a62', temperature: 4600, mass: 1.6, luminosity: 16, diameter: 2.2 },
  { name: 'Blue Giant', className: 'B', spectralType: 'B1I', description: 'Hot luminous giant star', color: '#9ec9ff', temperature: 12000, mass: 7, luminosity: 18000, diameter: 7.5 },
  { name: 'White Star', className: 'A', spectralType: 'A5V', description: 'Hot white main-sequence star', color: '#edf7ff', temperature: 9000, mass: 2.3, luminosity: 25, diameter: 2.1 }
];

const planetTypes = [
  { name: 'Rocky', color: '#c9d5e6', habitabilityBias: 0.48 },
  { name: 'Volcanic', color: '#d95d39', habitabilityBias: 0.18 },
  { name: 'Oceanic', color: '#3ac7ff', habitabilityBias: 0.72 },
  { name: 'Desert', color: '#f0b26a', habitabilityBias: 0.58 },
  { name: 'Gas Giant', color: '#b0c2ff', habitabilityBias: 0.1 },
  { name: 'Ice World', color: '#aee7ff', habitabilityBias: 0.4 }
];

const terrestrialTypes = planetTypes.filter((planet) => ['Rocky', 'Volcanic', 'Oceanic', 'Desert'].includes(planet.name));
const inhabitableAtmospheres = [
  { type: 'Breathable', pressure: 1, composition: '78% nitrogen, 21% oxygen, 1% argon, trace carbon dioxide' },
  { type: 'Thin', pressure: 0.72, composition: '76% nitrogen, 20% oxygen, 3% argon, trace carbon dioxide' },
  { type: 'Dense', pressure: 1.35, composition: '77% nitrogen, 21% oxygen, 1% argon, trace water vapor' }
];

const galacticStandardConversions = [
  ['Stellar Mass', '1.99 x 10^30 kilograms'],
  ['Stellar Luminosity', '3.75 x 10^28 lumens, or 3.85 x 10^26 watts'],
  ['Stellar Diameter', '1,391,000 kilometers'],
  ['Astronomical Unit', '149,598,000 kilometers'],
  ['Planetary Mass', '5.97 x 10^24 kilograms'],
  ['Planetary Diameter', '12,756.2 kilometers'],
  ['Planetary Gravity', '9.81 m/s^2, also called 1.0 g']
];

const stellarMassProgression = [
  { roll: '00-49', className: 'M', masses: [0.5, 0.5, 0.4, 0.3, 0.3, 0.2, 0.2, 0.1, 0.1, 0.1] },
  { roll: '50-64', className: 'K', masses: [0.8, 0.8, 0.7, 0.7, 0.7, 0.7, 0.6, 0.6, 0.6, 0.5] },
  { roll: '65-74', className: 'G', masses: [1.1, 1.0, 1.0, 1.0, 0.9, 0.9, 0.9, 0.9, 0.8, 0.8] },
  { roll: '75-84', className: 'F', masses: [1.6, 1.6, 1.5, 1.5, 1.4, 1.4, 1.3, 1.3, 1.2, 1.1] },
  { roll: '85-94', className: 'A', masses: [2.9, 2.7, 2.5, 2.4, 2.1, 1.9, 1.8, 1.8, 1.8, 1.7] },
  { roll: '95-98', className: 'B', masses: [17.5, 14.2, 10.9, 7.6, 6.7, 5.9, 5.2, 4.5, 3.8, 3.4] },
  { roll: '99', className: 'O', masses: [100, 97.5, 95, 92.5, 90, 60, 37, 30, 23, 20] }
];

const stellarMassMultipliers = [
  { roll: '00-14', classification: 'I (supergiant)', values: { M: 37.4, K: 11.1, G: 5.7, F: 6.1, A: 5.0, B: 3.1, O: 1.8 } },
  { roll: '15-29', classification: 'II (bright giant)', values: { M: 25.3, K: 5.9, G: 2.7, F: 4.4, A: 3.6, B: 2.4, O: 1.6 } },
  { roll: '30-44', classification: 'III (giant)', values: { M: 17.1, K: 4.2, G: 2.2, F: 3.3, A: 2.8, B: 2.0, O: 1.4 } },
  { roll: '45-59', classification: 'IV (sub-giant)', values: { M: 9.1, K: 2.6, G: 1.6, F: 2.1, A: 1.9, B: 1.5, O: 1.2 } },
  { roll: '60-84', classification: 'V (main sequence)', values: { M: 1.0, K: 1.0, G: 1.0, F: 1.0, A: 1.0, B: 1.0, O: 1.0 } },
  { roll: '85-99', classification: 'VI (sub-dwarf)', values: { M: 0.5, K: 0.7, G: 0.9, F: 0.8, A: 0.7, B: 0.5, O: 0.3 } }
];

const zonePopulationRanges = {
  O: {
    empty: null, dwarfPlanetoid: '01-10', terrestrial: '11-20', asteroidBelt: '21-30',
    jovianIce: '31-40', jovianGas: '41-50', companionStar: '51-60', coPopulated: '61-00'
  },
  B: {
    empty: '01-05', dwarfPlanetoid: '06-17', terrestrial: '18-29', asteroidBelt: '30-40',
    jovianIce: '41-50', jovianGas: '51-60', companionStar: '61-68', coPopulated: '69-00'
  },
  A: {
    empty: '01-10', dwarfPlanetoid: '11-25', terrestrial: '26-40', asteroidBelt: '41-50',
    jovianIce: '51-60', jovianGas: '61-70', companionStar: '71-77', coPopulated: '78-00'
  },
  F: {
    empty: '01-15', dwarfPlanetoid: '16-30', terrestrial: '31-45', asteroidBelt: '46-60',
    jovianIce: '61-70', jovianGas: '71-80', companionStar: '81-86', coPopulated: '87-00'
  },
  G: {
    empty: '01-15', dwarfPlanetoid: '16-35', terrestrial: '36-55', asteroidBelt: '56-70',
    jovianIce: '71-80', jovianGas: '81-90', companionStar: '91-95', coPopulated: '96-00'
  },
  K: {
    empty: '01-35', dwarfPlanetoid: '36-49', terrestrial: '50-63', asteroidBelt: '64-75',
    jovianIce: '76-85', jovianGas: '86-95', companionStar: '96-97', coPopulated: '98-00'
  },
  M: {
    empty: '01-50', dwarfPlanetoid: '51-60', terrestrial: '61-70', asteroidBelt: '71-80',
    jovianIce: '81-90', jovianGas: '91-00', companionStar: null, coPopulated: null
  }
};

const zonePopulationNames = {
  empty: 'Empty Zone',
  dwarfPlanetoid: 'Dwarf Planetoid',
  terrestrial: 'Terrestrial Planet',
  asteroidBelt: 'Asteroid Belt',
  jovianIce: 'Jovian: Ice',
  jovianGas: 'Jovian: Gas',
  companionStar: 'Companion Star'
};

const binarySystemTypes = [
  { minimum: 1, maximum: 30, name: 'Close' },
  { minimum: 31, maximum: 100, name: 'Distant' }
];

const binaryPlanetPlacements = [
  { minimum: 1, maximum: 50, name: 'Primary Only' },
  { minimum: 51, maximum: 75, name: 'Companion Only' },
  { minimum: 76, maximum: 100, name: 'Planets on Both' }
];

const moonSizeTable = [
  { minimum: 1, maximum: 3, name: 'Tiny', gravity: (roll) => roll / 800, diameter: (roll) => roll * 0.001, diameterRange: '0.001-0.010' },
  { minimum: 4, maximum: 6, name: 'Small', gravity: (roll) => roll / 400, diameter: (roll) => (roll + 5) * 0.01, diameterRange: '0.06-0.15' },
  { minimum: 7, maximum: 8, name: 'Medium', gravity: (roll) => roll / 200, diameter: (roll) => (roll + 5) * 0.02, diameterRange: '0.12-0.30' },
  { minimum: 9, maximum: 9, name: 'Large', gravity: (roll) => roll * 0.01, diameter: (roll) => (roll + 5) * 0.03, diameterRange: '0.18-0.45' },
  { minimum: 10, maximum: 10, name: 'Huge', gravity: (roll) => roll * 0.02, diameter: (roll) => (roll + 5) * 0.04, diameterRange: '0.24-0.60' }
];

const moonCountTable = [
  {
    minimumMass: 0.1,
    maximumMass: 0.6,
    outcomes: [
      { minimum: 1, maximum: 5, count: () => 0 },
      { minimum: 6, maximum: 8, count: () => 1 },
      { minimum: 9, maximum: 9, count: (random) => rollD5(random) },
      { minimum: 10, maximum: 10, count: (random) => rollD5(random), featureTable: true }
    ]
  },
  {
    minimumMass: 0.7,
    maximumMass: 2.5,
    outcomes: [
      { minimum: 1, maximum: 1, count: () => 0 },
      { minimum: 2, maximum: 4, count: (random) => rollD5(random) },
      { minimum: 5, maximum: 5, count: (random) => rollD5(random) + 1, ringChance: 0.2 },
      { minimum: 6, maximum: 7, count: (random) => rollD5(random), featureTable: true },
      { minimum: 8, maximum: 10, count: (random) => rollD10(random), featureTable: true }
    ]
  },
  {
    minimumMass: 2.6,
    maximumMass: 25,
    outcomes: [
      { minimum: 1, maximum: 2, count: (random) => rollD5(random) * 2 },
      { minimum: 3, maximum: 6, count: (random) => (rollD10(random) + rollD10(random)) * 2, ringChance: 0.3, ringDice: '1d5' },
      { minimum: 7, maximum: 9, count: (random) => (rollD10(random) + rollD10(random)) * 3, featureTable: true },
      { minimum: 10, maximum: 10, count: (random) => (rollD10(random) + rollD10(random) + rollD10(random)) * 2, ringChance: 0.3, ringDice: '1d5', featureTable: true }
    ]
  },
  {
    minimumMass: 26,
    maximumMass: 130,
    outcomes: [
      { minimum: 1, maximum: 5, count: (random) => rollDice(4, random) * 2, ringChance: 0.3, ringDice: '1d5' },
      { minimum: 6, maximum: 9, count: (random) => (rollD10(random) + rollD10(random) + rollD10(random) + rollD10(random) + rollD10(random)) * 2, ringDice: '1d10' },
      { minimum: 10, maximum: 10, count: (random) => (rollD10(random) + rollD10(random) + rollD10(random) + rollD10(random)) * 2, ringDice: '1d10', featureTable: true }
    ]
  },
  {
    minimumMass: 130.1,
    maximumMass: Infinity,
    outcomes: [
      { minimum: 1, maximum: 5, count: (random) => (rollD10(random) + rollD10(random) + rollD10(random) + rollD10(random)) * 2, ringDice: '1d10' },
      { minimum: 6, maximum: 9, count: (random) => (rollD10(random) + rollD10(random) + rollD10(random) + rollD10(random)) * 2, ringDice: '1d10', featureTable: true },
      { minimum: 10, maximum: 10, count: (random) => (rollD10(random) + rollD10(random) + rollD10(random) + rollD10(random) + rollD10(random)) * 2, ringDice: '1d10' }
    ]
  }
];

const dwarfPlanetoidDetails = {
  gravity: 'D100 / 30',
  diameter: '6D10 x 0.01',
  mass: 'Gravity x Diameter x Diameter'
};

const jovianIceDetails = {
  gravity: '(1D00 x 0.05) + 0.25',
  diameter: '(1D10 + 12) / 2',
  mass: 'Gravity x Diameter x Diameter'
};

const jovianGasDetails = {
  gravity: '(D100 x 0.05) + 0.3',
  diameter: '(1D10 + 15) / 2',
  mass: 'Gravity x Diameter x Diameter'
};

const terrestrialPlanetDetails = {
  gravity: '2D10 / 10',
  diameter: '(D100 + 40) / 70',
  mass: 'Gravity x Diameter x Diameter'
};

const jovianMainGases = [
  'Hydrogen 90%, Helium 10%',
  'Water vapor 45%, Ammonia 15%, Methane 40%',
  'Carbon dioxide 20%, Hydrogen 60%, Helium 20%',
  'Hydrogen 90%, Methane 10%',
  'Water vapor 10%, Ammonia 30%, Methane 60%',
  'Fluorine 33%, Methane 33%, Ammonia 33%',
  'Water vapor 20%, Ammonia 40%, Methane 40%',
  'Neon 25%, Argon 75%',
  'Hydrogen 80%, Helium 20%',
  'Water vapor 30%, Ammonia 30%, Methane 40%'
];

const jovianTraceGases = [
  'Water vapor, Methane, Ammonia',
  'Helium, Water vapor, Methane, Ammonia',
  'Ammonia, Fluorine, Argon',
  'Hydrogen Deuteride',
  '--',
  'Water vapor, Ethane, Hydrogen',
  'Water vapor, Ammonia',
  'Water vapor, Methane, Ethane, Ammonia, Fluorine, Hydrogen',
  'Water vapor, Methane, Ammonia',
  'Hydrogen'
];

const jovianCoreMakeup = [
  'Small core of rock and ice, surrounded by a thick layer of metallic hydrogen',
  'Solid inner core surrounded by a liquid outer core',
  'Small core consisting of a conducting liquid rotating around an iron outer core',
  'A dense lead core with uranium deposits and fissures that spout metals beyond the planet\'s surface',
  'Ferrous rocky chunks floating in a metallic hydrogen core causing a strong magnetic field',
  'Small iron core enriched with gold, platinum, and other iron-loving elements',
  'Mostly frozen rock',
  'Large liquid magnesium core surround by a uranium crust enriched with palladium veins',
  'A single iron crystal surrounded by zinc-sulfide encasement',
  'Solid iron core mixed with nickel and trace amounts of lighter elements'
];

const orbitEccentricityTable = [
  { minimum: 1, maximum: 10, name: 'Circular Orbit', eccentricity: [0, 0.02], climateEffect: 'No Effect', temperatureFactor: 0 },
  { minimum: 11, maximum: 40, name: 'Almost Circular', eccentricity: [0.02, 0.05], climateEffect: 'Very Minor', temperatureFactor: 0.1 },
  { minimum: 41, maximum: 75, name: 'Slightly Circular', eccentricity: [0.05, 0.1], climateEffect: 'Moderate Change', temperatureFactor: 0.25 },
  { minimum: 76, maximum: 100, name: 'Slightly Elliptical', eccentricity: [0.1, 0.4], climateEffect: 'Major Effect', temperatureFactor: 0.5 }
];

const axialTiltTable = [
  { minimum: 1, maximum: 5, name: 'None', tilt: [0, 3], climateEffect: 'None', temperatureFactor: 0 },
  { minimum: 6, maximum: 40, name: 'Little', tilt: [3, 15], climateEffect: 'Little', temperatureFactor: 0.1 },
  { minimum: 41, maximum: 90, name: 'Some', tilt: [15, 30], climateEffect: 'Some', temperatureFactor: 0.25 },
  { minimum: 91, maximum: 95, name: 'A lot', tilt: [30, 45], climateEffect: 'A lot', temperatureFactor: 0.4 },
  { minimum: 96, maximum: 100, name: 'Major Effect', tilt: [45, 90], climateEffect: 'Major Effect', temperatureFactor: 0.6 }
];

const oClassStellarData = [
  ['O0-I', 2150000, 40.4, 50000], ['O0-II', 2150000, 40.4, 50000], ['O0-III', 2150000, 40.4, 50000], ['O0-IV', 1360000, 32, 50000], ['O0-V', 1240000, 30.6, 50000], ['O0-VI', 940000, 26.6, 50000],
  ['O1-I', 1870000, 41.4, 47600], ['O1-II', 1730000, 39.6, 47800], ['O1-III', 1580000, 37.8, 47800], ['O1-IV', 1090000, 31.4, 47800], ['O1-V', 994000, 30, 47800], ['O1-VI', 754000, 26.2, 47800],
  ['O2-I', 1620000, 42.8, 45200], ['O2-II', 1520000, 40.6, 45600], ['O2-III', 1260000, 37, 45600], ['O2-IV', 872000, 30.8, 45600], ['O2-V', 795000, 29.4, 45600], ['O2-VI', 603000, 25.6, 45600],
  ['O3-I', 1400000, 44.4, 42800], ['O3-II', 1210000, 40, 43400], ['O3-III', 917000, 35, 43400], ['O3-IV', 696000, 30.4, 43400], ['O3-V', 634000, 29, 43400], ['O3-VI', 481000, 25.2, 43400],
  ['O4-I', 1200000, 46.2, 40400], ['O4-II', 960000, 39.6, 41200], ['O4-III', 728000, 34.6, 41200], ['O4-IV', 552000, 30, 41200], ['O4-V', 504000, 28.8, 41200], ['O4-VI', 382000, 25, 41200],
  ['O5-I', 1030000, 48.2, 38000], ['O5-II', 759000, 39.4, 39000], ['O5-III', 525000, 32.8, 39000], ['O5-IV', 437000, 29.8, 39000], ['O5-V', 398000, 28.4, 39000], ['O5-VI', 302000, 24.8, 39000],
  ['O6-I', 781000, 48.4, 35400], ['O6-II', 654000, 41, 36800], ['O6-III', 376000, 31.2, 36800], ['O6-IV', 313000, 28.4, 36800], ['O6-V', 260000, 25.8, 36800], ['O6-VI', 180000, 21.6, 36800],
  ['O7-I', 588000, 49, 32800], ['O7-II', 510000, 41, 34600], ['O7-III', 294000, 31, 34600], ['O7-IV', 223000, 27, 34600], ['O7-V', 154000, 22.6, 34600], ['O7-VI', 107000, 18.7, 34600],
  ['O8-I', 437000, 49.8, 30200], ['O8-II', 360000, 39.2, 32400], ['O8-III', 207000, 29.8, 32400], ['O8-IV', 157000, 26, 32400], ['O8-V', 99100, 20.6, 32400], ['O8-VI', 57000, 15.6, 32400],
  ['O9-I', 319000, 51, 27600], ['O9-II', 276000, 39.6, 30200], ['O9-III', 159000, 30, 30200], ['O9-IV', 110000, 25, 30200], ['O9-V', 57600, 18.1, 30200], ['O9-VI', 33100, 13.7, 30200]
].map(([spectralType, luminosity, diameter, temperature]) => ({ spectralType, luminosity, diameter, temperature }));

const bClassStellarData = [
  ['B0-I', 228000, 52.4, 25000], ['B0-II', 190000, 38.2, 28000], ['B0-III', 109000, 29, 28000], ['B0-IV', 75700, 24.2, 28000], ['B0-V', 36200, 16.7, 28000], ['B0-VI', 19000, 12.1, 28000],
  ['B1-I', 184000, 52, 23790], ['B1-II', 134000, 36.6, 26190], ['B1-III', 53400, 23.2, 26190], ['B1-IV', 37000, 19.3, 26190], ['B1-V', 19400, 13.9, 26190], ['B1-VI', 10200, 10.1, 26190],
  ['B2-I', 162000, 54.2, 22580], ['B2-II', 93600, 35.4, 24380], ['B2-III', 28300, 19.4, 24380], ['B2-IV', 19600, 16.2, 24380], ['B2-V', 9360, 11.2, 24380], ['B2-VI', 5390, 8.5, 24380],
  ['B3-I', 129000, 54, 21370], ['B3-II', 64500, 34.2, 22570], ['B3-III', 13500, 15.6, 22570], ['B3-IV', 9320, 13, 22570], ['B3-V', 4890, 9.4, 22570], ['B3-VI', 2570, 6.8, 22570],
  ['B4-I', 112000, 56.6, 20160], ['B4-II', 43700, 33.4, 20760], ['B4-III', 6930, 13.3, 20760], ['B4-IV', 4790, 11, 20760], ['B4-V', 2290, 7.6, 20760], ['B4-VI', 1320, 5.8, 20760],
  ['B5-I', 88000, 56.8, 18950], ['B5-II', 29100, 32.6, 18950], ['B5-III', 3190, 10.8, 18950], ['B5-IV', 2210, 9, 18950], ['B5-V', 1160, 6.5, 18950], ['B5-VI', 667, 4.9, 18950],
  ['B6-I', 63100, 58.8, 17140], ['B6-II', 17400, 30.8, 17140], ['B6-III', 1740, 9.7, 17140], ['B6-IV', 1200, 8.1, 17140], ['B6-V', 692, 6.1, 17140], ['B6-VI', 363, 4.5, 17140],
  ['B7-I', 44300, 61.6, 15330], ['B7-II', 11100, 30.8, 15330], ['B7-III', 1010, 9.3, 15330], ['B7-IV', 640, 7.4, 15330], ['B7-V', 404, 5.9, 15330], ['B7-VI', 193, 4.1, 15330],
  ['B8-I', 33400, 68.8, 13520], ['B8-II', 6990, 31.4, 13520], ['B8-III', 530, 8.7, 13520], ['B8-IV', 334, 6.9, 13520], ['B8-V', 211, 5.5, 13520], ['B8-VI', 101, 3.8, 13520],
  ['B9-I', 22700, 75.4, 11710], ['B9-II', 4320, 33, 11710], ['B9-III', 299, 8.7, 11710], ['B9-IV', 172, 6.6, 11710], ['B9-V', 119, 5.5, 11710], ['B9-VI', 52, 3.6, 11710]
].map(([spectralType, luminosity, diameter, temperature]) => ({ spectralType, luminosity, diameter, temperature }));

const aClassStellarData = [
  ['A0-I', 15400, 87, 9900], ['A0-II', 2680, 36.2, 9900], ['A0-III', 154, 8.7, 9900], ['A0-IV', 88.8, 6.6, 9900], ['A0-V', 67.4, 5.8, 9900], ['A0-VI', 26.8, 3.6, 9900],
  ['A1-I', 15000, 89.2, 9707], ['A1-II', 2350, 35.8, 9650], ['A1-III', 124, 8.2, 9650], ['A1-IV', 71.1, 6.2, 9650], ['A1-V', 49.2, 5.2, 9650], ['A1-VI', 19.6, 3.3, 9650],
  ['A2-I', 13300, 87.4, 9513], ['A2-II', 2070, 35.4, 9400], ['A2-III', 99, 7.7, 9400], ['A2-IV', 57, 5.9, 9400], ['A2-V', 39.4, 4.9, 9400], ['A2-VI', 15.7, 3.1, 9400],
  ['A3-I', 12900, 89.8, 9320], ['A3-II', 1660, 33.4, 9150], ['A3-III', 87.1, 7.7, 9150], ['A3-IV', 41.7, 5.3, 9150], ['A3-V', 28.9, 4.4, 9150], ['A3-VI', 11.5, 2.8, 9150],
  ['A4-I', 11400, 88.2, 9127], ['A4-II', 1460, 33.2, 8900], ['A4-III', 70, 7.3, 8900], ['A4-IV', 33.5, 5, 8900], ['A4-V', 23.2, 4.2, 8900], ['A4-VI', 9.23, 2.6, 8900],
  ['A5-I', 11100, 90.8, 8933], ['A5-II', 1290, 33, 8650], ['A5-III', 56.4, 6.9, 8650], ['A5-IV', 27, 4.8, 8650], ['A5-V', 17, 3.8, 8650], ['A5-VI', 6.78, 2.4, 8650],
  ['A6-I', 10900, 93.8, 8740], ['A6-II', 1140, 33, 8400], ['A6-III', 45.5, 6.6, 8400], ['A6-IV', 21.8, 4.5, 8400], ['A6-V', 15.1, 3.8, 8400], ['A6-VI', 5.47, 2.3, 8400],
  ['A7-I', 10600, 96.8, 8547], ['A7-II', 1110, 34.4, 8150], ['A7-III', 36.8, 6.3, 8150], ['A7-IV', 19.3, 4.5, 8150], ['A7-V', 12.2, 3.6, 8150], ['A7-VI', 4.43, 2.2, 8150],
  ['A8-I', 10400, 100.2, 8353], ['A8-II', 990, 34.6, 7900], ['A8-III', 32.8, 6.3, 7900], ['A8-IV', 15.7, 4.4, 7900], ['A8-V', 10.9, 3.6, 7900], ['A8-VI', 3.59, 2.1, 7900],
  ['A9-I', 10200, 104, 8160], ['A9-II', 970, 36.6, 7650], ['A9-III', 26.7, 6.1, 7650], ['A9-IV', 14, 4.4, 7650], ['A9-V', 8.85, 3.5, 7650], ['A9-VI', 2.93, 2, 7650]
].map(([spectralType, luminosity, diameter, temperature]) => ({ spectralType, luminosity, diameter, temperature }));

const fClassStellarData = [
  ['F0-I', 9960, 108, 7967], ['F0-II', 870, 37, 7400], ['F0-III', 21.9, 5.9, 7400], ['F0-IV', 11.5, 4.2, 7400], ['F0-V', 7.94, 3.5, 7400], ['F0-VI', 2.4, 1.9, 7400],
  ['F1-I', 9790, 112.4, 7773], ['F1-II', 865, 38.4, 7260], ['F1-III', 21.7, 6.1, 7260], ['F1-IV', 12.5, 4.6, 7260], ['F1-V', 6.56, 3.3, 7260], ['F1-VI', 1.98, 1.8, 7260],
  ['F2-I', 8800, 112.2, 7580], ['F2-II', 860, 39.8, 7120], ['F2-III', 19.7, 6, 7120], ['F2-IV', 14.9, 5.2, 7120], ['F2-V', 5.95, 3.3, 7120], ['F2-VI', 1.64, 1.7, 7120],
  ['F3-I', 8700, 117.4, 7387], ['F3-II', 782, 39.4, 6980], ['F3-III', 19.6, 6.2, 6980], ['F3-IV', 16.3, 5.7, 6980], ['F3-V', 4.94, 3.1, 6980], ['F3-VI', 1.49, 1.7, 6980],
  ['F4-I', 7860, 117.8, 7193], ['F4-II', 781, 41, 6840], ['F4-III', 19.6, 6.5, 6840], ['F4-IV', 19.6, 6.5, 6840], ['F4-V', 4.5, 3.1, 6840], ['F4-VI', 1.24, 1.6, 6840],
  ['F5-I', 7820, 124, 7000], ['F5-II', 783, 42.8, 6700], ['F5-III', 21.6, 7.1, 6700], ['F5-IV', 21.6, 7.1, 6700], ['F5-V', 3.75, 3, 6700], ['F5-VI', 1.03, 1.6, 6700],
  ['F6-I', 7820, 132.8, 6760], ['F6-II', 786, 44.8, 6560], ['F6-III', 23.7, 7.8, 6560], ['F6-IV', 16.4, 6.5, 6560], ['F6-V', 3.13, 2.8, 6560], ['F6-VI', 0.862, 1.5, 6560],
  ['F7-I', 7180, 136.8, 6520], ['F7-II', 791, 46.8, 6420], ['F7-III', 26.2, 8.5, 6420], ['F7-IV', 12.5, 5.9, 6420], ['F7-V', 2.62, 2.7, 6420], ['F7-VI', 0.791, 1.5, 6420],
  ['F8-I', 7290, 148.6, 6280], ['F8-II', 729, 47, 6280], ['F8-III', 29, 9.4, 6280], ['F8-IV', 10.5, 5.7, 6280], ['F8-V', 2.41, 2.7, 6280], ['F8-VI', 0.665, 1.4, 6280],
  ['F9-I', 6840, 157.2, 6011], ['F9-II', 739, 49.6, 6140], ['F9-III', 32.2, 10.3, 6140], ['F9-IV', 8.1, 5.2, 6140], ['F9-V', 2.03, 2.6, 6140], ['F9-VI', 0.614, 1.4, 6140]
].map(([spectralType, luminosity, diameter, temperature]) => ({ spectralType, luminosity, diameter, temperature }));

const gClassStellarData = [
  ['G0-I', 7150, 176.2, 5743], ['G0-II', 784, 58.4, 5743], ['G0-III', 37.5, 12.8, 5743], ['G0-IV', 6.25, 4.8, 6000], ['G0-V', 1.72, 2.5, 6000], ['G0-VI', 0.52, 1.4, 6000],
  ['G1-I', 7620, 200, 5474], ['G1-II', 835, 66.2, 5474], ['G1-III', 43.8, 15.2, 5474], ['G1-IV', 6.35, 5, 5890], ['G1-V', 1.46, 2.4, 5890], ['G1-VI', 0.44, 1.3, 5890],
  ['G2-I', 8290, 230, 5206], ['G2-II', 909, 76.4, 5206], ['G2-III', 52.3, 18.3, 5206], ['G2-IV', 6.48, 5.2, 5780], ['G2-V', 1.23, 2.3, 5780], ['G2-VI', 0.373, 1.3, 5780],
  ['G3-I', 8460, 260, 4937], ['G3-II', 1110, 94, 4937], ['G3-III', 70.3, 23.6, 4937], ['G3-IV', 6.04, 5.3, 5670], ['G3-V', 1.15, 2.3, 5670], ['G3-VI', 0.348, 1.3, 5670],
  ['G4-I', 9770, 312, 4669], ['G4-II', 1290, 113, 4669], ['G4-III', 89.1, 29.8, 4669], ['G4-IV', 6.2, 5.5, 5560], ['G4-V', 0.982, 2.2, 5560], ['G4-VI', 0.297, 1.2, 5560],
  ['G5-I', 11800, 384, 4400], ['G5-II', 1550, 139.8, 4400], ['G5-III', 118, 38.4, 4400], ['G5-IV', 6.38, 5.8, 5450], ['G5-V', 0.841, 2.1, 5450], ['G5-VI', 0.254, 1.2, 5450],
  ['G6-I', 12300, 404, 4343], ['G6-II', 1620, 146.6, 4343], ['G6-III', 123, 40.4, 4343], ['G6-IV', 6.59, 6.2, 5340], ['G6-V', 0.792, 2.1, 5340], ['G6-VI', 0.218, 1.1, 5340],
  ['G7-I', 12900, 424, 4286], ['G7-II', 1700, 154.2, 4286], ['G7-III', 129, 42.4, 4286], ['G7-IV', 6.84, 6.6, 5230], ['G7-V', 0.684, 2.1, 5230], ['G7-VI', 0.206, 1.1, 5230],
  ['G8-I', 14900, 468, 4229], ['G8-II', 1960, 170.2, 4229], ['G8-III', 124, 42.8, 4229], ['G8-IV', 6.5, 6.7, 5120], ['G8-V', 0.65, 2.1, 5120], ['G8-VI', 0.179, 1.1, 5120],
  ['G9-I', 15700, 494, 4171], ['G9-II', 2070, 179.6, 4171], ['G9-III', 131, 45.2, 4171], ['G9-IV', 6.8, 7.1, 5010], ['G9-V', 0.566, 2.1, 5010], ['G9-VI', 0.171, 1.1, 5010]
].map(([spectralType, luminosity, diameter, temperature]) => ({ spectralType, luminosity, diameter, temperature }));

const kClassStellarData = [
  ['K0-I', 16600, 524, 4114], ['K0-II', 2190, 190, 4114], ['K0-III', 138, 47.8, 4114], ['K0-IV', 7.16, 7.7, 4900], ['K0-V', 0.543, 2.1, 4900], ['K0-VI', 0.15, 1.1, 4900],
  ['K1-I', 17600, 554, 4057], ['K1-II', 2320, 202, 4057], ['K1-III', 161, 52.8, 4057], ['K1-IV', 7.71, 8.4, 4760], ['K1-V', 0.443, 2, 4760], ['K1-VI', 0.134, 1.1, 4760],
  ['K2-I', 20600, 616, 4000], ['K2-II', 2470, 214, 4000], ['K2-III', 206, 61.6, 4000], ['K2-IV', 8.38, 9.3, 4620], ['K2-V', 0.401, 2, 4620], ['K2-VI', 0.121, 1.1, 4620],
  ['K3-I', 25300, 718, 3900], ['K3-II', 2770, 238, 3900], ['K3-III', 253, 71.8, 3900], ['K3-IV', 9.22, 10.4, 4480], ['K3-V', 0.335, 2, 4480], ['K3-VI', 0.101, 1.1, 4480],
  ['K4-I', 31500, 844, 3800], ['K4-II', 3150, 266, 3800], ['K4-III', 345, 88.4, 3800], ['K4-IV', 10.3, 11.7, 4340], ['K4-V', 0.31, 2, 4340], ['K4-VI', 0.0936, 1.1, 4340],
  ['K5-I', 39600, 998, 3700], ['K5-II', 3620, 302, 3700], ['K5-III', 435, 104.6, 3700], ['K5-IV', 10.6, 12.7, 4200], ['K5-V', 0.266, 2, 4200], ['K5-VI', 0.088, 1.2, 4200],
  ['K6-I', 42400, 1024, 3717], ['K6-II', 3530, 296, 3717], ['K6-III', 465, 107.2, 3717], ['K6-IV', 12.2, 14.5, 4060], ['K6-V', 0.211, 1.9, 4060], ['K6-VI', 0.0767, 1.2, 4060],
  ['K7-I', 45500, 1052, 3733], ['K7-II', 3450, 290, 3733], ['K7-III', 499, 110, 3733], ['K7-IV', 14.2, 16.9, 3920], ['K7-V', 0.187, 1.9, 3920], ['K7-VI', 0.068, 1.2, 3920],
  ['K8-I', 44400, 1030, 3750], ['K8-II', 3690, 296, 3750], ['K8-III', 534, 112.8, 3750], ['K8-IV', 17, 19.8, 3780], ['K8-V', 0.155, 1.9, 3780], ['K8-VI', 0.0562, 1.1, 3780],
  ['K9-I', 50400, 1112, 3725], ['K9-II', 3830, 306, 3725], ['K9-III', 606, 121.8, 3725], ['K9-IV', 20.7, 23.6, 3640], ['K9-V', 0.144, 2, 3640], ['K9-VI', 0.0433, 1.1, 3640]
].map(([spectralType, luminosity, diameter, temperature]) => ({ spectralType, luminosity, diameter, temperature }));

const mClassStellarData = [
  ['M0-I', 57300, 1200, 3700], ['M0-II', 3960, 316, 3700], ['M0-III', 689, 131.6, 3700], ['M0-IV', 26, 28.6, 3500], ['M0-V', 0.125, 2, 3500], ['M0-VI', 0.0376, 1.1, 3500],
  ['M1-I', 77300, 1550, 3510], ['M1-II', 5860, 426, 3510], ['M1-III', 929, 170, 3510], ['M1-IV', 35.5, 36.8, 3333], ['M1-V', 0.0618, 1.5, 3333], ['M1-VI', 0.0186, 0.8, 3333],
  ['M2-I', 110000, 2060, 3320], ['M2-II', 8360, 570, 3320], ['M2-III', 1210, 216, 3320], ['M2-IV', 50.9, 48.8, 3167], ['M2-V', 0.0321, 1.2, 3167], ['M2-VI', 0.00885, 0.6, 3167],
  ['M3-I', 168000, 2880, 3130], ['M3-II', 14000, 828, 3130], ['M3-III', 1840, 300, 3130], ['M3-IV', 77.6, 67.2, 3000], ['M3-V', 0.0178, 1, 3000], ['M3-VI', 0.0049, 0.5, 3000],
  ['M4-I', 277000, 4180, 2940], ['M4-II', 23100, 1208, 2940], ['M4-III', 2770, 418, 2940], ['M4-IV', 127, 96.6, 2833], ['M4-V', 0.0106, 0.9, 2833], ['M4-VI', 0.00266, 0.4, 2833],
  ['M5-I', 507000, 6460, 2750], ['M5-II', 46200, 1952, 2750], ['M5-III', 5070, 646, 2750], ['M5-IV', 207, 138.8, 2667], ['M5-V', 0.00624, 0.8, 2667], ['M5-VI', 0.00172, 0.4, 2667],
  ['M6-I', 955000, 10240, 2560], ['M6-II', 95500, 3240, 2560], ['M6-III', 9550, 1024, 2560], ['M6-IV', 410, 222, 2500], ['M6-V', 0.0045, 0.7, 2500], ['M6-VI', 0.00163, 0.4, 2500],
  ['M7-I', 2100000, 17740, 2370], ['M7-II', 253000, 6140, 2370], ['M7-III', 21000, 1774, 2370], ['M7-IV', 926, 384, 2333], ['M7-V', 0.00369, 0.8, 2333], ['M7-VI', 0.00194, 0.6, 2333],
  ['M8-I', 5150000, 32800, 2180], ['M8-II', 744000, 12460, 2180], ['M8-III', 51500, 3280, 2180], ['M8-IV', 2440, 722, 2167], ['M8-V', 0.00353, 0.9, 2167], ['M8-VI', 0.00244, 0.7, 2167],
  ['M9-I', 17900000, 73400, 1990], ['M9-II', 2830000, 29200, 1990], ['M9-III', 179000, 7340, 1990], ['M9-IV', 7910, 1528, 2000], ['M9-V', 0.00415, 1.1, 2000], ['M9-VI', 0.00415, 1.1, 2000]
].map(([spectralType, luminosity, diameter, temperature]) => ({ spectralType, luminosity, diameter, temperature }));

const stellarMassOrbitZones = [
  { minimumMass: 0.5, maximumMass: 0.5, ranges: [[0.02, 0.05], [0.05, 0.09], [0.09, 0.18], [0.18, 0.36], [0.36, 0.73], [0.73, 1.46], [1.46, 2.92], [2.92, 5.84], [5.84, 11.67], [11.67, 23.35]] },
  { minimumMass: 0.6, maximumMass: 1.5, ranges: [[0.2, 0.4], [0.4, 0.8], [0.8, 1.5], [1.5, 3], [3, 6], [6, 12], [12, 24], [24, 48], [48, 96], [96, 192]] },
  { minimumMass: 1.6, maximumMass: 3, ranges: [[0.8, 1.9], [1.9, 3.7], [3.7, 7.5], [7.5, 14.9], [14.9, 29.8], [29.8, 59.6], [59.6, 119.3], [119.3, 238.6], [238.6, 477.2], [477.2, 954.3]] },
  { minimumMass: 3.1, maximumMass: 5, ranges: [[1.9, 4.2], [4.2, 8.5], [8.5, 17], [17, 33.9], [33.9, 67.9], [67.9, 135.8], [135.8, 271.5], [271.5, 543.1], [543.1, 1086.1], [1086.1, 2172.2]] },
  { minimumMass: 5.1, maximumMass: 8, ranges: [[4.4, 9.9], [9.9, 19.8], [19.8, 39.7], [39.7, 79.4], [79.4, 158.8], [158.8, 317.5], [317.5, 635.1], [635.1, 1270.1], [1270.1, 2540.2], [2540.2, 5080.4]] },
  { minimumMass: 8.1, maximumMass: 12, ranges: [[9, 21], [21, 42], [42, 84], [84, 169], [169, 337], [337, 675], [675, 1350], [1350, 2699], [2699, 5398], [5398, 10797]] },
  { minimumMass: 12.1, maximumMass: 20, ranges: [[21, 48], [48, 96], [96, 192], [192, 384], [384, 768], [768, 1536], [1536, 3072], [3072, 6144], [6144, 12288], [12288, 24576]] },
  { minimumMass: 20.1, maximumMass: 36, ranges: [[57, 128], [128, 256], [256, 511], [511, 1022], [1022, 2045], [2045, 4090], [4090, 8180], [8180, 16359], [16359, 32719], [32719, 65438]] },
  { minimumMass: 36.1, maximumMass: 68, ranges: [[168, 378], [378, 755], [755, 1510], [1510, 3021], [3021, 6042], [6042, 12083], [12083, 24167], [24167, 48333], [48333, 96667], [96667, 193333]] },
  { minimumMass: 68.1, maximumMass: 132, ranges: [[527, 1186], [1186, 2372], [2372, 4743], [4743, 9487], [9487, 18974], [18974, 37947], [37947, 75895], [75895, 151789], [151789, 303579], [303579, 607157]] },
  { minimumMass: 132.1, maximumMass: Infinity, ranges: [[1072, 2411], [2411, 4822], [4822, 9644], [9644, 19288], [19288, 38575], [38575, 77151], [77151, 154302], [154302, 308604], [308604, 617207], [617207, 1234414]] }
];

function rollIsInRange(roll, range) {
  if (!range) {
    return false;
  }

  const [minimumText, maximumText] = range.split('-');
  const minimum = Number(minimumText);
  const maximum = Number(maximumText) || 100;
  return roll >= minimum && roll <= maximum;
}

function rollZonePopulation(starClass, zone, random, options = {}) {
  const ranges = zonePopulationRanges[starClass] || zonePopulationRanges.G;
  let roll = Math.floor(random() * 100) + 1;
  let result = Object.keys(ranges).find((population) => rollIsInRange(roll, ranges[population]));

  if (!result || (options.excludeEmpty && result === 'empty') || (options.excludeCoPopulated && result === 'coPopulated')) {
    do {
      roll = Math.floor(random() * 100) + 1;
      result = Object.keys(ranges).find((population) => rollIsInRange(roll, ranges[population]));
    } while (!result || (options.excludeEmpty && result === 'empty') || (options.excludeCoPopulated && result === 'coPopulated'));
  }

  if (result === 'coPopulated') {
    return {
      name: 'Co-populated Zone',
      populations: [
        rollZonePopulation(starClass, zone, random, { excludeEmpty: true, excludeCoPopulated: true }).name,
        rollZonePopulation(starClass, zone, random, { excludeEmpty: true, excludeCoPopulated: true }).name
      ]
    };
  }

  const name = result === 'jovianIce' && zone === 1
    ? zonePopulationNames.jovianGas
    : zonePopulationNames[result];
  return { name, populations: [name] };
}

function populationToPlanetType(population, random) {
  if (population.includes('Jovian')) {
    return planetTypes.find((planet) => planet.name === 'Gas Giant');
  }
  if (population === 'Dwarf Planetoid') {
    return planetTypes.find((planet) => planet.name === 'Rocky');
  }
  if (population === 'Companion Star') {
    return { name: 'Companion Star', color: '#d9e8ff', habitabilityBias: 0 };
  }
  if (population === 'Empty Zone') {
    return { name: 'Empty Zone', color: '#607089', habitabilityBias: 0 };
  }
  if (population === 'Asteroid Belt') {
    return { name: 'Asteroid Belt', color: '#a6a6a6', habitabilityBias: 0.05 };
  }
  return randomFrom(terrestrialTypes, random);
}

function rollD10(random) {
  return Math.floor(random() * 10) + 1;
}

function rollD5(random) {
  return Math.floor(random() * 5) + 1;
}

function rollD100(random) {
  return Math.floor(random() * 100) + 1;
}

function generateClimateVariation(random) {
  const orbitRoll = rollD100(random);
  const orbitCategory = orbitEccentricityTable.find((entry) => orbitRoll >= entry.minimum && orbitRoll <= entry.maximum);
  const eccentricity = orbitCategory.eccentricity[0] + random() * (orbitCategory.eccentricity[1] - orbitCategory.eccentricity[0]);
  const tiltRoll = rollD100(random);
  const tiltCategory = axialTiltTable.find((entry) => tiltRoll >= entry.minimum && tiltRoll <= entry.maximum);
  const axialTilt = tiltCategory.tilt[0] + random() * (tiltCategory.tilt[1] - tiltCategory.tilt[0]);

  return {
    orbitRoll,
    orbitCategory: orbitCategory.name,
    eccentricity: Number(eccentricity.toFixed(3)),
    orbitClimateEffect: orbitCategory.climateEffect,
    axialTiltRoll: tiltRoll,
    axialTiltVariation: Number(axialTilt.toFixed(1)),
    axialTiltCategory: tiltCategory.name,
    axialTiltClimateEffect: tiltCategory.climateEffect,
    temperatureFactor: orbitCategory.temperatureFactor + tiltCategory.temperatureFactor
  };
}

function rollDice(count, random) {
  let total = 0;
  for (let index = 0; index < count; index += 1) {
    total += rollD10(random);
  }
  return total;
}

function generateMoonSystem(planetMass, random) {
  const table = moonCountTable.find((entry) => planetMass >= entry.minimumMass && planetMass <= entry.maximumMass);
  if (!table) {
    return { roll: null, moons: [], rings: 0, featureTable: false };
  }

  const roll = rollD10(random);
  const outcome = table.outcomes.find((entry) => roll >= entry.minimum && roll <= entry.maximum);
  const moonCount = outcome.count(random);
  const rings = outcome.ringChance && random() < outcome.ringChance
    ? (outcome.ringDice === '1d10' ? rollD10(random) : rollD5(random))
    : 0;

  return {
    roll,
    moons: moonCount,
    rings,
    featureTable: Boolean(outcome.featureTable),
    featureTableStatus: outcome.featureTable ? 'Pending Feature Table' : null
  };
}

function generateMoonDetails(count, hostDiameter, inHabitableZone, random) {
  return Array.from({ length: count }, (_, index) => {
    const sizeRoll = rollD10(random);
    const diameterRoll = rollD10(random);
    const gravityRoll = rollD100(random);
    const size = moonSizeTable.find((entry) => sizeRoll >= entry.minimum && sizeRoll <= entry.maximum);
    const diameter = Math.min(size.diameter(diameterRoll), hostDiameter);
    const gravity = size.gravity(gravityRoll);

    return {
      id: index + 1,
      sizeRoll,
      gravityRoll,
      diameterRoll,
      size: size.name,
      gravity: Number(gravity.toFixed(4)),
      diameter: Number(diameter.toFixed(3)),
      mass: Number((gravity * diameter * diameter).toFixed(5)),
      diameterCapped: diameter < size.diameter(diameterRoll),
      potentiallyHabitable: inHabitableZone && random() < 0.25
    };
  });
}

function rollBodyDetails(population, random) {
  if (population === 'Dwarf Planetoid') {
    const gravityRoll = rollD100(random);
    const diameterRoll = Array.from({ length: 6 }, () => rollD10(random)).reduce((total, roll) => total + roll, 0);
    const gravity = gravityRoll / 30;
    const diameter = diameterRoll * 0.01;
    return {
      category: population,
      gravity: Number(gravity.toFixed(2)),
      diameter: Number(diameter.toFixed(2)),
      mass: Number((gravity * diameter * diameter).toFixed(5)),
      calculations: dwarfPlanetoidDetails,
      rolls: { gravity: gravityRoll, diameter: diameterRoll }
    };
  }

  if (population === 'Jovian: Ice' || population === 'Jovian: Gas') {
    const gravityRoll = rollD100(random);
    const diameterRoll = rollD10(random);
    const isIce = population === 'Jovian: Ice';
    const gravity = isIce ? (gravityRoll * 0.05) + 0.25 : (gravityRoll * 0.05) + 0.3;
    const diameter = isIce ? (diameterRoll + 12) / 2 : (diameterRoll + 15) / 2;
    return {
      category: population,
      gravity: Number(gravity.toFixed(2)),
      diameter: Number(diameter.toFixed(2)),
      mass: Number((gravity * diameter * diameter).toFixed(2)),
      calculations: isIce ? jovianIceDetails : jovianGasDetails,
      rolls: { gravity: gravityRoll, diameter: diameterRoll }
    };
  }

  if (population === 'Terrestrial Planet') {
    const gravityRoll = rollD10(random) + rollD10(random);
    const diameterRoll = rollD100(random);
    const gravity = gravityRoll / 10;
    const diameter = (diameterRoll + 40) / 70;
    return {
      category: population,
      gravity: Number(gravity.toFixed(2)),
      diameter: Number(diameter.toFixed(2)),
      mass: Number((gravity * diameter * diameter).toFixed(2)),
      calculations: terrestrialPlanetDetails,
      rolls: { gravity: gravityRoll, diameter: diameterRoll }
    };
  }

  return null;
}

function generateJovianDetails(random) {
  const mainGasRoll = rollD10(random);
  const traceGasRoll = rollD10(random);
  const coreRoll = rollD10(random);
  return {
    mainGasRoll,
    mainGases: jovianMainGases[mainGasRoll - 1],
    traceGasRoll,
    traceGases: jovianTraceGases[traceGasRoll - 1],
    coreRoll,
    coreMakeup: jovianCoreMakeup[coreRoll - 1]
  };
}

function rollFromRanges(ranges, roll) {
  return ranges.find((entry) => roll >= entry.minimum && roll <= entry.maximum);
}

function generateBinarySystem(primaryStar, random) {
  const typeRoll = Math.floor(random() * 100) + 1;
  const type = rollFromRanges(binarySystemTypes, typeRoll);
  const separationAU = type.name === 'Close'
    ? Number((0.1 + random() * 2.9).toFixed(2))
    : Number((50 + random() * 150).toFixed(2));
  const companionMass = Number((random() * primaryStar.mass).toFixed(2));
  const binary = {
    type: type.name,
    typeRoll,
    separationAU,
    companionMass,
    planetPlacement: null,
    planetPlacementRoll: null
  };

  if (type.name === 'Distant') {
    const planetPlacementRoll = Math.floor(random() * 100) + 1;
    binary.planetPlacementRoll = planetPlacementRoll;
    binary.planetPlacement = rollFromRanges(binaryPlanetPlacements, planetPlacementRoll).name;
  } else {
    binary.planetPlacement = 'Primary and companion treated as one star';
  }

  return binary;
}

function getStellarMassOrbitRow(mass) {
  return stellarMassOrbitZones.find((row) => mass >= row.minimumMass && mass <= row.maximumMass)
    || (mass < stellarMassOrbitZones[0].minimumMass ? stellarMassOrbitZones[0] : stellarMassOrbitZones[stellarMassOrbitZones.length - 1]);
}

function kelvinToFahrenheit(kelvin) {
  return Math.round((kelvin - 273.15) * 9 / 5 + 32);
}

function mulberry32(seed) {
  let t = seed >>> 0;
  return function random() {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), t | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function randomFrom(list, random) {
  return list[Math.floor(random() * list.length)];
}

function loadSavedPresets() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    return [];
  }
}

function persistPresets(presets) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
  } catch (error) {
    // Ignore local storage quota issues.
  }
}

function updatePresetList() {
  const presets = loadSavedPresets();
  presetSelect.innerHTML = '<option value="">No preset loaded</option>' +
    presets.map((preset) => `<option value="${preset.id}">${preset.name}</option>`).join('');
}

function generateGalaxy(seed) {
  const random = mulberry32(seed + 1000);
  const stars = [];
  for (let index = 0; index < 140; index += 1) {
    const angle = random() * Math.PI * 2;
    const distance = Math.pow(random(), 1.4) * 240;
    const x = Math.cos(angle) * distance;
    const y = (random() - 0.5) * 160;
    const z = Math.sin(angle) * distance;
    stars.push({ x, y, z, size: 0.7 + random() * 2.3, alpha: 0.4 + random() * 0.6 });
  }
  return stars;
}

function generateSystem(seed, targetPlanetCount, options = {}) {
  const random = mulberry32(seed);
  const stellarRoll = Math.floor(random() * 100);
  const progression = Math.floor(random() * 10);
  const classificationRoll = Math.floor(random() * 100);
  const progressionRow = stellarMassProgression.find((row) => {
    const [minimum, maximum] = row.roll.split('-').map(Number);
    return stellarRoll >= minimum && stellarRoll <= (maximum || minimum);
  });
  const star = { ...randomFrom(starCatalog, random) };
  const multiplierRow = stellarMassMultipliers.find((row) => {
    const [minimum, maximum] = row.roll.split('-').map(Number);
    return classificationRoll >= minimum && classificationRoll <= maximum;
  });
  star.className = progressionRow.className;
  star.baseMass = progressionRow.masses[progression];
  star.massMultiplier = multiplierRow.values[star.className];
  star.mass = Number((star.baseMass * star.massMultiplier).toFixed(2));
  const luminosityClass = multiplierRow.classification.charAt(0);
  star.spectralType = `${star.className}${progression}-${luminosityClass}`;
  star.progression = progression;
  star.roll = stellarRoll;
  star.luminosityClassification = multiplierRow.classification;
  star.classificationRoll = classificationRoll;
  const classStellarData = star.className === 'O'
    ? oClassStellarData
    : star.className === 'B'
      ? bClassStellarData
      : star.className === 'A'
        ? aClassStellarData
        : star.className === 'F'
          ? fClassStellarData
          : star.className === 'G'
            ? gClassStellarData
            : star.className === 'K'
              ? kClassStellarData
              : star.className === 'M'
                ? mClassStellarData
                : null;
  const detailedStellarData = classStellarData?.find((entry) => entry.spectralType === star.spectralType);
  if (detailedStellarData) {
    star.luminosity = detailedStellarData.luminosity;
    star.diameter = detailedStellarData.diameter;
    star.temperature = detailedStellarData.temperature;
  }
  let binarySystem = null;
  const maxPlanets = clamp(targetPlanetCount, 3, 10);
  const stellarMassOrbitRow = getStellarMassOrbitRow(star.mass);

  const planets = [];
  const minOrbit = 84;
  const maxOrbit = 290;
  const orbitStep = (maxOrbit - minOrbit) / maxPlanets;
  const habitableZoneInner = Math.sqrt(star.luminosity / 1.1);
  const habitableZoneOuter = Math.sqrt(star.luminosity / 0.53);

  for (let index = 0; index < maxPlanets; index += 1) {
    const zone = index + 1;
    const orbitalRange = stellarMassOrbitRow.ranges[zone - 1];
    const orbitalDistanceAU = orbitalRange[0] + random() * (orbitalRange[1] - orbitalRange[0]);
    const distance = minOrbit + (index / Math.max(maxPlanets - 1, 1)) * (maxOrbit - minOrbit);
    const radius = 6 + random() * 14;
    const zonePopulation = options.ensureTerrestrial && index === 0
      ? { name: 'Terrestrial Planet', populations: ['Terrestrial Planet'] }
      : rollZonePopulation(star.className, zone, random);
    const primaryPopulation = zonePopulation.populations[0];
    if (zonePopulation.populations.includes('Companion Star') && !binarySystem) {
      binarySystem = generateBinarySystem(star, random);
    }
    const type = populationToPlanetType(primaryPopulation, random);
    const jovianDetails = primaryPopulation.includes('Jovian') ? generateJovianDetails(random) : null;
    const physicalDetails = zonePopulation.populations
      .map((population) => ({ population, details: rollBodyDetails(population, random) }))
      .filter((entry) => entry.details);
    const climateVariation = generateClimateVariation(random);
    const guaranteedInhabitable = options.ensureTerrestrial && index === 0;
    const equilibrium = guaranteedInhabitable
      ? 15 + random() * 12
      : clamp((star.temperature / 6000) * (250 / orbitalDistanceAU) + random() * 140 - 30, -40, 120);
    const orbitalPeriod = Math.round(Math.sqrt(Math.pow(orbitalDistanceAU, 3) / star.mass) * 365);
    const atmosphereProfile = guaranteedInhabitable
      ? randomFrom(inhabitableAtmospheres, random)
      : null;
    const atmosphereType = type.name === 'Gas Giant'
      ? 'Dense'
      : atmosphereProfile?.type || randomFrom(['Thin', 'Dense', 'Corrosive', 'Toxic'], random);
    const pressureEarth = atmosphereProfile?.pressure || (type.name === 'Gas Giant' ? 120 + random() * 280 : 0.2 + random() * 2.8);
    const pressureKPa = pressureEarth * 101.325;
    const composition = atmosphereProfile?.composition || (type.name === 'Gas Giant'
      ? '89% hydrogen, 10% helium, 1% methane, trace ammonia'
      : randomFrom(['92% nitrogen, 6% carbon dioxide, 2% argon', '70% carbon dioxide, 20% nitrogen, 10% sulfur dioxide', '80% methane, 15% nitrogen, 5% hydrogen'], random));
    const waterCoverage = type.name === 'Oceanic' ? 62 + random() * 31 : type.name === 'Desert' ? random() * 18 : random() * 72;
    const zoneFit = orbitalDistanceAU >= habitableZoneInner && orbitalDistanceAU <= habitableZoneOuter;
    const habitabilityScore = guaranteedInhabitable
      ? 80 + Math.floor(random() * 21)
      : Math.round(clamp((zoneFit ? 52 : 12) + type.habitabilityBias * 38 - Math.abs(equilibrium - 24) * 1.6 + random() * 10, 0, 100));
    const habitable = guaranteedInhabitable || (habitabilityScore >= 55 && type.name !== 'Gas Giant' && type.name !== 'Empty Zone');
    const averageTemperatureK = Math.round(equilibrium + 273.15);
    const baseTemperatureSwing = guaranteedInhabitable ? 8 + Math.round(random() * 8) : 18 + Math.round(random() * 38);
    const temperatureSwing = Math.round(baseTemperatureSwing * (1 + climateVariation.temperatureFactor));
    const planetMass = physicalDetails[0]?.details.mass || 0;
    const moonSystem = generateMoonSystem(planetMass, random);
    const moonCount = moonSystem.moons;
    const hostDiameter = physicalDetails[0]?.details.diameter || 0;
    const moons = generateMoonDetails(moonCount, hostDiameter, zoneFit, random);
    const companionMass = zonePopulation.populations.includes('Companion Star')
      ? binarySystem.companionMass
      : null;
    const hostStar = zonePopulation.populations.includes('Companion Star')
      ? 'Companion'
      : binarySystem?.type === 'Close'
        ? 'Primary + Companion'
        : binarySystem?.planetPlacement === 'Companion Only'
          ? 'Companion'
          : binarySystem?.planetPlacement === 'Planets on Both'
            ? 'Primary + Companion'
            : 'Primary';

    planets.push({
      id: index + 1,
      zone,
      population: zonePopulation.name,
      populations: zonePopulation.populations,
      physicalDetails,
      jovianDetails,
      climateVariation,
      hostStar,
      companionMass,
      orbitalDistanceAU: Number(orbitalDistanceAU.toFixed(2)),
      orbitalRangeAU: `${orbitalRange[0]}-${orbitalRange[1]} AU`,
      orbit: distance,
      radius,
      angle: random() * Math.PI * 2,
      speed: (0.2 + random() * 0.7) / (index + 1),
      type,
      equilibrium,
      orbitalPeriod,
      atmosphere: atmosphereType,
      pressureEarth,
      pressureKPa,
      composition,
      minTemperatureK: averageTemperatureK - temperatureSwing,
      averageTemperatureK,
      maxTemperatureK: averageTemperatureK + temperatureSwing,
      waterCoverage,
      habitabilityScore,
      habitable,
      moons: moonCount,
      moonDetails: moons,
      moonRoll: moonSystem.roll,
      rings: moonSystem.rings,
      featureTable: moonSystem.featureTable,
      featureTableStatus: moonSystem.featureTableStatus,
      label: `${index + 1}`,
      description: `${type.name} world with ${Math.floor(random() * 4)} notable features`
    });
  }

  return {
    seed,
    name: `${star.name} ${['Prime', 'Nova', 'Helios', 'Drift', 'Sigma'][Math.floor(random() * 5)]}`,
    star,
    binary: binarySystem,
    habitableZone: { inner: Number(habitableZoneInner.toFixed(2)), outer: Number(habitableZoneOuter.toFixed(2)) },
    planets,
    galaxy: generateGalaxy(seed),
    habitablePlanetCount: planets.filter((planet) => planet.habitable).length,
    totalMoons: planets.reduce((total, planet) => total + planet.moons, 0),
    systemScale: Number(stellarMassOrbitRow.ranges[9][1].toFixed(2)),
    ftlHorizon: { zone: 4, distanceAU: stellarMassOrbitRow.ranges[3][0] },
    discovery: `${Math.floor(900 + random() * 1500)} A.D.`
  };
}

function drawBackground() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#040b17';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (isGalaxyView && activeSystem) {
    activeSystem.galaxy.forEach((star) => {
      const x = canvas.width / 2 + star.x;
      const y = canvas.height / 2 + star.y;
      ctx.fillStyle = `rgba(255,255,255,${star.alpha})`;
      ctx.beginPath();
      ctx.arc(x, y, star.size, 0, Math.PI * 2);
      ctx.fill();
    });
    return;
  }

  for (let index = 0; index < 120; index += 1) {
    const x = (Math.sin(index * 91.73) * 1000 + index * 63) % canvas.width;
    const y = (Math.cos(index * 57.31) * 800 + index * 53) % canvas.height;
    const size = 0.8 + ((index * 13) % 4);
    ctx.fillStyle = `rgba(255,255,255,${0.4 + ((index % 5) / 10)})`;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }
}

function updatePlanetCards() {
  if (!activeSystem) {
    planetCards.innerHTML = '<p>System not ready.</p>';
    return;
  }

  planetCards.innerHTML = activeSystem.planets
    .map((planet, index) => `
      <button class="planet-card ${selectedPlanetIndex === index ? 'selected' : ''}" data-index="${index}" type="button">
        <div class="label">
          <span class="name">P${planet.id}</span>
          <span class="small">${planet.habitable ? 'Hab' : 'Unhab'}</span>
        </div>
        <div class="type">${planet.population}</div>
        <div class="small">${planet.habitabilityScore}% inhabitable</div>
        <div class="small">${planet.moons} moons · ${planet.orbitalPeriod.toLocaleString()} days</div>
      </button>
    `)
    .join('');

  planetCards.querySelectorAll('.planet-card').forEach((card) => {
    card.addEventListener('click', () => {
      selectedPlanetIndex = Number(card.dataset.index);
      updatePlanetFocus();
      updatePlanetCards();
    });
  });
}

function drawSystem(system, timestamp = 0) {
  drawBackground();

  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const starRadius = 24 + system.star.mass * 3;
  const orbitScale = orbitSpeedMultiplier * 0.7;

  const glow = ctx.createRadialGradient(centerX, centerY, 10, centerX, centerY, 90);
  glow.addColorStop(0, system.star.color);
  glow.addColorStop(0.35, system.star.color + 'AA');
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(centerX, centerY, 90, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.fillStyle = system.star.color;
  ctx.arc(centerX, centerY, starRadius, 0, Math.PI * 2);
  ctx.fill();

  ctx.font = '12px sans-serif';
  ctx.fillStyle = '#dfeeff';
  ctx.fillText(system.name, centerX - 42, centerY + starRadius + 22);

  system.planets.forEach((planet, index) => {
    const orbitRadius = planet.orbit;
    const angle = planet.angle + timestamp * 0.00022 * planet.speed * 80 * orbitScale;
    const x = centerX + Math.cos(angle) * orbitRadius;
    const y = centerY + Math.sin(angle) * orbitRadius;

    ctx.beginPath();
    ctx.strokeStyle = 'rgba(180, 210, 255, 0.18)';
    ctx.lineWidth = 1;
    ctx.arc(centerX, centerY, orbitRadius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.fillStyle = planet.type.color;
    ctx.arc(x, y, planet.radius, 0, Math.PI * 2);
    ctx.fill();

    const isSelected = selectedPlanetIndex === index;
    if (isSelected) {
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(255,255,255,0.95)';
      ctx.lineWidth = 2.5;
      ctx.arc(x, y, planet.radius + 6, 0, Math.PI * 2);
      ctx.stroke();
    }

    const ringColor = planet.habitable ? 'rgba(123, 255, 174, 0.8)' : 'rgba(255, 202, 112, 0.48)';
    if (index % 2 === 0) {
      ctx.beginPath();
      ctx.strokeStyle = ringColor;
      ctx.lineWidth = 2;
      ctx.ellipse(x, y, planet.radius + 8, planet.radius + 3, 0.8, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (planet.moons > 0) {
      for (let moonIndex = 0; moonIndex < planet.moons; moonIndex += 1) {
        const moonAngle = timestamp * 0.0011 * (moonIndex + 1) + moonIndex * 1.7;
        const moonOrbit = planet.radius + 8 + moonIndex * 5;
        const moonX = x + Math.cos(moonAngle) * moonOrbit;
        const moonY = y + Math.sin(moonAngle) * moonOrbit;

        ctx.beginPath();
        ctx.fillStyle = 'rgba(220, 232, 255, 0.9)';
        ctx.arc(moonX, moonY, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.fillStyle = '#edf5ff';
    ctx.fillText(planet.label, x - 3, y - planet.radius - 9);
  });
}

function updateSummary(system) {
  const rows = [
    ['Star', system.name],
    ['Class', `${system.star.className} type`],
    ['Mass', `${system.star.mass.toFixed(2)} M☉`],
    ['Luminosity', `${system.star.luminosity.toLocaleString()} L☉`],
    ['Diameter', `${system.star.diameter.toFixed(2)} D☉`],
    ['Temperature', `${system.star.temperature.toLocaleString()} K`],
    ['Habitable', `${system.habitablePlanetCount} world(s)`],
    ['Moons', `${system.totalMoons}`],
    ['Discovery', system.discovery],
    ['Scale', `${system.systemScale} AU`],
    ['FTL horizon', `Zone ${system.ftlHorizon.zone} from ${system.ftlHorizon.distanceAU} AU`]
  ];

  systemSummary.innerHTML = rows
    .map(([key, value]) => `
      <div>
        <dt>${key}</dt>
        <dd>${value}</dd>
      </div>
    `)
    .join('');
}

function updateStellarMetrics(system) {
  const rows = [
    ['Spectral type', `${system.star.spectralType} · ${system.star.description}`],
    ['Mass', `${system.star.mass.toFixed(2)} M☉`],
    ['Luminosity', `${system.star.luminosity.toLocaleString()} L☉`],
    ['Diameter', `${system.star.diameter.toFixed(2)} D☉`],
    ['Temperature', `${system.star.temperature.toLocaleString()} K`],
    ['Habitable zone', `${system.habitableZone.inner}-${system.habitableZone.outer} AU`]
  ];

  stellarMetrics.innerHTML = rows
    .map(([key, value]) => `
      <div>
        <dt>${key}</dt>
        <dd>${value}</dd>
      </div>
    `)
    .join('');
}

function updatePlanetFocus() {
  if (!activeSystem || selectedPlanetIndex === null || selectedPlanetIndex >= activeSystem.planets.length) {
    planetFocus.innerHTML = '<p>Click a planet in the system to inspect it.</p>';
    return;
  }

  const planet = activeSystem.planets[selectedPlanetIndex];
  planetFocus.innerHTML = `
    <strong>Planet ${planet.id}</strong>
    <span>${planet.population}</span>
    <div class="planet-meta">
      <span>Zone</span>
      <strong>${planet.zone}</strong>
    </div>
    <div class="planet-meta planet-meta-wide">
      <span>Zone population</span>
      <strong>${planet.populations.join(' + ')}</strong>
    </div>
    <div class="planet-meta">
      <span>Zone range</span>
      <strong>${planet.orbitalRangeAU}</strong>
    </div>
    ${planet.physicalDetails.map(({ population, details }) => `
      <div class="planet-meta">
        <span>${population} gravity / diameter / mass</span>
        <strong>${details.gravity} g · ${details.diameter} D⊕ · ${details.mass} M⊕</strong>
      </div>
    `).join('')}
    ${planet.jovianDetails === null ? '' : `
      <div class="planet-meta planet-meta-wide">
        <span>Jovian main gases</span>
        <strong>${planet.jovianDetails.mainGases}</strong>
      </div>
      <div class="planet-meta planet-meta-wide">
        <span>Jovian trace gases</span>
        <strong>${planet.jovianDetails.traceGases}</strong>
      </div>
      <div class="planet-meta planet-meta-wide">
        <span>Jovian core</span>
        <strong>${planet.jovianDetails.coreMakeup}</strong>
      </div>
    `}
    <div class="planet-meta">
      <span>Habitable</span>
      <strong>${planet.habitable ? 'Yes' : 'No'}</strong>
    </div>
    <div class="planet-meta">
      <span>Equilibrium</span>
      <strong>${Math.round(planet.equilibrium)}°C</strong>
    </div>
    <div class="planet-meta">
      <span>Habitability</span>
      <strong>${planet.habitabilityScore}%</strong>
    </div>


    <div class="planet-card">
      <h2><center><strong>ATMOSPHERE</strong></center></h2>
    </div>
    <div class="planet-meta">
      Type: <strong>${planet.atmosphere}</strong>
    </div>
    <div class="planet-meta">
      Atmospheric Pressure: <strong>${planet.pressureKPa.toFixed(1)} kPa<br>(${planet.pressureEarth.toFixed(2)}x Earth)</strong>
    </div>
    <div class="planet-meta">
      Composition: <strong>${planet.composition}</strong>
    </div>
    <div class="planet-meta">
      Climate: <strong>${planet.climateVariation.climateDescription}</strong>
    </div>
    <div class="planet-meta">
      Temperature: 
      <strong>
      ·Min Temp: ${planet.minTemperatureK} K (${kelvinToFahrenheit(planet.minTemperatureK)}°F)<br>
      ·Avg Temp: ${planet.averageTemperatureK} K (${kelvinToFahrenheit(planet.averageTemperatureK)}°F)<br>
      ·Max Temp: ${planet.maxTemperatureK} K (${kelvinToFahrenheit(planet.maxTemperatureK)}°F)</span></strong>
    </div>

    <div class="planet-card">
      <h2><center><strong>ORBIT</strong></center></h2>
    </div>
    <div class="planet-meta">
      Distance: <strong>${planet.orbitalDistanceAU} AU</strong>
    </div><div class="planet-meta">
      Period: <strong>${planet.orbitalPeriod.toLocaleString()} days</strong>
    </div><div class="planet-meta">
      Pattern: <strong>${planet.climateVariation.orbitCategory}</strong>
    </div><div class="planet-meta">
      Eccentricity: <strong>${planet.climateVariation.eccentricity}</strong>
    </div><div class="planet-meta">
      Climate Effects: <strong>${planet.climateVariation.orbitClimateEffect}</strong>
    </div>

    <div class="planet-card">
      <h2><center><strong>AXIAL TILT</strong></center></h2>
    </div>
    <div class="planet-meta">
      Variation: <strong>${planet.climateVariation.axialTiltVariation}°</strong>
    </div>
    <div class="planet-meta">
      Category: <strong>${planet.climateVariation.axialTiltCategory}</strong>
    </div>
    <div class="planet-meta">
      Climate Effect: <strong>${planet.climateVariation.axialTiltClimateEffect}</strong>
    </div>
    <div class="planet-meta">
      <span>Surface water</span>
      <strong>${Math.round(planet.waterCoverage)}%</strong>
    </div>
    <div class="planet-meta">
      <span>Moons</span>
      <strong>${planet.moons}</strong>
    </div>
    <div class="planet-meta">
      <span>Rings</span>
      <strong>${planet.rings}</strong>
    </div>
    ${planet.featureTable ? `
      <div class="planet-meta">
        <span>Feature table</span>
        <strong>${planet.featureTableStatus}</strong>
      </div>
    ` : ''}
    ${planet.moonDetails.length === 0 ? '' : `
      <div class="planet-meta planet-meta-wide">
        <span>Moon details</span>
        <strong>${planet.moonDetails.map((moon) => `#${moon.id} ${moon.size}, ${moon.gravity} g, ${moon.diameter} D⊕${moon.potentiallyHabitable ? ' (habitable potential)' : ''}`).join(' · ')}</strong>
      </div>
    `}
    ${planet.companionMass === null ? '' : `
      <div class="planet-meta">
        <span>Companion mass</span>
        <strong>${planet.companionMass.toFixed(2)} M☉</strong>
      </div>
    `}
  `;
}

function setupThreeScene() {
  if (!window.THREE || !activeSystem) {
    return;
  }

  threeScene = new THREE.Scene();
  threeScene.background = new THREE.Color(0x030914);

  threeCamera = new THREE.PerspectiveCamera(45, canvas.width / canvas.height, 0.1, 5000);
  threeCamera.position.set(0, 120, 260);

  if (!threeRenderer) {
    threeRenderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  }
  threeRenderer.setSize(canvas.width, canvas.height, false);
  threeRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  const ambient = new THREE.AmbientLight(0xffffff, 0.7);
  const pointLight = new THREE.PointLight(0x9ec9ff, 1.5, 600);
  pointLight.position.set(0, 30, 0);

  threeScene.add(ambient);
  threeScene.add(pointLight);

  const starColor = new THREE.Color(activeSystem.star.color);
  const star = new THREE.Mesh(
    new THREE.SphereGeometry(18, 32, 32),
    new THREE.MeshStandardMaterial({ color: starColor, emissive: starColor, emissiveIntensity: 0.9 })
  );
  threeScene.add(star);

  threeObjects = activeSystem.planets.map((planet, index) => {
    const orbitPivot = new THREE.Group();
    threeScene.add(orbitPivot);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(planet.orbit * 0.7, 0.35, 12, 80),
      new THREE.MeshBasicMaterial({ color: index % 2 === 0 ? 0x8ed7ff : 0x8b9cff, transparent: true, opacity: 0.25 })
    );
    ring.rotation.x = Math.PI / 2;
    orbitPivot.add(ring);

    const planetMesh = new THREE.Mesh(
      new THREE.SphereGeometry(planet.radius * 0.9, 24, 24),
      new THREE.MeshStandardMaterial({ color: new THREE.Color(planet.type.color), emissive: new THREE.Color(planet.type.color), emissiveIntensity: 0.2 })
    );
    planetMesh.position.x = planet.orbit * 0.7;
    orbitPivot.add(planetMesh);

    return {
      pivot: orbitPivot,
      mesh: planetMesh,
      speed: planet.speed,
      radius: planet.orbit * 0.7,
      angleOffset: planet.angle
    };
  });
}

function renderThreeScene() {
  if (!threeRenderer || !threeScene || !threeCamera || !activeSystem) {
    return;
  }

  const time = (paused ? lastTimestamp : performance.now()) * 0.00065 * orbitSpeedMultiplier;

  threeObjects.forEach((planet) => {
    const angle = time * (20 * planet.speed) + planet.angleOffset;
    planet.pivot.rotation.y = angle;
    planet.mesh.position.set(Math.cos(angle) * planet.radius, 0, Math.sin(angle) * planet.radius);
  });

  threeRenderer.render(threeScene, threeCamera);
}

function renderSystem() {
  const seed = Number(seedInput.value) || 1;
  const targetPlanetCount = Number(planetCountInput.value) || 6;
  const system = generateSystem(seed, targetPlanetCount, { ensureTerrestrial: terrestrialRequired });

  activeSystem = system;
  selectedPlanetIndex = null;
  updateSummary(system);
  updateStellarMetrics(system);
  updatePlanetFocus();
  updatePlanetCards();

  if (is3DView) {
    setupThreeScene();
  }
}

function saveCurrentSystem() {
  if (!activeSystem) {
    return;
  }

  const presets = loadSavedPresets();
  const payload = {
    id: Date.now(),
    name: `${activeSystem.name} (${activeSystem.seed})`,
    seed: activeSystem.seed,
    planetCount: activeSystem.planets.length,
    createdAt: new Date().toISOString(),
    system: activeSystem
  };

  presets.unshift(payload);
  persistPresets(presets.slice(0, 8));
  updatePresetList();
  presetSelect.value = String(payload.id);
}

function exportCurrentSystem() {
  if (!activeSystem) {
    return;
  }

  const blob = new Blob([JSON.stringify(activeSystem, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${activeSystem.name.toLowerCase().replace(/\s+/g, '-')}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function loadPresetById(presetId) {
  const presets = loadSavedPresets();
  const preset = presets.find((entry) => String(entry.id) === presetId);
  if (!preset) {
    return;
  }

  seedInput.value = String(preset.seed);
  planetCountInput.value = String(preset.planetCount || 6);
  planetCountValue.textContent = String(preset.planetCount || 6);
  renderSystem();
}

function animate(timestamp) {
  if (!paused && activeSystem) {
    lastTimestamp = timestamp;
  }

  if (is3DView) {
    renderThreeScene();
  } else if (activeSystem) {
    drawSystem(activeSystem, lastTimestamp || timestamp);
  }

  animationFrameId = requestAnimationFrame(animate);
}

canvas.addEventListener('click', (event) => {
  if (!activeSystem || is3DView) {
    return;
  }

  const rect = canvas.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * canvas.width;
  const y = ((event.clientY - rect.top) / rect.height) * canvas.height;

  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;

  let hitIndex = null;
  const currentTimestamp = lastTimestamp || performance.now();
  activeSystem.planets.forEach((planet, index) => {
    const angle = planet.angle + currentTimestamp * 0.00045 * planet.speed * 80;
    const planetX = centerX + Math.cos(angle) * planet.orbit;
    const planetY = centerY + Math.sin(angle) * planet.orbit;
    const distance = Math.hypot(x - planetX, y - planetY);

    if (distance <= planet.radius + 8) {
      hitIndex = index;
    }
  });

  selectedPlanetIndex = hitIndex;
  updatePlanetFocus();
  updatePlanetCards();
});

orbitSpeedInput.addEventListener('input', (event) => {
  orbitSpeedMultiplier = Number(event.target.value) || 0.8;
  orbitSpeedValue.textContent = `${orbitSpeedMultiplier.toFixed(1)}x`;
});

seedInput.addEventListener('input', renderSystem);
planetCountInput.addEventListener('input', (event) => {
  planetCountValue.textContent = event.target.value;
  renderSystem();
});

document.getElementById('generateBtn').addEventListener('click', renderSystem);
document.getElementById('randomBtn').addEventListener('click', () => {
  seedInput.value = String(Math.floor(Math.random() * 900000) + 1);
  renderSystem();
});

terrestrialBtn.addEventListener('click', () => {
  terrestrialRequired = true;
  terrestrialBtn.textContent = 'Terrestrial World Guaranteed';
  terrestrialBtn.classList.add('active');
  renderSystem();
});

pauseBtn.addEventListener('click', () => {
  paused = !paused;
  pauseBtn.textContent = paused ? 'Resume' : 'Pause';
});

toggle3DBtn.addEventListener('click', () => {
  is3DView = !is3DView;
  toggle3DBtn.textContent = is3DView ? '2D View' : '3D View';
  if (is3DView) {
    setupThreeScene();
  }
});

galaxyBtn.addEventListener('click', () => {
  isGalaxyView = !isGalaxyView;
  galaxyBtn.textContent = isGalaxyView ? 'System View' : 'Galaxy Map';
  if (activeSystem) {
    renderSystem();
  }
});

savePresetBtn.addEventListener('click', saveCurrentSystem);
exportBtn.addEventListener('click', exportCurrentSystem);
presetSelect.addEventListener('change', (event) => {
  if (event.target.value) {
    loadPresetById(event.target.value);
  }
});

planetCountValue.textContent = planetCountInput.value;
orbitSpeedValue.textContent = `${orbitSpeedMultiplier.toFixed(1)}x`;
updatePresetList();
renderSystem();
if (!animationFrameId) {
  animationFrameId = requestAnimationFrame(animate);
}
