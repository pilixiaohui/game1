
import React from 'react';
import { RegionData } from '../types';

interface WorldMapViewProps {
  globalState: {
      regions: RegionData[];
  };
  onEnterRegion: (region: RegionData) => void;
  onOpenHive: () => void;
  activeRegionId?: number;
}

export const WorldMapView: React.FC<WorldMapViewProps> = ({ globalState, onEnterRegion, activeRegionId }) => {
  return (
    <div className="relative w-full h-full bg-[#050b14] overflow-hidden shadow-[inset_0_0_50px_rgba(0,0,0,0.8)] border-r border-gray-800">
      
      {/* --- LAYER 0: Map Terrain (Stylized Landmasses) --- */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
         <defs>
             <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(59, 130, 246, 0.05)" strokeWidth="1"/>
             </pattern>
             <linearGradient id="landGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                 <stop offset="0%" stopColor="#1e293b" stopOpacity="0.8" />
                 <stop offset="100%" stopColor="#0f172a" stopOpacity="0.5" />
             </linearGradient>
             <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                 <feGaussianBlur stdDeviation="3" result="blur" />
                 <feComposite in="SourceGraphic" in2="blur" operator="over" />
             </filter>
         </defs>

         {/* Ocean Background Pattern */}
         <rect width="100%" height="100%" fill="url(#grid)" />

         {/* Landmass 1: West Slums (Roughly x:0-40, y:20-80) */}
         <path 
            d="M -10 30 Q 15 20 35 45 T 25 85 L -10 100 Z" 
            fill="url(#landGradient)" 
            stroke="#334155" 
            strokeWidth="2"
            className="opacity-60"
         />
         
         {/* Landmass 2: Central/East Continent (Roughly x:40-110, y:0-100) */}
         <path 
            d="M 45 10 Q 60 -10 90 10 T 110 50 L 105 95 Q 70 100 50 80 Q 40 60 45 10 Z" 
            fill="url(#landGradient)" 
            stroke="#334155" 
            strokeWidth="2" 
            className="opacity-60"
         />
         
         {/* Topographic Lines (Decor) */}
         <path d="M 55 20 Q 70 10 90 20" fill="none" stroke="#334155" strokeWidth="1" strokeDasharray="5,5" className="opacity-30" />
         <path d="M 50 70 Q 70 85 95 80" fill="none" stroke="#334155" strokeWidth="1" strokeDasharray="5,5" className="opacity-30" />
      </svg>

      {/* --- LAYER 1: Connection Lines --- */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
            {globalState.regions.map((region, i) => {
            if (i === 0) return null;
            const prev = globalState.regions[i-1];
            const isUnlocked = region.isUnlocked;
            
            return (
                <g key={`con-${i}`}>
                    {/* Base Line */}
                    <line 
                        x1={`${prev.x}%`} y1={`${prev.y}%`} 
                        x2={`${region.x}%`} y2={`${region.y}%`} 
                        stroke={isUnlocked ? "#1e40af" : "#333"} 
                        strokeWidth="2"
                        className="opacity-50"
                    />
                    {/* Animated Pulse (Only for unlocked paths) */}
                    {isUnlocked && (
                         <circle r="2" fill="#60a5fa">
                            <animateMotion 
                                dur="3s" 
                                repeatCount="indefinite"
                                path={`M ${prev.x * (window.innerWidth/3)/100} ${prev.y * window.innerHeight/100} L ${region.x * (window.innerWidth/3)/100} ${region.y * window.innerHeight/100}`} 
                                // Note: SVG coord mapping is tricky with percentages in animateMotion, 
                                // so we use a simpler CSS dashed line animation approach below for the visual flair
                            />
                         </circle>
                    )}
                    {/* Dashed Overlay */}
                    <line 
                        x1={`${prev.x}%`} y1={`${prev.y}%`} 
                        x2={`${region.x}%`} y2={`${region.y}%`} 
                        stroke={isUnlocked ? "#60a5fa" : "#444"} 
                        strokeWidth="1"
                        strokeDasharray="4,4"
                        className={isUnlocked ? "animate-pulse" : ""}
                    />
                </g>
            );
            })}
      </svg>

      {/* --- LAYER 2: Region Nodes --- */}
      <div className="absolute inset-0 z-10">
        {globalState.regions.map((region) => {
            const isLocked = !region.isUnlocked;
            const isActive = region.id === activeRegionId;
            const isCompleted = region.devourProgress >= 100;
            const isFighting = region.isFighting || isActive;
            
            // Dynamic Coloring
            let nodeColor = 'bg-gray-800 border-gray-600'; // Locked
            let glowColor = '';
            
            if (!isLocked) {
                if (region.devourProgress === 0) {
                     nodeColor = 'bg-white border-blue-400'; // Neutral
                } else if (region.devourProgress < 100) {
                     nodeColor = 'bg-red-900 border-red-500'; // Contested
                     glowColor = 'shadow-[0_0_15px_rgba(239,68,68,0.6)]';
                } else {
                     nodeColor = 'bg-red-600 border-red-400'; // Conquered
                     glowColor = 'shadow-[0_0_10px_rgba(220,38,38,0.8)]';
                }
            }
            if (isActive) {
                nodeColor = 'bg-yellow-100 border-yellow-400 scale-125';
                glowColor = 'shadow-[0_0_20px_rgba(250,204,21,0.8)]';
            }

            return (
            <button
                key={region.id}
                onClick={() => !isLocked && onEnterRegion(region)}
                disabled={isLocked}
                className={`absolute -translate-x-1/2 -translate-y-1/2 group outline-none transition-all duration-300`}
                style={{ left: `${region.x}%`, top: `${region.y}%` }}
            >
                {/* Ping Animation for Active/Fighting Nodes */}
                {isFighting && (
                    <div className="absolute inset-0 rounded-full animate-ping bg-red-500 opacity-30 scale-150"></div>
                )}
                
                {/* The Node Itself */}
                <div 
                    className={`relative w-4 h-4 md:w-6 md:h-6 rounded-full border-2 transition-all duration-300 z-20 flex items-center justify-center ${nodeColor} ${glowColor}`}
                >
                    {isLocked && <span className="text-[8px] opacity-0">🔒</span>}
                    {isCompleted && <div className="w-1.5 h-1.5 bg-black rounded-full opacity-50"/>}
                </div>

                {/* Label Tooltip */}
                <div className={`absolute top-8 left-1/2 -translate-x-1/2 whitespace-nowrap z-30 pointer-events-none transition-all duration-300 ${isActive ? 'translate-y-0 opacity-100' : 'translate-y-1 opacity-0 group-hover:translate-y-0 group-hover:opacity-100'}`}>
                    <div className="flex flex-col items-center">
                        <div className="bg-black/90 border border-gray-700 px-3 py-1 rounded-sm backdrop-blur-sm text-center shadow-xl">
                            <div className={`text-[10px] font-black uppercase tracking-widest ${isActive ? 'text-yellow-400' : 'text-gray-300'}`}>
                                {region.name}
                            </div>
                            {!isLocked && (
                                <div className="w-full bg-gray-800 h-1 mt-1 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-red-500 transition-all duration-500" 
                                        style={{ width: `${region.devourProgress}%` }}
                                    />
                                </div>
                            )}
                        </div>
                        {/* Little triangle arrow */}
                        <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[4px] border-b-gray-700 rotate-180 -mt-[1px]"></div>
                    </div>
                </div>
            </button>
            );
        })}
      </div>

      {/* --- LAYER 3: Scanline & HUD Decor --- */}
      <div className="absolute inset-0 pointer-events-none z-40 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,6px_100%] opacity-20" />
      <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500/50 to-transparent opacity-50"></div>
      
      {/* HUD Elements */}
      <div className="absolute bottom-4 left-4 z-50 pointer-events-none">
          <div className="text-[10px] text-gray-500 font-mono">
              坐标: {activeRegionId ? `SEC-${activeRegionId.toString().padStart(3, '0')}` : '扫描中...'} <br/>
              状态: {activeRegionId ? '交战中' : '等待指令'}
          </div>
      </div>
    </div>
  );
};
