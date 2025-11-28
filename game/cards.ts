
import { RoguelikeCard } from '../types';

export const CARD_POOL: RoguelikeCard[] = [
    {
        id: 'adrenal_glands',
        name: '肾上腺素腺体',
        description: '所有单位造成的伤害增加 50%。',
        rarity: 'COMMON',
        apply: (mods) => { mods.damageMultiplier += 0.5; }
    },
    {
        id: 'chitin_armor',
        name: '甲壳硬化',
        description: '单位生命值上限增加 50%。',
        rarity: 'COMMON',
        apply: (mods) => { mods.maxHpMultiplier += 0.5; }
    },
    {
        id: 'metabolic_boost',
        name: '代谢爆发',
        description: '资源生成速度提升 30%。',
        rarity: 'RARE',
        apply: (mods) => { mods.resourceRateMultiplier += 0.3; }
    },
    {
        id: 'volatile_blood',
        name: '易爆血液',
        description: '虫群单位死亡时会产生爆炸，对附近敌人造成范围伤害。',
        rarity: 'LEGENDARY',
        apply: (mods) => { mods.explodeOnDeath = true; }
    },
    {
        id: 'mitosis',
        name: '急速有丝分裂',
        description: '孵化时有 15% 的几率免费额外产生一个单位。',
        rarity: 'RARE',
        apply: (mods) => { mods.doubleSpawnChance += 0.15; }
    }
];

export const getRandomCards = (count: number): RoguelikeCard[] => {
    // Simple shuffle
    const shuffled = [...CARD_POOL].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
};