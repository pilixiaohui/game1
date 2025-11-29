
export enum Faction {
  ZERG = 'ZERG',
  HUMAN = 'HUMAN',
}

export enum UnitType {
  // Zerg Units
  MELEE = 'MELEE',
  RANGED = 'RANGED',
  QUEEN = 'QUEEN',
  
  // --- NEW: Elemental Units ---
  PYROVORE = 'PYROVORE', // Thermal Artillery
  CRYOLISK = 'CRYOLISK', // Cryo Assassin
  OMEGALIS = 'OMEGALIS', // Voltaic Tank

  // Human Units
  HUMAN_MARINE = 'HUMAN_MARINE',      // Kinetic / Ballistic
  HUMAN_RIOT = 'HUMAN_RIOT',          // Kinetic / High Armor
  HUMAN_PYRO = 'HUMAN_PYRO',          // Thermal
  HUMAN_SNIPER = 'HUMAN_SNIPER',      // Kinetic / High Crit
  HUMAN_TANK = 'HUMAN_TANK',          // Voltaic / Heavy
}

export enum HiveSection {
  EVOLUTION = 'EVOLUTION',
  GRAFTING = 'GRAFTING',
  SEQUENCE = 'SEQUENCE',
  METABOLISM = 'METABOLISM',
  BIRTHING = 'BIRTHING',
  GLANDULAR = 'GLANDULAR',
  PLAGUE = 'PLAGUE',
}

// --- CORE ELEMENTAL SYSTEM (White Paper v1.3) ---

export type ElementType = 'PHYSICAL' | 'THERMAL' | 'CRYO' | 'VOLTAIC' | 'TOXIN';

export type StatusType = 
    | 'BURNING'      // Thermal DoT
    | 'FROZEN'       // Cryo Slow/Stop
    | 'SHOCKED'      // Voltaic Stun
    | 'POISONED'     // Toxin DoT
    | 'ARMOR_BROKEN' // Defense reduced
    | 'STUNNED';     // General inability to act

export interface StatusEffect {
    type: StatusType;
    stacks: number;      // 0 to 100 (Threshold)
    duration: number;    // Time remaining in seconds
    decayAccumulator?: number; // For stable decay
    sourceId?: number;   // ID of the unit that applied it
}

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
        armor: number; // New: Physical damage reduction
    };
    baseCost: {
        biomass: number;
        larva: number;
        dna: number;
        time: number;
    };
    growthFactors: {
        hp: number;
        damage: number;
    };
    slots: {
        polarity: Polarity;
    }[];
    baseLoadCapacity: number;
    
    // Elemental Configuration
    elementConfig?: {
        type: ElementType;
        statusPerHit?: number; // How many stacks applied per hit
    };
}

export interface PluginStatModifier {
    stat: 'hp' | 'damage' | 'speed' | 'attackSpeed' | 'critChance' | 'critDamage' | 'elementalDmg';
    value: number; 
    isFlat?: boolean; 
    element?: ElementType;
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
    biomass: number;
    enzymes: number; 
    larva: number;    
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
    loadout: (string | null)[];
    cap: number;
    capLevel: number;
    efficiencyLevel: number;
    isProducing: boolean;
    productionProgress: number;
}

export interface HiveState {
    unlockedUnits: Record<UnitType, UnitState>; 
    unitStockpile: Record<UnitType, number>;
    production: {
        larvaCapBase: number;      
        queenIntervalLevel: number;
        queenAmountLevel: number; 
        queenTimer: number;
    };
    metabolism: {
        villiCount: number;
        taprootCount: number;
        geyserCount: number;
        breakerCount: number;
        fermentingSacCount: number;
        refluxPumpCount: number;
        thermalCrackerCount: number;
        fleshBoilerCount: number;
        crackerHeat: number; 
        crackerOverheated: boolean;
        thoughtSpireCount: number;
        hiveMindCount: number;
        akashicRecorderCount: number;
        spireAccumulator: number;
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
    armor: number; // Added
    
    critChance: number;
    critDamage: number;
    element: ElementType;
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
    populationCap: number; 
    
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