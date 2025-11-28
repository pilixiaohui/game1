


import { GameSaveData, UnitType, UnitRuntimeStats, Resources, GameModifiers, BioPluginConfig, PluginInstance } from '../types';
import { INITIAL_GAME_STATE, UNIT_CONFIGS, UNIT_UPGRADE_COST_BASE, HATCHERY_PRODUCTION_INTERVAL, RECYCLE_REFUND_RATE, METABOLISM_UPGRADES, MAX_RESOURCES_BASE, BIO_PLUGINS } from '../constants';

// Exported so other files can use the type if needed
export type Listener = (data: any) => void;

export class SimpleEventEmitter {
    private listeners: Record<string, Listener[]> = {};
    
    on(event: string, fn: Listener) {
        if (!this.listeners[event]) this.listeners[event] = [];
        this.listeners[event].push(fn);
    }
    
    off(event: string, fn: Listener) {
        if (!this.listeners[event]) return;
        this.listeners[event] = this.listeners[event].filter(l => l !== fn);
    }
    
    emit(event: string, data?: any) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(fn => fn(data));
        }
    }
}

export class DataManager {
    private static _instance: DataManager;
    
    public state: GameSaveData;
    public events: SimpleEventEmitter;
    private autoSaveInterval: any;
    
    // Hatchery Logic Variables
    private hatcheryTimer: number = 0;

    private constructor() {
        this.events = new SimpleEventEmitter();
        // Initialize with a deep copy of the default state
        this.state = JSON.parse(JSON.stringify(INITIAL_GAME_STATE));
        
        // Attempt to load saved data
        this.loadGame();
        
        // Auto-save every 30s
        this.autoSaveInterval = setInterval(() => this.saveGame(), 30000);
    }

    public static get instance(): DataManager {
        if (!this._instance) {
            this._instance = new DataManager();
        }
        return this._instance;
    }

    // --- Persistence ---

    public saveGame() {
        this.state.player.lastSaveTime = Date.now();
        const json = JSON.stringify(this.state);
        try {
            localStorage.setItem('HIVE_SAVE_DATA', json);
        } catch (e) {
            console.warn("Save failed - Storage might be disabled", e);
        }
    }

    public loadGame() {
        try {
            const json = localStorage.getItem('HIVE_SAVE_DATA');
            if (json) {
                const loaded = JSON.parse(json);
                // Merge loaded state with initial structure safely
                this.state = {
                    ...INITIAL_GAME_STATE,
                    ...loaded,
                    hive: { 
                        ...INITIAL_GAME_STATE.hive, 
                        ...(loaded.hive || {}),
                        unlockedUnits: { ...INITIAL_GAME_STATE.hive.unlockedUnits, ...(loaded.hive?.unlockedUnits || {})},
                        unitStockpile: { ...INITIAL_GAME_STATE.hive.unitStockpile, ...(loaded.hive?.unitStockpile || {}) },
                        production: { ...INITIAL_GAME_STATE.hive.production, ...(loaded.hive?.production || {}) },
                        metabolism: { ...INITIAL_GAME_STATE.hive.metabolism, ...(loaded.hive?.metabolism || {}) },
                        inventory: { 
                            ...INITIAL_GAME_STATE.hive.inventory, 
                            ...(loaded.hive?.inventory || {}),
                            plugins: loaded.hive?.inventory?.plugins || INITIAL_GAME_STATE.hive.inventory.plugins
                        }
                    },
                    world: { ...INITIAL_GAME_STATE.world, ...(loaded.world || {}) },
                    resources: { ...INITIAL_GAME_STATE.resources, ...(loaded.resources || {}) }
                };
                
                // Ensure regions map exists (legacy save fix)
                if (!this.state.world.regions) {
                    this.state.world.regions = INITIAL_GAME_STATE.world.regions;
                }
                
                // Fix missing loadouts from old saves
                Object.keys(this.state.hive.unlockedUnits).forEach(key => {
                     // @ts-ignore
                     const unit = this.state.hive.unlockedUnits[key];
                     if (!unit.loadout) unit.loadout = [null, null, null, null, null];
                });

                // --- MIGRATION: Convert old metabolism to new organ system if needed ---
                const meta = this.state.hive.metabolism;
                if (!meta.miningLevel) meta.miningLevel = meta.passiveGenLevel || 1;
                if (!meta.digestLevel) meta.digestLevel = 1;
                if (!meta.centrifugeLevel) meta.centrifugeLevel = 1;
                if (!meta.hiveCoreLevel) meta.hiveCoreLevel = meta.larvaGenLevel || 1;
                // Init Queen if missing
                if (!this.state.hive.unlockedUnits[UnitType.QUEEN]) {
                    this.state.hive.unlockedUnits[UnitType.QUEEN] = { id: UnitType.QUEEN, level: 1, loadout: [null, null, null] };
                    this.state.hive.production.unitWeights[UnitType.QUEEN] = 0;
                }
                
                this.calculateOfflineProgress();
            }
        } catch (e) {
            console.warn("Load failed - resetting to default", e);
            this.state = JSON.parse(JSON.stringify(INITIAL_GAME_STATE));
        }
    }

    public calculateOfflineProgress() {
        const now = Date.now();
        const last = this.state.player.lastSaveTime || now;
        const diffSeconds = (now - last) / 1000;

        if (diffSeconds > 60) {
            // Simplified offline progress for new chain system
            // We just give 50% of potential mining output to be safe
            // Complex simulation of chain efficiency offline is skipped for prototype
            
            const miningRate = this.state.hive.metabolism.miningLevel * METABOLISM_UPGRADES.MINING.RATE_PER_LEVEL;
            const offlineMinerals = miningRate * diffSeconds * 0.5;
            this.modifyResource('minerals', offlineMinerals);
            
            console.log(`[Offline] Gained approx ${offlineMinerals} minerals.`);
            this.state.resources.larva = this.state.hive.production.larvaCapBase;
        }
        this.state.player.lastSaveTime = now;
    }

    // --- Logic API ---

    public updateTick(dt: number) {
        // 1. Metabolism Chain: Minerals -> Biomass -> DNA / Larva
        this.updateMetabolism(dt);
        
        // 2. Hatchery: Produce Units into Stockpile
        this.updateHatchery(dt);
    }

    public modifyResource(type: keyof Resources, amount: number) {
        this.state.resources[type] += amount;
        
        // Caps
        if (type === 'larva') {
            const max = this.state.hive.production.larvaCapBase;
            if (this.state.resources.larva > max) this.state.resources.larva = max;
        } else if (type === 'biomass' || type === 'minerals') {
            const cap = this.getMaxResourceCap();
            if (this.state.resources[type] > cap) {
                this.state.resources[type] = cap;
            }
        }
        
        if (this.state.resources[type] < 0) this.state.resources[type] = 0;
        
        this.events.emit('RESOURCE_CHANGED', { type, value: this.state.resources[type] });
    }
    
    public getMaxResourceCap(): number {
        const level = this.state.hive.metabolism.storageLevel || 1;
        // Effect: Base + Level * Scaling
        return MAX_RESOURCES_BASE + ((level - 1) * METABOLISM_UPGRADES.STORAGE.CAP_PER_LEVEL);
    }
    
    public getMaxPopulationCap(): number {
        const level = this.state.hive.metabolism.maxSupplyLevel || 1;
        return METABOLISM_UPGRADES.SUPPLY.BASE_CAP + ((level - 1) * METABOLISM_UPGRADES.SUPPLY.CAP_PER_LEVEL);
    }

    public getRecycleRate(): number {
        // Flat 50% for now in new system
        return 0.5;
    }

    private updateMetabolism(dt: number) {
        const meta = this.state.hive.metabolism;
        const res = this.state.resources;
        
        // T0: MINING (Minerals)
        const miningOutput = (meta.miningLevel || 1) * METABOLISM_UPGRADES.MINING.RATE_PER_LEVEL * dt;
        this.modifyResource('minerals', miningOutput);

        // T1: DIGESTION (Minerals -> Biomass)
        const digestInputRate = (meta.digestLevel || 1) * METABOLISM_UPGRADES.DIGESTION.INPUT_RATE;
        const digestOutputRate = (meta.digestLevel || 1) * METABOLISM_UPGRADES.DIGESTION.OUTPUT_RATE;
        
        const mineralsNeeded = digestInputRate * dt;
        let digestEfficiency = 0;
        
        if (res.minerals >= mineralsNeeded) {
            this.modifyResource('minerals', -mineralsNeeded);
            digestEfficiency = 1;
        } else if (res.minerals > 0) {
            digestEfficiency = res.minerals / mineralsNeeded;
            this.modifyResource('minerals', -res.minerals);
        }
        this.modifyResource('biomass', digestOutputRate * dt * digestEfficiency);

        // T2: CENTRIFUGE (Biomass -> DNA)
        // Only run if we have excess biomass (simple logic)
        const centInputRate = (meta.centrifugeLevel || 1) * METABOLISM_UPGRADES.CENTRIFUGE.INPUT_RATE;
        const centOutputRate = (meta.centrifugeLevel || 1) * METABOLISM_UPGRADES.CENTRIFUGE.OUTPUT_RATE;
        
        const bioNeededForCent = centInputRate * dt;
        if (res.biomass >= bioNeededForCent) {
            this.modifyResource('biomass', -bioNeededForCent);
            this.modifyResource('dna', centOutputRate * dt);
        }

        // T3: HIVE CORE & QUEENS (Biomass -> Larva)
        // Larva regen logic: Base Rate + Queen Bonus
        // Requires Biomass consumption for the "Base Rate" part from Hive Core
        const coreLevel = meta.hiveCoreLevel || 1;
        const coreInputRate = coreLevel * METABOLISM_UPGRADES.HIVE_CORE.INPUT_RATE;
        
        const bioNeededForCore = coreInputRate * dt;
        let coreEfficiency = 0;
        
        if (res.biomass >= bioNeededForCore) {
            this.modifyResource('biomass', -bioNeededForCore);
            coreEfficiency = 1;
        } else if (res.biomass > 0) {
            coreEfficiency = res.biomass / bioNeededForCore;
            this.modifyResource('biomass', -res.biomass);
        }

        if (res.larva < this.state.hive.production.larvaCapBase) {
             const baseRegen = (coreLevel * METABOLISM_UPGRADES.HIVE_CORE.BASE_LARVA_RATE) * coreEfficiency;
             // Queen Bonus (Free, or assumes Queens feed themselves)
             const queenCount = this.state.hive.unitStockpile[UnitType.QUEEN] || 0;
             const queenBonus = queenCount * 0.2; // Each queen adds 0.2 larva/sec
             
             this.modifyResource('larva', (baseRegen + queenBonus) * dt);
        }
    }

    // THE FACTORY LOGIC
    private updateHatchery(dt: number) {
        this.hatcheryTimer += dt;
        
        if (this.hatcheryTimer >= HATCHERY_PRODUCTION_INTERVAL) {
            this.hatcheryTimer = 0;
            
            const totalStockpile = this.getTotalStockpile() + (this.state.hive.unitStockpile[UnitType.QUEEN] || 0);
            const cap = this.getMaxPopulationCap();
            this.state.hive.production.populationCapBase = cap;
            
            if (totalStockpile >= cap) return; 
            if (this.state.resources.larva < 1) return;

            const wMelee = this.state.hive.production.unitWeights[UnitType.MELEE] || 0;
            const wRanged = this.state.hive.production.unitWeights[UnitType.RANGED] || 0;
            const wQueen = this.state.hive.production.unitWeights[UnitType.QUEEN] || 0;
            const totalWeight = wMelee + wRanged + wQueen;
            
            if (totalWeight <= 0) return;

            const r = Math.random() * totalWeight;
            let targetType = UnitType.MELEE;
            if (r < wMelee) targetType = UnitType.MELEE;
            else if (r < wMelee + wRanged) targetType = UnitType.RANGED;
            else targetType = UnitType.QUEEN;

            const cost = UNIT_CONFIGS[targetType].cost;
            if (this.state.resources.biomass >= cost.biomass && 
                this.state.resources.minerals >= cost.minerals) {
                
                this.modifyResource('biomass', -cost.biomass);
                this.modifyResource('minerals', -cost.minerals);
                this.modifyResource('larva', -cost.larva);
                
                this.state.hive.unitStockpile[targetType] += 1;
                this.events.emit('STOCKPILE_CHANGED', this.state.hive.unitStockpile);
            }
        }
    }

    public digestStockpile() {
        // Destroy all units, refund X%
        const stockpile = this.state.hive.unitStockpile;
        let totalRefundBiomass = 0;
        let totalRefundMinerals = 0;
        
        for (const type of Object.values(UnitType)) {
            const count = stockpile[type] || 0;
            if (count > 0) {
                const config = UNIT_CONFIGS[type];
                totalRefundBiomass += count * config.cost.biomass * RECYCLE_REFUND_RATE;
                totalRefundMinerals += count * config.cost.minerals * RECYCLE_REFUND_RATE;
                stockpile[type] = 0;
            }
        }
        
        if (totalRefundBiomass > 0) this.modifyResource('biomass', totalRefundBiomass);
        if (totalRefundMinerals > 0) this.modifyResource('minerals', totalRefundMinerals);
        
        this.events.emit('STOCKPILE_CHANGED', this.state.hive.unitStockpile);
        this.saveGame();
    }
    
    public prestige() {
        // Calculate Mutagen Reward
        // Formula: sqrt(Biomass / 100) - simple version
        const sacrifice = this.state.resources.biomass;
        const reward = Math.floor(Math.sqrt(sacrifice / 10));
        
        if (reward <= 0 && this.state.player.prestigeLevel === 0) return; // Basic check

        const newMutagen = this.state.resources.mutagen + reward;
        const newPrestigeLevel = this.state.player.prestigeLevel + 1;
        
        // Keep inventory/cards (Roguelike element)
        const keptPlugins = this.state.hive.inventory.plugins;
        
        // RESET
        this.state = JSON.parse(JSON.stringify(INITIAL_GAME_STATE));
        
        // Restore kept items & Apply Prestige
        this.state.resources.mutagen = newMutagen;
        this.state.hive.inventory.plugins = keptPlugins;
        this.state.player.prestigeLevel = newPrestigeLevel;
        
        // Ensure Queen weight is 0 initially to avoid stuck hatchery
        this.state.hive.production.unitWeights[UnitType.QUEEN] = 0;

        this.saveGame();
        this.events.emit('RESOURCE_CHANGED', {});
        this.events.emit('STOCKPILE_CHANGED', {});
        // Force full reload of state in UI
        window.location.reload(); 
    }

    public getTotalStockpile(): number {
        return (this.state.hive.unitStockpile[UnitType.MELEE] || 0) + 
               (this.state.hive.unitStockpile[UnitType.RANGED] || 0);
    }

    // Called by Deployment System (GameEngine)
    public consumeStockpile(type: UnitType): boolean {
        if (this.state.hive.unitStockpile[type] > 0) {
            this.state.hive.unitStockpile[type]--;
            this.events.emit('STOCKPILE_CHANGED', this.state.hive.unitStockpile);
            return true;
        }
        return false;
    }

    public getUnitStats(type: UnitType, runtimeModifiers?: GameModifiers): UnitRuntimeStats {
        const config = UNIT_CONFIGS[type];
        
        if (!config || !config.baseStats) {
            return {
                hp: 0, maxHp: 0, damage: 0, range: 0, speed: 0, attackSpeed: 1, 
                width: 0, height: 0, color: 0, critChance: 0, critDamage: 0, element: 'PHYSICAL'
            };
        }

        const save = this.state.hive.unlockedUnits[type] || { id: type, level: 1, loadout: [] };
        
        const lvlMultHp = 1 + (save.level - 1) * config.growthFactors.hp;
        const lvlMultDmg = 1 + (save.level - 1) * config.growthFactors.damage;
        
        const runMultHp = runtimeModifiers ? runtimeModifiers.maxHpMultiplier : 1.0;
        const runMultDmg = runtimeModifiers ? runtimeModifiers.damageMultiplier : 1.0;

        // Mutagen global buff (Prestige)
        const mutagenMult = 1 + (this.state.resources.mutagen * 0.1); 

        let pluginMultHp = 0;
        let pluginMultDmg = 0;
        let pluginMultSpeed = 0;
        let pluginMultAttackSpeed = 0;
        let pluginFlatCritChance = 0; 
        let pluginMultCritChance = 0;
        let pluginMultCritDmg = 0;
        let element: UnitRuntimeStats['element'] = 'PHYSICAL'; 
        
        if (save.loadout) {
            save.loadout.forEach(instanceId => {
                if (!instanceId) return;
                const instance = this.state.hive.inventory.plugins.find(p => p.instanceId === instanceId);
                if (!instance) return;
                const template = BIO_PLUGINS[instance.templateId];
                if (!template) return;

                const rankMult = 1 + (instance.rank * template.statGrowth);
                
                template.stats.forEach(mod => {
                    const val = mod.value * rankMult;
                    if (mod.stat === 'hp') pluginMultHp += val;
                    if (mod.stat === 'damage') pluginMultDmg += val;
                    if (mod.stat === 'speed') pluginMultSpeed += val;
                    if (mod.stat === 'attackSpeed') pluginMultAttackSpeed += val;
                    if (mod.stat === 'critChance') {
                         if (mod.isFlat) pluginFlatCritChance += val; 
                         else pluginMultCritChance += val;
                    }
                    if (mod.stat === 'critDamage') pluginMultCritDmg += val;
                    if (mod.stat === 'elementalDmg' && mod.element) {
                        element = mod.element; 
                        pluginMultDmg += val; 
                    }
                });
            });
        }

        return {
            hp: config.baseStats.hp * lvlMultHp * runMultHp * (1 + pluginMultHp) * mutagenMult,
            maxHp: config.baseStats.hp * lvlMultHp * runMultHp * (1 + pluginMultHp) * mutagenMult,
            damage: config.baseStats.damage * lvlMultDmg * runMultDmg * (1 + pluginMultDmg) * mutagenMult,
            range: config.baseStats.range,
            speed: config.baseStats.speed * (1 + pluginMultSpeed),
            attackSpeed: Math.max(0.1, config.baseStats.attackSpeed / (1 + pluginMultAttackSpeed)), 
            
            width: config.baseStats.width,
            height: config.baseStats.height,
            color: config.baseStats.color,
            
            critChance: (0.05 + pluginFlatCritChance) * (1 + pluginMultCritChance), 
            critDamage: 1.5 + pluginMultCritDmg, 
            element: element
        };
    }

    public upgradeUnit(type: UnitType): boolean {
        const save = this.state.hive.unlockedUnits[type];
        if (!save) return false;

        const cost = this.getUpgradeCost(type);

        if (this.state.resources.biomass >= cost) {
            this.modifyResource('biomass', -cost);
            save.level++;
            this.saveGame();
            this.events.emit('UNIT_UPGRADED', { type, level: save.level });
            return true;
        }
        return false;
    }

    public getUpgradeCost(type: UnitType): number {
        const save = this.state.hive.unlockedUnits[type];
        if (!save) return 999999;
        return Math.floor(UNIT_UPGRADE_COST_BASE * Math.pow(1.5, save.level - 1));
    }
    
    // --- Metabolism Upgrade Logic ---
    
    public getMetabolismUpgradeCost(type: 'miningLevel' | 'digestLevel' | 'centrifugeLevel' | 'hiveCoreLevel' | 'storageLevel' | 'maxSupplyLevel'): number {
        const level = this.state.hive.metabolism[type] || 1;
        let baseCost = 0;
        let factor = 1.0;

        // Map to constants
        if (type === 'miningLevel') { baseCost = METABOLISM_UPGRADES.MINING.BASE_COST; factor = METABOLISM_UPGRADES.MINING.COST_FACTOR; }
        else if (type === 'digestLevel') { baseCost = METABOLISM_UPGRADES.DIGESTION.BASE_COST; factor = METABOLISM_UPGRADES.DIGESTION.COST_FACTOR; }
        else if (type === 'centrifugeLevel') { baseCost = METABOLISM_UPGRADES.CENTRIFUGE.BASE_COST; factor = METABOLISM_UPGRADES.CENTRIFUGE.COST_FACTOR; }
        else if (type === 'hiveCoreLevel') { baseCost = METABOLISM_UPGRADES.HIVE_CORE.BASE_COST; factor = METABOLISM_UPGRADES.HIVE_CORE.COST_FACTOR; }
        else if (type === 'storageLevel') { baseCost = METABOLISM_UPGRADES.STORAGE.BASE_COST; factor = METABOLISM_UPGRADES.STORAGE.COST_FACTOR; }
        else if (type === 'maxSupplyLevel') { baseCost = METABOLISM_UPGRADES.SUPPLY.BASE_COST; factor = METABOLISM_UPGRADES.SUPPLY.COST_FACTOR; }
        
        return Math.floor(baseCost * Math.pow(factor, level - 1));
    }
    
    public upgradeMetabolism(type: 'miningLevel' | 'digestLevel' | 'centrifugeLevel' | 'hiveCoreLevel' | 'storageLevel' | 'maxSupplyLevel'): boolean {
        const cost = this.getMetabolismUpgradeCost(type);
        if (this.state.resources.biomass >= cost) {
            this.modifyResource('biomass', -cost);
            this.state.hive.metabolism[type] = (this.state.hive.metabolism[type] || 1) + 1;
            this.saveGame();
            this.events.emit('RESOURCE_CHANGED', {}); // Trigger UI update
            return true;
        }
        return false;
    }

    public updateProductionConfig(type: UnitType, weight: number) {
        this.state.hive.production.unitWeights[type] = weight;
        this.events.emit('PRODUCTION_CHANGED', this.state.hive.production);
    }
    
    public unlockRegion(regionId: number) {
        if (!this.state.world.regions[regionId]) {
            this.state.world.regions[regionId] = { id: regionId, isUnlocked: true, devourProgress: 0 };
            this.events.emit('REGION_UNLOCKED', regionId);
            this.saveGame();
        }
    }

    public updateRegionProgress(regionId: number, progressDelta: number) {
        if (!this.state.world.regions[regionId]) return;
        
        const r = this.state.world.regions[regionId];
        r.devourProgress = Math.min(100, r.devourProgress + progressDelta);
        
        if (r.devourProgress >= 100) {
            const nextId = regionId + 1;
            if (nextId <= 10) { 
                 this.unlockRegion(nextId);
            }
        }
        this.events.emit('REGION_PROGRESS', { id: regionId, progress: r.devourProgress });
    }

    // --- GRAFTING SYSTEM API ---

    public calculateLoad(unitType: UnitType, loadout: (string | null)[]): number {
        let total = 0;
        const slots = UNIT_CONFIGS[unitType].slots;
        loadout.forEach((instanceId, idx) => {
            if (!instanceId) return;
            const instance = this.state.hive.inventory.plugins.find(p => p.instanceId === instanceId);
            if (!instance) return;
            const t = BIO_PLUGINS[instance.templateId];
            
            let cost = t.baseCost + (instance.rank * t.costPerRank);
            
            // Polarity discount
            const slotPolarity = slots[idx]?.polarity || 'UNIVERSAL';
            if (slotPolarity === t.polarity || slotPolarity === 'UNIVERSAL') {
                cost = Math.ceil(cost / 2);
            }
            total += cost;
        });
        return total;
    }

    public equipPlugin(unitType: UnitType, slotIndex: number, instanceId: string | null) {
        const unit = this.state.hive.unlockedUnits[unitType];
        if (!unit) return;
        
        if (instanceId) {
            const existingIdx = unit.loadout.indexOf(instanceId);
            if (existingIdx !== -1 && existingIdx !== slotIndex) {
                unit.loadout[existingIdx] = null;
            }
            
            Object.values(this.state.hive.unlockedUnits).forEach(u => {
                 if (u.id === unitType) return;
                 const idx = u.loadout.indexOf(instanceId);
                 if (idx !== -1) u.loadout[idx] = null;
            });
        }

        const old = unit.loadout[slotIndex];
        unit.loadout[slotIndex] = instanceId;

        const load = this.calculateLoad(unitType, unit.loadout);
        const maxLoad = UNIT_CONFIGS[unitType].baseLoadCapacity; 

        if (load > maxLoad) {
            unit.loadout[slotIndex] = old;
            console.warn("Cannot equip: Over capacity");
            return false;
        }

        this.saveGame();
        this.events.emit('PLUGIN_EQUIPPED', { unitType });
        return true;
    }

    public fusePlugin(instanceId: string): boolean {
        const instance = this.state.hive.inventory.plugins.find(p => p.instanceId === instanceId);
        if (!instance) return false;
        
        const t = BIO_PLUGINS[instance.templateId];
        if (instance.rank >= t.maxRank) return false;

        const cost = 50 * (instance.rank + 1);
        if (this.state.resources.biomass >= cost) {
            this.modifyResource('biomass', -cost);
            instance.rank++;
            this.saveGame();
            this.events.emit('PLUGIN_UPGRADED', instanceId);
            return true;
        }
        return false;
    }

    public addPlugin(templateId: string) {
        const newPlugin: PluginInstance = {
            instanceId: 'gen_' + Date.now() + Math.random().toString(36).substr(2, 5),
            templateId: templateId,
            rank: 0
        };
        this.state.hive.inventory.plugins.push(newPlugin);
        this.saveGame();
    }
}
