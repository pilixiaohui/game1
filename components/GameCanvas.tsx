
import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { GameEngine } from '../game/GameEngine';
import { RegionData } from '../types';

interface GameCanvasProps {
    activeRegion: RegionData | null;
    onEngineInit: (engine: GameEngine) => void;
}

export const GameCanvas = forwardRef<HTMLDivElement, GameCanvasProps>(({ activeRegion, onEngineInit }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const engineRef = useRef<GameEngine | null>(null);

    useImperativeHandle(ref, () => containerRef.current!);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        let canceled = false;
        let engine: GameEngine | undefined;

        const initGame = async () => {
            // Clean up previous children
            while (container.firstChild) container.removeChild(container.firstChild);

            engine = new GameEngine();
            try {
                if (activeRegion) {
                    engine.humanDifficultyMultiplier = activeRegion.difficultyMultiplier;
                    engine.activeRegionId = activeRegion.id;
                    engine.setStockpileMode(false);
                } else {
                    // Stockpile Mode
                    engine.setStockpileMode(true);
                }

                await engine.init(container);
                
                // If component unmounted or effect re-ran while initializing
                if (canceled) {
                    engine.destroy();
                    return;
                }
                
                // Clean up old engine if it exists
                if (engineRef.current && engineRef.current !== engine) {
                    engineRef.current.destroy();
                }

                engineRef.current = engine;
                onEngineInit(engine);
            } catch (err) {
                console.error("GameEngine init failed:", err);
                if (engine) engine.destroy();
            }
        };

        initGame();

        return () => {
            canceled = true;
            if (engineRef.current) {
                engineRef.current.destroy();
                engineRef.current = null;
            }
            if (container) {
                while (container.firstChild) container.removeChild(container.firstChild);
            }
        };
    }, [onEngineInit, activeRegion]); 

    return <div ref={containerRef} className="absolute inset-0 w-full h-full z-0" />;
});
