
export enum Faction {
  ZERG = 'ZERG',
  HUMAN = 'HUMAN',
}

export enum UnitType {
  // Zerg Units
  MELEE = 'MELEE',
  RANGED = 'RANGED',
  QUEEN = 'QUEEN', // New Production Unit

  // Human Units
  HUMAN_MARINE = 'HUMAN_MARINE',      // 标准步枪兵
  HUMAN_RIOT = 'HUMAN_RIOT',          // 防暴盾卫 (高防)
  HUMAN_PYRO = 'HUMAN_PYRO',          // 火焰兵 (近距离高伤)
  HUMAN_SNIPER = 'HUMAN_SNIPER',      // 狙击手 (超远距离)
  HUMAN_TANK = 'HUMAN_TANK',          // 步行机甲 (Boss级)
}

export enum HiveSection {
  HYPERTROPHY = 'HYPERTROPHY',
  GRAFTING = 'GRAFTING',
  SEQUENCE = 'SEQUENCE',
  METABOLISM = 'METABOLISM',
  BIRTHING = 'BIRTHING',
  GLANDULAR = 'GLANDULAR',
  PLAGUE = 'PLAGUE',
}

// --- CONFIG DATA (Static) ---

export type Polarity = 'ATTACK' | 'DEFENSE' | 'FUNCTION' | 'UNIVERSAL';

export interface UnitConfig {
    id: UnitType;
    name: string;
    baseStats: {
        hp: number;
        damage: number;
        range: number;
        speed: number;
        attackSpeed: number;
        width: number;
        height: number;
        color: number;
    };
    cost: {
        biomass: number;
        minerals: number;
        larva: number;
    };
    growthFactors: {
        hp: number;
        damage: number;
    };
    // Grafting Slots Configuration
    slots: {
        polarity: Polarity;
    }[];
    baseLoadCapacity: number;
}

export interface PluginStatModifier {
    stat: 'hp' | 'damage' | 'speed' | 'attackSpeed' | 'critChance' | 'critDamage' | 'elementalDmg';
    value: number; // The scalar value. Logic: Final = Value * (1 + rank) usually, or simple scaling.
    isFlat?: boolean; // If true, adds directly (e.g. +10 HP). Default false (percentage).
    element?: 'PHYSICAL' | 'TOXIN' | 'FIRE' | 'ICE' | 'ELECTRIC';
}

export interface BioPluginConfig {
    id: string;
    name: string;
    description: string;
    polarity: Polarity;
    baseCost: number; // Load cost at rank 0
    costPerRank: number;
    maxRank: number;
    rarity: 'COMMON' | 'RARE' | 'LEGENDARY';
    stats: PluginStatModifier[];
    statGrowth: number; // Multiplier logic. For simplicity: TotalValue = baseValue * (1 + rank * statGrowth)
}

// --- SAVE DATA (Dynamic) ---

export interface Resources {
    biomass: number;
    minerals: number; // New: High tier resource
    larva: number;    // New: Production limiter
    dna: number;
    mutagen: number;
}

export interface PluginInstance {
    instanceId: string;
    templateId: string;
    rank: number;
}

export interface UnitState {
    id: UnitType;
    level: number;
    // Array of instanceIds. Null means empty slot.
    loadout: (string | null)[];
}

export interface HiveState {
    unlockedUnits: Record<UnitType, UnitState>; 
    
    // The Reservoir Model Data
    unitStockpile: Record<UnitType, number>; // Ready-to-deploy units
    
    production: {
        spawnRateLevel: number;
        populationCapBase: number; // DEPRECATED: Now calculated from maxSupplyLevel
        larvaCapBase: number;      // Max larva count
        unitWeights: Record<UnitType, number>; // Normalized 0-1
    };
    metabolism: {
        // New Organ System
        miningLevel: number;     // Minerals Gen
        digestLevel: number;     // Minerals -> Bio
        centrifugeLevel: number; // Bio -> DNA
        hiveCoreLevel: number;   // Bio -> Larva Base
        
        storageLevel: number;
        maxSupplyLevel: number;
        
        // Deprecated fields kept for type safety during migration
        passiveGenLevel?: number;
        recycleLevel?: number;
        larvaGenLevel?: number;
    };
    inventory: {
        consumables: Record<string, number>;
        plugins: PluginInstance[];
    };
    globalBuffs: string[];
}

export interface RegionState {
    id: number;
    isUnlocked: boolean;
    devourProgress: number; // 0 to 100
}

export interface WorldState {
    currentRegionId: number;
    regions: Record<number, RegionState>;
}

export interface PlayerProfile {
    lastSaveTime: number;
    prestigeLevel: number;
    settings: {
        bgmVolume: number;
        sfxVolume: number;
    };
}

export interface GameSaveData {
    resources: Resources;
    hive: HiveState;
    world: WorldState;
    player: PlayerProfile;
}

// --- DTOs ---

export interface UnitRuntimeStats {
    hp: number;
    maxHp: number;
    damage: number;
    range: number;
    speed: number;
    attackSpeed: number;
    width: number;
    height: number;
    color: number;
    
    // Advanced Stats
    critChance: number;
    critDamage: number;
    element: 'PHYSICAL' | 'TOXIN' | 'FIRE' | 'ICE' | 'ELECTRIC';
}

export interface RoguelikeCard {
    id: string;
    name: string;
    description: string;
    rarity: 'COMMON' | 'RARE' | 'LEGENDARY';
    apply: (mods: GameModifiers) => void;
}

export interface GameModifiers {
    damageMultiplier: number;
    maxHpMultiplier: number;
    resourceRateMultiplier: number;
    explodeOnDeath: boolean;
    doubleSpawnChance: number;
}

export interface GameStateSnapshot {
    resources: number; // Legacy biomass display
    distance: number;
    unitCountZerg: number;
    unitCountHuman: number;
    
    // New stats for HUD
    stockpileMelee: number;
    stockpileRanged: number;
    stockpileTotal: number;
    populationCap: number;
    
    isPaused: boolean;
}

export interface EnemySpawnConfig {
    type: UnitType;
    weight: number; // 0.1 to 1.0 relative chance
}

export interface RegionData {
  id: number;
  name: string;
  x: number; 
  y: number; 
  difficultyMultiplier: number;
  spawnTable?: EnemySpawnConfig[]; // Defines which enemies spawn here
  
  // Merged state properties for UI convenience
  devourProgress: number;
  isUnlocked: boolean;
  isFighting: boolean;
}
