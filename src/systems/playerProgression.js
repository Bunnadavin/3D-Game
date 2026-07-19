export const LEVEL_SETTINGS = {
  startLevel: 1,
  maxLevel: 50,
  baseExpRequirement: 48,
  expGrowth: 1.35,
  baseMaxHealth: 100,
  healthPerLevel: 15,
  baseAttackDamage: 25,
  attackDamagePerLevel: 4,
  baseJumpAttackDamage: 45,
  jumpAttackPerLevel: 5,
  baseDashDamage: 70,
  dashDamagePerLevel: 6,
  baseExplosionDamage: 35,
  explosionDamagePerLevel: 4,
  deathLevelPenalty: 10,
};

export function getExpRequiredForNextLevel(level) {
  if (level >= LEVEL_SETTINGS.maxLevel) {
    return 0;
  }

  return Math.round(
    LEVEL_SETTINGS.baseExpRequirement * LEVEL_SETTINGS.expGrowth ** Math.max(level - 1, 0),
  );
}

export function getTotalExpForLevel(level) {
  let total = 0;

  for (let currentLevel = 1; currentLevel < level; currentLevel += 1) {
    total += getExpRequiredForNextLevel(currentLevel);
  }

  return total;
}

export function getLevelFromExp(totalExp) {
  let level = LEVEL_SETTINGS.startLevel;

  while (level < LEVEL_SETTINGS.maxLevel) {
    const nextLevelTotal = getTotalExpForLevel(level + 1);

    if (totalExp >= nextLevelTotal) {
      level += 1;
    } else {
      break;
    }
  }

  return level;
}

export function getExpProgress(totalExp, level) {
  if (level >= LEVEL_SETTINGS.maxLevel) {
    return 1;
  }

  const levelStart = getTotalExpForLevel(level);
  const nextLevelStart = getTotalExpForLevel(level + 1);
  const span = nextLevelStart - levelStart;

  if (span <= 0) {
    return 1;
  }

  return Math.max(0, Math.min(1, (totalExp - levelStart) / span));
}

export function getPlayerMaxHealth(level) {
  return LEVEL_SETTINGS.baseMaxHealth + (level - 1) * LEVEL_SETTINGS.healthPerLevel;
}

export function getPlayerAttackDamage(level) {
  return LEVEL_SETTINGS.baseAttackDamage + (level - 1) * LEVEL_SETTINGS.attackDamagePerLevel;
}

export function getPlayerJumpAttackDamage(level) {
  return LEVEL_SETTINGS.baseJumpAttackDamage + (level - 1) * LEVEL_SETTINGS.jumpAttackPerLevel;
}

export function getPlayerDashDamage(level) {
  return LEVEL_SETTINGS.baseDashDamage + (level - 1) * LEVEL_SETTINGS.dashDamagePerLevel;
}

export function getPlayerExplosionDamage(level) {
  return LEVEL_SETTINGS.baseExplosionDamage + (level - 1) * LEVEL_SETTINGS.explosionDamagePerLevel;
}

export function applyDeathLevelPenalty(level, penalty = LEVEL_SETTINGS.deathLevelPenalty) {
  return Math.max(LEVEL_SETTINGS.startLevel, level - penalty);
}
