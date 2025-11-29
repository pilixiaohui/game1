
import { Application, Container, Graphics, TilingSprite, Text, TextStyle } from 'pixi.js';
import { Faction, GameModifiers, UnitType, GameStateSnapshot, RoguelikeCard, ElementType, StatusType, StatusEffect } from '../types';
import { UNIT_CONFIGS, LANE_Y, LANE_HEIGHT, DECAY_TIME, MILESTONE_DISTANCE, COLLISION_BUFFER, UNIT_SCREEN_CAPS, ELEMENT_COLORS, INITIAL_REGIONS_CONFIG, STATUS_CONFIG, STRONGHOLDS, OBSTACLES } from '../constants';
import { DataManager } from './DataManager';

// --- ECS-lite UNIT CLASS ---
class Unit {
  active: boolean = false;
  id: number = 0;
  faction: Faction = Faction.ZERG;
  type: UnitType = UnitType.MELEE;
  
  // Physics & Transform
  x: number = 0;
  y: number = 0;
  radius: number = 15;
  
  // Stats
  hp: number = 0;
  maxHp: number = 0;
  damage: number = 0;
  range: number = 0;
  speed: number = 0;
  baseSpeed: number = 0;
  armor: number = 0;
  
  // Attack State
  attackCooldown: number = 0;
  maxAttackCooldown: number = 0;
  critChance: number = 0;
  critDamage: number = 1.5;
  element: ElementType = 'PHYSICAL';
  statusPerHit: number = 10; // Default application amount
  flashTimer: number = 0; // Visual hit feedback timer
  
  // AI State
  state: 'MOVE' | 'ATTACK' | 'IDLE' | 'DEAD' | 'WANDER' = 'IDLE';
  isDead: boolean = false;
  decayTimer: number = 0;
  target: Unit | null = null;
  wanderTimer: number = 0;
  wanderDir: number = 0;
  
  // --- Swarm AI Properties ---
  engagedCount: number = 0; // How many attackers are currently locking this unit
  speedVar: number = 1.0;   // Speed variance factor (0.9 - 1.1)
  waveOffset: number = 0;   // Offset for sine wave movement
  
  // Visuals
  view: Graphics | null = null;
  hpBar: Graphics | null = null;
  
  // --- NEW: STATUS MANAGER COMPONENT ---
  statuses: Partial<Record<StatusType, StatusEffect>> = {};

  constructor(id: number) { 
      this.id = id; 
      this.speedVar = 0.9 + Math.random() * 0.2; // +/- 10% speed
      this.waveOffset = Math.random() * 100;
  }
}

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
    const r1 = Math.random();
    const r2 = Math.random();
    const yOffset = (r1 - r2) * (LANE_HEIGHT / 2); 
    unit.y = LANE_Y + yOffset;
    unit.state = faction === Faction.ZERG ? 'MOVE' : 'IDLE';
    unit.target = null;
    unit.attackCooldown = 0;
    unit.statuses = {}; // Reset statuses
    unit.flashTimer = 0;
    
    // Reset AI props
    unit.engagedCount = 0;
    unit.speedVar = 0.85 + Math.random() * 0.3; // More variance
    unit.waveOffset = Math.random() * 100;

    let stats;
    if (faction === Faction.ZERG) {
        stats = DataManager.instance.getUnitStats(type, modifiers);
    } else {
        const config = UNIT_CONFIGS[type];
        stats = {
            maxHp: config.baseStats.hp * (1 + (x/5000)), // Scaling for humans
            damage: config.baseStats.damage,
            range: config.baseStats.range,
            speed: config.baseStats.speed,
            attackSpeed: config.baseStats.attackSpeed,
            width: config.baseStats.width,
            height: config.baseStats.height,
            color: config.baseStats.color,
            armor: config.baseStats.armor,
            critChance: 0.05,
            critDamage: 1.5,
            element: config.elementConfig?.type || 'PHYSICAL'
        };
    }

    unit.maxHp = stats.maxHp;
    unit.hp = unit.maxHp;
    unit.damage = stats.damage;
    unit.range = stats.range;
    unit.baseSpeed = stats.speed;
    unit.speed = stats.speed;
    unit.maxAttackCooldown = stats.attackSpeed;
    unit.radius = stats.width / 2;
    unit.critChance = stats.critChance || 0.05;
    unit.critDamage = stats.critDamage || 1.5;
    unit.element = stats.element || 'PHYSICAL';
    unit.armor = stats.armor || 0;
    
    // Config specific status app rate (e.g., Pyro applies more fire per tick)
    unit.statusPerHit = UNIT_CONFIGS[type].elementConfig?.statusPerHit || 15;

    if (unit.view) {
      unit.view.visible = true;
      unit.view.alpha = 1.0;
      unit.view.scale.set(1.0);
      unit.view.rotation = 0;
      unit.view.tint = 0xffffff;
      this.drawUnitView(unit, stats.width, stats.height, stats.color);
      unit.view.position.set(unit.x, unit.y);
      unit.view.zIndex = unit.y; 
    }
    return unit;
  }
  
  drawUnitView(unit: Unit, width: number, height: number, color: number) {
      if (!unit.view) return;
      unit.view.clear();
      // Shadow
      unit.view.beginFill(0x000000, 0.4);
      unit.view.drawEllipse(0, 0, width / 1.8, width / 4);
      unit.view.endFill();
      
      // Body
      unit.view.beginFill(color);
      if (unit.faction === Faction.ZERG) {
         if (unit.type === UnitType.PYROVORE) {
             // Bulbous back for artillery
             unit.view.drawCircle(0, -height/2, width/2);
             unit.view.endFill();
             // Eye
             unit.view.beginFill(0xffffff, 0.9);
             unit.view.drawCircle(4, -height/2 - 4, 3);
             unit.view.endFill();
         } else if (unit.type === UnitType.CRYOLISK) {
             // Fast, spiky
             unit.view.moveTo(0, -height);
             unit.view.lineTo(width/2, 0);
             unit.view.lineTo(-width/2, 0);
             unit.view.lineTo(0, -height);
             unit.view.endFill();
             // Eye
             unit.view.beginFill(0xffffff, 0.9);
             unit.view.drawCircle(0, -height + 10, 2);
             unit.view.endFill();
         } else if (unit.type === UnitType.OMEGALIS) {
             // Big tank
             unit.view.drawRoundedRect(-width/2, -height, width, height, 8);
             unit.view.drawRect(-width/2 - 4, -height + 10, width + 8, 10); // Armor plates
             unit.view.endFill();
             // Eye
             unit.view.beginFill(0xffffff, 0.9);
             unit.view.drawCircle(8, -height + 12, 4);
             unit.view.endFill();
         } else if (unit.type === UnitType.QUEEN) {
             // Queen visual - taller, majestic
             unit.view.drawRoundedRect(-width/2, -height, width, height, 10);
             unit.view.drawCircle(0, -height, width/1.5);
             unit.view.endFill();
             unit.view.beginFill(0xffffff, 0.9);
             unit.view.drawCircle(0, -height + 15, 4);
             unit.view.endFill();
         } else {
             // Default (Melee/Ranged)
             unit.view.drawRoundedRect(-width / 2, -height, width, height, 4);
             unit.view.endFill();
             // Eye
             unit.view.beginFill(0xffffff, 0.9);
             unit.view.drawCircle(5, -height + 8, 3);
             unit.view.endFill();
         }
      } else {
         // Humans
         if (unit.type === UnitType.HUMAN_RIOT) {
             unit.view.drawRect(-width/2, -height, width, height);
             unit.view.endFill();
             unit.view.beginFill(0x3b82f6);
             unit.view.drawRect(-width/2 - 5, -height + 5, 10, height - 10);
             unit.view.endFill();
         } 
         else if (unit.type === UnitType.HUMAN_SNIPER) {
             unit.view.drawRect(-width/2, -height, width, height);
             unit.view.endFill();
             unit.view.beginFill(0x000000);
             unit.view.drawRect(-width, -height + 10, -15, 2);
             unit.view.endFill();
         }
         else if (unit.type === UnitType.HUMAN_TANK) {
             unit.view.drawRoundedRect(-width/2, -height, width, height, 8);
             unit.view.endFill();
             unit.view.beginFill(0xfacc15);
             unit.view.drawRect(-10, -height + 10, 20, 10);
             unit.view.endFill();
         }
         else if (unit.type === UnitType.HUMAN_PYRO) {
             unit.view.drawRect(-width/2, -height, width, height);
             unit.view.endFill();
             unit.view.beginFill(0xff4500); // Fuel tank
             unit.view.drawRect(width/2, -height + 5, 6, 20);
             unit.view.endFill();
         }
         else {
             unit.view.drawRect(-width / 2, -height, width, height);
             unit.view.endFill();
             unit.view.beginFill(0x60a5fa);
             unit.view.drawRect(-8, -height + 6, 16, 4);
             unit.view.endFill();
         }
      }
  }

  recycle(unit: Unit) {
    unit.active = false;
    unit.isDead = false;
    if (unit.view) unit.view.visible = false;
  }
  getActiveUnits(): Unit[] { return this.pool.filter(u => u.active); }
}

interface ActiveParticle {
    view: Graphics | Text;
    type: 'GRAPHICS' | 'TEXT';
    life: number;
    maxLife: number;
    update: (p: ActiveParticle, dt: number) => boolean;
}

export class GameEngine {
  public app: Application | null = null;
  public world: Container;
  
  private bgLayer: TilingSprite | null = null;
  private groundLayer: TilingSprite | null = null;
  private unitPool: UnitPool | null = null;
  private unitLayer: Container;
  private particleLayer: Container;

  // Object Pooling for Particles
  private graphicsPool: Graphics[] = [];
  private textPool: Text[] = [];
  private activeParticles: ActiveParticle[] = [];

  public modifiers: GameModifiers = {
    damageMultiplier: 1.0,
    maxHpMultiplier: 1.0,
    resourceRateMultiplier: 1.0,
    explodeOnDeath: false,
    doubleSpawnChance: 0.0,
  };

  public humanDifficultyMultiplier: number = 1.0;
  public activeRegionId: number = 0;
  private deploymentTimer: number = 0; 
  private humanSpawnTimer: number = 0;
  public cameraX: number = 0;
  private lastProgressUpdateX: number = 0;
  public isPaused: boolean = false;
  private isDestroyed: boolean = false;
  public isStockpileMode: boolean = false;

  // --- NEW: BATTLEFIELD CONTROL PROPERTIES ---
  private currentStrongholdIndex: number = 0; // Tracks which stronghold we are currently sieging
  private cameraLocked: boolean = false;      // If true, camera holds position for siege
  // ------------------------------------------

  constructor() {
    this.world = new Container();
    this.unitLayer = new Container();
    this.particleLayer = new Container();
  }

  async init(element: HTMLElement) {
    if (this.app || this.isDestroyed) return;
    while (element.firstChild) element.removeChild(element.firstChild);
    const app = new Application({ resizeTo: element, backgroundColor: 0x0a0a0a, antialias: true, resolution: window.devicePixelRatio || 1, autoDensity: true });
    this.app = app;
    // @ts-ignore
    element.appendChild(this.app.view);
    
    // Background Setup
    const bgGfx = new Graphics(); bgGfx.beginFill(0x111111); bgGfx.drawRect(0, 0, 512, 512); bgGfx.endFill();
    const bgTex = this.app.renderer.generateTexture(bgGfx);
    this.bgLayer = new TilingSprite(bgTex, this.app.screen.width, this.app.screen.height);
    this.app.stage.addChild(this.bgLayer);

    const floorGfx = new Graphics(); floorGfx.beginFill(0x222222); floorGfx.drawRect(0, 0, 128, 128); floorGfx.endFill();
    const floorTex = this.app.renderer.generateTexture(floorGfx);
    this.groundLayer = new TilingSprite(floorTex, this.app.screen.width, this.app.screen.height / 2 + 200);
    this.groundLayer.anchor.set(0, 0);
    this.groundLayer.y = (this.app.screen.height / 2) - 50; 
    this.app.stage.addChild(this.groundLayer);

    this.world.position.set(0, this.app.screen.height / 2);
    this.world.sortableChildren = true;
    this.app.stage.addChild(this.world);
    
    // --- DEBUG: DRAW TERRAIN OBSTACLES & STRONGHOLDS ---
    const debugGfx = new Graphics();
    
    // Draw Obstacles (Gray outlines)
    debugGfx.lineStyle(2, 0x444444);
    OBSTACLES.forEach(obs => {
        debugGfx.drawCircle(obs.x, LANE_Y + obs.y, obs.radius);
    });

    // Draw Strongholds (Red defense lines)
    debugGfx.lineStyle(2, 0xff0000, 0.5);
    STRONGHOLDS.forEach(x => {
        debugGfx.moveTo(x, LANE_Y - 200);
        debugGfx.lineTo(x, LANE_Y + 200);
    });
    this.world.addChild(debugGfx);
    // ---------------------------------------------------

    this.unitLayer.sortableChildren = true;
    this.world.addChild(this.unitLayer);
    this.world.addChild(this.particleLayer);
    this.unitPool = new UnitPool(800, this.unitLayer); // Increased pool size to accommodate more units
    this.app.ticker.add(this.update.bind(this));
  }

  public setStockpileMode(enabled: boolean) {
      this.isStockpileMode = enabled;
      if (enabled) {
          this.cameraX = 0;
          this.currentStrongholdIndex = 0;
          this.cameraLocked = false;
          if (this.world) this.world.position.x = 0;
          this.unitPool?.getActiveUnits().forEach(u => { if (u.faction === Faction.HUMAN) this.unitPool?.recycle(u); });
          this.clearParticles();
      }
  }

  private clearParticles() {
      this.activeParticles.forEach(p => this.recycleParticle(p));
      this.activeParticles = [];
  }

  private recycleUnitToStockpile(u: Unit) {
      if (!this.unitPool) return;
      this.unitPool.recycle(u);
      DataManager.instance.addToStockpile(u.type, 1);
  }

  private update(delta: number) {
    if (this.isPaused || !this.app || this.isDestroyed) return;
    const dt = delta / 60; 
    DataManager.instance.updateTick(dt * this.modifiers.resourceRateMultiplier);

    if (this.isStockpileMode) {
        this.updateStockpileVisualization(dt);
    } else {
        this.handleDeployment(dt);
        this.handleHumanSpawning(dt);
    }

    const allUnits = this.unitPool!.getActiveUnits();
    const livingUnits = allUnits.filter(u => !u.active ? false : !u.isDead);
    
    // --- NEW: Reset Engagement Counters per frame ---
    // This allows us to re-evaluate who is attacking whom every frame, preventing "slot sticking" issues
    livingUnits.forEach(u => u.engagedCount = 0);
    // ------------------------------------------------

    const zergUnits = livingUnits.filter(u => u.faction === Faction.ZERG);
    const humanUnits = livingUnits.filter(u => u.faction === Faction.HUMAN);
    zergUnits.sort((a, b) => a.x - b.x); 

    if (!this.isStockpileMode) {
        // --- COMBAT HOTSPOT CAMERA LOGIC ---
        
        let targetCamX = this.cameraX;
        
        // A. Priority: Frontline Enemy (Anchor)
        const visibleEnemies = humanUnits.filter(e => e.x > this.cameraX);
        
        if (visibleEnemies.length > 0) {
            visibleEnemies.sort((a, b) => a.x - b.x);
            const enemyFrontX = visibleEnemies[0].x;
            // Target: First enemy at 70% of screen width (right side)
            targetCamX = enemyFrontX - this.app.screen.width * 0.7;
        } else {
            // B. No Enemies: Follow Swarm Centroid
            if (zergUnits.length > 0) {
                const totalX = zergUnits.reduce((sum, u) => sum + u.x, 0);
                const avgX = totalX / zergUnits.length;
                // Target: Swarm center at 40% of screen width (center-left)
                targetCamX = avgX - this.app.screen.width * 0.4;
            } else {
                // No units? Stay put or drift slowly.
                targetCamX = this.cameraX;
            }
        }

        // C. Stronghold Locking
        const nextStrongholdX = STRONGHOLDS[this.currentStrongholdIndex];
        if (nextStrongholdX !== undefined) {
             const lockCamX = nextStrongholdX - this.app.screen.width * 0.8;
             
             // If target goes past lock line AND stronghold not cleared
             if (targetCamX > lockCamX && !this.isStrongholdCleared(nextStrongholdX)) {
                 targetCamX = lockCamX;
                 this.cameraLocked = true;
             } else {
                 if (this.cameraLocked && this.isStrongholdCleared(nextStrongholdX)) {
                     this.cameraLocked = false;
                     this.currentStrongholdIndex++;
                 }
             }
        }

        // D. Smooth Move
        const finalGoalX = Math.max(0, targetCamX);
        const camDiff = finalGoalX - this.cameraX;
        const speedFactor = Math.abs(camDiff) > 100 ? 0.05 : 0.02; // Dynamic damping
        
        this.cameraX += camDiff * speedFactor;

        // Update Containers
        this.world.position.x = -this.cameraX; 
        if (this.bgLayer) this.bgLayer.tilePosition.x = -this.cameraX * 0.1;
        if (this.groundLayer) this.groundLayer.tilePosition.x = -this.cameraX;
    } else {
        this.world.position.x = 0;
        if (this.bgLayer) this.bgLayer.tilePosition.x += 0.2; 
    }

    // Update Particles
    for (let i = this.activeParticles.length - 1; i >= 0; i--) {
        const p = this.activeParticles[i];
        const alive = p.update(p, dt);
        if (!alive) {
            this.recycleParticle(p);
            this.activeParticles.splice(i, 1);
        }
    }

    // Iterate living units. NOTE: processUnit might remove a unit if it is culled for overlaps.
    for (const u of allUnits) {
        if (!u.active) continue; // Check active again in case recycled in loop
        if (u.isDead) {
            this.processCorpse(u, dt);
        } else {
            const enemies = u.faction === Faction.ZERG ? humanUnits : zergUnits;
            const friends = u.faction === Faction.ZERG ? zergUnits : humanUnits;
            this.processUnit(u, dt, enemies, friends);
        }
    }
    
    this.unitLayer.children.sort((a, b) => a.zIndex - b.zIndex);

    if (!this.isStockpileMode && this.cameraX - this.lastProgressUpdateX > 100) {
        const deltaMeters = (this.cameraX - this.lastProgressUpdateX) / 10; 
        DataManager.instance.updateRegionProgress(this.activeRegionId, deltaMeters * 0.05);
        this.lastProgressUpdateX = this.cameraX;
    }

    // E. Culling (Relaxed for off-screen combat simulation)
    if (this.unitPool && !this.isStockpileMode) {
        allUnits.forEach(u => { 
            // Only recycle units far behind the camera (left side)
            // Units running ahead (right side) are kept to fight off-screen
            if (u.active && u.x < this.cameraX - 500) {
                this.unitPool!.recycle(u); 
            }
        });
    }
  }

  // Check if enemies near the stronghold are dead
  private isStrongholdCleared(strongholdX: number): boolean {
      if (!this.unitPool) return true;
      const range = 300;
      // Filter for alive human human units near the stronghold x
      const defenders = this.unitPool.getActiveUnits().filter(u => 
          u.faction === Faction.HUMAN && 
          !u.isDead && 
          Math.abs(u.x - strongholdX) < range
      );
      return defenders.length === 0;
  }

  // --- NEW STATUS MANAGER SYSTEM ---
  
  private updateStatusEffects(unit: Unit, dt: number) {
      if (unit.isDead) return;

      // 1. Process Status Decay & DoT
      for (const key in unit.statuses) {
          const type = key as StatusType;
          const effect = unit.statuses[type];
          if (!effect) continue;

          // Decay duration
          effect.duration -= dt;
          if (effect.duration <= 0) {
              delete unit.statuses[type];
              continue;
          }

          // DoT Logic (Burning/Poisoned)
          // Simplified: Damage per second based on stacks
          if (type === 'BURNING') {
              // Thermal: High damage, scaling with stacks
              const dmg = effect.stacks * 0.5 * dt; 
              this.dealTrueDamage(unit, dmg);
          } else if (type === 'POISONED') {
              // Toxin: Moderate damage, independent of armor
              const dmg = effect.stacks * 0.3 * dt;
              this.dealTrueDamage(unit, dmg);
          }

          // Decay Stacks using accumulator for stability
          if (!effect.decayAccumulator) effect.decayAccumulator = 0;
          effect.decayAccumulator += dt;
          const decayInterval = 1.0 / STATUS_CONFIG.DECAY_RATE; 
          while (effect.decayAccumulator >= decayInterval) {
              if (effect.stacks > 0) effect.stacks--;
              effect.decayAccumulator -= decayInterval;
          }
      }

      // 2. Process Threshold Logic
      const burn = unit.statuses['BURNING'];
      if (burn && burn.stacks >= STATUS_CONFIG.THRESHOLD_BURNING) {
          this.applyStatus(unit, 'ARMOR_BROKEN', 1, STATUS_CONFIG.ARMOR_BREAK_DURATION);
      }

      const freeze = unit.statuses['FROZEN'];
      if (freeze) {
          // Slow logic
          const slowFactor = Math.min(0.9, freeze.stacks / STATUS_CONFIG.THRESHOLD_FROZEN); // Max 90% slow
          unit.speed = unit.baseSpeed * (1 - slowFactor);
          if (freeze.stacks >= STATUS_CONFIG.THRESHOLD_FROZEN) {
              unit.speed = 0; // Solid block of ice
          }
      } else {
          unit.speed = unit.baseSpeed; // Reset if no freeze
      }
      
      const shock = unit.statuses['SHOCKED'];
      if (shock && shock.stacks >= STATUS_CONFIG.THRESHOLD_SHOCK) {
          // Micro-stun logic handled in attack execution
      }
  }

  private applyStatus(target: Unit, type: StatusType, stacks: number, duration: number) {
      if (target.isDead) return;
      
      if (!target.statuses[type]) {
          target.statuses[type] = { type, stacks: 0, duration: 0, decayAccumulator: 0 };
      }
      const s = target.statuses[type]!;
      s.stacks = Math.min(STATUS_CONFIG.MAX_STACKS, s.stacks + stacks);
      s.duration = Math.max(s.duration, duration);
  }

  // --- DAMAGE PIPELINE & ELEMENTAL MATRIX ---

  private processDamagePipeline(source: Unit, target: Unit) {
      if (target.isDead) return;

      const elementType = source.element;
      let rawDamage = source.damage;
      let isCrit = false;

      // 1. Crit Calculation
      if (Math.random() < source.critChance) {
          rawDamage *= source.critDamage;
          isCrit = true;
      }

      // 2. Elemental Interaction Matrix (Primer + Detonator)
      // Check Target Primers
      let reactionText: string | null = null;
      let bonusMultiplier = 1.0;

      // A. Thermal Shock (Frozen + Thermal)
      if (target.statuses['FROZEN'] && target.statuses['FROZEN']!.stacks >= STATUS_CONFIG.REACTION_THRESHOLD_MINOR && elementType === 'THERMAL') {
          bonusMultiplier = 2.5;
          delete target.statuses['FROZEN']; // Remove primer
          reactionText = "THERMAL SHOCK!";
          this.createExplosion(target.x, target.y, 40, 0xffaa00);
      }
      // B. Shatter (Frozen + Physical)
      else if (target.statuses['FROZEN'] && target.statuses['FROZEN']!.stacks >= STATUS_CONFIG.REACTION_THRESHOLD_MAJOR && elementType === 'PHYSICAL') {
          const shatterDmg = target.maxHp * 0.15;
          this.dealTrueDamage(target, shatterDmg);
          delete target.statuses['FROZEN'];
          reactionText = "SHATTER!";
          this.createDamagePop(target.x, target.y - 40, Math.floor(shatterDmg), 'CRYO');
      }
      // C. Corrosion (Poisoned + Voltaic)
      else if (target.statuses['POISONED'] && elementType === 'VOLTAIC') {
          this.applyStatus(target, 'ARMOR_BROKEN', 1, 10);
          reactionText = "CORRODED!";
      }
      // D. Superconduct (Shocked + Cryo) - Freeze Duration Boost
      else if (target.statuses['SHOCKED'] && elementType === 'CRYO') {
          this.applyStatus(target, 'FROZEN', 20, 10); // Instant freeze
          reactionText = "SUPERCONDUCT!";
      }

      // 3. Apply Damage with Armor Logic
      let armor = target.armor;
      if (target.statuses['ARMOR_BROKEN']) armor = 0; // True damage if broken
      
      const reduction = armor / (armor + 50);
      let finalDamage = (rawDamage * bonusMultiplier) * (1 - reduction);
      
      // Toxin ignores armor naturally
      if (elementType === 'TOXIN') finalDamage = rawDamage * bonusMultiplier;

      target.hp -= finalDamage;

      // 4. Apply Status (Primer)
      if (elementType === 'THERMAL') this.applyStatus(target, 'BURNING', source.statusPerHit, 5);
      if (elementType === 'CRYO') this.applyStatus(target, 'FROZEN', source.statusPerHit, 5);
      if (elementType === 'VOLTAIC') this.applyStatus(target, 'SHOCKED', source.statusPerHit, 5);
      if (elementType === 'TOXIN') this.applyStatus(target, 'POISONED', source.statusPerHit, 5);

      // 5. Visual Feedback (Updated to use flashTimer and Particle Pool)
      if (target.view) {
          target.flashTimer = 0.1; // Flash for 0.1s
          if (!target.isDead) this.updateUnitVisuals(target); 
      }
      
      if (reactionText) {
          this.createFloatingText(target.x, target.y - 50, reactionText, 0xffffff, 16);
      }
      if (isCrit || finalDamage > target.maxHp * 0.1) {
          this.createDamagePop(target.x, target.y - 30, Math.floor(finalDamage), elementType);
      }

      if (target.hp <= 0) this.killUnit(target);
  }

  private dealTrueDamage(target: Unit, amount: number) {
      if (target.isDead) return;
      target.hp -= amount;
      if (target.hp <= 0) this.killUnit(target);
  }

  private handleDeployment(dt: number) {
    if (!this.app || !this.unitPool) return;
    this.deploymentTimer += dt;
    if (this.deploymentTimer < 0.1) return; // Faster deployment for larger caps
    this.deploymentTimer = 0;

    const activeZerg = this.unitPool.getActiveUnits().filter(u => u.faction === Faction.ZERG && !u.isDead);
    
    // REMOVED GLOBAL CAP CHECK
    // if (activeZerg.length >= MAX_SCREEN_UNITS) return;

    const stockpile = DataManager.instance.state.hive.unitStockpile;
    const spawnX = this.cameraX - 100 - (Math.random() * 50);

    const availableTypes = Object.values(UnitType).filter(t => (stockpile[t] || 0) > 0);
    
    if (availableTypes.length === 0) return;

    // Filter by Per-Unit Screen Caps
    const spawnableTypes = availableTypes.filter(t => {
        const currentCount = activeZerg.filter(u => u.type === t).length;
        const cap = UNIT_SCREEN_CAPS[t] || 5;
        return currentCount < cap;
    });

    if (spawnableTypes.length === 0) return;

    // Weighted selection logic or simple first available
    // Let's use simple logic: try to fill gaps proportionally or just pick random available
    const totalAvailable = spawnableTypes.reduce((acc, t) => acc + (stockpile[t] || 0), 0);
    let r = Math.random() * totalAvailable;
    let selectedType = spawnableTypes[0];
    
    for (const t of spawnableTypes) {
        r -= (stockpile[t] || 0);
        if (r <= 0) {
            selectedType = t;
            break;
        }
    }

    const success = DataManager.instance.consumeStockpile(selectedType);
    if (success) {
        this.unitPool.spawn(Faction.ZERG, selectedType, spawnX, this.modifiers);
        if (Math.random() < this.modifiers.doubleSpawnChance) {
            // Double spawn attempts also check cap
            const currentCount = activeZerg.filter(u => u.type === selectedType).length;
            if (currentCount + 1 < UNIT_SCREEN_CAPS[selectedType]) {
                 this.unitPool.spawn(Faction.ZERG, selectedType, spawnX - 20, this.modifiers);
            }
        }
    }
  }

  private updateStockpileVisualization(dt: number) {
      // Realistic visualization: Iterate through all Zerg unit types and match screen count to stockpile count
      const stockpile = DataManager.instance.state.hive.unitStockpile;
      const activeVisuals = this.unitPool!.getActiveUnits().filter(u => u.faction === Faction.ZERG);
      
      Object.values(UnitType).forEach(type => {
          // Skip Human types
          if (type.startsWith('HUMAN')) return;
          
          const storedCount = stockpile[type] || 0;
          const visualCap = UNIT_SCREEN_CAPS[type] || 10;
          // Show up to the screen cap
          const targetVisualCount = Math.min(storedCount, visualCap);
          
          const currentVisuals = activeVisuals.filter(u => u.type === type);
          
          // Spawn if deficit
          if (currentVisuals.length < targetVisualCount) {
             const spawnX = Math.random() * this.app!.screen.width;
             const u = this.unitPool!.spawn(Faction.ZERG, type, spawnX, this.modifiers);
             if (u) {
                 u.state = 'WANDER';
                 // Spread vertically
                 u.y = LANE_Y + (Math.random() - 0.5) * LANE_HEIGHT;
             }
          }
          // Despawn if surplus (e.g. stockpile consumed elsewhere or cap lowered)
          else if (currentVisuals.length > targetVisualCount) {
              const u = currentVisuals[0];
              this.unitPool!.recycle(u);
          }
      });
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
        const regionConfig = INITIAL_REGIONS_CONFIG.find(r => r.id === this.activeRegionId);
        const spawnTable = regionConfig?.spawnTable || [{ type: UnitType.HUMAN_MARINE, weight: 1.0 }];

        for(let i=0; i<waveSize; i++) {
             const spawnX = spawnXBase + (Math.random() * 200); 
             const totalWeight = spawnTable.reduce((acc, entry) => acc + entry.weight, 0);
             let random = Math.random() * totalWeight;
             let selectedType = UnitType.HUMAN_MARINE;
             for (const entry of spawnTable) {
                 random -= entry.weight;
                 if (random <= 0) { selectedType = entry.type; break; }
             }
             
             // Check Enemy Cap
             const currentEnemyCount = this.unitPool.getActiveUnits().filter(u => u.type === selectedType && !u.isDead).length;
             const cap = UNIT_SCREEN_CAPS[selectedType] || 10;
             if (currentEnemyCount < cap) {
                 this.unitPool!.spawn(Faction.HUMAN, selectedType, spawnX, this.modifiers);
             }
        }
    }
  }

  private processUnit(u: Unit, dt: number, enemies: Unit[], friends: Unit[]) {
     // Status Effects Tick
     this.updateStatusEffects(u, dt);
     
     // Update Flash Timer & Visuals
     if (u.flashTimer > 0) u.flashTimer -= dt;
     this.updateUnitVisuals(u);

     // --- 1. Stockpile Wander Logic ---
     if (this.isStockpileMode && u.faction === Faction.ZERG) {
         u.state = 'WANDER'; u.target = null;
         u.wanderTimer -= dt;
         if (u.wanderTimer <= 0) { u.wanderTimer = 1 + Math.random() * 2; u.wanderDir = Math.random() > 0.5 ? 1 : -1; if (Math.random() < 0.3) u.wanderDir = 0; }
         const speed = u.speed * 0.3; let dx = u.wanderDir * speed * dt;
         if (this.app) { if (u.x < 50) u.wanderDir = 1; if (u.x > this.app.screen.width - 50) u.wanderDir = -1; }
         u.x += dx; u.y += (Math.random() - 0.5) * 0.5; 
         if (u.y < LANE_Y - LANE_HEIGHT/2) u.y = LANE_Y - LANE_HEIGHT/2; if (u.y > LANE_Y + LANE_HEIGHT/2) u.y = LANE_Y + LANE_HEIGHT/2;
         if (u.view) { u.view.position.x = u.x; u.view.y = u.y; u.view.zIndex = u.y; if (Math.abs(dx) > 0.1) u.view.scale.x = Math.sign(dx); }
         return; 
     }

     // Micro-Stun Check (Shock)
     if (u.statuses['SHOCKED'] && Math.random() < 0.05) return; 

     // --- 2. Advanced Swarm AI: Targeting ---
     
     const AGGRO_RANGE = 400; 
     // Capacity: Circumference / UnitWidth (~2.5 factor)
     const getCapacity = (target: Unit) => Math.max(3, Math.floor((target.radius * 2.5) / 10));

     // Ranged units don't occupy slots and don't care about slots
     const isRanged = u.range > 60; 

     let shouldSearch = true;

     // A. Check if current target is still valid
     if (u.target) {
         if (u.target.isDead) {
             u.target = null;
         } else {
             const distSq = (u.target.x - u.x)**2 + (u.target.y - u.y)**2;
             if (distSq > AGGRO_RANGE * AGGRO_RANGE) {
                 u.target = null;
             } else {
                 if (isRanged) {
                     // Ranged always keeps target if in range, doesn't increment slot
                     shouldSearch = false;
                 } else {
                     // Melee Logic
                     const capacity = getCapacity(u.target);
                     const dist = Math.sqrt(distSq);
                     const isEngaged = dist <= u.range * 1.2;

                     if (isEngaged) {
                         u.target.engagedCount++;
                         shouldSearch = false;
                     } else {
                         if (u.target.engagedCount < capacity) {
                             u.target.engagedCount++;
                             shouldSearch = false;
                         } else {
                             u.target = null; 
                             shouldSearch = true; 
                         }
                     }
                 }
             }
         }
     }

     // B. Search for new target
     if (shouldSearch) {
        let bestTarget: Unit | null = null;
        let minDist = Infinity;

        for (const enemy of enemies) {
            const distSq = (enemy.x - u.x)**2 + (enemy.y - u.y)**2;
            if (distSq > AGGRO_RANGE * AGGRO_RANGE) continue;

            // Only check capacity for Melee units
            if (!isRanged) {
                const capacity = getCapacity(enemy);
                if (enemy.engagedCount >= capacity) continue; 
            }

            if (distSq < minDist) { 
                minDist = distSq; 
                bestTarget = enemy; 
            }
        }
        
        u.target = bestTarget;
        if (u.target && !isRanged) {
            u.target.engagedCount++;
        }
     }

     // --- 3. DECOUPLED PHYSICS & COMBAT (Run & Gun) ---
     
     let dxMove = 0;
     let dyMove = 0;
     let isMoving = false;
     const time = Date.now() / 1000;

     // A. MOVEMENT LAYER
     // We move IF we have a target and we are outside "Ideal Range"
     // OR if we have no target (Swarm Flow)
     if (u.target && !u.target.isDead) {
         const dist = Math.sqrt((u.target.x - u.x)**2 + (u.target.y - u.y)**2);
         
         // Stop Threshold:
         // Melee: Touch (radius + radius)
         // Ranged: DRASTICALLY REDUCED to 20% of range. 
         // This forces them to keep moving closer even if they can shoot, creating density.
         const stopThreshold = !isRanged 
            ? (u.radius + u.target.radius + COLLISION_BUFFER) 
            : (u.range * 0.2); 

         if (dist > stopThreshold) {
             let currentSpeed = u.speed * u.speedVar;

             // Move & Shoot Penalty:
             // If ranged unit is inside max range but moving to close gap, slow down.
             // This "stutter step" visual prevents them from running past enemies too fast.
             if (isRanged && dist <= u.range) {
                 currentSpeed *= 0.4; // 40% speed while firing
             }

             const dirX = (u.target.x - u.x) / dist;
             const dirY = (u.target.y - u.y) / dist;
             
             // Apply Speed Noise to movement towards target too
             const noise = 1 + Math.sin(time * 3 + u.waveOffset) * 0.1;

             dxMove += dirX * currentSpeed * noise * dt;
             dyMove += dirY * currentSpeed * noise * dt;
             isMoving = true;
         }
     } else {
         // No Target: Flow Right (Bypass Mode)
         if (u.faction === Faction.ZERG) {
            const currentSpeed = u.speed * u.speedVar;
            // Low freq sine wave for lane drift
            const wave = Math.sin(time + u.waveOffset) * 20; 
            // Speed surge noise
            const surge = 1 + Math.sin(time * 2 + u.waveOffset) * 0.2; 
            
            dxMove += currentSpeed * surge * dt;
            dyMove += wave * dt;
            isMoving = true;
         }
     }

     // B. SEPARATION (Boids) & TACTICAL RECYCLING
     for (const friend of friends) {
        if (friend === u) continue;
        
        // Zerg collision filter: Only collide with same type
        if (u.faction === Faction.ZERG && u.type !== friend.type) continue;
        
        if (Math.abs(friend.x - u.x) > 40) continue; 

        const distSq = (u.x - friend.x)**2 + (u.y - friend.y)**2;
        const repelRadius = u.radius + friend.radius + 3; 
        
        if (distSq < repelRadius * repelRadius && distSq > 0.001) {
            
            // --- TACTICAL RECYCLING (DENSITY CHECK) ---
            if (u.faction === Faction.ZERG && u.type === friend.type && u.state !== 'ATTACK') {
                const overlapLimit = (u.radius * 0.8)**2; 
                if (distSq < overlapLimit) {
                    if (u.y < friend.y) {
                        this.recycleUnitToStockpile(u);
                        return; // Stop processing
                    }
                }
            }
            // ------------------------------------------

            const d = Math.sqrt(distSq);
            const force = (repelRadius - d) / repelRadius; 
            
            const pushX = (u.x - friend.x) / d * force * 100 * dt;
            // Strong lateral squeeze to force spreading out
            const pushY = (u.y - friend.y) / d * force * 800 * dt; 
            
            dxMove += pushX;
            dyMove += pushY;
            
            if (Math.abs(pushX) > 0.5) isMoving = true;
        }
    }

    // Apply Movement
    u.x += dxMove;
    u.y += dyMove;

    // C. TERRAIN OBSTACLES
    for (const obs of OBSTACLES) {
        const obsY = LANE_Y + obs.y;
        const dx = u.x - obs.x;
        const dy = u.y - obsY;
        const distSq = dx*dx + dy*dy;
        const minSep = u.radius + obs.radius;

        if (distSq < minSep * minSep) {
            const d = Math.sqrt(distSq);
            const nx = dx / d;
            const ny = dy / d;
            const penetration = minSep - d;
            
            u.x += nx * penetration;
            u.y += ny * penetration;
            u.y += (ny > 0 ? 1 : -1) * 200 * dt; 
        }
    }

    // Bounds
    if (u.y < LANE_Y - LANE_HEIGHT/2) u.y = LANE_Y - LANE_HEIGHT/2; 
    if (u.y > LANE_Y + LANE_HEIGHT/2) u.y = LANE_Y + LANE_HEIGHT/2;

    // Update Visual Position
    if (u.view) {
        u.view.position.x = u.x;
        u.view.y = u.y;
        u.view.zIndex = u.y;
        
        if (Math.abs(dxMove) > 0.1) {
            u.view.scale.x = dxMove < 0 ? -1 : 1;
            // Bounce
            u.view.y += Math.sin(u.x * 0.15) * 2;
        }
        
        // HP Bar Update
        if (u.hpBar) {
            u.hpBar.clear();
            if (u.hp < u.maxHp) {
                const pct = Math.max(0, u.hp / u.maxHp);
                u.hpBar.beginFill(0x000000); u.hpBar.drawRect(-12, -u.radius * 2 - 10, 24, 4); u.hpBar.endFill();
                u.hpBar.beginFill(pct < 0.3 ? 0xff0000 : 0x00ff00); u.hpBar.drawRect(-12, -u.radius * 2 - 10, 24 * pct, 4); u.hpBar.endFill();
            }
        }
    }

    // D. COMBAT LAYER
    u.attackCooldown -= dt;
    if (u.target && !u.target.isDead) {
         const dist = Math.sqrt((u.target.x - u.x)**2 + (u.target.y - u.y)**2);
         // Shoot if in range
         if (dist <= u.range) {
             u.state = 'ATTACK'; // Just for visual tag, doesn't lock movement anymore
             if (u.attackCooldown <= 0) {
                 u.attackCooldown = u.maxAttackCooldown;
                 if (u.statuses['FROZEN']) u.attackCooldown *= 1.5;
                 this.performAttack(u, u.target);
             }
         } else {
             u.state = isMoving ? 'MOVE' : 'IDLE';
         }
    } else {
        u.state = isMoving ? 'MOVE' : 'IDLE';
    }
  }

  private updateUnitVisuals(u: Unit) {
      if (!u.view) return;
      
      // Flash override
      if (u.flashTimer > 0) {
          u.view.tint = 0xffffaa; 
          return;
      }
      
      // Default tint
      let tint = 0xffffff;

      // Status Tints
      if (u.statuses['BURNING']) {
          const intensity = Math.min(1, u.statuses['BURNING'].stacks / 50);
          tint = this.lerpColor(0xffffff, 0xff4500, intensity); // Red/Orange
      } else if (u.statuses['FROZEN']) {
          const intensity = Math.min(1, u.statuses['FROZEN'].stacks / 50);
          tint = this.lerpColor(0xffffff, 0x60a5fa, intensity); // Blue
      } else if (u.statuses['POISONED']) {
          tint = 0x4ade80; // Green
      } else if (u.statuses['ARMOR_BROKEN']) {
          tint = 0x555555; // Dark/Greyish
      }

      u.view.tint = tint;
  }
  
  private lerpColor(a: number, b: number, amount: number): number {
      const ar = (a >> 16) & 0xff; const ag = (a >> 8) & 0xff; const ab = a & 0xff;
      const br = (b >> 16) & 0xff; const bg = (b >> 8) & 0xff; const bb = b & 0xff;
      const rr = ar + amount * (br - ar);
      const rg = ag + amount * (bg - ag);
      const rb = ab + amount * (bb - ab);
      return (rr << 16) + (rg << 8) + (rb | 0);
  }

  private performAttack(source: Unit, target: Unit) {
     if (source.view) source.view.x += (source.faction === Faction.ZERG ? -1 : 1) * 4; 
     const color = ELEMENT_COLORS[source.element];
     
     const isRanged = source.type === UnitType.RANGED || source.type === UnitType.PYROVORE || source.type === UnitType.HUMAN_MARINE || source.type === UnitType.HUMAN_SNIPER || source.type === UnitType.HUMAN_TANK || source.type === UnitType.HUMAN_PYRO;
     
     if (isRanged) { 
         this.createProjectile(source.x, source.y - 15, target.x, target.y - 15, color); 
     } else { 
         this.createFlash(target.x + (Math.random()*10-5), target.y - 10, color); 
         this.processDamagePipeline(source, target); 
     }
  }
  
  // --- PARTICLE SYSTEM ---
  
  private getGraphics(): Graphics {
      let g = this.graphicsPool.pop();
      if (!g) g = new Graphics();
      g.clear();
      g.alpha = 1;
      g.scale.set(1);
      g.rotation = 0;
      g.visible = true;
      this.particleLayer.addChild(g);
      return g;
  }

  private recycleParticle(p: ActiveParticle) {
      p.view.visible = false;
      if (p.type === 'GRAPHICS' && p.view instanceof Graphics) this.graphicsPool.push(p.view);
      if (p.type === 'TEXT' && p.view instanceof Text) this.textPool.push(p.view);
  }

  private createDamagePop(x: number, y: number, value: number, element: string) {
      if (!this.app || this.isDestroyed) return;
      const g = this.getGraphics();
      g.beginFill(ELEMENT_COLORS[element as ElementType] || 0xffffff, 0.8);
      const rOuter = 10; const rInner = 4; const points = [];
      for (let i = 0; i < 8; i++) { const radius = (i % 2 === 0) ? rOuter : rInner; const angle = i * Math.PI / 4; points.push(Math.sin(angle) * radius, Math.cos(angle) * radius); }
      g.drawPolygon(points); g.endFill(); 
      g.position.set(x, y);
      
      this.activeParticles.push({
          view: g, type: 'GRAPHICS', life: 20, maxLife: 20,
          update: (p, dt) => {
              p.life -= dt * 60; // Approximate frame logic
              p.view.y -= 1;
              p.view.alpha = p.life / 20;
              return p.life > 0;
          }
      });
  }
  
  private createFloatingText(x: number, y: number, text: string, color: number, fontSize: number = 12) {
      if (!this.app || this.isDestroyed) return;
      let t = this.textPool.pop();
      if (!t) {
          t = new Text({
              text,
              style: {
                  fontFamily: 'Courier New', 
                  fontSize, 
                  fontWeight: 'bold', 
                  fill: color,
                  stroke: { color: 0x000000, width: 2 }
              }
          });
      } else {
          t.text = text;
          t.style.fill = color;
          t.style.fontSize = fontSize;
      }
      t.visible = true;
      t.alpha = 1;
      t.scale.set(0.5);
      t.anchor.set(0.5);
      t.position.set(x, y);
      this.particleLayer.addChild(t);

      this.activeParticles.push({
          view: t, type: 'TEXT', life: 60, maxLife: 60,
          update: (p, dt) => {
              p.life -= dt * 60;
              p.view.y -= 0.5;
              p.view.scale.set(p.view.scale.x + 0.01);
              p.view.alpha = p.life / 20;
              return p.life > 0;
          }
      });
  }
  
  private createFlash(x: number, y: number, color: number) { 
      if (!this.app || this.isDestroyed) return; 
      const g = this.getGraphics();
      g.beginFill(color, 0.9); g.drawCircle(0, 0, 4); g.endFill(); 
      g.position.set(x, y);
      
      this.activeParticles.push({
          view: g, type: 'GRAPHICS', life: 5, maxLife: 5,
          update: (p, dt) => {
              p.life -= dt * 60;
              p.view.alpha = p.life / 5;
              return p.life > 0;
          }
      });
  }

  private createProjectile(x1: number, y1: number, x2: number, y2: number, color: number) { 
      if (!this.app || this.isDestroyed) return; 
      const g = this.getGraphics();
      g.lineStyle(2, color, 1); g.moveTo(0, 0); g.lineTo(12, 0); 
      g.position.set(x1, y1); 
      g.rotation = Math.atan2(y2 - y1, x2 - x1); 
      
      const speed = 800; 
      const dist = Math.sqrt((x2-x1)**2 + (y2-y1)**2); 
      const duration = dist / speed; // seconds
      
      // Need specific particle state for projectile
      const p = {
          view: g, type: 'GRAPHICS', life: 0, maxLife: duration,
          startX: x1, startY: y1, endX: x2, endY: y2,
          update: (p: any, dt: number) => {
              p.life += dt;
              const t = Math.min(1, p.life / p.maxLife);
              p.view.x = p.startX + (p.endX - p.startX) * t;
              p.view.y = p.startY + (p.endY - p.startY) * t;
              if (t >= 1) {
                  return false; 
              }
              return true;
          }
      } as any; 
      this.activeParticles.push(p);
  }

  private createExplosion(x: number, y: number, radius: number, color: number = 0x00ff00) { 
      if (!this.app || this.isDestroyed) return; 
      const g = this.getGraphics();
      g.beginFill(color, 0.5); g.drawCircle(0, 0, 10); g.endFill(); 
      g.position.set(x, y); 
      
      this.activeParticles.push({
          view: g, type: 'GRAPHICS', life: 0, maxLife: 20,
          update: (p: any, dt: number) => {
              p.life++; // frame based
              p.view.width += 8; p.view.height += 8; p.view.alpha -= 0.05;
              return p.view.alpha > 0;
          }
      });
  }

  private processCorpse(u: Unit, dt: number) {
      u.decayTimer -= dt;
      if (u.view) { u.view.y += 10 * dt; u.view.alpha = Math.max(0, u.decayTimer / DECAY_TIME); }
      if (u.decayTimer <= 0) this.unitPool!.recycle(u);
  }

  private killUnit(u: Unit) {
      u.isDead = true; u.state = 'DEAD'; u.decayTimer = DECAY_TIME;
      if (u.faction === Faction.HUMAN) {
          let bioReward = 10;
          if (u.type === UnitType.HUMAN_RIOT) { bioReward = 15; } else if (u.type === UnitType.HUMAN_TANK) { bioReward = 50; }
          DataManager.instance.modifyResource('biomass', bioReward);
      } else {
          const recycleRate = DataManager.instance.getRecycleRate(); const recycleValue = 5; DataManager.instance.modifyResource('biomass', recycleValue * recycleRate);
      }
      
      // Death Effects (Toxin Cloud)
      if (u.statuses['POISONED']) {
          this.createExplosion(u.x, u.y, 40, 0x4ade80); // Visual Poison Cloud
          // Spread poison to nearby enemies
          this.unitPool!.getActiveUnits().forEach(other => {
              if (other === u || other.isDead || other.faction === u.faction) return;
              if (Math.abs(other.x - u.x) < 40 && Math.abs(other.y - u.y) < 40) {
                  this.applyStatus(other, 'POISONED', 20, 5);
              }
          });
      }

      if (u.view) { u.view.tint = 0x555555; u.view.zIndex = -9999; u.view.rotation = (Math.random() * 0.5 - 0.25) + Math.PI / 2; u.view.scale.y = 0.5; if (u.hpBar) u.hpBar.clear(); }
      
      if (u.faction === Faction.ZERG && this.modifiers.explodeOnDeath) {
         this.createExplosion(u.x, u.y, 80);
         const units = this.unitPool!.getActiveUnits();
         units.forEach(enemy => { if (!enemy.isDead && enemy.faction === Faction.HUMAN) { const dist = Math.sqrt((enemy.x - u.x)**2 + (enemy.y - u.y)**2); if (dist < 80) { enemy.hp -= 40; if (enemy.hp <= 0) this.killUnit(enemy); } } });
      }
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

      const activeZergCounts: Record<string, number> = {};
      // Initialize with 0 for all known zerg types
      [UnitType.MELEE, UnitType.RANGED, UnitType.PYROVORE, UnitType.CRYOLISK, UnitType.OMEGALIS, UnitType.QUEEN].forEach(t => {
          activeZergCounts[t] = 0;
      });

      if (!this.app || !this.unitPool) {
          return { ...baseSnapshot, unitCountZerg: 0, unitCountHuman: 0, activeZergCounts };
      }
      
      const active = this.unitPool.getActiveUnits();
      const zergUnits = active.filter(u => u.faction === Faction.ZERG && !u.isDead);
      
      zergUnits.forEach(u => {
          if (activeZergCounts[u.type] !== undefined) {
              activeZergCounts[u.type]++;
          }
      });

      return {
          ...baseSnapshot,
          unitCountZerg: zergUnits.length,
          unitCountHuman: active.filter(u => u.faction === Faction.HUMAN && !u.isDead).length,
          activeZergCounts
      };
  }
  
  public applyCard(card: RoguelikeCard) { card.apply(this.modifiers); }
  public resume() { this.isPaused = false; }
  public pause() { this.isPaused = true; }
  public destroy() { this.isDestroyed = true; if (this.app) { try { this.app.destroy(true, { children: true, texture: true }); } catch (e) { console.warn("GameEngine destroy error", e); } } this.app = null; this.unitPool = null; }
}
