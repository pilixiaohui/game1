
import React, { useState } from 'react';
import { GameSaveData, UnitType, HiveSection, Polarity, GameStateSnapshot, RegionData } from '../types';
import { UNIT_CONFIGS, METABOLISM_FACILITIES, BIO_PLUGINS, PLAYABLE_UNITS } from '../constants';
import { DataManager } from '../game/DataManager';
import { GameEngine } from '../game/GameEngine';
import { GameCanvas } from './GameCanvas';
import { WorldMapView } from './WorldMapView';
import { HUD } from './HUD';

interface HiveViewProps {
  globalState: GameSaveData;
  onUpgrade: (type: UnitType) => void;
  onConfigChange: (type: UnitType, value: number) => void;
  onDigest: () => void;
  
  // Invasion Props
  gameState: GameStateSnapshot;
  activeRegion: RegionData | null;
  mapRegions: RegionData[];
  onEnterRegion: (region: RegionData) => void;
  onEvacuate: () => void;
  onEngineInit: (engine: GameEngine) => void;
}

const PolarityIcon = ({ type }: { type: Polarity }) => {
    switch(type) {
        case 'ATTACK': return <span className="text-red-500 font-bold">▲</span>;
        case 'DEFENSE': return <span className="text-blue-500 font-bold">🛡️</span>;
        case 'FUNCTION': return <span className="text-yellow-500 font-bold">⚡</span>;
        default: return <span className="text-white font-bold">⚪</span>;
    }
}

export const HiveView: React.FC<HiveViewProps> = ({ 
    globalState, onUpgrade, onConfigChange, onDigest,
    gameState, activeRegion, mapRegions, onEnterRegion, onEvacuate, onEngineInit
}) => {
  const [activeSection, setActiveSection] = useState<HiveSection>(HiveSection.INVASION);
  
  // Grafting State
  const [graftingUnit, setGraftingUnit] = useState<UnitType>(UnitType.MELEE);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);

  const renderInvasion = () => {
      return (
          <div className="flex h-full w-full animate-in fade-in duration-300">
              {/* SIDEBAR (World Map) */}
              <div className="w-1/3 min-w-[300px] border-r border-gray-800 relative z-10 bg-[#0a0a0a]">
                   <div className="absolute top-0 left-0 w-full p-4 bg-gradient-to-b from-black/80 to-transparent pointer-events-none z-10">
                       <h2 className="text-gray-500 text-xs font-bold tracking-widest uppercase">全球行动 (Global Operations)</h2>
                   </div>
                   <WorldMapView 
                        globalState={{...globalState, regions: mapRegions} as any} 
                        onEnterRegion={onEnterRegion} 
                        onOpenHive={() => {}} // No-op as we are already in hive
                        activeRegionId={activeRegion?.id}
                    />
              </div>

              {/* MAIN GAME VIEW */}
              <div className="flex-1 relative bg-black">
                    <GameCanvas 
                        activeRegion={activeRegion}
                        onEngineInit={onEngineInit} 
                    />
                    
                    {activeRegion ? (
                        <>
                            <HUD gameState={gameState} onEvacuate={onEvacuate} />
                            <div className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-none opacity-30">
                                 <h1 className="text-4xl font-black text-white uppercase tracking-tighter">{activeRegion.name}</h1>
                            </div>
                        </>
                    ) : (
                        // Stockpile Overlay
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <div className="bg-black/40 backdrop-blur-sm p-6 rounded-2xl border border-gray-800/50 flex flex-col items-center">
                                <div className="text-orange-500 text-6xl mb-4 animate-pulse opacity-80">☣️</div>
                                <h2 className="text-2xl font-black text-white uppercase tracking-widest mb-2">等待指令</h2>
                                <p className="text-gray-400 text-xs tracking-wider uppercase">虫群兵力储备中... 选择冲突区域以投放</p>
                            </div>
                        </div>
                    )}
              </div>
          </div>
      );
  };

  const renderEvolution = () => (
    <div className="flex flex-col items-center justify-center h-full text-center p-8 animate-in fade-in slide-in-from-right-4 duration-300">
        <div className="w-24 h-24 bg-gray-900 rounded-full flex items-center justify-center mb-6 border-2 border-dashed border-gray-700 text-4xl grayscale opacity-50">
            🧬
        </div>
        <h3 className="text-2xl font-black text-gray-500 uppercase tracking-widest mb-2">Evolution Chamber</h3>
        <p className="text-gray-600 max-w-md">
            The gene sequencer is currently dormant. <br/>
            Advanced strain modifications will be available in future updates.
        </p>
        <div className="mt-8 px-4 py-2 bg-yellow-900/10 border border-yellow-900/30 text-yellow-700 text-xs rounded uppercase tracking-widest">
            Module Offline
        </div>
    </div>
  );

  const renderMetabolism = () => {
    const meta = globalState.hive.metabolism;
    
    // Config Grouping based on V1.3 Design Doc
    const groups = [
        {
            id: 'MATTER',
            name: '物质层 (Matter)',
            sub: 'Organic Sludge',
            color: 'text-green-400',
            bg: 'bg-green-900/5',
            border: 'border-green-500/20',
            facilities: ['VILLI', 'TAPROOT', 'GEYSER', 'BREAKER']
        },
        {
            id: 'ENERGY',
            name: '能量层 (Energy)',
            sub: 'Active Enzymes',
            color: 'text-orange-400',
            bg: 'bg-orange-900/5',
            border: 'border-orange-500/20',
            facilities: ['SAC', 'PUMP', 'CRACKER', 'BOILER']
        },
        {
            id: 'DATA',
            name: '资讯层 (Data)',
            sub: 'Helix Sequence',
            color: 'text-blue-400',
            bg: 'bg-blue-900/5',
            border: 'border-blue-500/20',
            facilities: ['SPIRE', 'HIVE_MIND', 'RECORDER']
        },
        {
            id: 'INFRA',
            name: '基础设施 (Infra)',
            sub: 'Storage & Supply',
            color: 'text-gray-400',
            bg: 'bg-gray-800/10',
            border: 'border-gray-700/30',
            facilities: ['STORAGE', 'SUPPLY']
        }
    ];

    const getFacilityStatus = (key: string) => {
        const cost = DataManager.instance.getMetabolismCost(key);
        let count = 0;
        let statText: React.ReactNode = "";

        // Count mapping
        if (key === 'VILLI') { 
            count = meta.villiCount; 
            const synergy = Math.pow(1.25, Math.floor(count/100));
            statText = (
                <span>
                    Base: {(count * METABOLISM_FACILITIES.VILLI.BASE_RATE).toFixed(1)}/s <br/>
                    Cluster: <span className="text-green-300">x{synergy.toFixed(2)}</span>
                </span>
            );
        }
        else if (key === 'TAPROOT') { count = meta.taprootCount; statText = `Buff: Villi Base +${(count * 0.1).toFixed(1)}`; }
        else if (key === 'GEYSER') { count = meta.geyserCount; statText = `Output: +${(count * METABOLISM_FACILITIES.GEYSER.BASE_RATE).toFixed(1)}/s`; }
        else if (key === 'BREAKER') { count = meta.breakerCount; statText = `Out: +${(count * METABOLISM_FACILITIES.BREAKER.BASE_RATE).toFixed(0)} | Loss: ${(count * 0.05).toFixed(2)}%`; }
        
        else if (key === 'SAC') { 
            count = meta.fermentingSacCount; 
            const red = meta.refluxPumpCount * METABOLISM_FACILITIES.PUMP.COST_REDUCTION;
            const finalCost = Math.max(50, 100 - red);
            const eff = 1 / finalCost * 100;
            statText = (
                <span>
                    Throughput: {count * 100} Bio/s <br/>
                    Efficiency: <span className="text-orange-300">{eff.toFixed(2)}%</span>
                </span>
            ); 
        }
        else if (key === 'PUMP') { 
            count = meta.refluxPumpCount; 
            statText = `Sac Cost: -${count * 2} Bio`; 
        }
        else if (key === 'CRACKER') { 
            count = meta.thermalCrackerCount;
            // Heat Bar Visualization
            const heatPct = meta.crackerHeat;
            const isOverheated = meta.crackerOverheated;
            statText = (
                <div className="w-full mt-1">
                    <div className="flex justify-between text-[8px] uppercase text-gray-400 mb-0.5">
                        <span>{isOverheated ? 'OVERHEATED (COOLING)' : 'HEAT LEVEL'}</span>
                        <span>{heatPct.toFixed(0)}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-800 rounded-sm overflow-hidden">
                        <div 
                            className={`h-full transition-all duration-300 ${isOverheated ? 'bg-red-500 animate-pulse' : 'bg-orange-500'}`} 
                            style={{ width: `${heatPct}%` }}
                        />
                    </div>
                </div>
            );
        }
        else if (key === 'BOILER') { count = meta.fleshBoilerCount; statText = `Conv: ${count} Larva -> ${count * 500} Enz`; }
        
        else if (key === 'SPIRE') { 
            count = meta.thoughtSpireCount; 
            // Accumulator bar
            const progress = meta.spireAccumulator * 100;
            statText = (
                <div className="w-full mt-1">
                    <div className="flex justify-between text-[8px] uppercase text-gray-400 mb-0.5">
                        <span>ANALYSIS</span>
                        <span>{progress.toFixed(0)}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-800 rounded-sm overflow-hidden">
                        <div 
                            className="h-full bg-blue-500 transition-all duration-300" 
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>
            );
        }
        else if (key === 'HIVE_MIND') { 
            count = meta.hiveMindCount; 
            const pop = DataManager.instance.getTotalStockpile();
            statText = `Calc: +${(count * Math.sqrt(pop)).toFixed(2)} DNA/s`; 
        }
        else if (key === 'RECORDER') { count = meta.akashicRecorderCount; statText = `Chance: ${Math.min(100, count * 15)}% to duplicate`; }

        else if (key === 'STORAGE') { count = meta.storageCount; statText = `Cap: +${(count * 5000).toLocaleString()}`; }
        else if (key === 'SUPPLY') { count = meta.supplyCount; statText = `Pop Cap: +${(count * 50)}`; }

        return { count, cost, statText };
    }

    return (
        <div className="animate-in fade-in slide-in-from-right-4 duration-300 pb-20 space-y-8 p-8 max-w-7xl mx-auto">
             <div className="flex justify-between items-end mb-4">
                <div>
                    <h3 className="text-2xl font-black text-green-500 uppercase tracking-widest mb-1">生产工程 (Metabolism)</h3>
                    <p className="text-gray-500 text-sm">Optimize the resource conversion loops.</p>
                </div>
            </div>
            
            <div className="space-y-6">
                {groups.map((group) => (
                    <div key={group.id} className={`rounded-xl border ${group.border} ${group.bg} overflow-hidden`}>
                        {/* Group Header */}
                        <div className="px-6 py-3 bg-black/20 border-b border-white/5 flex justify-between items-center">
                            <div>
                                <h4 className={`font-bold uppercase tracking-widest ${group.color}`}>{group.name}</h4>
                                <div className="text-[10px] text-gray-400 font-mono tracking-wide">{group.sub}</div>
                            </div>
                        </div>

                        {/* Facilities Rows */}
                        <div className="p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                            {group.facilities.map((key) => {
                                const config = METABOLISM_FACILITIES[key as keyof typeof METABOLISM_FACILITIES] as any;
                                const { count, cost, statText } = getFacilityStatus(key);
                                
                                const resType = cost.resource;
                                const currentRes = (globalState.resources as any)[resType];
                                const canAfford = currentRes >= cost.cost;

                                return (
                                    <div key={key} className="bg-[#0a0a0a] border border-gray-800 p-4 rounded-lg flex flex-col justify-between hover:border-gray-600 transition-colors group relative">
                                        <div>
                                            <div className="flex justify-between items-start mb-2">
                                                <h5 className="font-bold text-gray-200 text-sm">{config.NAME}</h5>
                                                <div className="text-xl font-black text-gray-800 absolute top-2 right-4 pointer-events-none opacity-50 group-hover:text-gray-700 transition-colors">
                                                    {count}
                                                </div>
                                            </div>
                                            <p className="text-[10px] text-gray-500 h-10 leading-tight overflow-hidden text-ellipsis">{config.DESC}</p>
                                            
                                            {/* Dynamic Stats */}
                                            {statText && (
                                                <div className="bg-black/40 rounded p-1.5 mt-2 border border-white/5 text-[10px] font-mono text-gray-300">
                                                    {statText}
                                                </div>
                                            )}
                                        </div>

                                        <button
                                            onClick={() => DataManager.instance.upgradeMetabolism(key)}
                                            disabled={!canAfford}
                                            className={`mt-4 w-full py-2 rounded text-[10px] font-bold uppercase flex items-center justify-center gap-2 transition-all border ${
                                                canAfford 
                                                ? 'bg-gray-800 hover:bg-gray-700 text-white border-gray-600 hover:border-white/50 shadow-lg' 
                                                : 'bg-black/50 text-gray-600 border-gray-800 cursor-not-allowed'
                                            }`}
                                        >
                                            <span>购买 (Buy)</span>
                                            <span className={`font-mono ${canAfford ? (resType === 'biomass' ? 'text-green-500' : resType === 'enzymes' ? 'text-orange-500' : 'text-blue-500') : 'text-gray-600'}`}>
                                                {cost.cost.toLocaleString()} {resType === 'biomass' ? 'Bio' : resType === 'enzymes' ? 'Enz' : 'DNA'}
                                            </span>
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
  };

  const renderGrafting = () => {
      const unit = globalState.hive.unlockedUnits[graftingUnit];
      const config = UNIT_CONFIGS[graftingUnit];
      const stats = DataManager.instance.getUnitStats(graftingUnit);
      const inventory = globalState.hive.inventory.plugins;
      const upgradeCost = DataManager.instance.getUpgradeCost(graftingUnit);
      const canAffordUpgrade = globalState.resources.biomass >= upgradeCost;

      // Calculate Load
      const currentLoad = DataManager.instance.calculateLoad(graftingUnit, unit.loadout);
      const maxLoad = config.baseLoadCapacity;
      const isOverload = currentLoad > maxLoad;

      return (
        <div className="animate-in fade-in slide-in-from-right-4 duration-300 flex h-full gap-6 pb-20 p-8 max-w-7xl mx-auto">
            {/* LEFT: Unit Selector & Stats & Upgrade */}
            <div className="w-1/3 flex flex-col gap-6">
                <div>
                    <h3 className="text-2xl font-black text-purple-500 uppercase tracking-widest mb-1">基因嫁接</h3>
                    <p className="text-gray-500 text-sm">Unit Customization & Evolution.</p>
                </div>

                {/* Unit Tabs */}
                <div className="flex bg-gray-900 p-1 rounded-lg">
                    {PLAYABLE_UNITS.map(t => (
                        <button 
                            key={t}
                            onClick={() => { setGraftingUnit(t); setSelectedSlot(null); }}
                            className={`flex-1 py-2 text-xs font-bold uppercase rounded transition-colors ${graftingUnit === t ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                        >
                            {UNIT_CONFIGS[t].name}
                        </button>
                    ))}
                </div>

                {/* Upgrade Panel (Merged from Evolution) */}
                <div className="bg-purple-900/10 border border-purple-500/30 p-5 rounded-xl">
                    <div className="flex justify-between items-center mb-4">
                        <div>
                             <h4 className="font-bold text-white uppercase text-sm">基因序列等级</h4>
                             <div className="text-xs text-purple-300">Mutation Strain: {unit.level}</div>
                        </div>
                        <div className="text-2xl font-black text-purple-500">v.{unit.level}.0</div>
                    </div>
                    
                    <div className="space-y-2 mb-4">
                         <div className="flex justify-between text-xs">
                             <span className="text-gray-400">Health</span>
                             <span className="text-white font-mono">{Math.floor(stats.hp)}</span>
                         </div>
                         <div className="flex justify-between text-xs">
                             <span className="text-gray-400">Damage</span>
                             <span className="text-white font-mono">{Math.floor(stats.damage)}</span>
                         </div>
                         <div className="flex justify-between text-xs">
                             <span className="text-gray-400">Speed</span>
                             <span className="text-white font-mono">{Math.floor(stats.speed)}</span>
                         </div>
                    </div>

                    <button
                        onClick={() => DataManager.instance.upgradeUnit(graftingUnit)}
                        disabled={!canAffordUpgrade}
                        className={`w-full py-3 rounded font-bold text-xs uppercase flex items-center justify-center gap-2 transition-all ${
                            canAffordUpgrade
                            ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-[0_0_15px_rgba(147,51,234,0.4)]'
                            : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                        }`}
                    >
                        <span>Evolve Strain</span>
                        <span className="bg-black/20 px-2 py-0.5 rounded text-[10px] font-mono">{upgradeCost} Bio</span>
                    </button>
                </div>

                {/* Load Capacity */}
                <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                    <div className="flex justify-between text-xs text-gray-400 uppercase mb-2">
                        <span>Neural Load</span>
                        <span className={isOverload ? 'text-red-500' : 'text-gray-400'}>{currentLoad} / {maxLoad}</span>
                    </div>
                    <div className="w-full h-1.5 bg-black rounded-full overflow-hidden">
                        <div className={`h-full ${isOverload ? 'bg-red-500' : 'bg-purple-500'} transition-all`} style={{ width: `${Math.min(100, (currentLoad/maxLoad)*100)}%` }}></div>
                    </div>
                </div>
            </div>

            {/* RIGHT: Slots & Inventory */}
            <div className="flex-1 flex flex-col gap-6">
                {/* Slots */}
                <div className="grid grid-cols-5 gap-4">
                    {config.slots.map((slot, idx) => {
                        const equippedId = unit.loadout[idx];
                        const equippedInstance = equippedId ? inventory.find(p => p.instanceId === equippedId) : null;
                        const equippedTemplate = equippedInstance ? BIO_PLUGINS[equippedInstance.templateId] : null;

                        return (
                            <button 
                                key={idx}
                                onClick={() => setSelectedSlot(selectedSlot === idx ? null : idx)}
                                className={`aspect-square rounded-xl border-2 flex flex-col items-center justify-center relative group transition-all ${
                                    selectedSlot === idx 
                                    ? 'border-white bg-gray-800' 
                                    : 'border-gray-800 bg-gray-900 hover:border-gray-600'
                                }`}
                            >
                                <div className="absolute top-2 right-2 text-[10px]">
                                    <PolarityIcon type={slot.polarity} />
                                </div>
                                
                                {equippedTemplate ? (
                                    <>
                                        <div className="text-2xl mb-1">{equippedTemplate.polarity === 'ATTACK' ? '⚔️' : equippedTemplate.polarity === 'DEFENSE' ? '🛡️' : '⚡'}</div>
                                        <div className="text-[10px] text-center font-bold text-gray-300 leading-tight px-1 truncate w-full">{equippedTemplate.name}</div>
                                        <div className="text-[8px] text-purple-400 mt-1">Rank {equippedInstance!.rank}</div>
                                    </>
                                ) : (
                                    <div className="text-gray-700 text-xs uppercase font-bold">Empty</div>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Inventory Selection (Only if slot selected) */}
                {selectedSlot !== null && (
                    <div className="flex-1 bg-black/40 rounded-xl border border-gray-800 p-4 overflow-y-auto">
                        <h4 className="text-xs font-bold text-gray-500 uppercase mb-4">Available Plugins for Slot {selectedSlot + 1}</h4>
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                            <button
                                onClick={() => DataManager.instance.equipPlugin(graftingUnit, selectedSlot!, null)}
                                className="bg-red-900/20 border border-red-900/50 hover:bg-red-900/40 p-3 rounded text-red-500 text-xs font-bold uppercase transition-colors"
                            >
                                Unequip
                            </button>
                            
                            {inventory.map(inst => {
                                const t = BIO_PLUGINS[inst.templateId];
                                const slotConfig = config.slots[selectedSlot!];
                                const isMatch = slotConfig.polarity === 'UNIVERSAL' || t.polarity === slotConfig.polarity;
                                const cost = t.baseCost + (inst.rank * t.costPerRank);
                                const actualCost = isMatch ? Math.ceil(cost/2) : cost;

                                return (
                                    <button 
                                        key={inst.instanceId}
                                        onClick={() => DataManager.instance.equipPlugin(graftingUnit, selectedSlot!, inst.instanceId)}
                                        className="bg-gray-800 border border-gray-700 hover:border-purple-500 p-3 rounded text-left flex flex-col gap-1 transition-all"
                                    >
                                        <div className="flex justify-between">
                                            <span className="text-sm font-bold text-white">{t.name}</span>
                                            <PolarityIcon type={t.polarity} />
                                        </div>
                                        <div className="text-[10px] text-gray-400">{t.description}</div>
                                        <div className="mt-2 flex justify-between text-[10px] font-mono">
                                            <span className="text-purple-400">Rank {inst.rank}</span>
                                            <span className={isMatch ? 'text-green-400' : 'text-white'}>Cost: {actualCost}</span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
      );
  };

  const renderBirthing = () => {
    const queenStats = DataManager.instance.getQueenStats();
    
    return (
      <div className="animate-in fade-in slide-in-from-right-4 duration-300 pb-20 p-8 max-w-7xl mx-auto">
        <div className="mb-6 flex justify-between items-end">
            <div>
                <h3 className="text-2xl font-black text-orange-500 uppercase tracking-widest mb-1">孵化矩阵</h3>
                <p className="text-gray-500 text-sm">管理虫群生产线。升级上限与效率。</p>
            </div>
            
            <button onClick={onDigest} className="px-3 py-1 border border-red-900 text-red-500 text-xs rounded uppercase hover:bg-red-900/20">
                紧急消化 (Kill All)
            </button>
        </div>

        {/* QUEEN PANEL */}
        <div className="bg-pink-900/10 border border-pink-500/30 p-6 rounded-xl mb-8 relative overflow-hidden">
             <div className="absolute top-0 right-0 p-1 bg-pink-900/50 text-[10px] text-pink-200 uppercase font-bold px-2 rounded-bl">Queen Status</div>
             
             <div className="flex gap-8 items-center mb-6">
                 <div className="text-4xl">👑</div>
                 <div>
                     <h4 className="text-lg font-bold text-white uppercase">虫后 (The Queen)</h4>
                     <p className="text-xs text-gray-400">产卵中枢。虫后数量越多，产量越高。</p>
                 </div>
                 <div className="ml-auto text-right">
                     <div className="text-2xl text-pink-400 font-mono font-bold">{globalState.hive.unitStockpile[UnitType.QUEEN]}</div>
                     <div className="text-[10px] text-gray-500 uppercase">Active Queens</div>
                 </div>
             </div>

             <div className="grid grid-cols-2 gap-4">
                 <div className="bg-black/30 p-4 rounded border border-gray-700 flex justify-between items-center">
                     <div>
                         <div className="text-xs text-gray-500 uppercase">Spawn Interval</div>
                         <div className="text-lg text-white font-mono">{queenStats.interval.toFixed(1)}s</div>
                     </div>
                     <button 
                        onClick={() => DataManager.instance.upgradeQueen('INTERVAL')}
                        className={`px-3 py-1 rounded text-xs uppercase font-bold border ${globalState.resources.biomass >= queenStats.costInterval ? 'border-pink-500 text-pink-400 hover:bg-pink-900/30' : 'border-gray-700 text-gray-600'}`}
                     >
                         Speed Up ({queenStats.costInterval} Bio)
                     </button>
                 </div>
                 <div className="bg-black/30 p-4 rounded border border-gray-700 flex justify-between items-center">
                     <div>
                         <div className="text-xs text-gray-500 uppercase">Spawn Amount</div>
                         <div className="text-lg text-white font-mono">x{queenStats.amount.toFixed(0)}</div>
                     </div>
                     <button 
                        onClick={() => DataManager.instance.upgradeQueen('AMOUNT')}
                        className={`px-3 py-1 rounded text-xs uppercase font-bold border ${globalState.resources.dna >= queenStats.costAmount ? 'border-blue-500 text-blue-400 hover:bg-blue-900/30' : 'border-gray-700 text-gray-600'}`}
                     >
                         Increase ({queenStats.costAmount} DNA)
                     </button>
                 </div>
             </div>
        </div>

        {/* UNIT PRODUCTION LIST */}
        <div className="space-y-4">
            {PLAYABLE_UNITS.map(type => {
                const u = globalState.hive.unlockedUnits[type];
                const config = UNIT_CONFIGS[type];
                const currentCount = globalState.hive.unitStockpile[type] || 0;
                
                const stats = DataManager.instance.getUnitProductionStats(type);
                
                return (
                    <div key={type} className={`bg-gray-900 border ${u.isProducing ? 'border-green-500/50' : 'border-gray-800'} p-4 rounded-xl transition-all`}>
                        <div className="flex justify-between items-center mb-4">
                            <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded flex items-center justify-center font-bold text-sm ${type === UnitType.MELEE ? 'bg-blue-900 text-blue-300' : type === UnitType.RANGED ? 'bg-purple-900 text-purple-300' : 'bg-pink-900 text-pink-300'}`}>
                                    {config.name[0]}
                                </div>
                                <div>
                                    <h4 className="font-bold text-white">{config.name}</h4>
                                    <div className="text-[10px] text-gray-400 flex gap-2">
                                        <span>Bio: {stats.bio.toFixed(0)}</span>
                                        <span>Larva: 1</span>
                                        <span>Time: {stats.time.toFixed(1)}s</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="text-right">
                                <div className="text-xs text-gray-500 uppercase">Count / Cap</div>
                                <div className="font-mono font-bold text-xl">
                                    <span className={currentCount >= u.cap ? 'text-yellow-500' : 'text-white'}>{currentCount}</span>
                                    <span className="text-gray-600"> / {u.cap}</span>
                                </div>
                            </div>
                        </div>
                        
                        {/* REMOVED PROGRESS BAR VISUALIZATION */}

                        <div className="grid grid-cols-3 gap-2">
                             <button
                                onClick={() => DataManager.instance.toggleProduction(type)}
                                className={`py-2 rounded font-bold text-xs uppercase flex items-center justify-center gap-2 ${u.isProducing ? 'bg-green-900/50 text-green-400 border border-green-500' : 'bg-gray-800 text-gray-400 border border-gray-600'}`}
                             >
                                 {u.isProducing ? 'Producing' : 'Stopped'}
                             </button>
                             
                             <button
                                onClick={() => DataManager.instance.upgradeUnitCap(type)}
                                className={`py-2 rounded font-bold text-xs uppercase flex flex-col items-center justify-center ${globalState.resources.biomass >= stats.capCost ? 'bg-gray-800 hover:bg-gray-700 text-white' : 'bg-gray-900 text-gray-600'}`}
                             >
                                 <span>Expand Cap</span>
                                 <span className="text-[10px] font-mono">{stats.capCost} Bio</span>
                             </button>

                             <button
                                onClick={() => DataManager.instance.upgradeUnitEfficiency(type)}
                                className={`py-2 rounded font-bold text-xs uppercase flex flex-col items-center justify-center ${globalState.resources.biomass >= stats.effCost ? 'bg-gray-800 hover:bg-gray-700 text-white' : 'bg-gray-900 text-gray-600'}`}
                             >
                                 <span>Optimize</span>
                                 <span className="text-[10px] font-mono">{stats.effCost} Bio</span>
                             </button>
                        </div>
                    </div>
                );
            })}
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-full gap-0">
        {/* Navigation Sidebar */}
        <div className="w-48 flex flex-col gap-2 shrink-0 border-r border-gray-800 bg-[#050505] p-2 pt-4">
             <button onClick={() => setActiveSection(HiveSection.INVASION)} className={`text-left px-4 py-3 rounded text-sm font-bold uppercase tracking-wider transition-colors border-l-4 ${activeSection === HiveSection.INVASION ? 'bg-red-900/30 text-white border-red-500' : 'border-transparent hover:bg-gray-900 text-gray-500'}`}>
                 0. 入侵 (Invasion)
             </button>
             <button onClick={() => setActiveSection(HiveSection.BIRTHING)} className={`text-left px-4 py-3 rounded text-sm font-bold uppercase tracking-wider transition-colors border-l-4 ${activeSection === HiveSection.BIRTHING ? 'bg-orange-900/30 text-white border-orange-500' : 'border-transparent hover:bg-gray-900 text-gray-500'}`}>
                 1. 孵化 (Birthing)
             </button>
             <button onClick={() => setActiveSection(HiveSection.METABOLISM)} className={`text-left px-4 py-3 rounded text-sm font-bold uppercase tracking-wider transition-colors border-l-4 ${activeSection === HiveSection.METABOLISM ? 'bg-green-900/30 text-white border-green-500' : 'border-transparent hover:bg-gray-900 text-gray-500'}`}>
                 2. 生产 (Metabolism)
             </button>
             <button onClick={() => setActiveSection(HiveSection.GRAFTING)} className={`text-left px-4 py-3 rounded text-sm font-bold uppercase tracking-wider transition-colors border-l-4 ${activeSection === HiveSection.GRAFTING ? 'bg-purple-900/30 text-white border-purple-500' : 'border-transparent hover:bg-gray-900 text-gray-500'}`}>
                 3. 嫁接 (Grafting)
             </button>
             <button onClick={() => setActiveSection(HiveSection.EVOLUTION)} className={`text-left px-4 py-3 rounded text-sm font-bold uppercase tracking-wider transition-colors border-l-4 ${activeSection === HiveSection.EVOLUTION ? 'bg-yellow-900/30 text-white border-yellow-500' : 'border-transparent hover:bg-gray-900 text-gray-500'}`}>
                 4. 进化 (Evolution)
             </button>
        </div>

        {/* Main Content Area */}
        <div className={`flex-1 h-full relative ${activeSection === HiveSection.INVASION ? 'overflow-hidden' : 'overflow-y-auto'}`}>
             {activeSection === HiveSection.INVASION && renderInvasion()}
             {activeSection === HiveSection.BIRTHING && renderBirthing()}
             {activeSection === HiveSection.METABOLISM && renderMetabolism()}
             {activeSection === HiveSection.GRAFTING && renderGrafting()}
             {activeSection === HiveSection.EVOLUTION && renderEvolution()}
        </div>
    </div>
  );
};
