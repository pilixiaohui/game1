

import { Application, Container, Graphics, TilingSprite } from 'pixi.js';
import { Faction, GameModifiers, UnitType, GameStateSnapshot, RoguelikeCard } from '../types';
import { HUMAN_STATS, LANE_Y, LANE_HEIGHT, DECAY_TIME, MILESTONE_DISTANCE, COLLISION_BUFFER, MAX_SCREEN_UNITS, ELEMENT_COLORS, INITIAL_REGIONS_CONFIG } from '../constants';
import { DataManager } from './DataManager';

// --- Components / ECS Data ---
class Unit {
  active: boolean = false;
  id: number = 0;
  faction: Faction = Faction.ZERG;
  type: UnitType = UnitType.MELEE;
  
  // Transform
  x: number = 0;
  y: number = 0;
  radius: number = 15;
  
  // Stats
  hp: number = 0;
  maxHp: number = 0;
  damage: number = 0;
  range: number = 0;
  speed: number = 0;
  attackCooldown: number = 0;
  maxAttackCooldown: number = 0;
  
  // Advanced Stats
  critChance: number = 0;
  critDamage: number = 1.5;
  element: 'PHYSICAL' | 'TOXIN' | 'FIRE' | 'ICE' | 'ELECTRIC' = 'PHYSICAL';
  
  // State
  state: 'MOVE' | 'ATTACK' | 'IDLE' | 'DEAD' | 'WANDER' = 'IDLE';
  isDead: boolean = false;
  decayTimer: number = 0;
  target: Unit | null = null;
  
  // Visuals
  view: Graphics | null = null;
  hpBar: Graphics | null = null;

  // Wander State
  wanderTimer: number = 0;
  wanderDir: number = 0;

  constructor(id: number) {
    this.id = id;
  }
}

// --- Object Pool ---
class UnitPool {
  private pool: Unit[] = [];
  public container: Container;
  
  constructor(size: number, container: Container) {
    this.container = container;

    for (let i = 0; i < size; i++) {
      const u = new Unit(i);
      u.view = new Graphics();
      u.hpBar = new Graphics();
      u.view.addChild(u.hpBar);
      this.container.addChild(u.view);
      u.view.visible = false;
      this.pool.push(u);
    }
  }

  spawn(faction: Faction, type: UnitType, x: number, modifiers: GameModifiers): Unit | null {
    const unit = this.pool.find(u => !u.active);
    if (!unit) return null;

    unit.active = true;
    unit.isDead = false;
    unit.faction = faction;
    unit.type = type;
    unit.x = x;
    
    // 2.5D Depth
    const r1 = Math.random();
    const r2 = Math.random();
    const yOffset = (r1 - r2) * (LANE_HEIGHT / 2); 
    unit.y = LANE_Y + yOffset;
    
    unit.state = faction === Faction.ZERG ? 'MOVE' : 'IDLE';
    unit.target = null;
    unit.attackCooldown = 0;

    // --- DATA DRIVEN STATS ---
    let stats;
    if (faction === Faction.ZERG) {
        // Fetch dynamic stats from DataManager based on Level + Modifiers + Plugins
        stats = DataManager.instance.getUnitStats(type, modifiers);
    } else {
        // Human stats are static for now, or could come from Region Config
        stats = HUMAN_STATS[type] || HUMAN_STATS[UnitType.HUMAN_MARINE];
    }

    unit.maxHp = stats.maxHp;
    unit.hp = unit.maxHp;
    unit.damage = stats.damage;
    unit.range = stats.range;
    unit.speed = stats.speed;
    unit.maxAttackCooldown = stats.attackSpeed;
    unit.radius = stats.width / 2;
    unit.critChance = stats.critChance || 0.05;
    unit.critDamage = stats.critDamage || 1.5;
    unit.element = stats.element || 'PHYSICAL';

    // Visual Reset
    if (unit.view) {
      unit.view.visible = true;
      unit.view.alpha = 1.0;
      unit.view.scale.set(1.0);
      unit.view.rotation = 0;
      unit.view.tint = 0xffffff;
      
      unit.view.clear();
      
      // Shadow
      unit.view.beginFill(0x000000, 0.4);
      unit.view.drawEllipse(0, 0, stats.width / 1.8, stats.width / 4);
      unit.view.endFill();

      // Body Render Logic
      const bodyColor = stats.color;
      unit.view.beginFill(bodyColor);

      if (faction === Faction.ZERG) {
         // Zerg Shapes
         unit.view.drawRoundedRect(-stats.width / 2, -stats.height, stats.width, stats.height, 4);
         unit.view.endFill();
         
         // Zerg Eye
         unit.view.beginFill(0xffffff, 0.9);
         unit.view.drawCircle(5, -stats.height + 8, 3);
         unit.view.endFill();
      } else {
         // Human Shapes based on Role
         if (type === UnitType.HUMAN_RIOT) {
             // Shield shape
             unit.view.drawRect(-stats.width/2, -stats.height, stats.width, stats.height);
             unit.view.endFill();
             // Shield Plate
             unit.view.beginFill(0x3b82f6); // Lighter blue
             unit.view.drawRect(-stats.width/2 - 5, -stats.height + 5, 10, stats.height - 10);
             unit.view.endFill();
         } 
         else if (type === UnitType.HUMAN_SNIPER) {
             // Tall thin
             unit.view.drawRect(-stats.width/2, -stats.height, stats.width, stats.height);
             unit.view.endFill();
             // Long Barrel
             unit.view.beginFill(0x000000);
             unit.view.drawRect(-stats.width, -stats.height + 10, -15, 2);
             unit.view.endFill();
         }
         else if (type === UnitType.HUMAN_TANK) {
             // Big Mech
             unit.view.drawRoundedRect(-stats.width/2, -stats.height, stats.width, stats.height, 8);
             unit.view.endFill();
             // Cockpit
             unit.view.beginFill(0xfacc15); // Yellow glass
             unit.view.drawRect(-10, -stats.height + 10, 20, 10);
             unit.view.endFill();
         }
         else if (type === UnitType.HUMAN_PYRO) {
             // Pyro with backpack
             unit.view.drawRect(-stats.width/2, -stats.height, stats.width, stats.height);
             unit.view.endFill();
             // Tank on back
             unit.view.beginFill(0xff4500);
             unit.view.drawRect(stats.width/2, -stats.height + 5, 6, 20);
             unit.view.endFill();
         }
         else {
             // Standard Marine
             unit.view.drawRect(-stats.width / 2, -stats.height, stats.width, stats.height);
             unit.view.endFill();
             // Visor
             unit.view.beginFill(0x60a5fa);
             unit.view.drawRect(-8, -stats.height + 6, 16, 4);
             unit.view.endFill();
         }
      }

      unit.view.position.set(unit.x, unit.y);
      unit.view.zIndex = unit.y; 
    }

    return unit;
  }

  recycle(unit: Unit) {
    unit.active = false;
    unit.isDead = false;
    if (unit.view) unit.view.visible = false;
  }

  getActiveUnits(): Unit[] {
    return this.pool.filter(u => u.active);
  }
}

// --- Main Engine ---
export class GameEngine {
  public app: Application | null = null;
  public world: Container;
  
  private bgLayer: TilingSprite | null = null;
  private groundLayer: TilingSprite | null = null;
  private unitPool: UnitPool | null = null;
  private unitLayer: Container;
  private particleLayer: Container;

  // Local battle Modifiers
  public modifiers: GameModifiers = {
    damageMultiplier: 1.0,
    maxHpMultiplier: 1.0,
    resourceRateMultiplier: 1.0,
    explodeOnDeath: false,
    doubleSpawnChance: 0.0,
  };

  public humanDifficultyMultiplier: number = 1.0;
  public activeRegionId: number = 0;

  // Timers
  private deploymentTimer: number = 0; // Throttles deployment
  private humanSpawnTimer: number = 0;
  
  // Camera & Progression
  public cameraX: number = 0;
  private lastProgressUpdateX: number = 0;

  public isPaused: boolean = false;
  private isDestroyed: boolean = false;
  
  // Stockpile Mode (Restless Swarm Visualization)
  public isStockpileMode: boolean = false;

  constructor() {
    this.world = new Container();
    this.unitLayer = new Container();
    this.particleLayer = new Container();
  }

  async init(element: HTMLElement) {
    if (this.app || this.isDestroyed) return;
    
    // Clean element
    while (element.firstChild) element.removeChild(element.firstChild);

    const app = new Application({
        resizeTo: element,
        backgroundColor: 0x0a0a0a,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
    });
    
    this.app = app;
    // @ts-ignore
    element.appendChild(this.app.view);

    // --- Backgrounds ---
    const bgGfx = new Graphics();
    bgGfx.beginFill(0x111111); bgGfx.drawRect(0, 0, 512, 512); bgGfx.endFill();
    bgGfx.beginFill(0x1a1a1a);
    for(let i=0; i<40; i++) bgGfx.drawCircle(Math.random() * 512, Math.random() * 512, Math.random() * 20 + 5);
    bgGfx.endFill();
    const bgTex = this.app.renderer.generateTexture(bgGfx);
    this.bgLayer = new TilingSprite(bgTex, this.app.screen.width, this.app.screen.height);
    this.app.stage.addChild(this.bgLayer);

    const floorGfx = new Graphics();
    floorGfx.beginFill(0x222222); floorGfx.drawRect(0, 0, 128, 128); floorGfx.endFill();
    floorGfx.lineStyle(2, 0x333333, 0.5); floorGfx.moveTo(0, 100); floorGfx.lineTo(128, 100); 
    const floorTex = this.app.renderer.generateTexture(floorGfx);
    this.groundLayer = new TilingSprite(floorTex, this.app.screen.width, this.app.screen.height / 2 + 200);
    this.groundLayer.anchor.set(0, 0);
    this.groundLayer.y = (this.app.screen.height / 2) - 50; 
    this.app.stage.addChild(this.groundLayer);

    // --- Containers ---
    this.world.position.set(0, this.app.screen.height / 2);
    this.world.sortableChildren = true;
    this.app.stage.addChild(this.world);
    this.unitLayer.sortableChildren = true;
    this.world.addChild(this.unitLayer);
    this.world.addChild(this.particleLayer);

    this.unitPool = new UnitPool(400, this.unitLayer);

    this.app.ticker.add(this.update.bind(this));
  }

  public setStockpileMode(enabled: boolean) {
      this.isStockpileMode = enabled;
      // Reset camera when switching
      if (enabled) {
          this.cameraX = 0;
          if (this.world) this.world.position.x = 0;
          
          // Clear Human Units
          this.unitPool?.getActiveUnits().forEach(u => {
              if (u.faction === Faction.HUMAN) this.unitPool?.recycle(u);
          });
      }
  }

  private update(delta: number) {
    if (this.isPaused || !this.app || this.isDestroyed) return;
    const dt = delta / 60; 

    // 1. DataManager Ticking
    DataManager.instance.updateTick(dt * this.modifiers.resourceRateMultiplier);

    if (this.isStockpileMode) {
        this.updateStockpileVisualization(dt);
    } else {
        // Battle Mode Logic
        this.handleDeployment(dt);
        this.handleHumanSpawning(dt);
    }

    // 3. Game Logic Shared
    const allUnits = this.unitPool!.getActiveUnits();
    const livingUnits = allUnits.filter(u => !u.isDead);
    
    // Separate for AI
    const zergUnits = livingUnits.filter(u => u.faction === Faction.ZERG);
    const humanUnits = livingUnits.filter(u => u.faction === Faction.HUMAN);
    zergUnits.sort((a, b) => a.x - b.x); 

    if (!this.isStockpileMode) {
        // 4. Camera & Push System (Battle Only)
        let frontX = 0;
        if (zergUnits.length > 0) {
            const leaders = zergUnits.slice(-3); 
            frontX = leaders.reduce((acc, u) => acc + u.x, 0) / leaders.length;
        } else {
            frontX = this.cameraX + 200; 
        }

        const desiredOffset = this.app.screen.width * 0.6; 
        const goalX = Math.max(0, frontX - desiredOffset);
        const camDiff = goalX - this.cameraX;
        this.cameraX += camDiff * (camDiff > 0 ? 0.05 : 0.02);

        // Sync World Position
        this.world.position.x = -this.cameraX; 
        if (this.bgLayer) this.bgLayer.tilePosition.x = -this.cameraX * 0.1;
        if (this.groundLayer) this.groundLayer.tilePosition.x = -this.cameraX;
    } else {
        // Static Camera in Stockpile
        this.world.position.x = 0;
        if (this.bgLayer) this.bgLayer.tilePosition.x += 0.2; // Slow drift
    }

    // 5. Update Units
    allUnits.forEach(u => {
      if (u.isDead) this.processCorpse(u, dt);
      else {
          const enemies = u.faction === Faction.ZERG ? humanUnits : zergUnits;
          const friends = u.faction === Faction.ZERG ? zergUnits : humanUnits;
          this.processUnit(u, dt, enemies, friends);
      }
    });

    this.unitLayer.children.sort((a, b) => a.zIndex - b.zIndex);

    // 6. Map Progression Check (Battle Only)
    if (!this.isStockpileMode && this.cameraX - this.lastProgressUpdateX > 100) {
        const deltaMeters = (this.cameraX - this.lastProgressUpdateX) / 10; 
        DataManager.instance.updateRegionProgress(this.activeRegionId, deltaMeters * 0.05);
        this.lastProgressUpdateX = this.cameraX;
    }

    // Cleanup
    if (this.unitPool && !this.isStockpileMode) {
        allUnits.forEach(u => {
            if (u.x < this.cameraX - 200) this.unitPool!.recycle(u);
        });
    }
  }

  private updateStockpileVisualization(dt: number) {
      // Sync visual count with actual stockpile data
      // Limit visuals to avoid performance kill, e.g., 50 units max on screen
      const VISUAL_CAP = 50; 
      const stockpile = DataManager.instance.state.hive.unitStockpile;
      const totalStored = stockpile[UnitType.MELEE] + stockpile[UnitType.RANGED];
      
      const activeVisuals = this.unitPool!.getActiveUnits().filter(u => u.faction === Faction.ZERG);
      const currentVisualCount = activeVisuals.length;
      
      // Calculate target visual count (scaled)
      // If we have 1 unit, show 1. If we have 1000, show 50.
      const targetVisualCount = Math.min(VISUAL_CAP, totalStored);

      // Spawn if deficit
      if (currentVisualCount < targetVisualCount) {
          // Determine type based on ratio
          const meleeStored = stockpile[UnitType.MELEE];
          const rangedStored = stockpile[UnitType.RANGED];
          const isMelee = Math.random() < (meleeStored / (meleeStored + rangedStored || 1));
          
          const spawnX = Math.random() * this.app!.screen.width;
          const u = this.unitPool!.spawn(Faction.ZERG, isMelee ? UnitType.MELEE : UnitType.RANGED, spawnX, this.modifiers);
          if (u) u.state = 'WANDER';
      }
      
      // Despawn if surplus (or if real stockpile dropped)
      if (currentVisualCount > targetVisualCount) {
          const u = activeVisuals[0];
          if (u) this.unitPool!.recycle(u);
      }
  }

  private handleDeployment(dt: number) {
    if (!this.app || !this.unitPool) return;
    
    // 1. Throttle Deployment
    this.deploymentTimer += dt;
    if (this.deploymentTimer < 0.2) return; 
    this.deploymentTimer = 0;

    // 2. Deployment Logic with Ratios
    const activeZerg = this.unitPool.getActiveUnits().filter(u => u.faction === Faction.ZERG && !u.isDead);
    const activeTotal = activeZerg.length;

    // Hard cap total
    if (activeTotal >= MAX_SCREEN_UNITS) return;

    // Calculate Ratio-based Caps
    const weights = DataManager.instance.state.hive.production.unitWeights;
    const wMelee = weights[UnitType.MELEE] || 0;
    const wRanged = weights[UnitType.RANGED] || 0;
    const totalWeight = wMelee + wRanged || 1;

    // Max number of units allowed on screen per type based on ratio
    const maxMeleeOnScreen = Math.floor(MAX_SCREEN_UNITS * (wMelee / totalWeight));
    const maxRangedOnScreen = Math.floor(MAX_SCREEN_UNITS * (wRanged / totalWeight));
    
    const activeMelee = activeZerg.filter(u => u.type === UnitType.MELEE).length;
    const activeRanged = activeZerg.filter(u => u.type === UnitType.RANGED).length;

    const stockpile = DataManager.instance.state.hive.unitStockpile;
    const spawnX = this.cameraX - 100 - (Math.random() * 50);

    // Try Deploy Melee if below ratio cap
    if (stockpile[UnitType.MELEE] > 0 && activeMelee < maxMeleeOnScreen) {
        const success = DataManager.instance.consumeStockpile(UnitType.MELEE);
        if (success) {
            this.unitPool.spawn(Faction.ZERG, UnitType.MELEE, spawnX, this.modifiers);
            // Chance for double spawn if mutation active
            if (Math.random() < this.modifiers.doubleSpawnChance) {
                 this.unitPool.spawn(Faction.ZERG, UnitType.MELEE, spawnX - 20, this.modifiers);
            }
        }
    } 
    // Try Deploy Ranged if below ratio cap
    else if (stockpile[UnitType.RANGED] > 0 && activeRanged < maxRangedOnScreen) {
        const success = DataManager.instance.consumeStockpile(UnitType.RANGED);
        if (success) {
            this.unitPool.spawn(Faction.ZERG, UnitType.RANGED, spawnX, this.modifiers);
        }
    }
  }

  private handleHumanSpawning(dt: number) {
    if (!this.app || !this.unitPool) return;

    const difficultyMult = 1 + (this.cameraX / 1500) * this.humanDifficultyMultiplier; 
    const baseHumanInterval = Math.max(0.8, 3.5 / difficultyMult); 
    
    this.humanSpawnTimer += dt;
    if (this.humanSpawnTimer > baseHumanInterval) {
        this.humanSpawnTimer = 0;
        const spawnXBase = this.cameraX + this.app.screen.width + 150;
        const waveSize = 2 + Math.floor(Math.random() * difficultyMult);
        
        // --- REGION SPAWN TABLE LOGIC ---
        const regionConfig = INITIAL_REGIONS_CONFIG.find(r => r.id === this.activeRegionId);
        const spawnTable = regionConfig?.spawnTable || [{ type: UnitType.HUMAN_MARINE, weight: 1.0 }];

        for(let i=0; i<waveSize; i++) {
             const spawnX = spawnXBase + (Math.random() * 200); 
             
             // Weighted Random Selection
             const totalWeight = spawnTable.reduce((acc, entry) => acc + entry.weight, 0);
             let random = Math.random() * totalWeight;
             let selectedType = UnitType.HUMAN_MARINE;
             
             for (const entry of spawnTable) {
                 random -= entry.weight;
                 if (random <= 0) {
                     selectedType = entry.type;
                     break;
                 }
             }

             this.unitPool!.spawn(Faction.HUMAN, selectedType, spawnX, this.modifiers);
        }
    }
  }

  // ... (Physics/Combat methods unchanged) ... 
  
  private processUnit(u: Unit, dt: number, enemies: Unit[], friends: Unit[]) {
     if (this.isStockpileMode && u.faction === Faction.ZERG) {
         // --- STOCKPILE WANDER LOGIC ---
         u.state = 'WANDER';
         u.target = null;
         
         u.wanderTimer -= dt;
         if (u.wanderTimer <= 0) {
             u.wanderTimer = 1 + Math.random() * 2;
             u.wanderDir = Math.random() > 0.5 ? 1 : -1;
             // Chance to stop
             if (Math.random() < 0.3) u.wanderDir = 0;
         }

         // Jittery movement
         const speed = u.speed * 0.3; // Slower in base
         let dx = u.wanderDir * speed * dt;
         
         // Keep in bounds
         if (this.app) {
             if (u.x < 50) u.wanderDir = 1;
             if (u.x > this.app.screen.width - 50) u.wanderDir = -1;
         }
         u.x += dx;
         u.y += (Math.random() - 0.5) * 0.5; // Slight vertical jitter
         
         // Clamp Y
         if (u.y < LANE_Y - LANE_HEIGHT/2) u.y = LANE_Y - LANE_HEIGHT/2;
         if (u.y > LANE_Y + LANE_HEIGHT/2) u.y = LANE_Y + LANE_HEIGHT/2;

         if (u.view) {
             u.view.position.x = u.x;
             u.view.y = u.y;
             u.view.zIndex = u.y;
             // Face direction
             if (Math.abs(dx) > 0.1) {
                 u.view.scale.x = Math.sign(dx);
             }
         }
         return; // Skip combat logic
     }


     // Target & State Logic
     let nearestDist = Infinity;
     let nearestUnit: Unit | null = null;
     for (const enemy of enemies) {
        const dx = enemy.x - u.x;
        const forwardDir = u.faction === Faction.ZERG ? 1 : -1;
        if (Math.sign(dx) !== forwardDir && Math.abs(dx) > 30) continue;
        const dist = Math.sqrt((enemy.x - u.x)**2 + (enemy.y - u.y)**2); 
        if (dist < nearestDist) { nearestDist = dist; nearestUnit = enemy; }
     }
     u.target = nearestUnit;

     if (u.faction === Faction.ZERG) {
        u.state = 'MOVE';
        if (u.target && (nearestDist <= u.radius + u.target.radius + COLLISION_BUFFER || nearestDist <= u.range)) {
            u.state = 'ATTACK';
        }
     } else {
        u.state = 'IDLE';
        if (u.target && nearestDist <= u.range) u.state = 'ATTACK';
     }

     // Physics
     if (u.state === 'MOVE' || u.state === 'IDLE') {
        const direction = u.faction === Faction.ZERG ? 1 : -1;
        let dxMove = 0;
        let dyMove = 0;
        if (u.faction === Faction.ZERG && u.state === 'MOVE') dxMove += u.speed * dt * direction;

        // Separation
        for (const friend of friends) {
            if (friend === u) continue;
            
            // CORE CHANGE: Skip collision logic if both are ZERG (Fluid Swarm)
            if (u.faction === Faction.ZERG && friend.faction === Faction.ZERG) continue;

            if (Math.abs(friend.x - u.x) > 40) continue; 
            const fDx = u.x - friend.x;
            const fDy = u.y - friend.y;
            const distSq = fDx*fDx + fDy*fDy;
            const minSep = u.radius + friend.radius;
            if (distSq < minSep * minSep && distSq > 0.001) {
                const dist = Math.sqrt(distSq);
                const pushStr = (minSep - dist) / minSep; 
                dxMove += (fDx / dist) * pushStr * 200 * dt;
                dyMove += (fDy / dist) * pushStr * 200 * dt;
            }
        }
        u.x += dxMove;
        u.y += dyMove;
        if (u.y < LANE_Y - LANE_HEIGHT/2) u.y = LANE_Y - LANE_HEIGHT/2;
        if (u.y > LANE_Y + LANE_HEIGHT/2) u.y = LANE_Y + LANE_HEIGHT/2;
        
        if (u.view && Math.abs(dxMove) > 0.5) u.view.y = u.y + Math.sin(u.x * 0.15) * 2;
        else if (u.view) u.view.y = u.y;
     } else if (u.state === 'ATTACK') {
        u.attackCooldown -= dt;
        if (u.attackCooldown <= 0 && u.target) {
            u.attackCooldown = u.maxAttackCooldown;
            this.performAttack(u, u.target);
        }
        if (u.view) u.view.y = u.y;
     }

     if (u.view) {
        u.view.position.x = u.x;
        u.view.zIndex = u.y;
        if (u.hpBar) {
            u.hpBar.clear();
            if (u.hp < u.maxHp) {
                const pct = Math.max(0, u.hp / u.maxHp);
                u.hpBar.beginFill(0x000000); u.hpBar.drawRect(-12, -u.radius * 2 - 10, 24, 4); u.hpBar.endFill();
                u.hpBar.beginFill(pct < 0.3 ? 0xff0000 : 0x00ff00); u.hpBar.drawRect(-12, -u.radius * 2 - 10, 24 * pct, 4); u.hpBar.endFill();
            }
        }
     }
  }

  private performAttack(source: Unit, target: Unit) {
     if (source.view) source.view.x += (source.faction === Faction.ZERG ? -1 : 1) * 4; 
     
     // Determine element color
     let color = 0xffaa00;
     if (source.faction === Faction.ZERG) {
         color = ELEMENT_COLORS[source.element];
     } else {
         if (source.type === UnitType.HUMAN_PYRO) color = ELEMENT_COLORS.FIRE;
         else if (source.type === UnitType.HUMAN_TANK) color = ELEMENT_COLORS.ELECTRIC;
     }

     const isRanged = source.type === UnitType.RANGED || 
                      source.type === UnitType.HUMAN_MARINE || 
                      source.type === UnitType.HUMAN_SNIPER ||
                      source.type === UnitType.HUMAN_TANK;

     if (isRanged) {
         this.createProjectile(source.x, source.y - 15, target.x, target.y - 15, color);
         this.dealDamage(source, target);
     } else {
         // Melee or Short Range (Pyro/Riot)
         this.createFlash(target.x + (Math.random()*10-5), target.y - 10, color);
         this.dealDamage(source, target);
     }
  }

  private dealDamage(source: Unit, target: Unit) {
      if (target.isDead) return;
      
      let dmg = source.damage;
      let isCrit = false;

      // Crit Calculation
      if (Math.random() < source.critChance) {
          dmg *= source.critDamage;
          isCrit = true;
      }

      target.hp -= dmg;
      
      // Visual feedback
      if (target.view) {
          target.view.tint = isCrit ? 0xffff00 : 0xffaaaa;
          setTimeout(() => { if (target.view && !target.isDead) target.view.tint = 0xffffff; }, 100);
      }
      
      // Pop text for crits (Simple version)
      if (isCrit) this.createDamagePop(target.x, target.y - 30, Math.floor(dmg), source.element);

      if (target.hp <= 0) this.killUnit(target);
  }

  private createDamagePop(x: number, y: number, value: number, element: string) {
      // Basic implementation using existing particle layer for now
      // Replaced drawStar with manual polygon because 'drawStar' requires graphics-extras
      if (!this.app || this.isDestroyed) return;
      const gfx = new Graphics();
      gfx.beginFill(ELEMENT_COLORS[element as keyof typeof ELEMENT_COLORS] || 0xffffff, 0.8);
      
      // Manual 4-point star/diamond drawing
      const rOuter = 10;
      const rInner = 4;
      const points = [];
      for (let i = 0; i < 8; i++) {
        const radius = (i % 2 === 0) ? rOuter : rInner;
        const angle = i * Math.PI / 4;
        points.push(Math.sin(angle) * radius, Math.cos(angle) * radius);
      }
      gfx.drawPolygon(points);
      
      gfx.endFill();
      gfx.position.set(x, y);
      this.particleLayer.addChild(gfx);
      
      let life = 20;
      const animate = () => {
          if (this.isDestroyed || gfx.destroyed) return;
          life--; 
          gfx.y -= 1;
          gfx.alpha = life / 20;
          if (life <= 0) gfx.destroy(); else requestAnimationFrame(animate);
      };
      animate();
  }

  private processCorpse(u: Unit, dt: number) {
      u.decayTimer -= dt;
      if (u.view) {
          u.view.y += 10 * dt; 
          u.view.alpha = Math.max(0, u.decayTimer / DECAY_TIME); 
      }
      if (u.decayTimer <= 0) this.unitPool!.recycle(u);
  }

  private killUnit(u: Unit) {
      u.isDead = true;
      u.state = 'DEAD';
      u.decayTimer = DECAY_TIME;
      
      // RECYCLING LOGIC (Centralized via DataManager)
      if (u.faction === Faction.HUMAN) {
          // Loot based on type
          let bioReward = 10;
          let minReward = 2;
          
          if (u.type === UnitType.HUMAN_RIOT) { bioReward = 15; minReward = 5; }
          else if (u.type === UnitType.HUMAN_TANK) { bioReward = 50; minReward = 30; }

          DataManager.instance.modifyResource('biomass', bioReward); 
          DataManager.instance.modifyResource('minerals', minReward); 
      } else {
          // Recycle own unit
          // Now fetch the official recycle rate (e.g. 0.1 to 0.5)
          const recycleRate = DataManager.instance.getRecycleRate();
          
          // Base recycle value (hardcoded approx cost for now, or fetch config)
          const recycleValue = 5; 
          
          DataManager.instance.modifyResource('biomass', recycleValue * recycleRate);
      }

      if (u.view) {
          u.view.tint = 0x555555; 
          u.view.zIndex = -9999;
          u.view.rotation = (Math.random() * 0.5 - 0.25) + Math.PI / 2;
          u.view.scale.y = 0.5; 
          if (u.hpBar) u.hpBar.clear();
      }

      if (u.faction === Faction.ZERG && this.modifiers.explodeOnDeath) {
         this.createExplosion(u.x, u.y, 80);
         const units = this.unitPool!.getActiveUnits();
         units.forEach(enemy => {
             if (!enemy.isDead && enemy.faction === Faction.HUMAN) {
                 const dist = Math.sqrt((enemy.x - u.x)**2 + (enemy.y - u.y)**2);
                 if (dist < 80) {
                     enemy.hp -= 40; 
                     if (enemy.hp <= 0) this.killUnit(enemy);
                 }
             }
         });
      }
  }

  private createFlash(x: number, y: number, color: number) {
      if (!this.app || this.isDestroyed) return;
      const gfx = new Graphics();
      gfx.beginFill(color, 0.9);
      gfx.drawCircle(0, 0, 4);
      gfx.endFill();
      gfx.position.set(x, y);
      this.particleLayer.addChild(gfx);
      let life = 5;
      const animate = () => {
          if (this.isDestroyed || gfx.destroyed) return;
          life--; gfx.alpha = life / 5;
          if (life <= 0) gfx.destroy(); else requestAnimationFrame(animate);
      };
      animate();
  }

  private createProjectile(x1: number, y1: number, x2: number, y2: number, color: number) {
      if (!this.app || this.isDestroyed) return;
      const gfx = new Graphics();
      gfx.lineStyle(2, color, 1); gfx.moveTo(0, 0); gfx.lineTo(12, 0);
      gfx.position.set(x1, y1);
      gfx.rotation = Math.atan2(y2 - y1, x2 - x1);
      this.particleLayer.addChild(gfx);
      const speed = 800; const dist = Math.sqrt((x2-x1)**2 + (y2-y1)**2);
      const duration = dist / speed * 1000;
      const startTime = performance.now();
      const animate = (time: number) => {
          if (this.isDestroyed || gfx.destroyed) return;
          const t = Math.min(1, (time - startTime) / duration);
          gfx.x = x1 + (x2 - x1) * t; gfx.y = y1 + (y2 - y1) * t;
          if (t >= 1) gfx.destroy(); else requestAnimationFrame(animate);
      };
      requestAnimationFrame(animate);
  }

  private createExplosion(x: number, y: number, radius: number) {
      if (!this.app || this.isDestroyed) return;
      const gfx = new Graphics();
      gfx.beginFill(0x00ff00, 0.5); gfx.drawCircle(0, 0, 10); gfx.endFill();
      gfx.position.set(x, y);
      this.particleLayer.addChild(gfx);
      let frame = 0;
      const animate = () => {
          if (this.isDestroyed || gfx.destroyed) return;
          frame++; gfx.width += 8; gfx.height += 8; gfx.alpha -= 0.05;
          if (gfx.alpha <= 0) gfx.destroy(); else requestAnimationFrame(animate);
      };
      animate();
  }

  public getSnapshot(): GameStateSnapshot {
      const s = DataManager.instance.state;
      const baseSnapshot = {
          resources: s.resources.biomass,
          distance: Math.floor(this.cameraX / 10),
          stockpileMelee: s.hive.unitStockpile[UnitType.MELEE] || 0,
          stockpileRanged: s.hive.unitStockpile[UnitType.RANGED] || 0,
          stockpileTotal: (s.hive.unitStockpile[UnitType.MELEE] || 0) + (s.hive.unitStockpile[UnitType.RANGED] || 0),
          populationCap: DataManager.instance.getMaxPopulationCap(),
          isPaused: this.isPaused
      };

      if (!this.app || !this.unitPool) {
          return { ...baseSnapshot, unitCountZerg: 0, unitCountHuman: 0 };
      }
      const active = this.unitPool.getActiveUnits();
      return {
          ...baseSnapshot,
          unitCountZerg: active.filter(u => u.faction === Faction.ZERG && !u.isDead).length,
          unitCountHuman: active.filter(u => u.faction === Faction.HUMAN && !u.isDead).length,
      };
  }
  
  public applyCard(card: RoguelikeCard) { card.apply(this.modifiers); }
  public resume() { this.isPaused = false; }
  public pause() { this.isPaused = true; }
  public destroy() {
      this.isDestroyed = true;
      if (this.app) {
          try { this.app.destroy(true, { children: true, texture: true }); } 
          catch (e) { console.warn("GameEngine destroy error", e); }
      }
      this.app = null; this.unitPool = null;
  }
}