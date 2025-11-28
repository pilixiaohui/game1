


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
                
                const liveStats = DataManager.instance.getUnitStats(type);
                
                return (
                    <div key={type} className="group relative bg-gray-900 border border-red-900/30 hover:border-red-500/50 p-6 rounded-xl transition-all">
                         <div className="flex justify-between items-center relative z-10">
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-xl font-bold border ${type === UnitType.QUEEN ? 'bg-pink-900/20 border-pink-500/30 text-pink-400' : type === UnitType.MELEE ? 'bg-blue-900/20 border-blue-500/30 text-blue-400' : 'bg-purple-900/20 border-purple-500/30 text-purple-400'}`}>
                                    {type === UnitType.MELEE ? 'Z' : type === UnitType.QUEEN ? 'Q' : 'H'}
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
    const queenWeight = globalState.hive.production.unitWeights[UnitType.QUEEN] || 0;
    
    const totalUnits = (globalState.hive.unitStockpile[UnitType.MELEE] || 0) + 
                       (globalState.hive.unitStockpile[UnitType.RANGED] || 0) +
                       (globalState.hive.unitStockpile[UnitType.QUEEN] || 0);
    
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
                 <div className="text-xl text-orange-400 font-mono">{(meleeWeight + rangedWeight + queenWeight).toFixed(1)}</div>
             </div>
        </div>

        <div className="space-y-4">
              <div className="bg-gray-900 p-4 rounded border border-gray-800">
                <div className="flex justify-between mb-4">
                  <span className="text-blue-400 font-bold uppercase text-sm flex items-center gap-2">
                      <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                      跳虫流 (Melee)
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
                      刺蛇流 (Ranged)
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

              <div className="bg-gray-900 p-4 rounded border border-pink-900/50 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-1 bg-pink-900 text-[10px] text-pink-200 uppercase font-bold px-2 rounded-bl">EXPONENTIAL GROWTH</div>
                <div className="flex justify-between mb-4">
                  <span className="text-pink-400 font-bold uppercase text-sm flex items-center gap-2">
                      <span className="w-2 h-2 bg-pink-500 rounded-full animate-pulse"></span>
                      虫后 (Queen) - <span className="text-gray-400 text-xs">生产幼虫的催化剂</span>
                  </span>
                  <span className="text-mono text-white font-bold">{Math.round(queenWeight * 100)}%</span>
                </div>
                <input 
                  type="range" min="0" max="1" step="0.1"
                  value={queenWeight}
                  onChange={(e) => onConfigChange(UnitType.QUEEN, parseFloat(e.target.value))}
                  className="w-full h-4 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-pink-600"
                />
                <div className="text-[10px] text-gray-500 mt-2">
                    当前虫后数量: {globalState.hive.unitStockpile[UnitType.QUEEN]} | 幼虫回复加成: +{(globalState.hive.unitStockpile[UnitType.QUEEN] * 0.2).toFixed(1)}/s
                </div>
              </div>
        </div>
      </div>
    );
  };
  
  const renderMetabolism = () => {
    // Helper to render an upgrade card with input/output
    const renderChainCard = (
        type: 'miningLevel' | 'digestLevel' | 'centrifugeLevel' | 'hiveCoreLevel',
        title: string,
        desc: string,
        inputLabel: string | null,
        inputValue: number,
        outputLabel: string,
        outputValue: number,
        colorClass: string,
        isStarved: boolean = false
    ) => {
        const cost = DataManager.instance.getMetabolismUpgradeCost(type);
        const level = globalState.hive.metabolism[type] || 1;
        const canAfford = globalState.resources.biomass >= cost;

        return (
            <div className={`group bg-gray-900 border ${isStarved ? 'border-red-600 animate-pulse' : 'border-gray-800'} hover:border-gray-600 p-6 rounded-xl transition-all relative overflow-hidden flex flex-col justify-between`}>
                <div>
                    <div className="flex justify-between items-start mb-2">
                        <h4 className={`text-xl font-bold text-white uppercase tracking-wider`}>{title}</h4>
                        <span className="bg-gray-800 text-gray-400 px-2 py-0.5 rounded text-xs font-mono">Lv.{level}</span>
                    </div>
                    <p className="text-gray-500 text-xs mb-4 min-h-[32px]">{desc}</p>
                    
                    {/* Rate Display */}
                    <div className="bg-black/30 rounded p-3 text-xs font-mono mb-4 border border-gray-800">
                         {inputLabel && (
                             <div className="flex justify-between mb-1 text-red-400">
                                 <span>IN ({inputLabel})</span>
                                 <span>-{inputValue.toFixed(1)}/s</span>
                             </div>
                         )}
                         <div className={`flex justify-between ${isStarved ? 'text-gray-600 line-through' : colorClass}`}>
                             <span>OUT ({outputLabel})</span>
                             <span>+{outputValue.toFixed(1)}/s</span>
                         </div>
                         {isStarved && <div className="text-red-500 font-bold text-center mt-1 uppercase text-[10px]">Starved (Insufficient {inputLabel})</div>}
                    </div>
                </div>

                <button
                    onClick={() => DataManager.instance.upgradeMetabolism(type)}
                    disabled={!canAfford}
                    className={`w-full py-2 rounded font-bold uppercase tracking-widest text-xs transition-all flex justify-between items-center px-4 ${
                        canAfford 
                        ? `bg-gray-800 hover:bg-gray-700 text-white border border-gray-600` 
                        : 'bg-black/40 text-gray-700 cursor-not-allowed border border-transparent'
                    }`}
                >
                    <span>UPGRADE</span>
                    <span className="font-mono">{cost} Bio</span>
                </button>
            </div>
        );
    };
    
    // Stats for Chain
    const miningRate = (globalState.hive.metabolism.miningLevel || 1) * METABOLISM_UPGRADES.MINING.RATE_PER_LEVEL;
    
    const digestIn = (globalState.hive.metabolism.digestLevel || 1) * METABOLISM_UPGRADES.DIGESTION.INPUT_RATE;
    const digestOut = (globalState.hive.metabolism.digestLevel || 1) * METABOLISM_UPGRADES.DIGESTION.OUTPUT_RATE;
    const digestStarved = globalState.resources.minerals < 0.1 && digestIn > 0;

    const centIn = (globalState.hive.metabolism.centrifugeLevel || 1) * METABOLISM_UPGRADES.CENTRIFUGE.INPUT_RATE;
    const centOut = (globalState.hive.metabolism.centrifugeLevel || 1) * METABOLISM_UPGRADES.CENTRIFUGE.OUTPUT_RATE;
    const centStarved = globalState.resources.biomass < 0.1 && centIn > 0;

    const coreIn = (globalState.hive.metabolism.hiveCoreLevel || 1) * METABOLISM_UPGRADES.HIVE_CORE.INPUT_RATE;
    const coreOut = (globalState.hive.metabolism.hiveCoreLevel || 1) * METABOLISM_UPGRADES.HIVE_CORE.BASE_LARVA_RATE;
    const coreStarved = globalState.resources.biomass < 0.1 && coreIn > 0;

    return (
        <div className="animate-in fade-in slide-in-from-right-4 duration-300 pb-20">
            <div className="mb-6">
                <h3 className="text-2xl font-black text-yellow-500 uppercase tracking-widest mb-1">代谢循环链</h3>
                <p className="text-gray-500 text-sm">建立资源转化流水线。确保前级资源充足。</p>
            </div>
            
            <div className="flex flex-col gap-4 relative">
                {/* Visual Line connecting */}
                <div className="absolute left-6 top-10 bottom-10 w-0.5 bg-gray-800 -z-10"></div>
                
                {renderChainCard('miningLevel', 'T0 采集触手', '地壳矿物提取', null, 0, 'Minerals', miningRate, 'text-purple-400')}
                {renderChainCard('digestLevel', 'T1 消化池', '矿物转化生物质', 'Minerals', digestIn, 'Biomass', digestOut, 'text-green-400', digestStarved)}
                
                <div className="grid grid-cols-2 gap-4">
                     {renderChainCard('hiveCoreLevel', 'T2 主巢核心', '生物质维持幼虫环境', 'Biomass', coreIn, 'Larva (Base)', coreOut, 'text-orange-400', coreStarved)}
                     {renderChainCard('centrifugeLevel', 'T2 基因离心机', '生物质提取DNA', 'Biomass', centIn, 'DNA', centOut, 'text-blue-400', centStarved)}
                </div>
            </div>
            
            <div className="mt-8 border-t border-gray-800 pt-8">
                 <h4 className="text-gray-500 uppercase text-xs font-bold mb-4">Utility Organs</h4>
                 <div className="grid grid-cols-2 gap-4">
                     {/* Storage & Supply upgrades here (simplified for this view) */}
                      <button 
                        onClick={() => DataManager.instance.upgradeMetabolism('storageLevel')}
                        className="p-4 border border-gray-800 rounded hover:bg-gray-800 text-left"
                      >
                          <div className="text-xs text-gray-500 uppercase">能量泵 (Storage)</div>
                          <div className="text-white font-bold">{DataManager.instance.getMaxResourceCap()} Cap</div>
                      </button>
                      <button 
                        onClick={() => DataManager.instance.upgradeMetabolism('maxSupplyLevel')}
                        className="p-4 border border-gray-800 rounded hover:bg-gray-800 text-left"
                      >
                          <div className="text-xs text-gray-500 uppercase">突触网络 (Supply)</div>
                          <div className="text-white font-bold">{DataManager.instance.getMaxPopulationCap()} Cap</div>
                      </button>
                 </div>
            </div>
        </div>
    );
  };

  const renderGrafting = () => {
      const unit = globalState.hive.unlockedUnits[graftingUnit];
      const config = UNIT_CONFIGS[graftingUnit];
      if (!unit) return null;

      const liveStats = DataManager.instance.getUnitStats(graftingUnit);
      
      const currentLoad = DataManager.instance.calculateLoad(graftingUnit, unit.loadout);
      const maxLoad = config.baseLoadCapacity;
      const loadPct = (currentLoad / maxLoad) * 100;
      
      const allPlugins = globalState.hive.inventory.plugins;

      const handleEquip = (instanceId: string | null) => {
          if (selectedSlot === null) return;
          const success = DataManager.instance.equipPlugin(graftingUnit, selectedSlot, instanceId);
          if (success) {
              setSelectedSlot(null);
              setSelectedPluginId(null);
          }
      };

      const handleFuse = () => {
          if (!selectedPluginId) return;
          DataManager.instance.fusePlugin(selectedPluginId);
      };

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
                  <div className="w-1/3 flex flex-col gap-4">
                      <div className="bg-gray-900 p-4 rounded border border-gray-800">
                          <div className="flex justify-between mb-2 text-xs uppercase text-gray-400 font-bold">
                              <span>寄生负荷 (Capacity)</span>
                              <span className={loadPct > 100 ? 'text-red-500' : 'text-white'}>{currentLoad} / {maxLoad}</span>
                          </div>
                          <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                              <div className={`h-full transition-all duration-300 ${loadPct > 100 ? 'bg-red-600' : 'bg-green-500'}`} style={{width: `${Math.min(100, loadPct)}%`}} />
                          </div>
                      </div>

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

                      <div className="flex-1 bg-black/40 rounded border border-gray-800 p-6 flex flex-col items-center justify-center relative">
                          <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/diagmonds-light.png')]" />
                          
                          <div className={`w-32 h-48 border-2 border-dashed border-gray-700 rounded-full mb-8 flex items-center justify-center ${graftingUnit === UnitType.MELEE ? 'text-blue-900' : 'text-purple-900'}`}>
                              <span className="text-6xl font-black opacity-20">{graftingUnit === UnitType.MELEE ? 'Z' : graftingUnit === UnitType.QUEEN ? 'Q' : 'H'}</span>
                          </div>

                          <div className="grid grid-cols-2 gap-4 w-full relative z-10">
                              {config.slots.map((slot, idx) => {
                                  const equippedId = unit.loadout[idx];
                                  const equipped = equippedId ? allPlugins.find(p => p.instanceId === equippedId) : null;
                                  const template = equipped ? BIO_PLUGINS[equipped.templateId] : null;
                                  const isActive = selectedSlot === idx;

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

                  <div className="flex-1 flex flex-col gap-4">
                      <div className="flex-1 bg-gray-900 rounded border border-gray-800 p-4 flex flex-col overflow-hidden">
                           <div className="flex justify-between items-center mb-4">
                                <h4 className="text-xs uppercase text-gray-500 font-bold tracking-wider">培养皿 (Inventory)</h4>
                                <div className="text-xs text-gray-600">{allPlugins.length} items</div>
                           </div>
                           <div className="flex-1 overflow-y-auto grid grid-cols-3 gap-3 pr-2 content-start">
                               {allPlugins.map(renderInventoryCard)}
                           </div>
                      </div>

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

  const renderPrestige = () => {
      const biomass = globalState.resources.biomass;
      // Formula: sqrt(biomass / 10)
      const potentialMutagen = Math.floor(Math.sqrt(biomass / 10));
      const currentMutagen = globalState.resources.mutagen;
      
      return (
         <div className="animate-in fade-in slide-in-from-right-4 duration-300 flex flex-col items-center justify-center h-full text-center max-w-2xl mx-auto">
             <h3 className="text-4xl font-black text-purple-500 uppercase tracking-widest mb-4">吞噬世界 (DEVOUR WORLD)</h3>
             <p className="text-gray-400 mb-8 leading-relaxed">
                 当虫群已经无法在当前的生态中继续进化时，必须吞噬整个星球的表面生物质，将其提炼为纯粹的“突变原”，并携带核心基因（卡牌）前往下一个星球。
             </p>
             
             <div className="bg-purple-900/20 border border-purple-500/50 p-8 rounded-2xl mb-8 w-full">
                 <div className="text-gray-500 text-xs uppercase tracking-widest mb-2">本次轮回收益</div>
                 <div className="text-5xl font-mono text-purple-300 font-bold mb-2">+{potentialMutagen} <span className="text-sm">Mutagen</span></div>
                 <div className="text-xs text-gray-600">基于当前生物质: {Math.floor(biomass)}</div>
             </div>
             
             <div className="flex gap-8 text-left text-sm text-gray-500 mb-12">
                 <ul className="list-disc space-y-2">
                     <li className="text-red-400">重置所有单位等级</li>
                     <li className="text-red-400">重置所有资源 (Bio/Min/Larva)</li>
                     <li className="text-red-400">重置所有代谢器官等级</li>
                 </ul>
                 <ul className="list-disc space-y-2">
                     <li className="text-green-400">保留所有基因插件 (Inventory)</li>
                     <li className="text-green-400">保留突变原 (永久全局加成)</li>
                     <li className="text-green-400">开启更难的轮回 (TODO)</li>
                 </ul>
             </div>
             
             <button
                 onClick={() => {
                     if (confirm("确定要吞噬世界并重置吗？此操作不可撤销。")) {
                         DataManager.instance.prestige();
                     }
                 }}
                 disabled={potentialMutagen <= 0}
                 className={`px-8 py-4 rounded-xl font-bold uppercase tracking-widest text-lg transition-all ${
                     potentialMutagen > 0 
                     ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-[0_0_30px_rgba(168,85,247,0.5)]' 
                     : 'bg-gray-800 text-gray-600 cursor-not-allowed'
                 }`}
             >
                 启动基因重组
             </button>
             
             <div className="mt-8 text-xs text-gray-600">
                 当前突变原加成: +{(currentMutagen * 10).toFixed(0)}% 全局属性
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
                {activeSection === HiveSection.SEQUENCE && renderPrestige()}
            </div>
        </div>

      </div>
    </div>
  );
};
