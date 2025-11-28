
import { GameSaveData, UnitType, UnitRuntimeStats, Resources, GameModifiers, BioPluginConfig, PluginInstance } from '../types';
import { INITIAL_GAME_STATE, UNIT_CONFIGS, UNIT_UPGRADE_COST_BASE, RECYCLE_REFUND_RATE, METABOLISM_UPGRADES, MAX_RESOURCES_BASE, BIO_PLUGINS, CAP_UPGRADE_BASE, EFFICIENCY_UPGRADE_BASE, QUEEN_UPGRADE_BASE, INITIAL_LARVA_CAP } from '../constants';

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

    private constructor() {
        this.events = new SimpleEventEmitter();
        this.state = JSON.parse(JSON.stringify(INITIAL_GAME_STATE));
        this.loadGame();
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
                this.state = { ...INITIAL_GAME_STATE, ...loaded };
                
                if (!this.state.hive.production.queenIntervalLevel) {
                    this.state.hive.production.queenIntervalLevel = 1;
                    this.state.hive.production.queenAmountLevel = 1;
                    this.state.hive.production.larvaCapBase = INITIAL_LARVA_CAP;
                    this.state.resources.larva = INITIAL_LARVA_CAP;
                }
                
                Object.values(UnitType).forEach(uType => {
                    const u = uType as UnitType;
                    if (!this.state.hive.unlockedUnits[u]) {
                        this.state.hive.unlockedUnits[u] = JSON.parse(JSON.stringify(INITIAL_GAME_STATE.hive.unlockedUnits[u] || {id:u}));
                    }
                    if (this.state.hive.unlockedUnits[u].cap === undefined) {
                         this.state.hive.unlockedUnits[u].cap = (INITIAL_GAME_STATE.hive.unlockedUnits[u] as any).cap || 0;
                         this.state.hive.unlockedUnits[u].capLevel = 1;
                         this.state.hive.unlockedUnits[u].efficiencyLevel = 1;
                         this.state.hive.unlockedUnits[u].isProducing = false;
                         this.state.hive.unlockedUnits[u].productionProgress = 0;
                    }
                });

                this.calculateOfflineProgress();
            }
        } catch (e) {
            console.warn("Load failed - resetting to default", e);
            this.state = JSON.parse(JSON.stringify(INITIAL_GAME_STATE));
        }
    }

    public calculateOfflineProgress() {
        this.state.player.lastSaveTime = Date.now();
    }

    // --- Logic API ---

    public updateTick(dt: number) {
        this.updateMetabolism(dt);
        this.updateQueen(dt);
        this.updateHatchery(dt);
    }

    public modifyResource(type: keyof Resources, amount: number) {
        this.state.resources[type] += amount;
        
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
        return MAX_RESOURCES_BASE + ((level - 1) * METABOLISM_UPGRADES.STORAGE.CAP_PER_LEVEL);
    }
    
    public getMaxPopulationCap(): number {
        let total = 0;
        Object.values(this.state.hive.unlockedUnits).forEach(u => {
            total += u.cap || 0;
        });
        return total;
    }

    public getRecycleRate(): number { return 0.5; }

    private updateMetabolism(dt: number) {
        const meta = this.state.hive.metabolism;
        const res = this.state.resources;
        
        const miningOutput = (meta.miningLevel || 1) * METABOLISM_UPGRADES.MINING.RATE_PER_LEVEL * dt;
        this.modifyResource('minerals', miningOutput);

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

        const centInputRate = (meta.centrifugeLevel || 1) * METABOLISM_UPGRADES.CENTRIFUGE.INPUT_RATE;
        const centOutputRate = (meta.centrifugeLevel || 1) * METABOLISM_UPGRADES.CENTRIFUGE.OUTPUT_RATE;
        const bioNeededForCent = centInputRate * dt;
        if (res.biomass >= bioNeededForCent) {
            this.modifyResource('biomass', -bioNeededForCent);
            this.modifyResource('dna', centOutputRate * dt);
        }
    }
    
    private updateQueen(dt: number) {
        const prod = this.state.hive.production;
        const queenCount = this.state.hive.unitStockpile[UnitType.QUEEN] || 0;
        
        if (queenCount < 1) return;

        const interval = 5.0 * Math.pow(0.9, prod.queenIntervalLevel - 1);
        prod.queenTimer = (prod.queenTimer || 0) + dt;
        
        if (prod.queenTimer >= interval) {
            prod.queenTimer = 0;
            const amount = 1 * prod.queenAmountLevel * queenCount;
            this.modifyResource('larva', amount);
        }
    }

    private updateHatchery(dt: number) {
        const units = this.state.hive.unlockedUnits;
        const stockpile = this.state.hive.unitStockpile;
        const resources = this.state.resources;

        Object.values(units).forEach(unit => {
            if (!unit.isProducing) return;
            if ((stockpile[unit.id] || 0) >= unit.cap) return;

            const config = UNIT_CONFIGS[unit.id];
            
            const discount = Math.pow(0.95, unit.efficiencyLevel - 1);
            const bioCost = config.baseCost.biomass * discount;
            const minCost = config.baseCost.minerals * discount;
            const dnaCost = config.baseCost.dna * discount;
            const larvaCost = config.baseCost.larva;
            const timeCost = config.baseCost.time * discount;

            if (resources.biomass >= bioCost && 
                resources.minerals >= minCost && 
                resources.dna >= dnaCost &&
                resources.larva >= larvaCost) {
                
                unit.productionProgress += dt;
                
                if (unit.productionProgress >= timeCost) {
                    this.modifyResource('biomass', -bioCost);
                    this.modifyResource('minerals', -minCost);
                    this.modifyResource('dna', -dnaCost);
                    this.modifyResource('larva', -larvaCost);
                    
                    stockpile[unit.id] = (stockpile[unit.id] || 0) + 1;
                    unit.productionProgress = 0;
                    
                    this.events.emit('STOCKPILE_CHANGED', stockpile);
                }
            }
        });
    }

    public toggleProduction(type: UnitType) {
        const u = this.state.hive.unlockedUnits[type];
        if (u) {
            u.isProducing = !u.isProducing;
            this.saveGame();
            this.events.emit('PRODUCTION_CHANGED', {});
        }
    }

    public upgradeUnitCap(type: UnitType) {
        const u = this.state.hive.unlockedUnits[type];
        if (!u) return;

        const cost = Math.floor(CAP_UPGRADE_BASE * Math.pow(1.5, u.capLevel - 1));
        if (this.state.resources.biomass >= cost) {
            this.modifyResource('biomass', -cost);
            u.capLevel++;
            const increment = type === UnitType.MELEE ? 20 : type === UnitType.RANGED ? 10 : 1; 
            u.cap += increment;
            
            this.saveGame();
            this.events.emit('PRODUCTION_CHANGED', {});
        }
    }

    public upgradeUnitEfficiency(type: UnitType) {
        const u = this.state.hive.unlockedUnits[type];
        if (!u) return;

        const cost = Math.floor(EFFICIENCY_UPGRADE_BASE * Math.pow(1.5, u.efficiencyLevel - 1));
        if (this.state.resources.biomass >= cost) {
            this.modifyResource('biomass', -cost);
            u.efficiencyLevel++;
            this.saveGame();
            this.events.emit('PRODUCTION_CHANGED', {});
        }
    }

    public upgradeQueen(type: 'INTERVAL' | 'AMOUNT') {
        const prod = this.state.hive.production;
        
        if (type === 'INTERVAL') {
             const cost = Math.floor(QUEEN_UPGRADE_BASE * Math.pow(1.8, prod.queenIntervalLevel - 1));
             if (this.state.resources.biomass >= cost) {
                 this.modifyResource('biomass', -cost);
                 prod.queenIntervalLevel++;
                 this.saveGame();
                 this.events.emit('PRODUCTION_CHANGED', {});
             }
        } else {
             const cost = Math.floor(QUEEN_UPGRADE_BASE * 2 * Math.pow(2.0, prod.queenAmountLevel - 1));
             if (this.state.resources.dna >= cost) {
                 this.modifyResource('dna', -cost);
                 prod.queenAmountLevel++;
                 this.saveGame();
                 this.events.emit('PRODUCTION_CHANGED', {});
             }
        }
    }
    
    public getUnitProductionStats(type: UnitType) {
        const u = this.state.hive.unlockedUnits[type];
        const config = UNIT_CONFIGS[type];
        const discount = Math.pow(0.95, u.efficiencyLevel - 1);
        
        return {
            bio: config.baseCost.biomass * discount,
            min: config.baseCost.minerals * discount,
            dna: config.baseCost.dna * discount,
            time: config.baseCost.time * discount,
            capCost: Math.floor(CAP_UPGRADE_BASE * Math.pow(1.5, u.capLevel - 1)),
            effCost: Math.floor(EFFICIENCY_UPGRADE_BASE * Math.pow(1.5, u.efficiencyLevel - 1))
        };
    }

    public getQueenStats() {
        const prod = this.state.hive.production;
        const interval = 5.0 * Math.pow(0.9, prod.queenIntervalLevel - 1);
        const amount = 1 * prod.queenAmountLevel;
        return {
            interval,
            amount,
            costInterval: Math.floor(QUEEN_UPGRADE_BASE * Math.pow(1.8, prod.queenIntervalLevel - 1)),
            costAmount: Math.floor(QUEEN_UPGRADE_BASE * 2 * Math.pow(2.0, prod.queenAmountLevel - 1))
        };
    }
    
    public digestStockpile() {
        const stockpile = this.state.hive.unitStockpile;
        let totalRefundBiomass = 0;
        let totalRefundMinerals = 0;
        for (const type of Object.values(UnitType)) {
            const count = stockpile[type] || 0;
            if (count > 0 && type !== UnitType.QUEEN) {
                const config = UNIT_CONFIGS[type];
                totalRefundBiomass += count * config.baseCost.biomass * RECYCLE_REFUND_RATE;
                totalRefundMinerals += count * config.baseCost.minerals * RECYCLE_REFUND_RATE;
                stockpile[type] = 0;
            }
        }
        if (totalRefundBiomass > 0) this.modifyResource('biomass', totalRefundBiomass);
        if (totalRefundMinerals > 0) this.modifyResource('minerals', totalRefundMinerals);
        this.events.emit('STOCKPILE_CHANGED', this.state.hive.unitStockpile);
        this.saveGame();
    }
    
    public consumeStockpile(type: UnitType): boolean {
        if (this.state.hive.unitStockpile[type] > 0) {
            this.state.hive.unitStockpile[type]--;
            this.events.emit('STOCKPILE_CHANGED', this.state.hive.unitStockpile);
            return true;
        }
        return false;
    }
    
    public prestige() {
        const sacrifice = this.state.resources.biomass;
        const reward = Math.floor(Math.sqrt(sacrifice / 10));
        if (reward <= 0 && this.state.player.prestigeLevel === 0) return;
        const newMutagen = this.state.resources.mutagen + reward;
        const newPrestigeLevel = this.state.player.prestigeLevel + 1;
        const keptPlugins = this.state.hive.inventory.plugins;
        this.state = JSON.parse(JSON.stringify(INITIAL_GAME_STATE));
        this.state.resources.mutagen = newMutagen;
        this.state.hive.inventory.plugins = keptPlugins;
        this.state.player.prestigeLevel = newPrestigeLevel;
        this.saveGame();
        this.events.emit('RESOURCE_CHANGED', {});
        window.location.reload(); 
    }
    
    public upgradeUnit(type: UnitType): boolean {
        const u = this.state.hive.unlockedUnits[type];
        if (!u) return false;

        const cost = this.getUpgradeCost(type);
        if (this.state.resources.biomass >= cost) {
            this.modifyResource('biomass', -cost);
            u.level++;
            
            this.saveGame();
            this.events.emit('UNIT_UPGRADED', type);
            return true;
        }
        return false;
    }

    public updateProductionConfig(type: UnitType, weight: number) { }
    public getTotalStockpile(): number { return 0; }
    
    public calculateLoad(unitType: UnitType, loadout: (string | null)[]): number {
        let total = 0;
        const slots = UNIT_CONFIGS[unitType].slots;
        loadout.forEach((instanceId, idx) => {
            if (!instanceId) return;
            const instance = this.state.hive.inventory.plugins.find(p => p.instanceId === instanceId);
            if (!instance) return;
            const t = BIO_PLUGINS[instance.templateId];
            let cost = t.baseCost + (instance.rank * t.costPerRank);
            const slotPolarity = slots[idx]?.polarity || 'UNIVERSAL';
            if (slotPolarity === t.polarity || slotPolarity === 'UNIVERSAL') {
                cost = Math.ceil(cost / 2);
            }
            total += cost;
        });
        return total;
    }

    public getUpgradeCost(type: UnitType): number {
         const save = this.state.hive.unlockedUnits[type];
         if (!save) return 999999;
         return Math.floor(UNIT_UPGRADE_COST_BASE * Math.pow(1.5, save.level - 1));
    }

    public getUnitStats(type: UnitType, runtimeModifiers?: GameModifiers): UnitRuntimeStats {
        const config = UNIT_CONFIGS[type];
        if (!config || !config.baseStats) {
            return { hp: 0, maxHp: 0, damage: 0, range: 0, speed: 0, attackSpeed: 1, width: 0, height: 0, color: 0, critChance: 0, critDamage: 0, element: 'PHYSICAL' };
        }
        const save = this.state.hive.unlockedUnits[type];
        const lvlMultHp = 1 + (save.level - 1) * config.growthFactors.hp;
        const lvlMultDmg = 1 + (save.level - 1) * config.growthFactors.damage;
        const runMultHp = runtimeModifiers ? runtimeModifiers.maxHpMultiplier : 1.0;
        const runMultDmg = runtimeModifiers ? runtimeModifiers.damageMultiplier : 1.0;
        const mutagenMult = 1 + (this.state.resources.mutagen * 0.1); 
        let pluginMultHp = 0, pluginMultDmg = 0, pluginMultSpeed = 0, pluginMultAttackSpeed = 0, pluginFlatCritChance = 0, pluginMultCritChance = 0, pluginMultCritDmg = 0;
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
                    if (mod.stat === 'critChance') { if (mod.isFlat) pluginFlatCritChance += val; else pluginMultCritChance += val; }
                    if (mod.stat === 'critDamage') pluginMultCritDmg += val;
                    if (mod.stat === 'elementalDmg' && mod.element) { element = mod.element; pluginMultDmg += val; }
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
            width: config.baseStats.width, height: config.baseStats.height, color: config.baseStats.color,
            critChance: (0.05 + pluginFlatCritChance) * (1 + pluginMultCritChance), 
            critDamage: 1.5 + pluginMultCritDmg, element: element
        };
    }
    
    public equipPlugin(unitType: UnitType, slotIndex: number, instanceId: string | null) {
        const unit = this.state.hive.unlockedUnits[unitType];
        if (instanceId) {
            const existingIdx = unit.loadout.indexOf(instanceId);
            if (existingIdx !== -1 && existingIdx !== slotIndex) unit.loadout[existingIdx] = null;
        }
        const old = unit.loadout[slotIndex];
        unit.loadout[slotIndex] = instanceId;
        const load = this.calculateLoad(unitType, unit.loadout);
        if (load > UNIT_CONFIGS[unitType].baseLoadCapacity) {
            unit.loadout[slotIndex] = old;
            return false;
        }
        this.saveGame();
        this.events.emit('PLUGIN_EQUIPPED', { unitType });
        return true;
    }
    public fusePlugin(instanceId: string): boolean {
         const instance = this.state.hive.inventory.plugins.find(p => p.instanceId === instanceId);
         if (!instance) return false;
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
    public addPlugin(templateId: string) { }
    public unlockRegion(id: number) { 
        if (!this.state.world.regions[id]) { this.state.world.regions[id] = {id, isUnlocked:true, devourProgress:0}; this.events.emit('REGION_UNLOCKED', id); this.saveGame(); } 
    }
    public updateRegionProgress(id: number, delta: number) {
        if (!this.state.world.regions[id]) return;
        this.state.world.regions[id].devourProgress = Math.min(100, this.state.world.regions[id].devourProgress + delta);
        if (this.state.world.regions[id].devourProgress >= 100 && id < 10) this.unlockRegion(id+1);
        this.events.emit('REGION_PROGRESS', {id, progress: this.state.world.regions[id].devourProgress});
    }

    public getMetabolismUpgradeCost(key: string): number {
        const meta = this.state.hive.metabolism;
        let config: any = null;
        let currentLevel = 1;

        if (key === 'miningLevel') { config = METABOLISM_UPGRADES.MINING; currentLevel = meta.miningLevel; }
        else if (key === 'digestLevel') { config = METABOLISM_UPGRADES.DIGESTION; currentLevel = meta.digestLevel; }
        else if (key === 'centrifugeLevel') { config = METABOLISM_UPGRADES.CENTRIFUGE; currentLevel = meta.centrifugeLevel; }
        else if (key === 'hiveCoreLevel') { config = METABOLISM_UPGRADES.HIVE_CORE; currentLevel = meta.hiveCoreLevel; }
        else if (key === 'storageLevel') { config = METABOLISM_UPGRADES.STORAGE; currentLevel = meta.storageLevel; }
        else if (key === 'maxSupplyLevel') { config = METABOLISM_UPGRADES.SUPPLY; currentLevel = meta.maxSupplyLevel; }

        if (!config) return 999999;
        return Math.floor(config.BASE_COST * Math.pow(config.COST_FACTOR, currentLevel - 1));
    }

    public upgradeMetabolism(key: string) {
        const cost = this.getMetabolismUpgradeCost(key);
        if (this.state.resources.biomass >= cost) {
            this.modifyResource('biomass', -cost);
            const meta: any = this.state.hive.metabolism;
            if (meta[key] !== undefined) {
                meta[key]++;
                this.saveGame();
                this.events.emit('PRODUCTION_CHANGED', {});
            }
        }
    }
}
