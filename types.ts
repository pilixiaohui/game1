
export enum Faction {
  ZERG = 'ZERG',
  HUMAN = 'HUMAN',
}

export enum UnitType {
  // Zerg Units
  MELEE = 'MELEE',
  RANGED = 'RANGED',
  QUEEN = 'QUEEN', // The actual unit that can fight

  // Human Units
  HUMAN_MARINE = 'HUMAN_MARINE',      // 标准步枪兵
  HUMAN_RIOT = 'HUMAN_RIOT',          // 防暴盾卫 (高防)
  HUMAN_PYRO = 'HUMAN_PYRO',          // 火焰兵 (近距离高伤)
  HUMAN_SNIPER = 'HUMAN_SNIPER',      // 狙击手 (超远距离)
  HUMAN_TANK = 'HUMAN_TANK',          // 步行机甲 (Boss级)
}

export enum HiveSection {
  EVOLUTION = 'EVOLUTION', // Formerly HYPERTROPHY
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
    baseCost: {
        biomass: number;
        minerals: number;
        larva: number;
        dna: number;
        time: number; // Seconds to produce
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
    value: number; 
    isFlat?: boolean; 
    element?: 'PHYSICAL' | 'TOXIN' | 'FIRE' | 'ICE' | 'ELECTRIC';
}

export interface BioPluginConfig {
    id: string;
    name: string;
    description: string;
    polarity: Polarity;
    baseCost: number; 
    costPerRank: number;
    maxRank: number;
    rarity: 'COMMON' | 'RARE' | 'LEGENDARY';
    stats: PluginStatModifier[];
    statGrowth: number; 
}

// --- SAVE DATA (Dynamic) ---

export interface Resources {
    biomass: number; // Organic Sludge
    minerals: number; 
    enzymes: number; // New: Energy Layer
    larva: number;    
    dna: number;     // Helix Sequence
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
    
    // PRODUCTION STATE
    cap: number;          // Current max limit for this unit
    capLevel: number;     // Level of Cap Upgrade
    efficiencyLevel: number; // Level of Cost Reduction
    isProducing: boolean; // Toggle switch
    productionProgress: number; // 0 to 1
}

export interface HiveState {
    unlockedUnits: Record<UnitType, UnitState>; 
    
    // The Reservoir Model Data
    unitStockpile: Record<UnitType, number>; // Ready-to-deploy units
    
    production: {
        larvaCapBase: number;      
        
        // Queen Logic
        queenIntervalLevel: number; // Reduces time between larva spawns
        queenAmountLevel: number;   // Increases larva per spawn
        queenTimer: number;         // Runtime timer
    };
    
    // New Metabolism Structure (v1.3 Design)
    metabolism: {
        // TIER 1: MATTER
        villiCount: number;
        taprootCount: number;
        geyserCount: number;
        breakerCount: number;

        // TIER 2: ENERGY
        fermentingSacCount: number;
        refluxPumpCount: number;
        thermalCrackerCount: number;
        fleshBoilerCount: number; // New
        
        // Cracker Runtime State
        crackerHeat: number; // 0 to 100
        crackerOverheated: boolean;

        // TIER 3: DATA
        thoughtSpireCount: number;
        hiveMindCount: number;
        akashicRecorderCount: number; // New
        
        // Accumulators for discrete drops
        spireAccumulator: number;

        // Infrastructure
        storageCount: number;
        supplyCount: number;
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
    devourProgress: number; 
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
    resources: number; 
    distance: number;
    unitCountZerg: number;
    unitCountHuman: number;
    
    stockpileMelee: number;
    stockpileRanged: number;
    stockpileTotal: number;
    populationCap: number; // Calculated dynamically
    
    isPaused: boolean;
}

export interface EnemySpawnConfig {
    type: UnitType;
    weight: number; 
}

export interface RegionData {
  id: number;
  name: string;
  x: number; 
  y: number; 
  difficultyMultiplier: number;
  spawnTable?: EnemySpawnConfig[]; 
  
  devourProgress: number;
  isUnlocked: boolean;
  isFighting: boolean;
}
