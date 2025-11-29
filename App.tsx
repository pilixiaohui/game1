



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

  // Helper for Top Bar
  const ResourceItem = ({ label, value, color }: { label: string, value: number, color: string }) => (
      <div className="flex flex-col">
          <span className="text-[10px] text-gray-500 uppercase tracking-widest">{label}</span>
          <span className={`text-lg font-mono font-bold ${color} leading-none`}>
              {Math.floor(value).toLocaleString()}
          </span>
      </div>
  );

  return (
    <div className="flex flex-col w-full h-full bg-neutral-900 font-sans select-none overflow-hidden">
      
      {/* GLOBAL HEADER (Unified Resource Display) */}
      <div className="h-16 bg-[#050505] border-b border-gray-800 flex items-center justify-between px-6 z-50 shrink-0">
          <div className="flex items-center gap-8">
              <h1 className="text-xl font-black text-white tracking-tighter uppercase italic">
                  <span className="text-red-600">异种</span>起源
              </h1>
              
              <div className="h-8 w-px bg-gray-800"></div>

              <div className="flex gap-6">
                  <ResourceItem label="Biomass" value={globalState.resources.biomass} color="text-green-500" />
                  <ResourceItem label="Enzymes" value={globalState.resources.enzymes} color="text-orange-500" />
                  <ResourceItem label="DNA" value={globalState.resources.dna} color="text-blue-400" />
              </div>
          </div>

          <div className="flex items-center gap-8">
               {/* Larva Status */}
               <div className="w-40">
                    <div className="flex justify-between text-[10px] text-gray-500 uppercase mb-1">
                        <span>幼虫 (Larva)</span>
                        <span>{globalState.resources.larva.toFixed(1)} / {globalState.hive.production.larvaCapBase}</span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
                        <div className="h-full bg-orange-500 transition-all duration-300" 
                             style={{ width: `${(globalState.resources.larva / globalState.hive.production.larvaCapBase) * 100}%` }} 
                        />
                    </div>
               </div>

               {/* Population */}
               <div className="text-right">
                   <div className="text-[10px] text-gray-500 uppercase">Swarm Size</div>
                   <div className="text-lg font-mono font-bold text-orange-400 leading-none">
                        {globalState.hive.unitStockpile[UnitType.MELEE] + globalState.hive.unitStockpile[UnitType.RANGED]}
                        <span className="text-xs text-gray-600 ml-1">/ {DataManager.instance.getMaxPopulationCap()}</span>
                   </div>
               </div>
               
               <button 
                  onClick={() => setIsHiveOpen(!isHiveOpen)}
                  className={`px-4 py-2 rounded text-xs font-bold uppercase tracking-widest transition-colors border shadow-lg ${
                      isHiveOpen 
                      ? 'bg-red-900/50 text-red-200 border-red-500/50 hover:bg-red-800' 
                      : 'bg-gray-800 text-gray-300 border-gray-700 hover:border-white hover:text-white'
                  }`}
               >
                  {isHiveOpen ? 'Close Hive' : 'Manage Hive'}
               </button>
          </div>
      </div>

      {/* CONTENT AREA WRAPPER */}
      <div className="flex-1 flex overflow-hidden relative">
          {/* HIVE VIEW OVERLAY - MOVED HERE TO COVER ALL CONTENT */}
          {isHiveOpen && (
              <div className="absolute inset-0 z-50 bg-[#0b0b0b]/98 backdrop-blur-md overflow-hidden flex flex-col">
                  <div className="flex-1 overflow-y-auto">
                    <div className="p-8 max-w-7xl mx-auto h-full">
                        <HiveView 
                            globalState={globalState}
                            onUpgrade={handleUpgradeUnit}
                            onConfigChange={handleProductionConfigChange}
                            onDigest={handleDigest}
                            onClose={() => setIsHiveOpen(false)}
                        />
                    </div>
                  </div>
              </div>
          )}

          {/* SIDEBAR (World Map) */}
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

          {/* MAIN GAME VIEW */}
          <div className="flex-1 relative bg-black">
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
                        </div>
                    </div>
                )}
          </div>
      </div>
    </div>
  );
};
export default App;