

import { GameSaveData, UnitType, UnitRuntimeStats, Resources, GameModifiers, BioPluginConfig, PluginInstance } from '../types';
import { INITIAL_GAME_STATE, UNIT_CONFIGS, UNIT_UPGRADE_COST_BASE, RESOURCE_TICK_RATE_BASE, MINERAL_TICK_RATE_BASE, LARVA_REGEN_RATE, HATCHERY_PRODUCTION_INTERVAL, RECYCLE_REFUND_RATE, METABOLISM_UPGRADES, MAX_RESOURCES_BASE, BIO_PLUGINS } from '../constants';

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

                // Fix missing maxSupplyLevel from old saves
                if (!this.state.hive.metabolism.maxSupplyLevel) {
                    this.state.hive.metabolism.maxSupplyLevel = 1;
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
            // 1. Calculate Passive Gains
            const bioRate = this.getPassiveResourceRate('biomass');
            const minRate = this.getPassiveResourceRate('minerals');
            
            let bioGained = Math.floor(bioRate * diffSeconds);
            let minGained = Math.floor(minRate * diffSeconds);
            
            // 2. Simulate Hatchery Consumption (Turn biomass/minerals into stockpile)
            
            const wMelee = this.state.hive.production.unitWeights[UnitType.MELEE] || 0;
            const wRanged = this.state.hive.production.unitWeights[UnitType.RANGED] || 0;
            const totalWeight = wMelee + wRanged || 1;
            
            // Average cost
            const costMelee = UNIT_CONFIGS[UnitType.MELEE].cost;
            const costRanged = UNIT_CONFIGS[UnitType.RANGED].cost;
            
            const avgBioCost = (costMelee.biomass * wMelee + costRanged.biomass * wRanged) / totalWeight;
            const avgMinCost = (costMelee.minerals * wMelee + costRanged.minerals * wRanged) / totalWeight;

            // How many could we have made with the BIOMASS we gained?
            const potentialByBio = avgBioCost > 0 ? Math.floor((bioGained * 0.8) / avgBioCost) : 99999;
            const potentialByMin = avgMinCost > 0 ? Math.floor((minGained * 0.8) / avgMinCost) : 99999;
            
            // Limit by the scarcest resource
            const potentialUnits = Math.min(potentialByBio, potentialByMin);

            // Apply Logic
            const currentPop = this.getTotalStockpile();
            const cap = this.getMaxPopulationCap();
            const space = Math.max(0, cap - currentPop);
            const unitsToSpawn = Math.min(potentialUnits, space);
            
            // Distribute units
            const meleeCount = Math.floor(unitsToSpawn * (wMelee / totalWeight));
            const rangedCount = unitsToSpawn - meleeCount;
            
            const bioUsed = (meleeCount * costMelee.biomass) + (rangedCount * costRanged.biomass);
            const minUsed = (meleeCount * costMelee.minerals) + (rangedCount * costRanged.minerals);

            if (unitsToSpawn > 0) {
                this.state.hive.unitStockpile[UnitType.MELEE] += meleeCount;
                this.state.hive.unitStockpile[UnitType.RANGED] += rangedCount;
                
                bioGained -= bioUsed;
                minGained -= minUsed;
                
                console.log(`[Offline] Hatchery produced ${unitsToSpawn} units.`);
            }

            // Grant remaining resources
            this.modifyResource('biomass', bioGained > 0 ? bioGained : 0);
            this.modifyResource('minerals', minGained > 0 ? minGained : 0);
            // Reset Larva to full on login
            this.state.resources.larva = this.state.hive.production.larvaCapBase;
            
            console.log(`[Offline] Gained ${bioGained} biomass, ${minGained} minerals.`);
        }
        this.state.player.lastSaveTime = now;
    }

    // --- Logic API ---

    public updateTick(dt: number) {
        // 1. Metabolism: Produce Biomass, Minerals, Larva
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

    public getPassiveResourceRate(type: 'biomass' | 'minerals'): number {
        const level = this.state.hive.metabolism.passiveGenLevel || 1;
        // Effect: +20% per level over base
        const multiplier = 1 + ((level - 1) * METABOLISM_UPGRADES.PASSIVE.EFFECT_PER_LEVEL);
        
        if (type === 'biomass') return RESOURCE_TICK_RATE_BASE * multiplier;
        if (type === 'minerals') return MINERAL_TICK_RATE_BASE * multiplier;
        return 0;
    }
    
    public getLarvaRegenRate(): number {
        const level = this.state.hive.metabolism.larvaGenLevel || 1;
        return METABOLISM_UPGRADES.LARVA.BASE_RATE + ((level - 1) * METABOLISM_UPGRADES.LARVA.RATE_PER_LEVEL);
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
        const level = this.state.hive.metabolism.recycleLevel || 1;
        // Effect: Base + Level * 5%
        let rate = METABOLISM_UPGRADES.RECYCLE.BASE_RATE + ((level - 1) * METABOLISM_UPGRADES.RECYCLE.RATE_PER_LEVEL);
        if (rate > METABOLISM_UPGRADES.RECYCLE.MAX_RATE) rate = METABOLISM_UPGRADES.RECYCLE.MAX_RATE;
        return rate;
    }

    private updateMetabolism(dt: number) {
        // Biomass
        const bioAmount = this.getPassiveResourceRate('biomass') * dt;
        if (bioAmount > 0) this.modifyResource('biomass', bioAmount);
        
        // Minerals
        const minAmount = this.getPassiveResourceRate('minerals') * dt;
        if (minAmount > 0) this.modifyResource('minerals', minAmount);
        
        // Larva (Regen)
        if (this.state.resources.larva < this.state.hive.production.larvaCapBase) {
             const rate = this.getLarvaRegenRate();
             this.modifyResource('larva', rate * dt);
        }
    }

    // THE FACTORY LOGIC
    private updateHatchery(dt: number) {
        this.hatcheryTimer += dt;
        
        // Production Cycle
        if (this.hatcheryTimer >= HATCHERY_PRODUCTION_INTERVAL) {
            this.hatcheryTimer = 0;
            
            // 1. Check Population Cap
            const totalStockpile = this.getTotalStockpile();
            const cap = this.getMaxPopulationCap();
            
            // Also sync the old base variable for snapshots to avoid breaking
            this.state.hive.production.populationCapBase = cap;
            
            if (totalStockpile >= cap) return; // Warehouse full

            // 2. Check Larva (Must have at least 1 full larva)
            if (this.state.resources.larva < 1) return;

            // 3. Decide what to build (Weighted Random)
            const wMelee = this.state.hive.production.unitWeights[UnitType.MELEE] || 0;
            const wRanged = this.state.hive.production.unitWeights[UnitType.RANGED] || 0;
            const totalWeight = wMelee + wRanged;
            
            if (totalWeight <= 0) return;

            const r = Math.random() * totalWeight;
            let targetType = UnitType.MELEE;
            if (r > wMelee) targetType = UnitType.RANGED;

            // 4. Check Cost
            const cost = UNIT_CONFIGS[targetType].cost;
            if (this.state.resources.biomass >= cost.biomass && 
                this.state.resources.minerals >= cost.minerals) {
                
                // 5. Manufacture
                this.modifyResource('biomass', -cost.biomass);
                this.modifyResource('minerals', -cost.minerals);
                this.modifyResource('larva', -cost.larva); // Consumes 1 larva
                
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
            // Safety fallback for incomplete unit configs (like Human types in UI context)
            return {
                hp: 0, maxHp: 0, damage: 0, range: 0, speed: 0, attackSpeed: 1, 
                width: 0, height: 0, color: 0, critChance: 0, critDamage: 0, element: 'PHYSICAL'
            };
        }

        const save = this.state.hive.unlockedUnits[type] || { id: type, level: 1, loadout: [] };
        
        // 1. Level Multipliers
        const lvlMultHp = 1 + (save.level - 1) * config.growthFactors.hp;
        const lvlMultDmg = 1 + (save.level - 1) * config.growthFactors.damage;
        
        // 2. Runtime Modifiers (Roguelike)
        const runMultHp = runtimeModifiers ? runtimeModifiers.maxHpMultiplier : 1.0;
        const runMultDmg = runtimeModifiers ? runtimeModifiers.damageMultiplier : 1.0;

        // 3. Plugin Modifiers (Grafting)
        let pluginMultHp = 0;
        let pluginMultDmg = 0;
        let pluginMultSpeed = 0;
        let pluginMultAttackSpeed = 0;
        let pluginFlatCritChance = 0; // 0 to 1
        let pluginMultCritChance = 0;
        let pluginMultCritDmg = 0;
        let element: UnitRuntimeStats['element'] = 'PHYSICAL'; // Default
        
        // Iterate equipped plugins
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
                        element = mod.element; // Last equipped element overrides
                        pluginMultDmg += val; // Add elemental dmg to total dmg scalar for now
                    }
                });
            });
        }

        // Final Calculation
        return {
            hp: config.baseStats.hp * lvlMultHp * runMultHp * (1 + pluginMultHp),
            maxHp: config.baseStats.hp * lvlMultHp * runMultHp * (1 + pluginMultHp),
            damage: config.baseStats.damage * lvlMultDmg * runMultDmg * (1 + pluginMultDmg),
            range: config.baseStats.range,
            speed: config.baseStats.speed * (1 + pluginMultSpeed),
            attackSpeed: Math.max(0.1, config.baseStats.attackSpeed / (1 + pluginMultAttackSpeed)), 
            // NOTE: config.attackSpeed is Delay. So Higher Attack Speed Stat = Lower Delay.
            // Formula: BaseDelay / (1 + Mod). 
            
            width: config.baseStats.width,
            height: config.baseStats.height,
            color: config.baseStats.color,
            
            critChance: (0.05 + pluginFlatCritChance) * (1 + pluginMultCritChance), // Base 5%
            critDamage: 1.5 + pluginMultCritDmg,      // Base 150% crit damage
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
    
    public getMetabolismUpgradeCost(type: 'passiveGenLevel' | 'recycleLevel' | 'storageLevel' | 'larvaGenLevel' | 'maxSupplyLevel'): number {
        const level = this.state.hive.metabolism[type] || 1;
        let baseCost = 0;
        let factor = 1.0;

        if (type === 'passiveGenLevel') {
            baseCost = METABOLISM_UPGRADES.PASSIVE.BASE_COST;
            factor = METABOLISM_UPGRADES.PASSIVE.COST_FACTOR;
        } else if (type === 'recycleLevel') {
            baseCost = METABOLISM_UPGRADES.RECYCLE.BASE_COST;
            factor = METABOLISM_UPGRADES.RECYCLE.COST_FACTOR;
        } else if (type === 'storageLevel') {
            baseCost = METABOLISM_UPGRADES.STORAGE.BASE_COST;
            factor = METABOLISM_UPGRADES.STORAGE.COST_FACTOR;
        } else if (type === 'larvaGenLevel') {
            baseCost = METABOLISM_UPGRADES.LARVA.BASE_COST;
            factor = METABOLISM_UPGRADES.LARVA.COST_FACTOR;
        } else if (type === 'maxSupplyLevel') {
            baseCost = METABOLISM_UPGRADES.SUPPLY.BASE_COST;
            factor = METABOLISM_UPGRADES.SUPPLY.COST_FACTOR;
        }
        
        return Math.floor(baseCost * Math.pow(factor, level - 1));
    }
    
    public upgradeMetabolism(type: 'passiveGenLevel' | 'recycleLevel' | 'storageLevel' | 'larvaGenLevel' | 'maxSupplyLevel'): boolean {
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
        
        // Remove from other slots if already equipped there
        if (instanceId) {
            const existingIdx = unit.loadout.indexOf(instanceId);
            if (existingIdx !== -1 && existingIdx !== slotIndex) {
                unit.loadout[existingIdx] = null;
            }
            
            // Check other units
            Object.values(this.state.hive.unlockedUnits).forEach(u => {
                 if (u.id === unitType) return;
                 const idx = u.loadout.indexOf(instanceId);
                 if (idx !== -1) u.loadout[idx] = null;
            });
        }

        // Apply
        const old = unit.loadout[slotIndex];
        unit.loadout[slotIndex] = instanceId;

        // Check Capacity
        const load = this.calculateLoad(unitType, unit.loadout);
        const maxLoad = UNIT_CONFIGS[unitType].baseLoadCapacity; // Static cap for now

        if (load > maxLoad) {
            // Revert if over capacity
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

        // Cost logic: Biomass
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