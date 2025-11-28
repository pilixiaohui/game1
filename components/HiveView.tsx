
import React, { useState } from 'react';
import { GameSaveData, UnitType, HiveSection, Polarity } from '../types';
import { UNIT_CONFIGS, METABOLISM_UPGRADES, BIO_PLUGINS, PLAYABLE_UNITS, MAX_RESOURCES_BASE } from '../constants';
import { DataManager } from '../game/DataManager';

interface HiveViewProps {
  globalState: GameSaveData;
  onUpgrade: (type: UnitType) => void;
  onConfigChange: (type: UnitType, value: number) => void;
  onDigest: () => void;
  onClose: () => void;
}

const PolarityIcon = ({ type }: { type: Polarity }) => {
    switch(type) {
        case 'ATTACK': return <span className="text-red-500 font-bold">▲</span>;
        case 'DEFENSE': return <span className="text-blue-500 font-bold">🛡️</span>;
        case 'FUNCTION': return <span className="text-yellow-500 font-bold">⚡</span>;
        default: return <span className="text-white font-bold">⚪</span>;
    }
}

export const HiveView: React.FC<HiveViewProps> = ({ globalState, onUpgrade, onConfigChange, onDigest, onClose }) => {
  const [activeSection, setActiveSection] = useState<HiveSection>(HiveSection.BIRTHING);
  
  // Grafting State
  const [graftingUnit, setGraftingUnit] = useState<UnitType>(UnitType.MELEE);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);

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
    // Helper to get current stats display
    const getStats = (key: string, level: number) => {
        const conf = METABOLISM_UPGRADES[key as keyof typeof METABOLISM_UPGRADES] as any;
        if (!conf) return null;
        
        if (key === 'MINING') {
            return (
                <div className="text-xs space-y-1 bg-black/20 p-2 rounded border border-gray-800/50">
                    <div className="flex justify-between items-center text-gray-400">
                        <span>基础产出</span> 
                        <span className="text-purple-400 font-mono font-bold">+{level * conf.RATE_PER_LEVEL}/s</span>
                    </div>
                </div>
            );
        }
        if (key === 'DIGESTION') {
             return (
                <div className="text-xs space-y-1 bg-black/20 p-2 rounded border border-gray-800/50">
                    <div className="flex justify-between text-gray-400">
                        <span>消耗 (Input)</span> 
                        <span className="text-purple-400 font-mono">-{level * conf.INPUT_RATE} Min/s</span>
                    </div>
                    <div className="flex justify-between text-gray-400">
                        <span>产出 (Output)</span> 
                        <span className="text-green-400 font-mono font-bold">+{level * conf.OUTPUT_RATE} Bio/s</span>
                    </div>
                    <div className="flex justify-between text-gray-500 border-t border-gray-700/50 pt-1 mt-1">
                        <span>转化效率</span> 
                        <span className="font-mono">{(conf.OUTPUT_RATE/conf.INPUT_RATE * 100).toFixed(0)}%</span>
                    </div>
                </div>
            );
        }
        if (key === 'CENTRIFUGE') {
             return (
                <div className="text-xs space-y-1 bg-black/20 p-2 rounded border border-gray-800/50">
                    <div className="flex justify-between text-gray-400">
                        <span>消耗 (Input)</span> 
                        <span className="text-green-400 font-mono">-{level * conf.INPUT_RATE} Bio/s</span>
                    </div>
                    <div className="flex justify-between text-gray-400">
                        <span>产出 (Output)</span> 
                        <span className="text-blue-400 font-mono font-bold">+{level * conf.OUTPUT_RATE} DNA/s</span>
                    </div>
                </div>
            );
        }
        if (key === 'STORAGE') {
             return (
                <div className="text-xs space-y-1 bg-black/20 p-2 rounded border border-gray-800/50">
                    <div className="flex justify-between text-gray-400">
                        <span>总容量 (Cap)</span> 
                        <span className="text-white font-mono">{(MAX_RESOURCES_BASE + (level - 1) * conf.CAP_PER_LEVEL).toLocaleString()}</span>
                    </div>
                </div>
            );
        }
        if (key === 'SUPPLY') {
             return (
                <div className="text-xs space-y-1 bg-black/20 p-2 rounded border border-gray-800/50">
                    <div className="flex justify-between text-gray-400">
                        <span>兵力上限</span> 
                        <span className="text-orange-400 font-mono">{conf.BASE_CAP + (level - 1) * conf.CAP_PER_LEVEL}</span>
                    </div>
                </div>
            );
        }
        if (key === 'HIVE_CORE') {
             return (
                <div className="text-xs space-y-1 bg-black/20 p-2 rounded border border-gray-800/50">
                     <div className="flex justify-between text-gray-400">
                        <span>维护消耗</span> 
                        <span className="text-green-400 font-mono">-{level * conf.INPUT_RATE} Bio/s</span>
                    </div>
                </div>
            );
        }
        return null;
    };
    
    // Grouping configuration
    const groups = [
        {
            title: "矿物质循环 (Minerals)",
            desc: "基础资源的采集与初步处理。",
            color: "text-purple-400",
            border: "border-purple-900/30",
            bg: "bg-purple-900/5",
            items: ['MINING']
        },
        {
            title: "生物质合成 (Biomass)",
            desc: "将无机物转化为有机组织的消化系统。",
            color: "text-green-400",
            border: "border-green-900/30",
            bg: "bg-green-900/5",
            items: ['DIGESTION']
        },
        {
            title: "基因提取 (DNA)",
            desc: "高级遗传物质的离心与提纯。",
            color: "text-blue-400",
            border: "border-blue-900/30",
            bg: "bg-blue-900/5",
            items: ['CENTRIFUGE']
        },
        {
            title: "基础设施 (Infrastructure)",
            desc: "虫巢的核心维持与扩展系统。",
            color: "text-gray-300",
            border: "border-gray-700/50",
            bg: "bg-gray-800/20",
            items: ['STORAGE', 'SUPPLY', 'HIVE_CORE']
        }
    ];

    return (
        <div className="animate-in fade-in slide-in-from-right-4 duration-300 pb-20 space-y-8">
             <div className="mb-6">
                <h3 className="text-2xl font-black text-green-500 uppercase tracking-widest mb-1">代谢工程</h3>
                <p className="text-gray-500 text-sm">优化资源流转效率，建立自动化生产管线。</p>
            </div>
            
            {groups.map((group, idx) => (
                <div key={idx} className={`rounded-xl border ${group.border} ${group.bg} p-6`}>
                    <div className="mb-6">
                        <h4 className={`text-sm font-bold uppercase tracking-widest ${group.color} flex items-center gap-2 mb-1`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                            {group.title}
                        </h4>
                        <p className="text-[10px] text-gray-500 ml-3.5">{group.desc}</p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {group.items.map(key => {
                            let stateKey = '';
                             if (key === 'MINING') stateKey = 'miningLevel';
                            else if (key === 'DIGESTION') stateKey = 'digestLevel';
                            else if (key === 'CENTRIFUGE') stateKey = 'centrifugeLevel';
                            else if (key === 'HIVE_CORE') stateKey = 'hiveCoreLevel';
                            else if (key === 'STORAGE') stateKey = 'storageLevel';
                            else if (key === 'SUPPLY') stateKey = 'maxSupplyLevel';

                            const currentLevel = (globalState.hive.metabolism as any)[stateKey] || 1;
                            const config = METABOLISM_UPGRADES[key as keyof typeof METABOLISM_UPGRADES] as any;
                            const cost = DataManager.instance.getMetabolismUpgradeCost(stateKey);
                            const canAfford = globalState.resources.biomass >= cost;

                            return (
                                <div key={key} className="bg-[#0f1115] border border-gray-800 p-4 rounded-lg flex flex-col hover:border-gray-600 transition-colors group relative overflow-hidden">
                                    <div className={`absolute top-0 left-0 w-0.5 h-full opacity-0 group-hover:opacity-100 transition-opacity ${group.color.replace('text', 'bg')}`}></div>
                                    
                                    <div className="flex justify-between items-start mb-2 pl-2">
                                        <div className="font-bold text-gray-200">{config.NAME}</div>
                                        <div className="text-[10px] bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded font-mono border border-gray-700">Lv.{currentLevel}</div>
                                    </div>
                                    <div className="text-[10px] text-gray-500 mb-4 pl-2 h-8 leading-relaxed">{config.DESC}</div>
                                    
                                    <div className="mb-4 pl-2">
                                        {getStats(key, currentLevel)}
                                    </div>
                                    
                                    <button
                                        onClick={() => DataManager.instance.upgradeMetabolism(stateKey)}
                                        disabled={!canAfford}
                                        className={`mt-auto w-full py-2.5 rounded text-[10px] font-bold uppercase flex items-center justify-center gap-2 transition-all border ${
                                            canAfford 
                                            ? 'bg-gray-800 hover:bg-gray-700 text-white border-gray-600 hover:border-white/50 shadow-lg' 
                                            : 'bg-black/50 text-gray-600 border-gray-800 cursor-not-allowed'
                                        }`}
                                    >
                                        <span>升级</span>
                                        <span className={`font-mono ${canAfford ? 'text-green-500' : 'text-gray-600'}`}>{cost.toLocaleString()} Bio</span>
                                    </button>
                                </div>
                            )
                        })}
                    </div>
                </div>
            ))}
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
        <div className="animate-in fade-in slide-in-from-right-4 duration-300 flex h-full gap-6 pb-20">
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
      <div className="animate-in fade-in slide-in-from-right-4 duration-300 pb-20">
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
                                        <span>Min: {stats.min.toFixed(0)}</span>
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
                        
                        {/* Progress Bar */}
                        {u.isProducing && currentCount < u.cap && (
                             <div className="w-full h-1 bg-gray-800 rounded-full overflow-hidden mb-4">
                                 <div className="h-full bg-green-500 transition-all duration-100" style={{ width: `${(u.productionProgress / stats.time) * 100}%` }} />
                             </div>
                        )}

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
    <div className="flex h-full gap-8">
        {/* Navigation */}
        <div className="w-48 flex flex-col gap-2 shrink-0">
             <button onClick={() => setActiveSection(HiveSection.BIRTHING)} className={`text-left px-4 py-3 rounded text-sm font-bold uppercase tracking-wider transition-colors ${activeSection === HiveSection.BIRTHING ? 'bg-orange-600 text-white' : 'hover:bg-gray-800 text-gray-500'}`}>
                 1. 孵化 (Birthing)
             </button>
             <button onClick={() => setActiveSection(HiveSection.METABOLISM)} className={`text-left px-4 py-3 rounded text-sm font-bold uppercase tracking-wider transition-colors ${activeSection === HiveSection.METABOLISM ? 'bg-green-600 text-white' : 'hover:bg-gray-800 text-gray-500'}`}>
                 2. 代谢 (Metabolism)
             </button>
             <button onClick={() => setActiveSection(HiveSection.GRAFTING)} className={`text-left px-4 py-3 rounded text-sm font-bold uppercase tracking-wider transition-colors ${activeSection === HiveSection.GRAFTING ? 'bg-purple-600 text-white' : 'hover:bg-gray-800 text-gray-500'}`}>
                 3. 嫁接 (Grafting)
             </button>
             <button onClick={() => setActiveSection(HiveSection.EVOLUTION)} className={`text-left px-4 py-3 rounded text-sm font-bold uppercase tracking-wider transition-colors ${activeSection === HiveSection.EVOLUTION ? 'bg-yellow-600 text-white' : 'hover:bg-gray-800 text-gray-500'}`}>
                 4. 进化 (Evolution)
             </button>
             
             <div className="mt-auto">
                 <button onClick={onClose} className="w-full py-3 border border-gray-700 text-gray-500 uppercase text-xs font-bold hover:bg-gray-800 hover:text-white transition-colors">
                     Back to Surface
                 </button>
             </div>
        </div>

        {/* Content */}
        <div className="flex-1 h-full overflow-y-auto pr-4">
             {activeSection === HiveSection.BIRTHING && renderBirthing()}
             {activeSection === HiveSection.METABOLISM && renderMetabolism()}
             {activeSection === HiveSection.GRAFTING && renderGrafting()}
             {activeSection === HiveSection.EVOLUTION && renderEvolution()}
        </div>
    </div>
  );
};
