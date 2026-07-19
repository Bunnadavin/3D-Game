import { KHMER_ALPHABET, getAlphabetRank, getEnemyPalette } from "./khmerAlphabet.js";

export const WORLD_SETTINGS = {
  skyColor: 0xaee1fb,
  groundColor: 0x3f9b4f,
  groundSize: 300,
};

export const CAMERA_SETTINGS = {
  fieldOfView: 62,
  nearPlane: 0.1,
  farPlane: 1000,
  startPosition: {
    x: 0,
    y: 2.35,
    z: 2.0,
  },
  followOffset: {
    x: 0,
    y: 2.35,
    z: 2.0,
  },
  targetHeight: 0.85,
  minZoom: 0.55,
  maxZoom: 1.85,
  defaultZoom: 1.85,
  zoomSpeed: 0.0014,
  aimScreenY: 0.16,
  lookAt: {
    x: 0,
    y: 0.85,
    z: 0,
  },
};

export const RENDER_SETTINGS = {
  antialias: true,
  maxPixelRatio: 2,
};

export const GAME_MODES = [
  { id: "normal", label: "Normal", description: "Take damage from enemies" },
  { id: "invincible", label: "Invincible", description: "Hero cannot take damage" },
];

export const ENEMY_DEATH_SETTINGS = {
  duration: 1.0,
  spinSpeed: 26,
  burstParticleCount: 36,
  ringCount: 3,
  flashLightIntensity: 5,
};

export const PLAYER_CLOTHES = [
  { id: "blue", label: "Blue", color: 0x2563eb },
  { id: "red", label: "Red", color: 0xdc2626 },
  { id: "green", label: "Green", color: 0x16a34a },
  { id: "purple", label: "Purple", color: 0x7c3aed },
  { id: "gold", label: "Gold", color: 0xca8a04 },
  { id: "teal", label: "Teal", color: 0x0d9488 },
];

export const PLAYER_SKINS = [
  { id: "peach", label: "Peach", color: 0xf2c39b },
  { id: "tan", label: "Tan", color: 0xd4a574 },
  { id: "sand", label: "Sand", color: 0xe8c4a0 },
  { id: "rose", label: "Rose", color: 0xf5b8b0 },
  { id: "olive", label: "Olive", color: 0xc9b088 },
  { id: "cocoa", label: "Cocoa", color: 0x8d5524 },
];

export const PLAYER_SETTINGS = {
  visualScale: 0.85,
  collisionRadius: 0.55,
  collisionHeight: 2.25,
  defaultSkinId: "peach",
  defaultClothId: "blue",
  defaultGameModeId: "normal",
  maxHealth: 100,
  walkSpeed: 6,
  runSpeed: 10,
  walkAnimationSpeed: 10,
  runAnimationSpeed: 15,
  flySpeed: 9,
  dashSpeed: 26,
  dashEndSpeed: 6,
  dashDuration: 0.68,
  dashCooldown: 1.8,
  dashDamage: 70,
  comboTapDelayMs: 260,
  flyLandingSpeed: 10,
  jumpVelocity: 9,
  doubleJumpVelocity: 8,
  maxJumps: 2,
  gravity: 30,
  fallGravityMultiplier: 1.8,
  maxFallSpeed: 28,
  groundY: 0.5,
  doubleTapDelayMs: 320,
  attackDuration: 0.34,
  mouseLookSensitivity: 0.003,
  verticalMouseLookSensitivity: 0.001,
  minCameraPitch: -0.65,
  maxCameraPitch: 0.55,
  attackRange: 5.5,
  attackCone: 0.52,
  attackDamage: 25,
  jumpAttackDamage: 45,
  hurtCooldown: 0.8,
  healthRegenDelay: 3.5,
  healthRegenRate: 4,
  killHealthBonus: 6,
  explosionDamage: 35,
  explosionRange: 4.2,
  explosionCooldown: 6,
  explosionEffectDuration: 0.35,
};

function buildEnemyTypes() {
  const alphabetLength = KHMER_ALPHABET.length;

  return KHMER_ALPHABET.map((letter, alphabetIndex) => {
    const rank = getAlphabetRank(alphabetIndex, alphabetLength);
    const colors = getEnemyPalette(alphabetIndex, alphabetLength);

    return {
      name: letter,
      letter,
      alphabetIndex,
      maxHealth: Math.round(55 + rank * 125),
      damage: Math.round(8 + rank * 16),
      expReward: Math.round(12 + rank * 25),
      moveSpeed: Number((3.0 - rank * 0.95).toFixed(2)),
      scale: 1,
      bodyColor: colors.bodyColor,
      headColor: colors.headColor,
      limbColor: colors.limbColor,
    };
  });
}

export const ENEMY_SETTINGS = {
  maxCount: 10,
  initialCount: 5,
  spawnIntervalMin: 4,
  spawnIntervalMax: 8,
  spawnBatchMin: 1,
  spawnBatchMax: 3,
  spawnRadiusMin: 10,
  spawnRadiusMax: 24,
  chaseDistance: 13,
  stopDistance: 1.55,
  attackCooldown: 0.85,
  healthPerHeroLevel: 12,
  damagePerHeroLevel: 3,
  expPerHeroLevel: 3,
  types: buildEnemyTypes(),
};
