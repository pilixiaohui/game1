

import React, { useState, useMemo } from 'react';
import { GameSaveData, UnitType, HiveSection, PluginInstance, Polarity, UnitRuntimeStats } from '../types';
import { UNIT_CONFIGS, METABOLISM_UPGRADES, BIO_PLUGINS, ELEMENT_COLORS, PLAYABLE_UNITS } from '../constants';
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

// Unified Stat Row Component to ensure consistent styling and logic
const StatRow = ({ label, current, base }: { label: string, current: number, base: number }) => {
    const diff = current - base;
    const isPos = diff > 0.001;
    const isNeg = diff < -0.001;
    
    return (
        <div className="flex justify-between items-center text-xs border-b border-gray-800 py-2 last:border-0">
            <span className="text-gray-500 uppercase tracking-wide">{label}</span>
            <div className="flex items-center gap-2">
                <span className="text-gray-500">{base.toFixed(0)}</span>
                {Math.abs(diff) > 0.001 && (
                    <span className={`font-bold text-[10px] ${isPos ? 'text-green-500' : 'text-red-500'}`}>
                        {isPos ? '+' : ''}{diff.toFixed(1)}
                    </span>
                )}
                <span className={`font-mono font-bold w-12 text-right ${isPos ? 'text-green-300' : isNeg ? 'text-red-300' : 'text-white'}`}>
                    {current.toFixed(1)}
                </span>
            </div>
        </div>
    );
};

export const HiveView: React.FC<HiveViewProps> = ({ globalState, onUpgrade, onConfigChange, onDigest, onClose }) => {
  const [activeSection, setActiveSection] = useState<HiveSection>(HiveSection.HYPERTROPHY);
  
  // Grafting State
  const [graftingUnit, setGraftingUnit] = useState<UnitType>(UnitType.MELEE);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [selectedPluginId, setSelectedPluginId] = useState<string | null>(null); // For inventory selection

  // 1. Hypertrophy (Upgrades)
  const renderHypertrophy = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
        <div className="mb-6">
            <h3 className="text-2xl font-black text-red-500 uppercase tracking-widest mb-1">增肌腔室</h3>
            <p className="text-gray-500 text-sm">注入生物质以增强肌肉束，提高单位基础密度。此处显示的属性为<span className="text-white font-bold">最终实战数值</span>。</p>
        </div>
        
        <div className="grid grid-cols-1 gap-4">
            {PLAYABLE_UNITS.map((type) => {
                const config = UNIT_CONFIGS[type];
                const unitSave = globalState.hive.unlockedUnits[type];
                if (!unitSave) return null;

                const cost = DataManager.instance.getUpgradeCost(type);
                const canAfford = globalState.resources.biomass >= cost;
                
                // CORE CHANGE: Use DataManager to get the Truth stats
                const liveStats = DataManager.instance.getUnitStats(type);
                
                return (
                    <div key={type} className="group relative bg-gray-900 border border-red-900/30 hover:border-red-500/50 p-6 rounded-xl transition-all">
                         <div className="flex justify-between items-center relative z-10">
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-xl font-bold border ${type === UnitType.MELEE ? 'bg-blue-900/20 border-blue-500/30 text-blue-400' : 'bg-purple-900/20 border-purple-500/30 text-purple-400'}`}>
                                    {type === UnitType.MELEE ? 'Z' : 'H'}
                                </div>
                                <div>
                                    <div className="flex items-baseline gap-2">
                                        <h4 className="text-xl font-bold text-gray-200">{config.name}</h4>
                                        <span className="text-xs font-mono text-red-500 bg-red-950/50 px-2 py-0.5 rounded border border-red-900">Lv.{unitSave.level}</span>
                                    </div>
                                    {/* Stats Summary */}
                                    <div className="text-xs text-gray-400 mt-2 grid grid-cols-2 gap-x-6 gap-y-1">
                                        <div className="flex justify-between w-24">
                                            <span>伤害</span>
                                            <span className="text-white font-mono">{liveStats.damage.toFixed(1)}</span>
                                        </div>
                                        <div className="flex justify-between w-24">
                                            <span>生命</span>
                                            <span className="text-white font-mono">{liveStats.hp.toFixed(0)}</span>
                                        </div>
                                        <div className="flex justify-between w-24">
                                            <span>攻速</span>
                                            <span className="text-white font-mono">{(1 / liveStats.attackSpeed).toFixed(1)}/s</span>
                                        </div>
                                        <div className="flex justify-between w-24">
                                            <span>移速</span>
                                            <span className="text-white font-mono">{liveStats.speed.toFixed(0)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => onUpgrade(type)}
                                disabled={!canAfford}
                                className={`px-6 py-3 rounded font-bold uppercase tracking-widest text-sm transition-all flex flex-col items-end ${
                                    canAfford 
                                    ? 'bg-red-600 hover:bg-red-500 text-white shadow-[0_0_15px_rgba(220,38,38,0.4)]' 
                                    : 'bg-gray-800 text-gray-600 cursor-not-allowed'
                                }`}
                            >
                                <span>注入血清</span>
                                <span className="text-[10px] opacity-70 font-mono">{cost} 生物质</span>
                            </button>
                         </div>
                    </div>
                );
            })}
        </div>
    </div>
  );

  const renderBirthing = () => {
    const meleeWeight = globalState.hive.production.unitWeights[UnitType.MELEE] || 0;
    const rangedWeight = globalState.hive.production.unitWeights[UnitType.RANGED] || 0;
    const totalUnits = (globalState.hive.unitStockpile[UnitType.MELEE] || 0) + (globalState.hive.unitStockpile[UnitType.RANGED] || 0);
    
    return (
      <div className="animate-in fade-in slide-in-from-right-4 duration-300">
        <div className="mb-6 flex justify-between items-start">
            <div>
                <h3 className="text-2xl font-black text-orange-500 uppercase tracking-widest mb-1">孵化矩阵</h3>
                <p className="text-gray-500 text-sm">配置虫群洪流的成分配比。</p>
            </div>
            
            <button 
                onClick={onDigest}
                disabled={totalUnits === 0}
                className={`px-4 py-2 border rounded text-xs font-bold uppercase tracking-widest transition-all ${
                    totalUnits > 0 
                    ? 'border-red-500 text-red-400 hover:bg-red-900/30' 
                    : 'border-gray-800 text-gray-600 cursor-not-allowed'
                }`}
            >
                消化重组 (Digest)
            </button>
        </div>

        <div className="bg-black/40 border border-gray-800 p-6 rounded-xl mb-6 flex justify-between items-center">
             <div>
                 <div className="text-gray-500 text-xs uppercase">幼虫池状态</div>
                 <div className="text-2xl text-white font-mono flex items-center gap-2">
                     {globalState.resources.larva.toFixed(1)} <span className="text-xs text-gray-600">/ {globalState.hive.production.larvaCapBase}</span>
                 </div>
             </div>
             <div className="text-right">
                 <div className="text-gray-500 text-xs uppercase">总流速权重</div>
                 <div className="text-xl text-orange-400 font-mono">{(meleeWeight + rangedWeight).toFixed(1)}</div>
             </div>
        </div>

        <div className="space-y-8">
              <div className="bg-gray-900 p-4 rounded border border-gray-800">
                <div className="flex justify-between mb-4">
                  <span className="text-blue-400 font-bold uppercase text-sm flex items-center gap-2">
                      <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                      跳虫流
                  </span>
                  <span className="text-mono text-white font-bold">{Math.round(meleeWeight * 100)}%</span>
                </div>
                <input 
                  type="range" min="0" max="1" step="0.1"
                  value={meleeWeight}
                  onChange={(e) => onConfigChange(UnitType.MELEE, parseFloat(e.target.value))}
                  className="w-full h-4 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>

              <div className="bg-gray-900 p-4 rounded border border-gray-800">
                <div className="flex justify-between mb-4">
                  <span className="text-purple-400 font-bold uppercase text-sm flex items-center gap-2">
                      <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                      刺蛇流
                  </span>
                  <span className="text-mono text-white font-bold">{Math.round(rangedWeight * 100)}%</span>
                </div>
                <input 
                  type="range" min="0" max="1" step="0.1"
                  value={rangedWeight}
                  onChange={(e) => onConfigChange(UnitType.RANGED, parseFloat(e.target.value))}
                  className="w-full h-4 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-purple-600"
                />
              </div>
        </div>
      </div>
    );
  };
  
  const renderMetabolism = () => {
    // Helper to render an upgrade card
    const renderCard = (
        type: 'passiveGenLevel' | 'recycleLevel' | 'storageLevel' | 'larvaGenLevel' | 'maxSupplyLevel',
        title: string,
        desc: string,
        icon: string,
        colorClass: string,
        currentValueStr: string,
        nextValueStr: string
    ) => {
        const cost = DataManager.instance.getMetabolismUpgradeCost(type);
        const level = globalState.hive.metabolism[type] || 1;
        const canAfford = globalState.resources.biomass >= cost;

        const handleUpgrade = () => {
            if (DataManager.instance.upgradeMetabolism(type)) {
                // UI updates automatically via props change
            }
        };

        return (
            <div className={`group bg-gray-900 border border-gray-800 hover:${colorClass.replace('text-', 'border-')} p-6 rounded-xl transition-all relative overflow-hidden`}>
                <div className={`absolute top-0 right-0 p-2 opacity-10 text-6xl font-black ${colorClass} pointer-events-none`}>
                    {icon}
                </div>
                
                <div className="relative z-10 flex flex-col h-full justify-between">
                    <div>
                        <div className="flex justify-between items-start mb-2">
                            <h4 className={`text-xl font-bold text-white uppercase tracking-wider`}>{title}</h4>
                            <span className="bg-gray-800 text-gray-400 px-2 py-0.5 rounded text-xs font-mono">Lv.{level}</span>
                        </div>
                        <p className="text-gray-500 text-sm mb-4 leading-relaxed min-h-[40px]">{desc}</p>
                        
                        <div className="flex gap-4 text-xs font-mono mb-6 bg-black/20 p-2 rounded">
                            <div className="flex-1">
                                <div className="text-gray-600 uppercase mb-1">当前效果</div>
                                <div className="text-gray-300 font-bold">{currentValueStr}</div>
                            </div>
                            <div className="w-px bg-gray-700"></div>
                            <div className="flex-1">
                                <div className="text-gray-600 uppercase mb-1">升级预览</div>
                                <div className={`${colorClass} font-bold`}>{nextValueStr}</div>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={handleUpgrade}
                        disabled={!canAfford}
                        className={`w-full py-3 rounded font-bold uppercase tracking-widest text-sm transition-all flex justify-between items-center px-4 ${
                            canAfford 
                            ? `bg-gray-800 hover:bg-gray-700 text-white border border-gray-600 hover:border-gray-400` 
                            : 'bg-black/40 text-gray-700 cursor-not-allowed border border-transparent'
                        }`}
                    >
                        <span>升级器官</span>
                        <span className="text-[10px] font-mono">{cost} Bio</span>
                    </button>
                </div>
            </div>
        );
    };

    // Calculate display values
    const passiveLevel = globalState.hive.metabolism.passiveGenLevel || 1;
    const passiveBase = 15; // Rough estimate for display
    const passiveCur = Math.round(passiveBase * (1 + (passiveLevel-1)*0.2));
    const passiveNext = Math.round(passiveBase * (1 + (passiveLevel)*0.2));

    const recycleLevel = globalState.hive.metabolism.recycleLevel || 1;
    const recycleCur = Math.min(80, Math.round((10 + (recycleLevel-1)*5)));
    const recycleNext = Math.min(80, Math.round((10 + (recycleLevel)*5)));

    const storageLevel = globalState.hive.metabolism.storageLevel || 1;
    const storageCur = DataManager.instance.getMaxResourceCap();
    const storageNext = storageCur + METABOLISM_UPGRADES.STORAGE.CAP_PER_LEVEL;

    const larvaLevel = globalState.hive.metabolism.larvaGenLevel || 1;
    const larvaCur = (METABOLISM_UPGRADES.LARVA.BASE_RATE + (larvaLevel - 1) * METABOLISM_UPGRADES.LARVA.RATE_PER_LEVEL).toFixed(1);
    const larvaNext = (METABOLISM_UPGRADES.LARVA.BASE_RATE + (larvaLevel) * METABOLISM_UPGRADES.LARVA.RATE_PER_LEVEL).toFixed(1);

    const supplyLevel = globalState.hive.metabolism.maxSupplyLevel || 1;
    const supplyCur = DataManager.instance.getMaxPopulationCap();
    const supplyNext = supplyCur + METABOLISM_UPGRADES.SUPPLY.CAP_PER_LEVEL;

    return (
        <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="mb-6">
                <h3 className="text-2xl font-black text-yellow-500 uppercase tracking-widest mb-1">代谢循环</h3>
                <p className="text-gray-500 text-sm">强化资源产出、回收与存储效率。</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {renderCard(
                    'passiveGenLevel',
                    METABOLISM_UPGRADES.PASSIVE.NAME,
                    METABOLISM_UPGRADES.PASSIVE.DESC,
                    '🌱',
                    'text-green-500',
                    `~${passiveCur} /sec`,
                    `~${passiveNext} /sec`
                )}
                {renderCard(
                    'larvaGenLevel',
                    METABOLISM_UPGRADES.LARVA.NAME,
                    METABOLISM_UPGRADES.LARVA.DESC,
                    '🥚',
                    'text-orange-500',
                    `${larvaCur} /sec`,
                    `${larvaNext} /sec`
                )}
                {renderCard(
                    'maxSupplyLevel',
                    METABOLISM_UPGRADES.SUPPLY.NAME,
                    METABOLISM_UPGRADES.SUPPLY.DESC,
                    '🧠',
                    'text-red-500',
                    `${supplyCur} Units`,
                    `${supplyNext} Units`
                )}
                 {renderCard(
                    'recycleLevel',
                    METABOLISM_UPGRADES.RECYCLE.NAME,
                    METABOLISM_UPGRADES.RECYCLE.DESC,
                    '🦴',
                    'text-purple-500',
                    `${recycleCur}% 回收`,
                    `${recycleNext}% 回收`
                )}
                {renderCard(
                    'storageLevel',
                    METABOLISM_UPGRADES.STORAGE.NAME,
                    METABOLISM_UPGRADES.STORAGE.DESC,
                    '🔋',
                    'text-blue-500',
                    `${storageCur / 1000}k 容量`,
                    `${storageNext / 1000}k 容量`
                )}
            </div>
        </div>
    );
  };

  const renderGrafting = () => {
      const unit = globalState.hive.unlockedUnits[graftingUnit];
      const config = UNIT_CONFIGS[graftingUnit];
      if (!unit) return null;

      // CORE CHANGE: Remove internal state. Use DataManager to calculate everything live.
      // This ensures when globalState changes (via App.tsx listener), this view updates.
      const liveStats = DataManager.instance.getUnitStats(graftingUnit);
      
      const currentLoad = DataManager.instance.calculateLoad(graftingUnit, unit.loadout);
      const maxLoad = config.baseLoadCapacity;
      const loadPct = (currentLoad / maxLoad) * 100;
      
      const allPlugins = globalState.hive.inventory.plugins;

      // Handle equip
      const handleEquip = (instanceId: string | null) => {
          if (selectedSlot === null) return;
          const success = DataManager.instance.equipPlugin(graftingUnit, selectedSlot, instanceId);
          if (success) {
              setSelectedSlot(null);
              setSelectedPluginId(null);
          }
      };

      // Handle Upgrade
      const handleFuse = () => {
          if (!selectedPluginId) return;
          DataManager.instance.fusePlugin(selectedPluginId);
      };

      // Helper to render a card in the inventory
      const renderInventoryCard = (p: PluginInstance) => {
          const t = BIO_PLUGINS[p.templateId];
          if (!t) return null;
          const isSelected = selectedPluginId === p.instanceId;
          const isEquipped = unit.loadout.includes(p.instanceId);
          
          return (
              <button 
                key={p.instanceId}
                onClick={() => setSelectedPluginId(p.instanceId)}
                className={`relative p-3 rounded border text-left transition-all h-32 flex flex-col justify-between ${
                    isSelected ? 'bg-green-900/40 border-green-500' : 'bg-gray-800/50 border-gray-700 hover:bg-gray-800'
                }`}
              >
                  {isEquipped && <div className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full" />}
                  <div>
                      <div className="flex justify-between items-start mb-1">
                          <span className={`text-xs font-bold ${t.rarity === 'COMMON' ? 'text-gray-300' : t.rarity === 'RARE' ? 'text-yellow-300' : 'text-purple-300'}`}>{t.name}</span>
                          <PolarityIcon type={t.polarity} />
                      </div>
                      <div className="text-[10px] text-gray-500 line-clamp-2">{t.description}</div>
                  </div>
                  <div className="flex justify-between items-end mt-2">
                       <div className="flex gap-0.5">
                           {Array.from({length: t.maxRank}).map((_, i) => (
                               <div key={i} className={`w-1.5 h-1.5 rounded-full ${i <= p.rank ? 'bg-white' : 'bg-gray-700'}`} />
                           ))}
                       </div>
                       <div className="text-xs font-mono text-gray-400">{t.baseCost + (p.rank * t.costPerRank)}</div>
                  </div>
              </button>
          );
      };

      const selectedPluginInstance = selectedPluginId ? allPlugins.find(p => p.instanceId === selectedPluginId) : null;
      const selectedPluginTemplate = selectedPluginInstance ? BIO_PLUGINS[selectedPluginInstance.templateId] : null;

      return (
          <div className="flex flex-col h-full animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="mb-4 flex gap-4 border-b border-gray-800 pb-4">
                  {PLAYABLE_UNITS.map(type => (
                      <button 
                        key={type}
                        onClick={() => { setGraftingUnit(type); setSelectedSlot(null); }}
                        className={`px-4 py-2 rounded text-xs font-bold uppercase tracking-widest transition-colors ${
                            graftingUnit === type ? 'bg-green-900 text-green-400' : 'bg-gray-800 text-gray-500 hover:text-gray-300'
                        }`}
                      >
                          {UNIT_CONFIGS[type].name}
                      </button>
                  ))}
              </div>

              <div className="flex-1 flex gap-8 min-h-0">
                  {/* LEFT: Anatomy & Slots */}
                  <div className="w-1/3 flex flex-col gap-4">
                      {/* Load Capacity */}
                      <div className="bg-gray-900 p-4 rounded border border-gray-800">
                          <div className="flex justify-between mb-2 text-xs uppercase text-gray-400 font-bold">
                              <span>寄生负荷 (Capacity)</span>
                              <span className={loadPct > 100 ? 'text-red-500' : 'text-white'}>{currentLoad} / {maxLoad}</span>
                          </div>
                          <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                              <div className={`h-full transition-all duration-300 ${loadPct > 100 ? 'bg-red-600' : 'bg-green-500'}`} style={{width: `${Math.min(100, loadPct)}%`}} />
                          </div>
                      </div>

                      {/* Live Stats Display */}
                      <div className="bg-black/40 rounded border border-gray-800 p-4">
                          <h4 className="text-xs font-bold text-gray-400 uppercase mb-2 flex justify-between">
                              <span>宿主指标 (Metrics)</span>
                              <span className="text-[10px] text-gray-600">BASE + MOD</span>
                          </h4>
                          
                          <StatRow label="生命 (HP)" current={liveStats.hp} base={config.baseStats.hp} />
                          <StatRow label="伤害 (DMG)" current={liveStats.damage} base={config.baseStats.damage} />
                          <StatRow label="移速 (SPD)" current={liveStats.speed} base={config.baseStats.speed} />
                          <StatRow label="暴击 (Crit)" current={liveStats.critChance * 100} base={5} />
                          <StatRow label="爆伤 (CritD)" current={liveStats.critDamage} base={1.5} />
                          
                          <div className="flex justify-between items-center text-xs pt-2 mt-2 border-t border-gray-700">
                               <span className="text-gray-500 uppercase">攻击属性</span>
                               <span className="font-bold px-2 py-0.5 rounded" style={{color: '#' + ELEMENT_COLORS[liveStats.element].toString(16), backgroundColor: 'rgba(255,255,255,0.1)'}}>
                                   {liveStats.element}
                               </span>
                          </div>
                      </div>

                      {/* Slots Visual */}
                      <div className="flex-1 bg-black/40 rounded border border-gray-800 p-6 flex flex-col items-center justify-center relative">
                          <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/diagmonds-light.png')]" />
                          
                          {/* Unit Silhouette */}
                          <div className={`w-32 h-48 border-2 border-dashed border-gray-700 rounded-full mb-8 flex items-center justify-center ${graftingUnit === UnitType.MELEE ? 'text-blue-900' : 'text-purple-900'}`}>
                              <span className="text-6xl font-black opacity-20">{graftingUnit === UnitType.MELEE ? 'Z' : 'H'}</span>
                          </div>

                          <div className="grid grid-cols-2 gap-4 w-full relative z-10">
                              {config.slots.map((slot, idx) => {
                                  const equippedId = unit.loadout[idx];
                                  const equipped = equippedId ? allPlugins.find(p => p.instanceId === equippedId) : null;
                                  const template = equipped ? BIO_PLUGINS[equipped.templateId] : null;
                                  const isActive = selectedSlot === idx;

                                  // Cost calculation for display
                                  let costDisplay = '';
                                  if (template && equipped) {
                                      const rawCost = template.baseCost + (equipped.rank * template.costPerRank);
                                      const reduced = slot.polarity === template.polarity || slot.polarity === 'UNIVERSAL' ? Math.ceil(rawCost/2) : rawCost;
                                      costDisplay = reduced.toString();
                                  }

                                  return (
                                      <button 
                                        key={idx}
                                        onClick={() => setSelectedSlot(isActive ? null : idx)}
                                        className={`h-24 rounded border flex flex-col items-center justify-center relative overflow-hidden transition-all ${
                                            isActive 
                                            ? 'border-green-400 bg-green-900/20' 
                                            : equipped 
                                                ? 'border-gray-600 bg-gray-800' 
                                                : 'border-gray-800 bg-black/20 hover:border-gray-600'
                                        }`}
                                      >
                                          <div className="absolute top-1 right-1 opacity-50"><PolarityIcon type={slot.polarity} /></div>
                                          
                                          {equipped && template ? (
                                              <>
                                                <div className="text-[10px] font-bold text-gray-300 text-center px-2 line-clamp-2">{template.name}</div>
                                                <div className="text-xs font-mono text-green-400 mt-1">{costDisplay}</div>
                                                {/* Dots */}
                                                <div className="flex gap-0.5 mt-2 opacity-50">
                                                    {Array.from({length: template.maxRank}).map((_, i) => (
                                                        <div key={i} className={`w-1 h-1 rounded-full ${i <= equipped.rank ? 'bg-white' : 'bg-gray-600'}`} />
                                                    ))}
                                                </div>
                                              </>
                                          ) : (
                                              <span className="text-xs text-gray-700 uppercase">Empty</span>
                                          )}
                                      </button>
                                  )
                              })}
                          </div>
                      </div>
                  </div>

                  {/* RIGHT: Inventory & Details */}
                  <div className="flex-1 flex flex-col gap-4">
                      {/* Inventory Grid */}
                      <div className="flex-1 bg-gray-900 rounded border border-gray-800 p-4 flex flex-col overflow-hidden">
                           <div className="flex justify-between items-center mb-4">
                                <h4 className="text-xs uppercase text-gray-500 font-bold tracking-wider">培养皿 (Inventory)</h4>
                                <div className="text-xs text-gray-600">{allPlugins.length} items</div>
                           </div>
                           <div className="flex-1 overflow-y-auto grid grid-cols-3 gap-3 pr-2 content-start">
                               {allPlugins.map(renderInventoryCard)}
                           </div>
                      </div>

                      {/* Detail Panel */}
                      <div className="h-40 bg-black rounded border border-gray-800 p-4 flex gap-6">
                           {selectedPluginInstance && selectedPluginTemplate ? (
                               <>
                                   <div className="w-1/3 border-r border-gray-800 pr-4">
                                       <h3 className="text-lg font-bold text-white mb-1">{selectedPluginTemplate.name}</h3>
                                       <p className="text-xs text-gray-500 mb-2">{selectedPluginTemplate.description}</p>
                                       <div className="flex gap-2 text-xs">
                                           <span className="text-gray-600">Polarity:</span>
                                           <PolarityIcon type={selectedPluginTemplate.polarity} />
                                       </div>
                                       <div className="mt-2 text-green-400 font-mono text-sm">
                                           Rank: {selectedPluginInstance.rank} / {selectedPluginTemplate.maxRank}
                                       </div>
                                   </div>
                                   <div className="flex-1 flex flex-col justify-between">
                                       {/* Actions */}
                                       <div className="flex justify-end gap-4">
                                           {selectedSlot !== null && (
                                                <button 
                                                    onClick={() => handleEquip(selectedPluginInstance.instanceId)}
                                                    className="bg-green-700 hover:bg-green-600 text-white px-6 py-2 rounded text-xs font-bold uppercase"
                                                >
                                                    INSERT
                                                </button>
                                           )}
                                            {selectedPluginInstance.rank < selectedPluginTemplate.maxRank && (
                                                <button 
                                                    onClick={handleFuse}
                                                    className="bg-purple-900 hover:bg-purple-700 text-purple-200 border border-purple-500 px-6 py-2 rounded text-xs font-bold uppercase flex items-center gap-2"
                                                >
                                                    FUSE <span className="opacity-50 text-[10px]">| {50 * (selectedPluginInstance.rank + 1)} Bio</span>
                                                </button>
                                            )}
                                       </div>
                                       
                                       <div className="text-right text-xs text-gray-500">
                                            {selectedSlot !== null ? "Select plugin to equip into slot" : "Select slot first to equip"}
                                       </div>
                                   </div>
                               </>
                           ) : (
                               <div className="w-full h-full flex items-center justify-center text-gray-700 uppercase text-xs">
                                   Select a plugin to view details
                               </div>
                           )}
                      </div>
                      
                      {selectedSlot !== null && unit.loadout[selectedSlot] && (
                          <div className="flex justify-end">
                             <button 
                                onClick={() => handleEquip(null)}
                                className="text-red-500 text-xs font-bold uppercase hover:underline"
                             >
                                Unequip Slot
                             </button>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      );
  }
  
  const renderPlaceholder = (title: string, color: string) => (
       <div className="animate-in fade-in slide-in-from-right-4 duration-300">
          <h3 className={`text-2xl font-black ${color} uppercase tracking-widest mb-1`}>{title}</h3>
          <p className="text-gray-500 text-sm mb-6">此生物器官尚未在基因序列中激活。</p>
       </div>
  );

  const navItems = [
    { id: HiveSection.HYPERTROPHY, label: '增肌', icon: '💪', color: 'border-red-500' },
    { id: HiveSection.GRAFTING, label: '嫁接', icon: '🪱', color: 'border-green-500' }, 
    { id: HiveSection.BIRTHING, label: '孵化', icon: '🥚', color: 'border-orange-500' },
    { id: HiveSection.METABOLISM, label: '代谢', icon: '♻️', color: 'border-yellow-500' },
    { id: HiveSection.SEQUENCE, label: '序列', icon: '🧬', color: 'border-purple-500' },
    { id: HiveSection.GLANDULAR, label: '腺体', icon: '⚗️', color: 'border-pink-500' },
    { id: HiveSection.PLAGUE, label: '载体', icon: '☣️', color: 'border-cyan-500' },
  ];

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/95 backdrop-blur-xl p-0 md:p-8 animate-in fade-in duration-200">
      <div className="w-full max-w-6xl h-full flex border border-gray-800 rounded-2xl overflow-hidden shadow-2xl bg-[#050505]">
        
        <div className="w-64 bg-[#0a0a0a] border-r border-gray-800 flex flex-col">
            <div className="p-6 border-b border-gray-800">
                <h1 className="text-2xl font-black text-gray-100 uppercase tracking-widest">虫巢核心</h1>
                <div className="text-[10px] text-gray-500 uppercase mt-1 tracking-[0.2em]">进化中枢</div>
            </div>
            
            <div className="flex-1 overflow-y-auto py-4 space-y-1">
                {navItems.map(item => (
                    <button 
                        key={item.id}
                        onClick={() => setActiveSection(item.id)}
                        className={`w-full text-left px-6 py-4 flex items-center gap-4 transition-all duration-200 border-l-4 ${
                            activeSection === item.id 
                            ? `${item.color} bg-gray-900 text-white` 
                            : 'border-transparent text-gray-500 hover:text-gray-300 hover:bg-gray-900/50'
                        }`}
                    >
                        <span className="text-xl filter grayscale opacity-70">{item.icon}</span>
                        <span className="uppercase text-xs font-bold tracking-wider">{item.label}</span>
                    </button>
                ))}
            </div>

            <div className="p-6 border-t border-gray-800 bg-[#080808]">
                <div className="flex items-center gap-2 text-gray-500 text-xs uppercase mb-2">
                    <span>可用生物质</span>
                </div>
                <div className="text-2xl font-mono text-purple-400 font-bold">
                    {Math.floor(globalState.resources.biomass)}
                </div>
            </div>
        </div>

        <div className="flex-1 flex flex-col relative">
            <div className="h-16 border-b border-gray-800 flex justify-end items-center px-6">
                <button 
                    onClick={onClose}
                    className="px-6 py-2 bg-gray-800 hover:bg-gray-700 text-white text-xs font-bold rounded uppercase tracking-wider transition-colors border border-gray-700"
                >
                    断开神经连接
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]">
                {activeSection === HiveSection.HYPERTROPHY && renderHypertrophy()}
                {activeSection === HiveSection.BIRTHING && renderBirthing()}
                {activeSection === HiveSection.METABOLISM && renderMetabolism()}
                {activeSection === HiveSection.GRAFTING && renderGrafting()}
                {activeSection === HiveSection.SEQUENCE && renderPlaceholder("基因序列重组", "text-purple-500")}
                {activeSection === HiveSection.GLANDULAR && renderPlaceholder("腺体分泌", "text-pink-500")}
                {activeSection === HiveSection.PLAGUE && renderPlaceholder("瘟疫载体", "text-cyan-500")}
            </div>
        </div>

      </div>
    </div>
  );
};