import * as THREE from "three";
import { LEVEL_SETTINGS } from "../systems/playerProgression.js";

export const HERO_AURA_SETTINGS = {
  startLevel: 10,
  redPeakLevel: 25,
  darkPeakLevel: 35,
};

const tempColorA = new THREE.Color();
const tempColorB = new THREE.Color();
const tempColorOut = new THREE.Color();

let smokeTexture = null;

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function lerpColor(fromHex, toHex, amount) {
  tempColorA.set(fromHex);
  tempColorB.set(toHex);
  tempColorOut.copy(tempColorA).lerp(tempColorB, amount);

  return tempColorOut.getHex();
}

export function getHeroAuraState(level) {
  const {
    startLevel,
    redPeakLevel,
    darkPeakLevel,
  } = HERO_AURA_SETTINGS;
  const maxLevel = LEVEL_SETTINGS.maxLevel;

  if (level < startLevel) {
    return {
      visible: false,
      glowColor: 0xff4400,
      tipColor: 0xffaa66,
      upperColor: 0x000000,
      intensity: 0,
      spread: 1,
      blackMix: 0,
      upperBlackMix: 0,
      wispCount: 0,
      riseSpeed: 0,
      smokeHeight: 1,
      colorBoost: 0,
    };
  }

  if (level <= redPeakLevel) {
    const progress = clamp01((level - startLevel) / (redPeakLevel - startLevel));

    return {
      visible: true,
      glowColor: lerpColor(0xff6622, 0xff1100, progress),
      tipColor: lerpColor(0xffee55, 0xff6622, progress),
      upperColor: 0x220000,
      intensity: 0.32 + progress * 0.58,
      spread: 0.64 + progress * 0.22,
      thickness: 1.14 + progress * 0.32,
      blackMix: 0,
      upperBlackMix: 0,
      wispCount: Math.round(12 + progress * 15),
      riseSpeed: 0.62 + progress * 0.26,
      smokeHeight: 1.08 + progress * 0.44,
      colorBoost: 0.65 + progress * 0.5,
    };
  }

  if (level <= darkPeakLevel) {
    const progress = clamp01((level - redPeakLevel) / (darkPeakLevel - redPeakLevel));

    return {
      visible: true,
      glowColor: lerpColor(0xff1100, 0x880000, progress),
      tipColor: lerpColor(0xff6622, 0xcc1100, progress),
      upperColor: lerpColor(0x440000, 0x110000, progress),
      intensity: 0.88 + progress * 0.58,
      spread: 0.82 + progress * 0.24,
      thickness: 1.4 + progress * 0.32,
      blackMix: progress * 0.78,
      upperBlackMix: 0.15 + progress * 0.85,
      wispCount: Math.round(24 + progress * 18),
      riseSpeed: 0.88 + progress * 0.32,
      smokeHeight: 1.38 + progress * 0.48,
      colorBoost: 0.95 + progress * 0.4,
    };
  }

  const progress = clamp01((level - darkPeakLevel) / Math.max(maxLevel - darkPeakLevel, 1));

  return {
    visible: true,
    glowColor: lerpColor(0x880000, 0x330808, progress),
    tipColor: lerpColor(0xcc1100, 0x550000, progress),
    upperColor: lerpColor(0x220000, 0x000000, progress),
    intensity: 1.45 + progress * 0.48,
    spread: 0.98 + progress * 0.16,
    thickness: 1.62 + progress * 0.26,
    blackMix: 0.78 + progress * 0.22,
    upperBlackMix: 0.92 + progress * 0.08,
    wispCount: Math.round(42 + progress * 12),
    riseSpeed: 1.2 + progress * 0.28,
    smokeHeight: 1.82 + progress * 0.38,
    colorBoost: 1.35 + progress * 0.35,
  };
}

function getSmokeTexture() {
  if (smokeTexture) {
    return smokeTexture;
  }

  const canvas = document.createElement("canvas");
  canvas.width = 96;
  canvas.height = 128;
  const context = canvas.getContext("2d");
  context.clearRect(0, 0, canvas.width, canvas.height);

  const drawSoftPuff = (x, y, radiusX, radiusY, alpha) => {
    const gradient = context.createRadialGradient(x, y, 0, x, y, Math.max(radiusX, radiusY));
    gradient.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.55})`);
    gradient.addColorStop(0.35, `rgba(255, 255, 255, ${alpha * 0.22})`);
    gradient.addColorStop(0.68, `rgba(255, 255, 255, ${alpha * 0.06})`);
    gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
    context.fillStyle = gradient;
    context.beginPath();
    context.ellipse(x, y, radiusX, radiusY, 0, 0, Math.PI * 2);
    context.fill();
  };

  drawSoftPuff(48, 92, 34, 26, 0.9);
  drawSoftPuff(48, 58, 30, 36, 0.78);
  drawSoftPuff(48, 30, 21, 28, 0.58);

  smokeTexture = new THREE.CanvasTexture(canvas);
  smokeTexture.needsUpdate = true;

  return smokeTexture;
}

function createSmokeWisp(texture, index) {
  const material = new THREE.SpriteMaterial({
    map: texture,
    color: 0xff7744,
    transparent: true,
    opacity: 0.08,
    depthWrite: false,
    blending: THREE.NormalBlending,
  });

  const sprite = new THREE.Sprite(material);
  sprite.userData.cycleOffset = (index * 0.137) % 1;
  sprite.userData.cycleDuration = THREE.MathUtils.randFloat(0.85, 1.55);
  sprite.userData.anchorX = THREE.MathUtils.randFloat(-0.24, 0.24);
  sprite.userData.anchorZ = THREE.MathUtils.randFloat(-0.24, 0.24);
  sprite.userData.driftSpeed = THREE.MathUtils.randFloat(1.2, 2.8);
  sprite.userData.driftAmount = THREE.MathUtils.randFloat(0.08, 0.2);
  sprite.userData.widthScale = THREE.MathUtils.randFloat(0.28, 0.46);
  sprite.userData.heightScale = THREE.MathUtils.randFloat(0.64, 0.98);
  sprite.userData.opacityJitter = THREE.MathUtils.randFloat(0.75, 1.1);
  sprite.userData.spin = THREE.MathUtils.randFloat(-0.08, 0.08);

  return sprite;
}

function getWispLife(elapsedTime, wisp, riseSpeed) {
  const speed = riseSpeed / wisp.userData.cycleDuration;
  return ((elapsedTime * speed + wisp.userData.cycleOffset) % 1 + 1) % 1;
}

export function createHeroAura() {
  const root = new THREE.Group();
  root.name = "HeroAura";

  const texture = getSmokeTexture();
  const wisps = [];
  const maxWisps = 55;

  for (let index = 0; index < maxWisps; index += 1) {
    const wisp = createSmokeWisp(texture, index);
    wisp.visible = false;
    wisps.push(wisp);
    root.add(wisp);
  }

  root.visible = false;

  return {
    root,
    wisps,
    lastLevel: -1,
  };
}

function resizeWispPool(aura, targetCount) {
  for (let index = 0; index < aura.wisps.length; index += 1) {
    aura.wisps[index].visible = index < targetCount;
  }
}

export function updateHeroAura(aura, level, elapsedTime) {
  if (!aura?.root) {
    return;
  }

  const state = getHeroAuraState(level);
  aura.root.visible = state.visible;

  if (!state.visible) {
    resizeWispPool(aura, 0);
    return;
  }

  aura.root.position.y = 0.1;
  resizeWispPool(aura, state.wispCount);

  for (let index = 0; index < state.wispCount; index += 1) {
    const wisp = aura.wisps[index];
    const life = getWispLife(elapsedTime, wisp, state.riseSpeed);
    const spread = state.spread;
    const height = life * state.smokeHeight;
    const fade = Math.sin(life * Math.PI) ** 1.15;
    const drift =
      Math.sin(elapsedTime * wisp.userData.driftSpeed + index * 0.8) *
      wisp.userData.driftAmount *
      (0.35 + life * 0.75);
    const swirl =
      Math.cos(elapsedTime * wisp.userData.driftSpeed * 0.7 + index) *
      wisp.userData.driftAmount *
      0.45 *
      life;

    wisp.position.set(
      (wisp.userData.anchorX + drift) * spread,
      height,
      (wisp.userData.anchorZ + swirl) * spread,
    );

    const expand = 0.92 + life * 0.48;
    const width = wisp.userData.widthScale * spread * state.thickness * expand;
    const smokeHeight =
      wisp.userData.heightScale * spread * state.thickness * (0.92 + life * 0.32);
    wisp.scale.set(width, smokeHeight, 1);
    wisp.material.rotation = wisp.userData.spin * life;

    const darkStart = 0.48 + state.blackMix * 0.18;
    const colorMix =
      life > darkStart
        ? ((life - darkStart) / (1 - darkStart)) *
          (0.4 + state.blackMix * 0.52 + state.upperBlackMix * 0.35)
        : 0;
    const wispColor = lerpColor(
      life < 0.3 ? state.tipColor : state.glowColor,
      state.upperBlackMix > 0.1 ? state.upperColor : state.glowColor,
      colorMix,
    );
    wisp.material.color.setHex(wispColor);

    const baseOpacity = THREE.MathUtils.lerp(0.07, 0.24, clamp01(state.intensity / 1.95));
    wisp.material.opacity = Math.min(
      0.42,
      baseOpacity * state.colorBoost * fade * wisp.userData.opacityJitter,
    );
    wisp.material.blending =
      life > 0.58 && state.blackMix > 0.4
        ? THREE.NormalBlending
        : THREE.AdditiveBlending;
  }

  aura.lastLevel = level;
}

export function disposeHeroAura(aura) {
  if (!aura?.root) {
    return;
  }

  aura.root.traverse((object) => {
    if (object.material) {
      object.material.dispose();
    }
  });
}
