
import { UnitType, UnitConfig, RegionData, GameSaveData, Faction, BioPluginConfig, Polarity, ElementType } from './types';

export const SCREEN_PADDING = 100;
export const LANE_Y = 0; 
export const FLOOR_Y = 100;
export const LANE_HEIGHT = 180; 
export const DECAY_TIME = 2.0; 
export const COLLISION_BUFFER = 10;
export const MILESTONE_DISTANCE = 1500;

// Caps and Rates
export const MAX_RESOURCES_BASE = 2000000; 
export const INITIAL_LARVA_CAP = 1000;
export const RESOURCE_TICK_RATE_BASE = 15; 
export const MINERAL_TICK_RATE_BASE = 5;   
export const UNIT_UPGRADE_COST_BASE = 100;
export const MAX_SCREEN_UNITS = 50; // Increased for swarm feel
export const RECYCLE_REFUND_RATE = 0.8; 

// UPGRADE COSTS
export const CAP_UPGRADE_BASE = 50;
export const EFFICIENCY_UPGRADE_BASE = 100;
export const QUEEN_UPGRADE_BASE = 200;

// --- STATUS CONSTANTS ---
export const STATUS_CONFIG = {
    MAX_STACKS: 100,
    DECAY_RATE: 15, // Stacks lost per second
    THRESHOLD_BURNING: 100,
    THRESHOLD_FROZEN: 100,
    THRESHOLD_SHOCK: 50,
    DOT_INTERVAL: 0.5, // Seconds between DoT ticks
    ARMOR_BREAK_DURATION: 999, // Effectively permanent until death
};

// METABOLISM FACILITIES
export const METABOLISM_FACILITIES = {
    // TIER 1: MATTER (Organic Sludge/Biomass)
    VILLI: {
        NAME: "菌毯绒毛 (Villi)",
        DESC: "最基础的吸收单元。每100个使产出+25%。",
        BASE_COST: 15,
        GROWTH: 1.07,
        BASE_RATE: 1.0,
        COST_RESOURCE: 'biomass'
    },
    TAPROOT: {
        NAME: "深钻根须 (Taproot)",
        DESC: "共生供养：每根须使所有绒毛基础产出 +0.1。",
        BASE_COST: 500, 
        GROWTH: 1.10,
        BASE_RATE: 12.0,
        BONUS_TO_VILLI: 0.1,
        COST_RESOURCE: 'biomass'
    },
    GEYSER: {
        NAME: "酸蚀喷泉 (Acid Geyser)",
        DESC: "解锁智能代谢（自动化）的阈值设施。",
        BASE_COST: 12000, 
        GROWTH: 1.12,
        BASE_RATE: 85.0,
        COST_RESOURCE: 'biomass'
    },
    BREAKER: {
        NAME: "地壳破碎机 (Crust Breaker)",
        DESC: "震荡过载：极高产出，但导致 0.05% 原浆流失。",
        BASE_COST: 150000,
        GROWTH: 1.15,
        BASE_RATE: 650.0,
        LOSS_RATE: 0.0005, 
        COST_RESOURCE: 'biomass'
    },
    // TIER 2: ENERGY (Enzymes)
    SAC: {
        NAME: "发酵囊 (Fermentation Sac)",
        DESC: "时间墙：转化原浆为活性酶。受吞吐量限制。",
        BASE_COST: 10000, 
        GROWTH: 1.15,
        INPUT: 100, 
        OUTPUT: 1,  
        COST_RESOURCE: 'biomass'
    },
    PUMP: {
        NAME: "回流泵 (Reflux Pump)",
        DESC: "解决饥荒：每级降低发酵囊 2 原浆消耗。",
        BASE_COST: 2500, 
        GROWTH: 1.15,
        COST_REDUCTION: 2,
        MIN_COST: 50,
        COST_RESOURCE: 'enzymes'
    },
    CRACKER: {
        NAME: "热能裂解堆 (Thermal Cracker)",
        DESC: "过热熔毁：500 Bio -> 15 Enz。产生热量。",
        BASE_COST: 25000, 
        GROWTH: 1.20,
        INPUT: 500,
        OUTPUT: 15,
        HEAT_GEN: 5, 
        COOL_RATE: 10, 
        COST_RESOURCE: 'enzymes'
    },
    BOILER: {
        NAME: "血肉锅炉 (Flesh Boiler)",
        DESC: "后期循环：消耗 1 幼虫 -> 500 酶。",
        BASE_COST: 100000, 
        GROWTH: 1.25,
        INPUT_LARVA: 1,
        OUTPUT_ENZ: 500,
        COST_RESOURCE: 'enzymes'
    },
    // TIER 3: DATA (DNA/Helix)
    SPIRE: {
        NAME: "神经尖塔 (Neural Spire)",
        DESC: "离散掉落：极慢速解析基因序列。",
        BASE_COST: 5000, 
        GROWTH: 1.25,
        BASE_RATE: 0.005, 
        COST_RESOURCE: 'enzymes'
    },
    HIVE_MIND: {
        NAME: "虫群意识网 (Hive Mind)",
        DESC: "人口红利：基于总兵力计算。产出 = √总兵力",
        BASE_COST: 50000, 
        GROWTH: 1.30,
        COST_RESOURCE: 'enzymes'
    },
    RECORDER: {
        NAME: "阿卡西记录 (Akashic Recorder)",
        DESC: "量子观测：尖塔产出时，15% 概率获得当前总量 1%。",
        BASE_COST: 250000, 
        GROWTH: 1.50,
        CHANCE: 0.15,
        PERCENT: 0.01,
        COST_RESOURCE: 'enzymes'
    },
    // INFRA
    STORAGE: {
        NAME: "能量泵 (Storage)",
        DESC: "增加资源存储上限。",
        BASE_COST: 100,
        GROWTH: 1.5,
        CAP_PER_LEVEL: 5000,
        COST_RESOURCE: 'biomass'
    },
    SUPPLY: {
        NAME: "突触网络 (Supply)",
        DESC: "提升兵力储备上限。",
        BASE_COST: 250,
        GROWTH: 1.5,
        CAP_PER_LEVEL: 50,
        COST_RESOURCE: 'biomass'
    }
};

// --- CONFIG TABLES ---

export const PLAYABLE_UNITS = [UnitType.MELEE, UnitType.RANGED, UnitType.QUEEN];

export const UNIT_CONFIGS: Record<UnitType, UnitConfig> = {
  [UnitType.MELEE]: {
    id: UnitType.MELEE,
    name: '跳虫 (Zergling)',
    baseStats: {
        hp: 60,
        damage: 15,
        range: 30,
        speed: 180,
        attackSpeed: 0.4,
        width: 24,
        height: 24,
        color: 0x3b82f6,
        armor: 0
    },
    baseCost: { biomass: 15, minerals: 5, larva: 1, dna: 0, time: 2.0 },
    growthFactors: { hp: 0.2, damage: 0.2 },
    baseLoadCapacity: 30,
    slots: [{ polarity: 'ATTACK' }, { polarity: 'DEFENSE' }, { polarity: 'ATTACK' }, { polarity: 'FUNCTION' }, { polarity: 'UNIVERSAL' }],
    elementConfig: { type: 'PHYSICAL' }
  },
  [UnitType.RANGED]: {
    id: UnitType.RANGED,
    name: '刺蛇 (Hydralisk)',
    baseStats: {
        hp: 45,
        damage: 30,
        range: 220,
        speed: 130,
        attackSpeed: 1.0,
        width: 20,
        height: 30,
        color: 0x8b5cf6,
        armor: 5
    },
    baseCost: { biomass: 25, minerals: 15, larva: 1, dna: 0, time: 4.0 },
    growthFactors: { hp: 0.15, damage: 0.25 },
    baseLoadCapacity: 30,
    slots: [{ polarity: 'ATTACK' }, { polarity: 'DEFENSE' }, { polarity: 'FUNCTION' }, { polarity: 'FUNCTION' }, { polarity: 'UNIVERSAL' }],
    elementConfig: { type: 'TOXIN', statusPerHit: 10 }
  },
  [UnitType.QUEEN]: {
    id: UnitType.QUEEN,
    name: '虫后 (Queen)',
    baseStats: {
        hp: 300,
        damage: 10,
        range: 100,
        speed: 50,
        attackSpeed: 1.0,
        width: 32,
        height: 48,
        color: 0xd946ef, 
        armor: 20
    },
    baseCost: { biomass: 150, minerals: 50, larva: 1, dna: 5, time: 10.0 },
    growthFactors: { hp: 0.1, damage: 0.1 },
    baseLoadCapacity: 50,
    slots: [{ polarity: 'UNIVERSAL' }, { polarity: 'FUNCTION' }, { polarity: 'DEFENSE' }]
  },
  // Humans
  [UnitType.HUMAN_MARINE]: {
      id: UnitType.HUMAN_MARINE,
      name: '步枪兵 (Marine)',
      baseStats: { hp: 80, damage: 15, range: 200, speed: 0, attackSpeed: 1.0, width: 20, height: 32, color: 0x9ca3af, armor: 10 },
      baseCost: {} as any, growthFactors: {} as any, slots: [], baseLoadCapacity: 0,
      elementConfig: { type: 'PHYSICAL' }
  },
  [UnitType.HUMAN_RIOT]: {
      id: UnitType.HUMAN_RIOT,
      name: '防暴盾卫 (Riot)',
      baseStats: { hp: 300, damage: 10, range: 50, speed: 0, attackSpeed: 1.5, width: 30, height: 34, color: 0x1e3a8a, armor: 50 },
      baseCost: {} as any, growthFactors: {} as any, slots: [], baseLoadCapacity: 0,
      elementConfig: { type: 'PHYSICAL' }
  },
  [UnitType.HUMAN_PYRO]: {
      id: UnitType.HUMAN_PYRO,
      name: '火焰兵 (Pyro)',
      baseStats: { hp: 150, damage: 5, range: 120, speed: 0, attackSpeed: 0.1, width: 24, height: 32, color: 0xea580c, armor: 20 },
      baseCost: {} as any, growthFactors: {} as any, slots: [], baseLoadCapacity: 0,
      elementConfig: { type: 'THERMAL', statusPerHit: 4 } // High tick rate means fast stacking
  },
  [UnitType.HUMAN_SNIPER]: {
      id: UnitType.HUMAN_SNIPER,
      name: '狙击手 (Sniper)',
      baseStats: { hp: 60, damage: 100, range: 500, speed: 0, attackSpeed: 3.5, width: 18, height: 30, color: 0x166534, armor: 5 },
      baseCost: {} as any, growthFactors: {} as any, slots: [], baseLoadCapacity: 0,
      elementConfig: { type: 'PHYSICAL' }
  },
  [UnitType.HUMAN_TANK]: {
      id: UnitType.HUMAN_TANK,
      name: '步行机甲 (Mech)',
      baseStats: { hp: 1500, damage: 60, range: 250, speed: 0, attackSpeed: 2.0, width: 50, height: 60, color: 0x475569, armor: 80 },
      baseCost: {} as any, growthFactors: {} as any, slots: [], baseLoadCapacity: 0,
      elementConfig: { type: 'VOLTAIC', statusPerHit: 25 }
  }
};

export const BIO_PLUGINS: Record<string, BioPluginConfig> = {
    'chitin_growth': {
        id: 'chitin_growth', name: '几丁质增生', description: '硬化甲壳', polarity: 'DEFENSE',
        baseCost: 6, costPerRank: 1, maxRank: 5, rarity: 'COMMON',
        stats: [{ stat: 'hp', value: 0.2 }], statGrowth: 1 
    },
    'toxin_sac': {
        id: 'toxin_sac', name: '腐蚀腺体', description: '攻击附带剧毒', polarity: 'ATTACK',
        baseCost: 8, costPerRank: 2, maxRank: 5, rarity: 'COMMON',
        stats: [{ stat: 'elementalDmg', value: 5, element: 'TOXIN', isFlat: true }], statGrowth: 0.5 
    },
    'pyro_gland': {
        id: 'pyro_gland', name: '放热腺体', description: '攻击附带热能灼烧', polarity: 'ATTACK',
        baseCost: 12, costPerRank: 2, maxRank: 5, rarity: 'RARE',
        stats: [{ stat: 'elementalDmg', value: 3, element: 'THERMAL', isFlat: true }], statGrowth: 0.5
    },
    'metabolic_boost': {
        id: 'metabolic_boost', name: '代谢加速', description: '移动速度提升', polarity: 'FUNCTION',
        baseCost: 5, costPerRank: 1, maxRank: 3, rarity: 'COMMON',
        stats: [{ stat: 'speed', value: 0.15 }], statGrowth: 0.5
    },
    'adrenal_surge': {
        id: 'adrenal_surge', name: '肾上腺激增', description: '攻速大幅提升，但降低防御', polarity: 'ATTACK',
        baseCost: 15, costPerRank: 3, maxRank: 5, rarity: 'RARE',
        stats: [{ stat: 'attackSpeed', value: 0.25 }, { stat: 'hp', value: -0.1 }], statGrowth: 0.2
    }
};
export { BIO_PLUGINS as EXISTING_PLUGINS } from './constants'; 

export const ELEMENT_COLORS: Record<ElementType, number> = {
    PHYSICAL: 0xffffff,
    TOXIN: 0x4ade80,   // Green
    THERMAL: 0xf87171, // Red/Orange
    CRYO: 0x60a5fa,    // Blue
    VOLTAIC: 0xfacc15  // Yellow
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
    resources: { biomass: 50, minerals: 0, enzymes: 0, larva: 1000, dna: 0, mutagen: 0 },
    hive: {
        unlockedUnits: {
            [UnitType.MELEE]: { 
                id: UnitType.MELEE, level: 1, loadout: [null, null, null, null, null],
                cap: 100, capLevel: 1, efficiencyLevel: 1, isProducing: true, productionProgress: 0
            },
            [UnitType.RANGED]: { 
                id: UnitType.RANGED, level: 1, loadout: [null, null, null, null, null],
                cap: 50, capLevel: 1, efficiencyLevel: 1, isProducing: false, productionProgress: 0
            },
            [UnitType.QUEEN]: { 
                id: UnitType.QUEEN, level: 1, loadout: [null, null, null],
                cap: 5, capLevel: 1, efficiencyLevel: 1, isProducing: false, productionProgress: 0
            },
            
            [UnitType.HUMAN_MARINE]: { id: UnitType.HUMAN_MARINE, level: 0, loadout: [], cap:0, capLevel:0, efficiencyLevel:0, isProducing:false, productionProgress:0 },
            [UnitType.HUMAN_RIOT]: { id: UnitType.HUMAN_RIOT, level: 0, loadout: [], cap:0, capLevel:0, efficiencyLevel:0, isProducing:false, productionProgress:0 },
            [UnitType.HUMAN_PYRO]: { id: UnitType.HUMAN_PYRO, level: 0, loadout: [], cap:0, capLevel:0, efficiencyLevel:0, isProducing:false, productionProgress:0 },
            [UnitType.HUMAN_SNIPER]: { id: UnitType.HUMAN_SNIPER, level: 0, loadout: [], cap:0, capLevel:0, efficiencyLevel:0, isProducing:false, productionProgress:0 },
            [UnitType.HUMAN_TANK]: { id: UnitType.HUMAN_TANK, level: 0, loadout: [], cap:0, capLevel:0, efficiencyLevel:0, isProducing:false, productionProgress:0 },
        },
        unitStockpile: {
            [UnitType.MELEE]: 10, 
            [UnitType.RANGED]: 0,
            [UnitType.QUEEN]: 1, 
            [UnitType.HUMAN_MARINE]: 0,
            [UnitType.HUMAN_RIOT]: 0,
            [UnitType.HUMAN_PYRO]: 0,
            [UnitType.HUMAN_SNIPER]: 0,
            [UnitType.HUMAN_TANK]: 0,
        },
        production: {
            larvaCapBase: 1000,
            queenIntervalLevel: 1,
            queenAmountLevel: 1,
            queenTimer: 0
        },
        metabolism: {
            villiCount: 1, 
            taprootCount: 0,
            geyserCount: 0,
            breakerCount: 0,
            fermentingSacCount: 0,
            refluxPumpCount: 0,
            thermalCrackerCount: 0,
            fleshBoilerCount: 0,
            crackerHeat: 0,
            crackerOverheated: false,
            thoughtSpireCount: 0,
            hiveMindCount: 0,
            akashicRecorderCount: 0,
            spireAccumulator: 0,
            storageCount: 0,
            supplyCount: 0
        },
        inventory: { 
            consumables: {}, 
            plugins: [
                { instanceId: 'starter_1', templateId: 'chitin_growth', rank: 0 },
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
