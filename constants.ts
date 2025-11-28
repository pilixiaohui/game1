

import { UnitType, UnitConfig, RegionData, GameSaveData, Faction, BioPluginConfig, Polarity } from './types';

export const SCREEN_PADDING = 100;
export const LANE_Y = 0; 
export const FLOOR_Y = 100;
export const LANE_HEIGHT = 180; 
export const DECAY_TIME = 2.0; 
export const COLLISION_BUFFER = 10;
export const MILESTONE_DISTANCE = 1500;

// Caps and Rates
export const MAX_RESOURCES_BASE = 2000; 
export const RESOURCE_TICK_RATE_BASE = 15; // Increased base income for better flow
export const MINERAL_TICK_RATE_BASE = 5;   // Slower mineral gain
export const LARVA_REGEN_RATE = 0.5;       // Base Larva per second (Legacy fallback)
export const UNIT_UPGRADE_COST_BASE = 100;
export const MAX_SCREEN_UNITS = 30; // Deployment valve limit (Visual density cap)
export const HATCHERY_PRODUCTION_INTERVAL = 0.5; // Seconds between production attempts
export const RECYCLE_REFUND_RATE = 0.8; // 80% refund on digest (Stockpile)

// METABOLISM UPGRADES
export const METABOLISM_UPGRADES = {
    PASSIVE: {
        NAME: "菌毯瘤",
        DESC: "加速生物质与矿物质的自然生成。",
        BASE_COST: 150,
        COST_FACTOR: 1.6,
        EFFECT_PER_LEVEL: 0.2, // +20% per level
    },
    RECYCLE: {
        NAME: "食腐胃囊",
        DESC: "提高战场阵亡单位的资源回收率。",
        BASE_COST: 300,
        COST_FACTOR: 2.0,
        BASE_RATE: 0.1,
        RATE_PER_LEVEL: 0.05, // +5% per level
        MAX_RATE: 0.8,
    },
    STORAGE: {
        NAME: "能量泵",
        DESC: "增加资源存储上限。",
        BASE_COST: 100,
        COST_FACTOR: 1.5,
        CAP_PER_LEVEL: 2000,
    },
    LARVA: {
        NAME: "孵化池",
        DESC: "加速幼虫的自然孵化速度。",
        BASE_COST: 200,
        COST_FACTOR: 1.8,
        BASE_RATE: 0.5,
        RATE_PER_LEVEL: 0.1, // +0.1 per level
    },
    SUPPLY: {
        NAME: "突触网络",
        DESC: "扩展虫巢思维控制能力，提升兵力储备上限。",
        BASE_COST: 250,
        COST_FACTOR: 1.5,
        BASE_CAP: 200,
        CAP_PER_LEVEL: 50,
    }
};

// --- CONFIG TABLES ---

export const PLAYABLE_UNITS = [UnitType.MELEE, UnitType.RANGED];

export const UNIT_CONFIGS: Record<UnitType, UnitConfig> = {
  [UnitType.MELEE]: {
    id: UnitType.MELEE,
    name: '跳虫',
    baseStats: {
        hp: 60,
        damage: 20,
        range: 30,
        speed: 180,
        attackSpeed: 0.5,
        width: 24,
        height: 24,
        color: 0x3b82f6,
    },
    cost: { biomass: 15, minerals: 0, larva: 1 },
    growthFactors: {
        hp: 0.2, // 20% per level
        damage: 0.2,
    },
    baseLoadCapacity: 30,
    slots: [
        { polarity: 'ATTACK' }, // Claws
        { polarity: 'DEFENSE' }, // Carapace
        { polarity: 'ATTACK' }, // Muscles
        { polarity: 'FUNCTION' }, // Adrenal
        { polarity: 'UNIVERSAL' }, // Core
    ]
  },
  [UnitType.RANGED]: {
    id: UnitType.RANGED,
    name: '刺蛇',
    baseStats: {
        hp: 45,
        damage: 35,
        range: 220,
        speed: 130,
        attackSpeed: 1.0,
        width: 20,
        height: 30,
        color: 0x8b5cf6,
    },
    cost: { biomass: 25, minerals: 15, larva: 1 },
    growthFactors: {
        hp: 0.15,
        damage: 0.25,
    },
    baseLoadCapacity: 30,
    slots: [
        { polarity: 'ATTACK' }, 
        { polarity: 'DEFENSE' },
        { polarity: 'FUNCTION' }, // Eyes
        { polarity: 'FUNCTION' }, // Spines
        { polarity: 'UNIVERSAL' }, 
    ]
  },
  // Humans don't need full config, but typescript expects it if we iterate keys. 
  // We'll leave them undefined here or mock them if necessary, but logic uses HUMAN_STATS below.
  [UnitType.HUMAN_MARINE]: {} as any,
  [UnitType.HUMAN_RIOT]: {} as any,
  [UnitType.HUMAN_PYRO]: {} as any,
  [UnitType.HUMAN_SNIPER]: {} as any,
  [UnitType.HUMAN_TANK]: {} as any,
};

// BIO-PLUGINS DEFINITIONS
export const BIO_PLUGINS: Record<string, BioPluginConfig> = {
    // A. Structure & Vitality (Defense - Blue)
    'chitin_growth': {
        id: 'chitin_growth', name: '几丁质增生', description: '硬化甲壳', polarity: 'DEFENSE',
        baseCost: 6, costPerRank: 1, maxRank: 5, rarity: 'COMMON',
        stats: [{ stat: 'hp', value: 0.2 }], statGrowth: 1 
    },
    'giant_ventricle': {
        id: 'giant_ventricle', name: '巨型心室', description: '强化心脏泵血', polarity: 'DEFENSE',
        baseCost: 6, costPerRank: 1, maxRank: 5, rarity: 'COMMON',
        stats: [{ stat: 'hp', value: 0.3 }], statGrowth: 1 
    },
    'adipose_buffer': {
        id: 'adipose_buffer', name: '脂肪缓冲层', description: '皮下脂肪', polarity: 'DEFENSE',
        baseCost: 8, costPerRank: 1, maxRank: 5, rarity: 'COMMON',
        stats: [{ stat: 'hp', value: 0.075 }], statGrowth: 1
    },
    'bone_densification': {
        id: 'bone_densification', name: '骨骼致密化', description: '骨骼加固', polarity: 'DEFENSE',
        baseCost: 9, costPerRank: 1, maxRank: 5, rarity: 'RARE',
        stats: [{ stat: 'hp', value: 0.2 }], statGrowth: 1 
    },
    'crystal_membrane': {
        id: 'crystal_membrane', name: '晶体薄膜', description: '牺牲生命换取极大生存率(模拟)', polarity: 'DEFENSE',
        baseCost: 10, costPerRank: 1, maxRank: 5, rarity: 'RARE',
        stats: [{ stat: 'hp', value: 0.15 }], statGrowth: 1
    },

    // B. Muscular Aggression (Attack - Red)
    'adrenal_gland': {
        id: 'adrenal_gland', name: '肾上腺素腺体', description: '激素包', polarity: 'ATTACK',
        baseCost: 10, costPerRank: 1, maxRank: 5, rarity: 'COMMON',
        stats: [{ stat: 'damage', value: 0.275 }], statGrowth: 1
    },
    'twitch_fibers': {
        id: 'twitch_fibers', name: '快缩肌纤维', description: '腿部肌肉强化', polarity: 'ATTACK',
        baseCost: 8, costPerRank: 1, maxRank: 5, rarity: 'COMMON',
        stats: [{ stat: 'attackSpeed', value: 0.1 }], statGrowth: 1
    },
    'serrated_claws': {
        id: 'serrated_claws', name: '锯齿利爪', description: '打磨过的爪子', polarity: 'ATTACK', 
        baseCost: 9, costPerRank: 1, maxRank: 5, rarity: 'COMMON',
        stats: [{ stat: 'critDamage', value: 0.2 }], statGrowth: 1
    },
    'berserk_pituitary': {
        id: 'berserk_pituitary', name: '狂暴脑垂体', description: '牺牲攻速换取极高伤害', polarity: 'ATTACK',
        baseCost: 12, costPerRank: 1, maxRank: 5, rarity: 'RARE',
        stats: [
            { stat: 'damage', value: 0.33 }, 
            { stat: 'attackSpeed', value: -0.05 }
        ], statGrowth: 1
    },
    'cheetah_tendon': {
        id: 'cheetah_tendon', name: '猎豹肌腱', description: '高速移动', polarity: 'ATTACK',
        baseCost: 7, costPerRank: 1, maxRank: 5, rarity: 'COMMON',
        stats: [{ stat: 'speed', value: 0.066 }], statGrowth: 1
    },

    // C. Neural & Elemental (Function - Yellow)
    'compound_eyes': {
        id: 'compound_eyes', name: '复眼阵列', description: '多重视觉感知', polarity: 'FUNCTION',
        baseCost: 9, costPerRank: 1, maxRank: 5, rarity: 'COMMON',
        stats: [{ stat: 'critChance', value: 0.25, isFlat: false }], statGrowth: 1
    },
    'hyper_secretion': {
        id: 'hyper_secretion', name: '过度分泌腺', description: '粘液腺 (模拟额外元素伤)', polarity: 'FUNCTION',
        baseCost: 7, costPerRank: 1, maxRank: 5, rarity: 'COMMON',
        stats: [{ stat: 'elementalDmg', value: 0.15, element: 'TOXIN' }], statGrowth: 1
    },
    'weakpoint_scan': {
        id: 'weakpoint_scan', name: '致命弱点扫描', description: '红外感应', polarity: 'FUNCTION',
        baseCost: 11, costPerRank: 1, maxRank: 5, rarity: 'RARE',
        stats: [
            { stat: 'critChance', value: 0.1 },
            { stat: 'critDamage', value: 0.1 }
        ], statGrowth: 1
    },
    'synaptic_accel': {
        id: 'synaptic_accel', name: '神经加速突触', description: '神经节', polarity: 'FUNCTION',
        baseCost: 8, costPerRank: 1, maxRank: 5, rarity: 'COMMON',
        stats: [
            { stat: 'attackSpeed', value: 0.066 },
            { stat: 'speed', value: 0.033 }
        ], statGrowth: 1
    },

    // D. Elemental (Universal or Function)
    'venom_sac': {
        id: 'venom_sac', name: '毒液囊', description: '物理转毒素', polarity: 'FUNCTION',
        baseCost: 7, costPerRank: 1, maxRank: 5, rarity: 'RARE',
        stats: [{ stat: 'elementalDmg', value: 0.15, element: 'TOXIN' }], statGrowth: 1
    },
    'combustion_lung': {
        id: 'combustion_lung', name: '高热肺叶', description: '物理转火焰', polarity: 'ATTACK',
        baseCost: 7, costPerRank: 1, maxRank: 5, rarity: 'RARE',
        stats: [{ stat: 'elementalDmg', value: 0.15, element: 'FIRE' }], statGrowth: 1
    },
    'cryo_vessels': {
        id: 'cryo_vessels', name: '低温血管', description: '物理转冰霜', polarity: 'DEFENSE',
        baseCost: 7, costPerRank: 1, maxRank: 5, rarity: 'RARE',
        stats: [{ stat: 'elementalDmg', value: 0.15, element: 'ICE' }], statGrowth: 1
    },
    'voltaic_spines': {
        id: 'voltaic_spines', name: '放电棘刺', description: '物理转电击', polarity: 'FUNCTION',
        baseCost: 7, costPerRank: 1, maxRank: 5, rarity: 'RARE',
        stats: [{ stat: 'elementalDmg', value: 0.15, element: 'ELECTRIC' }], statGrowth: 1
    },
    'plague_touch': {
         id: 'plague_touch', name: '瘟疫之触', description: '毒素+触发', polarity: 'FUNCTION',
         baseCost: 9, costPerRank: 1, maxRank: 5, rarity: 'LEGENDARY',
         stats: [{ stat: 'elementalDmg', value: 0.1, element: 'TOXIN' }], statGrowth: 1
    },
    'high_voltage': {
         id: 'high_voltage', name: '高压电容', description: '电击+触发', polarity: 'FUNCTION',
         baseCost: 9, costPerRank: 1, maxRank: 5, rarity: 'LEGENDARY',
         stats: [{ stat: 'elementalDmg', value: 0.1, element: 'ELECTRIC' }], statGrowth: 1
    }
};

export const ELEMENT_COLORS = {
    PHYSICAL: 0xffffff,
    TOXIN: 0x4ade80, // Green
    FIRE: 0xf87171, // Red
    ICE: 0x60a5fa, // Blue
    ELECTRIC: 0xfacc15 // Yellow
};


// ENEMY TEMPLATES
export const HUMAN_STATS: Partial<Record<UnitType, any>> = {
  // 1. Standard Marine: Balanced
  [UnitType.HUMAN_MARINE]: {
    hp: 80, maxHp: 80, damage: 20, range: 200, speed: 0, attackSpeed: 1.2, width: 20, height: 32, color: 0x9ca3af, 
    element: 'PHYSICAL'
  },
  // 2. Riot Guard: Tanky, Short Range, Low Damage
  [UnitType.HUMAN_RIOT]: {
    hp: 250, maxHp: 250, damage: 12, range: 50, speed: 0, attackSpeed: 1.5, width: 30, height: 34, color: 0x1e3a8a,
    element: 'PHYSICAL'
  },
  // 3. Pyro: AoE (Simulated via high fire rate/short range), High Damage
  [UnitType.HUMAN_PYRO]: {
    hp: 120, maxHp: 120, damage: 8, range: 100, speed: 0, attackSpeed: 0.2, width: 24, height: 32, color: 0xea580c,
    element: 'FIRE'
  },
  // 4. Sniper: Glass Cannon, Long Range, Slow Fire
  [UnitType.HUMAN_SNIPER]: {
    hp: 50, maxHp: 50, damage: 90, range: 500, speed: 0, attackSpeed: 4.0, width: 18, height: 30, color: 0x166534,
    element: 'PHYSICAL', critChance: 0.5, critDamage: 2.5
  },
  // 5. Mech/Tank: Boss, Huge HP, AoE
  [UnitType.HUMAN_TANK]: {
    hp: 1200, maxHp: 1200, damage: 50, range: 250, speed: 0, attackSpeed: 2.0, width: 50, height: 60, color: 0x475569,
    element: 'ELECTRIC'
  }
};

export const INITIAL_REGIONS_CONFIG: RegionData[] = [
  { 
      id: 1, name: "第七区贫民窟", x: 10, y: 50, difficultyMultiplier: 1.0, devourProgress: 0, isUnlocked: true, isFighting: false,
      spawnTable: [
          { type: UnitType.HUMAN_MARINE, weight: 1.0 }
      ]
  },
  { 
      id: 2, name: "工业污染区", x: 25, y: 30, difficultyMultiplier: 1.2, devourProgress: 0, isUnlocked: false, isFighting: false,
      spawnTable: [
          { type: UnitType.HUMAN_MARINE, weight: 0.7 },
          { type: UnitType.HUMAN_PYRO, weight: 0.3 }
      ]
  },
  { 
      id: 3, name: "地下铁枢纽", x: 30, y: 70, difficultyMultiplier: 1.3, devourProgress: 0, isUnlocked: false, isFighting: false,
      spawnTable: [
          { type: UnitType.HUMAN_MARINE, weight: 0.5 },
          { type: UnitType.HUMAN_RIOT, weight: 0.5 }
      ]
  },
  { 
      id: 4, name: "中央公园", x: 45, y: 50, difficultyMultiplier: 1.5, devourProgress: 0, isUnlocked: false, isFighting: false,
      spawnTable: [
          { type: UnitType.HUMAN_MARINE, weight: 0.4 },
          { type: UnitType.HUMAN_RIOT, weight: 0.3 },
          { type: UnitType.HUMAN_SNIPER, weight: 0.3 }
      ]
  },
  { 
      id: 5, name: "99号高速公路", x: 55, y: 20, difficultyMultiplier: 1.8, devourProgress: 0, isUnlocked: false, isFighting: false,
      spawnTable: [
          { type: UnitType.HUMAN_RIOT, weight: 0.4 },
          { type: UnitType.HUMAN_PYRO, weight: 0.4 },
          { type: UnitType.HUMAN_MARINE, weight: 0.2 }
      ]
  },
  { 
      id: 6, name: "生物实验室", x: 60, y: 80, difficultyMultiplier: 2.0, devourProgress: 0, isUnlocked: false, isFighting: false,
      spawnTable: [
          { type: UnitType.HUMAN_MARINE, weight: 0.5 },
          { type: UnitType.HUMAN_SNIPER, weight: 0.4 },
          { type: UnitType.HUMAN_TANK, weight: 0.1 }
      ]
  },
  { 
      id: 7, name: "军事前哨站", x: 75, y: 40, difficultyMultiplier: 2.5, devourProgress: 0, isUnlocked: false, isFighting: false,
      spawnTable: [
          { type: UnitType.HUMAN_RIOT, weight: 0.3 },
          { type: UnitType.HUMAN_TANK, weight: 0.2 },
          { type: UnitType.HUMAN_MARINE, weight: 0.5 }
      ]
  },
  { 
      id: 8, name: "内城区", x: 80, y: 65, difficultyMultiplier: 3.0, devourProgress: 0, isUnlocked: false, isFighting: false,
      spawnTable: [
          { type: UnitType.HUMAN_PYRO, weight: 0.4 },
          { type: UnitType.HUMAN_TANK, weight: 0.3 },
          { type: UnitType.HUMAN_SNIPER, weight: 0.3 }
      ]
  },
  { 
      id: 9, name: "联合指挥中心", x: 90, y: 50, difficultyMultiplier: 4.0, devourProgress: 0, isUnlocked: false, isFighting: false,
      spawnTable: [
          { type: UnitType.HUMAN_TANK, weight: 0.6 },
          { type: UnitType.HUMAN_RIOT, weight: 0.4 }
      ]
  },
  { 
      id: 10, name: "最后的方舟", x: 95, y: 20, difficultyMultiplier: 5.0, devourProgress: 0, isUnlocked: false, isFighting: false,
      spawnTable: [
          { type: UnitType.HUMAN_MARINE, weight: 0.1 },
          { type: UnitType.HUMAN_RIOT, weight: 0.1 },
          { type: UnitType.HUMAN_PYRO, weight: 0.1 },
          { type: UnitType.HUMAN_SNIPER, weight: 0.1 },
          { type: UnitType.HUMAN_TANK, weight: 0.6 }
      ]
  },
];

export const INITIAL_GAME_STATE: GameSaveData = {
    resources: { biomass: 200, minerals: 50, larva: 3, dna: 0, mutagen: 0 },
    hive: {
        unlockedUnits: {
            [UnitType.MELEE]: { id: UnitType.MELEE, level: 1, loadout: [null, null, null, null, null] },
            [UnitType.RANGED]: { id: UnitType.RANGED, level: 1, loadout: [null, null, null, null, null] },
            // Humans (Placeholder)
            [UnitType.HUMAN_MARINE]: { id: UnitType.HUMAN_MARINE, level: 0, loadout: [] },
            [UnitType.HUMAN_RIOT]: { id: UnitType.HUMAN_RIOT, level: 0, loadout: [] },
            [UnitType.HUMAN_PYRO]: { id: UnitType.HUMAN_PYRO, level: 0, loadout: [] },
            [UnitType.HUMAN_SNIPER]: { id: UnitType.HUMAN_SNIPER, level: 0, loadout: [] },
            [UnitType.HUMAN_TANK]: { id: UnitType.HUMAN_TANK, level: 0, loadout: [] },
        },
        unitStockpile: {
            [UnitType.MELEE]: 10, // Start with some units
            [UnitType.RANGED]: 5,
            [UnitType.HUMAN_MARINE]: 0,
            [UnitType.HUMAN_RIOT]: 0,
            [UnitType.HUMAN_PYRO]: 0,
            [UnitType.HUMAN_SNIPER]: 0,
            [UnitType.HUMAN_TANK]: 0,
        },
        production: {
            spawnRateLevel: 1,
            populationCapBase: 200, // Reservoir capacity
            larvaCapBase: 10,       // Larva capacity
            unitWeights: { 
                [UnitType.MELEE]: 0.7, 
                [UnitType.RANGED]: 0.3,
                [UnitType.HUMAN_MARINE]: 0,
                [UnitType.HUMAN_RIOT]: 0,
                [UnitType.HUMAN_PYRO]: 0,
                [UnitType.HUMAN_SNIPER]: 0,
                [UnitType.HUMAN_TANK]: 0,
            },
        },
        metabolism: { 
            passiveGenLevel: 1, 
            recycleLevel: 1, 
            storageLevel: 1,
            larvaGenLevel: 1,
            maxSupplyLevel: 1,
        },
        inventory: { 
            consumables: {}, 
            plugins: [
                // Starter Plugins
                { instanceId: 'starter_1', templateId: 'chitin_growth', rank: 0 },
                { instanceId: 'starter_2', templateId: 'adrenal_gland', rank: 0 },
                { instanceId: 'starter_3', templateId: 'twitch_fibers', rank: 0 }
            ] 
        },
        globalBuffs: []
    },
    world: {
        currentRegionId: 1,
        regions: { 1: { id: 1, isUnlocked: true, devourProgress: 0 } }
    },
    player: {
        lastSaveTime: Date.now(),
        prestigeLevel: 0,
        settings: { bgmVolume: 1, sfxVolume: 1 }
    }
};