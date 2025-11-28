
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { HUD } from './components/HUD';
import { WorldMapView } from './components/WorldMapView';
import { HiveView } from './components/HiveView';
import { GameEngine } from './game/GameEngine';
import { DataManager } from './game/DataManager';
import { GameStateSnapshot, RoguelikeCard, RegionData, UnitType, GameSaveData } from './types';
import { INITIAL_REGIONS_CONFIG } from './constants';

const App: React.FC = () => {
  const engineRef = useRef<GameEngine | null>(null);
  
  // Connect to DataManager (Global Store)
  const [globalState, setGlobalState] = useState<GameSaveData>(() => DataManager.instance.state);
  
  // Force update trigger
  const [, setTick] = useState(0);

  // --- UI State ---
  const [activeRegion, setActiveRegion] = useState<RegionData | null>(null);
  const [isHiveOpen, setIsHiveOpen] = useState(false);

  // --- Battle State (HUD) ---
  const [gameState, setGameState] = useState<GameStateSnapshot>({
    resources: 0, distance: 0, unitCountZerg: 0, unitCountHuman: 0, isPaused: false,
    stockpileMelee: 0, stockpileRanged: 0, stockpileTotal: 0, populationCap: 0
  });

  // Subscribe to DataManager events
  useEffect(() => {
      const handleDataChange = () => {
          // Create a new reference to force React to detect change
          setGlobalState(JSON.parse(JSON.stringify(DataManager.instance.state))); 
          setTick(t => t + 1);
      };

      const dm = DataManager.instance;
      // Resource & Production
      dm.events.on('RESOURCE_CHANGED', handleDataChange);
      dm.events.on('STOCKPILE_CHANGED', handleDataChange);
      dm.events.on('PRODUCTION_CHANGED', handleDataChange);
      // Units & Progression
      dm.events.on('UNIT_UPGRADED', handleDataChange);
      dm.events.on('REGION_PROGRESS', handleDataChange);
      dm.events.on('REGION_UNLOCKED', handleDataChange);
      // Grafting / Plugins (CRITICAL FOR SYNC)
      dm.events.on('PLUGIN_EQUIPPED', handleDataChange);
      dm.events.on('PLUGIN_UPGRADED', handleDataChange);

      return () => {
          dm.events.off('RESOURCE_CHANGED', handleDataChange);
          dm.events.off('STOCKPILE_CHANGED', handleDataChange);
          dm.events.off('PRODUCTION_CHANGED', handleDataChange);
          dm.events.off('UNIT_UPGRADED', handleDataChange);
          dm.events.off('REGION_PROGRESS', handleDataChange);
          dm.events.off('REGION_UNLOCKED', handleDataChange);
          dm.events.off('PLUGIN_EQUIPPED', handleDataChange);
          dm.events.off('PLUGIN_UPGRADED', handleDataChange);
      };
  }, []);

  // Passive Loop (Run when engine is NOT running) - BUT engine is now always running visuals
  // We still need to tick data if we are in stockpile mode because GameEngine handles visual ticks, 
  // but DataManager needs to tick logical resources.
  // GameEngine now calls DataManager.updateTick internally in both modes.

  // Battle Loop Polling
  useEffect(() => {
      let animId: number;
      const poll = () => {
          if (engineRef.current && !engineRef.current.isPaused) {
              const snapshot = engineRef.current.getSnapshot();
              setGameState(snapshot);
          }
          animId = requestAnimationFrame(poll);
      };
      animId = requestAnimationFrame(poll);
      return () => cancelAnimationFrame(animId);
  }, [activeRegion]);

  const handleEngineInit = useCallback((engine: GameEngine) => {
    engineRef.current = engine;
  }, []);

  const handleEnterRegion = (region: RegionData) => {
      setActiveRegion(region);
  };
  
  const handleEvacuate = () => {
      setActiveRegion(null);
  };

  const handleUpgradeUnit = (type: UnitType) => {
      DataManager.instance.upgradeUnit(type);
  };
  
  const handleDigest = () => {
      DataManager.instance.digestStockpile();
  };

  const handleProductionConfigChange = (type: UnitType, value: number) => {
      DataManager.instance.updateProductionConfig(type, value);
  };

  // Construct Region Data for Map View
  const mapRegions: RegionData[] = INITIAL_REGIONS_CONFIG.map(r => {
      const saved = globalState.world.regions[r.id];
      return {
          ...r,
          isUnlocked: saved ? saved.isUnlocked : false,
          devourProgress: saved ? saved.devourProgress : 0,
          isFighting: activeRegion?.id === r.id
      };
  });

  const getSliderColor = (val: number) => val === 0 ? 'accent-gray-500' : (val < 0.5 ? 'accent-blue-400' : 'accent-blue-600');
  const getWeight = (type: UnitType) => globalState.hive.production.unitWeights[type] || 0;

  return (
    <div className="flex flex-col w-full h-full bg-neutral-900 font-sans select-none overflow-hidden">
      
      {/* CONTENT */}
      <div className="flex-1 flex overflow-hidden">
          <div className="w-1/3 min-w-[300px] border-r border-gray-800 relative z-10 bg-[#0a0a0a]">
               <div className="absolute top-0 left-0 w-full p-4 bg-gradient-to-b from-black/80 to-transparent pointer-events-none z-10">
                   <h2 className="text-gray-500 text-xs font-bold tracking-widest uppercase">全球行动</h2>
               </div>
               <WorldMapView 
                    globalState={{...globalState, regions: mapRegions} as any} 
                    onEnterRegion={handleEnterRegion} 
                    onOpenHive={() => setIsHiveOpen(true)}
                    activeRegionId={activeRegion?.id}
                />
          </div>

          <div className="flex-1 relative bg-black">
                {/* Always render canvas to show stockpile when idle */}
                <GameCanvas 
                    activeRegion={activeRegion}
                    onEngineInit={handleEngineInit} 
                />
                
                {activeRegion ? (
                    <>
                        <HUD gameState={gameState} onEvacuate={handleEvacuate} />
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
                            <div className="mt-4 flex gap-4 text-xs font-mono text-gray-500">
                                <span>MELEE: {globalState.hive.unitStockpile[UnitType.MELEE]}</span>
                                <span>RANGED: {globalState.hive.unitStockpile[UnitType.RANGED]}</span>
                            </div>
                        </div>
                    </div>
                )}
          </div>
      </div>

      {/* COMMAND CONSOLE */}
      <div className="h-48 bg-[#0f0f11] border-t border-gray-800 flex relative z-20 shadow-2xl">
          {/* LEFT: Resources & Stockpile Detail */}
          <div className="w-1/3 min-w-[300px] p-6 border-r border-gray-800 flex flex-col justify-between bg-[#111]">
               <div className="flex justify-between items-start">
                   <div>
                        <div className="text-xs text-gray-500 uppercase tracking-widest mb-1">生物质</div>
                        <div className="text-2xl font-mono text-white font-bold tracking-tighter flex items-baseline gap-2">
                           {Math.floor(globalState.resources.biomass)} 
                           <span className="text-xs text-green-500 font-normal animate-pulse">▲</span>
                        </div>
                   </div>
                   <div className="text-right">
                        <div className="text-xs text-gray-500 uppercase tracking-widest mb-1">矿物质</div>
                        <div className="text-2xl font-mono text-purple-300 font-bold tracking-tighter flex items-baseline justify-end gap-2">
                           {Math.floor(globalState.resources.minerals)} 
                           <span className="text-xs text-purple-500 font-normal">▲</span>
                        </div>
                   </div>
               </div>

               <div className="flex items-center gap-4 mt-2">
                    <div className="flex-1">
                        <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">幼虫</div>
                        <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                             <div className="h-full bg-orange-500 transition-all duration-300" 
                                  style={{ width: `${(globalState.resources.larva / globalState.hive.production.larvaCapBase) * 100}%` }} 
                             />
                        </div>
                    </div>
                    <button onClick={() => setIsHiveOpen(true)} className="p-2 bg-gray-800 hover:bg-gray-700 rounded text-gray-400 hover:text-white transition-colors">
                        ⚙️
                    </button>
               </div>
          </div>

          {/* RIGHT: Production Sliders & Counts */}
          <div className="flex-1 p-6 flex gap-8 items-center bg-[#141414]">
               <div className="w-32 text-right border-r border-gray-800 pr-4 h-full flex flex-col items-end justify-center">
                   <div className="text-xs text-gray-500 font-bold uppercase tracking-widest leading-tight mb-2">兵力储备</div>
                   <div className="text-2xl font-mono font-bold text-orange-400">
                        {globalState.hive.unitStockpile[UnitType.MELEE] + globalState.hive.unitStockpile[UnitType.RANGED]}
                        <span className="text-xs text-gray-600 ml-1">/ {globalState.hive.production.populationCapBase}</span>
                   </div>
               </div>
               <div className="flex-1 flex gap-8">
                    <div className="flex-1">
                        <div className="flex justify-between mb-2">
                            <span className="text-blue-400 font-bold uppercase text-xs tracking-wider flex items-center gap-2">
                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>跳虫
                                <span className="text-gray-600 ml-1">[{globalState.hive.unitStockpile[UnitType.MELEE]}]</span>
                            </span>
                            <span className="text-gray-400 text-xs font-mono">{Math.round(getWeight(UnitType.MELEE) * 100)}%</span>
                        </div>
                        <input type="range" min="0" max="1" step="0.1"
                            value={getWeight(UnitType.MELEE)}
                            onChange={(e) => handleProductionConfigChange(UnitType.MELEE, parseFloat(e.target.value))}
                            className={`w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer ${getSliderColor(getWeight(UnitType.MELEE))}`}
                        />
                    </div>
                    <div className="flex-1">
                         <div className="flex justify-between mb-2">
                            <span className="text-purple-400 font-bold uppercase text-xs tracking-wider flex items-center gap-2">
                                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>刺蛇
                                <span className="text-gray-600 ml-1">[{globalState.hive.unitStockpile[UnitType.RANGED]}]</span>
                            </span>
                             <span className="text-gray-400 text-xs font-mono">{Math.round(getWeight(UnitType.RANGED) * 100)}%</span>
                        </div>
                        <input type="range" min="0" max="1" step="0.1"
                            value={getWeight(UnitType.RANGED)}
                            onChange={(e) => handleProductionConfigChange(UnitType.RANGED, parseFloat(e.target.value))}
                            className={`w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer ${getSliderColor(getWeight(UnitType.RANGED))}`}
                        />
                    </div>
               </div>
          </div>
      </div>

      {isHiveOpen && (
        <HiveView 
            globalState={globalState}
            onUpgrade={handleUpgradeUnit}
            onConfigChange={handleProductionConfigChange}
            onDigest={handleDigest}
            onClose={() => setIsHiveOpen(false)}
        />
      )}
    </div>
  );
};
export default App;
