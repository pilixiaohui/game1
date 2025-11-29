
import React from 'react';
import { GameStateSnapshot, UnitType } from '../types';
import { PLAYABLE_UNITS } from '../constants';

interface HUDProps {
    gameState: GameStateSnapshot;
    onEvacuate: () => void;
}

// Helper for icon/color configuration
const getUnitIcon = (type: string) => {
    switch(type) {
        case UnitType.MELEE: return { char: 'Z', color: 'text-blue-400' };
        case UnitType.RANGED: return { char: 'H', color: 'text-purple-400' };
        case UnitType.PYROVORE: return { char: 'P', color: 'text-red-400' };
        case UnitType.CRYOLISK: return { char: 'C', color: 'text-cyan-400' };
        case UnitType.OMEGALIS: return { char: 'O', color: 'text-yellow-400' };
        case UnitType.QUEEN: return { char: 'Q', color: 'text-pink-400' };
        default: return { char: '?', color: 'text-gray-400' };
    }
};

export const HUD: React.FC<HUDProps> = ({ gameState, onEvacuate }) => {
    return (
        <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 z-10">
            {/* Top Bar: Stats */}
            <div className="flex justify-between items-start w-full pointer-events-auto">
                
                {/* Left: Distance Metre */}
                <div className="bg-black/60 backdrop-blur-sm px-4 py-2 rounded border-l-2 border-red-500 pointer-events-none">
                    <div className="text-[10px] text-red-400 uppercase tracking-widest">推进距离</div>
                    <div className="text-2xl font-black font-mono text-white">
                        {gameState.distance} <span className="text-sm text-gray-500">米</span>
                    </div>
                </div>
                
                {/* Right: Controls & Counts */}
                 <div className="flex gap-2">
                     <div className="bg-black/60 backdrop-blur-sm px-4 py-2 rounded text-xs text-gray-300 font-mono flex gap-4 border-r-2 border-gray-600 pointer-events-none items-center">
                        {/* Zerg Unit Breakdown */}
                        <div className="flex gap-3">
                            {PLAYABLE_UNITS.map(type => {
                                 const count = (gameState.activeZergCounts && gameState.activeZergCounts[type]) || 0;
                                 const icon = getUnitIcon(type);
                                 // Only show types with active units to keep it clean, or keep layout consistent?
                                 // User asked for real-time counts. Showing 0 might be useful for caps check, 
                                 // but hiding 0s looks cleaner for "active battle". 
                                 // Let's hide 0s for cleaner UI.
                                 if (count <= 0) return null;
                                 
                                 return (
                                     <div key={type} className="flex items-center gap-1">
                                         <span className={`font-bold ${icon.color}`}>{icon.char}</span>
                                         <span>{count}</span>
                                     </div>
                                 );
                            })}
                            {/* Fallback if no units active */}
                            {(!gameState.activeZergCounts || Object.values(gameState.activeZergCounts).every(c => c === 0)) && (
                                <span className="text-gray-500 text-[10px]">NO SIGNAL</span>
                            )}
                        </div>

                        <div className="w-px bg-gray-600 h-4"></div>
                        
                        <div>
                            <span className="text-red-400 mr-2">敌军</span>
                            {gameState.unitCountHuman}
                        </div>
                    </div>
                    
                    <button 
                        onClick={onEvacuate}
                        className="bg-red-900/80 hover:bg-red-700 text-white px-4 py-2 rounded text-xs font-bold uppercase tracking-wider border border-red-500 transition-colors pointer-events-auto shadow-lg"
                    >
                        撤离战场
                    </button>
                </div>
            </div>
            
        </div>
    );
};
