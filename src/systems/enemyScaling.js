import { ENEMY_SETTINGS } from "../utils/constants.js";
import { KHMER_ALPHABET } from "../utils/khmerAlphabet.js";
import { LEVEL_SETTINGS } from "./playerProgression.js";

export function getSpawnAlphabetMaxIndex(heroLevel, alphabetLength = KHMER_ALPHABET.length) {
  if (alphabetLength <= 1) {
    return 0;
  }

  const progress = (heroLevel - LEVEL_SETTINGS.startLevel) / (LEVEL_SETTINGS.maxLevel - LEVEL_SETTINGS.startLevel);
  const unlocked = Math.round(progress * (alphabetLength - 1));

  return Math.min(alphabetLength - 1, Math.max(2, unlocked));
}

export function getScaledEnemyType(baseType, heroLevel) {
  const levelBonus = Math.max(heroLevel - LEVEL_SETTINGS.startLevel, 0);

  return {
    ...baseType,
    maxHealth: Math.round(
      baseType.maxHealth + levelBonus * ENEMY_SETTINGS.healthPerHeroLevel,
    ),
    damage: Math.round(
      baseType.damage + levelBonus * ENEMY_SETTINGS.damagePerHeroLevel,
    ),
    expReward: Math.round(
      baseType.expReward + levelBonus * ENEMY_SETTINGS.expPerHeroLevel,
    ),
    spawnHeroLevel: heroLevel,
  };
}

export function pickEnemyTypeForLevel(types, heroLevel) {
  const maxIndex = getSpawnAlphabetMaxIndex(heroLevel, types.length);
  const alphabetIndex = Math.floor(Math.pow(Math.random(), 0.75) * (maxIndex + 1));
  const baseType = types[alphabetIndex];

  return getScaledEnemyType(baseType, heroLevel);
}
