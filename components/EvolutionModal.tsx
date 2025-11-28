
import React from 'react';
import { RoguelikeCard } from '../types';

interface EvolutionModalProps {
    visible: boolean;
    cards: RoguelikeCard[];
    onSelect: (card: RoguelikeCard) => void;
}

const RARITY_MAP: Record<string, string> = {
    'COMMON': '普通',
    'RARE': '稀有',
    'LEGENDARY': '传说'
};

export const EvolutionModal: React.FC<EvolutionModalProps> = ({ visible, cards, onSelect }) => {
    if (!visible) return null;

    return (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="max-w-4xl w-full p-8">
                <h1 className="text-4xl font-black text-center text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 mb-2 uppercase tracking-widest drop-shadow-lg">
                    需要突变
                </h1>
                <p className="text-center text-gray-400 mb-8">虫群必须适应，洪流才能延续。</p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {cards.map((card) => (
                        <button
                            key={card.id}
                            onClick={() => onSelect(card)}
                            className="group relative bg-gray-900 border border-gray-700 hover:border-purple-500 rounded-xl p-6 transition-all duration-200 hover:-translate-y-2 hover:shadow-[0_0_30px_rgba(168,85,247,0.4)] text-left flex flex-col h-64"
                        >
                            <div className="absolute inset-0 bg-gradient-to-b from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 rounded-xl transition-opacity" />
                            
                            <div className="mb-4">
                                <span className={`text-xs font-bold px-2 py-1 rounded bg-gray-800 ${
                                    card.rarity === 'LEGENDARY' ? 'text-yellow-400 border border-yellow-400/30' : 
                                    card.rarity === 'RARE' ? 'text-blue-400 border border-blue-400/30' : 'text-gray-400'
                                }`}>
                                    {RARITY_MAP[card.rarity] || card.rarity}
                                </span>
                            </div>
                            
                            <h3 className="text-xl font-bold text-white mb-2 group-hover:text-purple-300 transition-colors">
                                {card.name}
                            </h3>
                            <p className="text-gray-400 text-sm leading-relaxed">
                                {card.description}
                            </p>
                            
                            <div className="mt-auto pt-4 border-t border-white/5 w-full flex justify-between items-center text-xs text-gray-500 uppercase tracking-wider">
                                <span>注入 DNA</span>
                                <span className="group-hover:translate-x-1 transition-transform">→</span>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};