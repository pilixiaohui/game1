
import React from 'react';
import { GameStateSnapshot } from '../types';

interface HUDProps {
    gameState: GameStateSnapshot;
    onEvacuate: () => void;
}

export const HUD: React.FC<HUDProps> = ({ gameState, onEvacuate }) => {
    const stockpilePct = Math.min(100, (gameState.stockpileTotal / gameState.populationCap) * 100);

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
                
                {/* Center: Stockpile Monitor */}
                <div className="absolute top-4 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none">
                    <div className="bg-black/80 backdrop-blur px-4 py-2 rounded border border-gray-800 flex flex-col items-center min-w-[200px]">
                        <div className="text-[10px] text-orange-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                             <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></span>
                             后勤储备
                        </div>
                        <div className="w-full h-1 bg-gray-800 rounded-full mb-1">
                            <div className="h-full bg-orange-500 transition-all duration-300" style={{ width: `${stockpilePct}%` }} />
                        </div>
                        <div className="text-xs font-mono text-gray-300">
                            {gameState.stockpileTotal} / {gameState.populationCap} <span className="text-gray-600">UNITS</span>
                        </div>
                    </div>
                </div>

                {/* Right: Controls & Counts */}
                 <div className="flex gap-2">
                     <div className="bg-black/60 backdrop-blur-sm px-4 py-2 rounded text-xs text-gray-300 font-mono flex gap-4 border-r-2 border-gray-600 pointer-events-none">
                        <div>
                            <span className="text-blue-400 mr-2">前线</span>
                            {gameState.unitCountZerg}
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
