import * as THREE from "three";
import { CSS2DObject } from "../../node_modules/three/examples/jsm/renderers/CSS2DRenderer.js";
import { ENEMY_SETTINGS, ENEMY_DEATH_SETTINGS, PLAYER_SETTINGS } from "../utils/constants.js";

const KHMER_FONT_FAMILY = '"Noto Sans Khmer", "Leelawadee UI", "Khmer UI", sans-serif';
const KHMER_FONT_SPEC = `700 180px ${KHMER_FONT_FAMILY}`;
const KHMER_BADGE_FONT_SPEC = `700 210px ${KHMER_FONT_FAMILY}`;
const CHARACTER_MODEL_HEIGHT = 2.28;

function getCharacterDisplayHeight() {
  return CHARACTER_MODEL_HEIGHT * PLAYER_SETTINGS.visualScale;
}

export async function ensureKhmerFontReady() {
  if (!document.fonts?.load) {
    return;
  }

  await document.fonts.load(KHMER_FONT_SPEC);
  await document.fonts.load(KHMER_BADGE_FONT_SPEC);
  await document.fonts.ready;
}

function createBoxPart(name, size, position, color) {
  const geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.72,
    metalness: 0.02,
    flatShading: true,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  mesh.position.set(position.x, position.y, position.z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  return mesh;
}

function createLimb(name, meshSize, pivotPosition, meshOffset, color) {
  const pivot = new THREE.Group();
  pivot.name = `${name}Pivot`;
  pivot.position.set(pivotPosition.x, pivotPosition.y, pivotPosition.z);

  const limb = createBoxPart(name, meshSize, meshOffset, color);
  pivot.add(limb);

  return pivot;
}

function createKhmerLetterBadge(letter) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext("2d");

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "rgba(15, 23, 42, 0.82)";
  context.fillRect(8, 8, 240, 240);
  context.strokeStyle = "rgba(248, 250, 252, 0.35)";
  context.lineWidth = 6;
  context.strokeRect(8, 8, 240, 240);
  context.font = KHMER_BADGE_FONT_SPEC;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = "#ffffff";
  context.fillText(letter, canvas.width * 0.5, canvas.height * 0.56);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;

  const material = new THREE.MeshStandardMaterial({
    map: texture,
    transparent: true,
    alphaTest: 0.06,
    roughness: 0.85,
    metalness: 0,
    flatShading: true,
  });

  const badge = new THREE.Mesh(new THREE.PlaneGeometry(0.78, 0.9), material);
  badge.name = "KhmerLetterBadge";
  badge.position.set(0, 0.04, 0.235);
  badge.castShadow = true;
  badge.userData.texture = texture;

  return badge;
}

function createMinecraftCharacter(type) {
  const visualRoot = new THREE.Group();
  visualRoot.name = "EnemyVisualRoot";
  visualRoot.scale.setScalar(PLAYER_SETTINGS.visualScale);

  const body = createBoxPart(
    "Body",
    { x: 0.9, y: 1.1, z: 0.42 },
    { x: 0, y: 1.0, z: 0 },
    type.bodyColor,
  );
  const letterBadge = createKhmerLetterBadge(type.letter);
  body.add(letterBadge);

  const head = createBoxPart(
    "Head",
    { x: 0.72, y: 0.72, z: 0.72 },
    { x: 0, y: 1.92, z: 0 },
    type.headColor,
  );

  const leftEye = createBoxPart(
    "LeftEye",
    { x: 0.12, y: 0.12, z: 0.04 },
    { x: -0.16, y: 0.08, z: 0.37 },
    0x111827,
  );
  const rightEye = createBoxPart(
    "RightEye",
    { x: 0.12, y: 0.12, z: 0.04 },
    { x: 0.16, y: 0.08, z: 0.37 },
    0x111827,
  );
  head.add(leftEye, rightEye);

  const leftArm = createLimb(
    "LeftArm",
    { x: 0.28, y: 0.95, z: 0.32 },
    { x: -0.62, y: 1.42, z: 0 },
    { x: 0, y: -0.42, z: 0 },
    type.limbColor,
  );
  const rightArm = createLimb(
    "RightArm",
    { x: 0.28, y: 0.95, z: 0.32 },
    { x: 0.62, y: 1.42, z: 0 },
    { x: 0, y: -0.42, z: 0 },
    type.limbColor,
  );
  const leftLeg = createLimb(
    "LeftLeg",
    { x: 0.34, y: 1.0, z: 0.34 },
    { x: -0.24, y: 0.5, z: 0 },
    { x: 0, y: -0.5, z: 0 },
    type.limbColor,
  );
  const rightLeg = createLimb(
    "RightLeg",
    { x: 0.34, y: 1.0, z: 0.34 },
    { x: 0.24, y: 0.5, z: 0 },
    { x: 0, y: -0.5, z: 0 },
    type.limbColor,
  );

  visualRoot.add(body, head, leftArm, rightArm, leftLeg, rightLeg);

  const flashMeshes = [body, head, leftArm.children[0], rightArm.children[0], leftLeg.children[0], rightLeg.children[0]];

  return {
    visualRoot,
    body,
    letterBadge,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    flashMeshes,
  };
}

function createEnemyHealthBar(type) {
  const container = document.createElement("div");
  container.className = "enemy-health-label";

  const name = document.createElement("span");
  name.className = "enemy-health-name";
  name.textContent = type.name;

  const value = document.createElement("span");
  value.className = "enemy-health-value";
  value.textContent = `HP ${type.maxHealth} / ${type.maxHealth}`;

  const attack = document.createElement("span");
  attack.className = "enemy-attack-value";
  attack.textContent = `ATK ${type.damage}`;

  const track = document.createElement("div");
  track.className = "enemy-health-track";

  const fill = document.createElement("div");
  fill.className = "enemy-health-fill";
  fill.style.transform = "scaleX(1)";

  track.appendChild(fill);
  container.appendChild(name);
  container.appendChild(value);
  container.appendChild(attack);
  container.appendChild(track);

  const label = new CSS2DObject(container);
  label.name = "EnemyHealthBar";
  label.center.set(0.5, 0);

  return { label, fill, value, attack };
}

function setMeshesEmissive(meshes, hex, intensity = 1) {
  for (const mesh of meshes) {
    if (mesh?.material) {
      mesh.material.emissive.setHex(hex);
      mesh.material.emissiveIntensity = intensity;
    }
  }
}

export function createEnemy(type = ENEMY_SETTINGS.types[0]) {
  const enemy = new THREE.Group();
  enemy.name = type.name;
  enemy.position.set(0, PLAYER_SETTINGS.groundY, -8);

  const character = createMinecraftCharacter(type);
  const displayHeight = getCharacterDisplayHeight();
  const {
    label: healthBar,
    fill: healthBarFill,
    value: healthBarValue,
    attack: healthBarAttack,
  } = createEnemyHealthBar(type);
  healthBar.position.set(0, displayHeight + 0.45, 0);

  enemy.add(character.visualRoot, healthBar);

  enemy.userData.visualRoot = character.visualRoot;
  enemy.userData.letterMesh = character.visualRoot;
  enemy.userData.bodyMesh = character.body;
  enemy.userData.letterBadge = character.letterBadge;
  enemy.userData.flashMeshes = character.flashMeshes;
  enemy.userData.leftArm = character.leftArm;
  enemy.userData.rightArm = character.rightArm;
  enemy.userData.leftLeg = character.leftLeg;
  enemy.userData.rightLeg = character.rightLeg;
  enemy.userData.healthBar = healthBar;
  enemy.userData.healthBarFill = healthBarFill;
  enemy.userData.healthBarValue = healthBarValue;
  enemy.userData.healthBarAttack = healthBarAttack;
  enemy.userData.letterHeight = displayHeight;
  enemy.userData.type = type;
  enemy.userData.health = type.maxHealth;
  enemy.userData.attackCooldown = Math.random() * ENEMY_SETTINGS.attackCooldown;
  enemy.userData.hitFlashTimer = 0;
  enemy.userData.baseVisualY = 0;

  return enemy;
}

export function updateEnemyHealthBar(enemy) {
  const { healthBarFill, healthBarValue, healthBarAttack, type, health } = enemy.userData;

  if (!healthBarFill || !type) {
    return;
  }

  const ratio = Math.max(health / type.maxHealth, 0);
  healthBarFill.style.transform = `scaleX(${ratio})`;

  if (healthBarValue) {
    healthBarValue.textContent = `HP ${Math.max(Math.ceil(health), 0)} / ${type.maxHealth}`;
  }

  if (healthBarAttack) {
    healthBarAttack.textContent = `ATK ${type.damage}`;
  }
}

export function flashEnemyHit(enemy) {
  enemy.userData.hitFlashTimer = 0.18;
  setMeshesEmissive(enemy.userData.flashMeshes, 0x7f1d1d, 0.85);
}

export function updateEnemyVisuals(enemy, deltaTime) {
  if (enemy.userData.isDying) {
    return;
  }

  if (enemy.userData.hitFlashTimer > 0) {
    enemy.userData.hitFlashTimer = Math.max(enemy.userData.hitFlashTimer - deltaTime, 0);

    if (enemy.userData.hitFlashTimer === 0) {
      setMeshesEmissive(enemy.userData.flashMeshes, 0x000000, 1);
    }
  }

  const bob = Math.sin(performance.now() * 0.008 + enemy.id) * 0.04;
  const walkPhase = performance.now() * 0.014 + enemy.id;
  const walkSwing = Math.sin(walkPhase) * 0.42;

  enemy.userData.visualRoot.position.y = enemy.userData.baseVisualY + bob;
  enemy.userData.healthBar.position.y = getCharacterDisplayHeight() + 0.45 + bob;

  if (enemy.userData.leftArm) {
    enemy.userData.leftArm.rotation.x = walkSwing;
    enemy.userData.rightArm.rotation.x = -walkSwing;
    enemy.userData.leftLeg.rotation.x = -walkSwing * 0.85;
    enemy.userData.rightLeg.rotation.x = walkSwing * 0.85;
  }
}

export function startEnemyDeath(enemy) {
  if (enemy.userData.isDying) {
    return;
  }

  enemy.userData.isDying = true;
  enemy.userData.deathTimer = ENEMY_DEATH_SETTINGS.duration;
  enemy.userData.deathProgress = 0;
  enemy.userData.deathWobble = Math.random() * Math.PI * 2;

  if (enemy.userData.healthBar) {
    enemy.userData.healthBar.visible = false;
  }

  setMeshesEmissive(enemy.userData.flashMeshes, 0xffffff, 2);
}

export function updateEnemyDeathAnimation(enemy, deltaTime) {
  if (!enemy.userData.isDying) {
    return false;
  }

  enemy.userData.deathTimer = Math.max(enemy.userData.deathTimer - deltaTime, 0);
  enemy.userData.deathProgress =
    1 - enemy.userData.deathTimer / ENEMY_DEATH_SETTINGS.duration;

  const progress = enemy.userData.deathProgress;
  const pulse = Math.sin(progress * Math.PI * 10 + enemy.userData.deathWobble) * 0.5 + 0.5;
  const { visualRoot, flashMeshes, baseVisualY } = enemy.userData;
  const flashColors = [0xfff176, 0xff8a65, 0xf06292, 0xba68c8, 0x4fc3f7, 0xffffff];

  enemy.rotation.y += ENEMY_DEATH_SETTINGS.spinSpeed * deltaTime;
  enemy.rotation.x = Math.sin(progress * Math.PI * 4) * 0.45;
  enemy.rotation.z = Math.cos(progress * Math.PI * 3) * 0.35;
  enemy.position.y += Math.sin(progress * Math.PI) * deltaTime * 2.4;

  const groupPop = progress < 0.4
    ? 1 + progress * 2.2
    : Math.max(0, 2.08 - (progress - 0.4) * 2.8);

  enemy.scale.setScalar(groupPop);

  if (visualRoot) {
    const meshPop = progress < 0.3
      ? 1 + progress * 1.8
      : Math.max(0, 1.54 - (progress - 0.3) * 2.2);

    visualRoot.scale.setScalar(meshPop);
    visualRoot.position.y =
      baseVisualY + Math.sin(progress * Math.PI) * 1.2;
    visualRoot.rotation.x = Math.sin(progress * Math.PI * 8) * 0.6;
    visualRoot.rotation.z = Math.cos(progress * Math.PI * 6) * 0.5;

    const flashColor = flashColors[Math.floor(progress * 18) % flashColors.length];
    setMeshesEmissive(flashMeshes, flashColor, 1.2 + pulse * 2.2);

    for (const mesh of flashMeshes) {
      if (mesh?.material) {
        mesh.material.opacity = progress > 0.75 ? 1 - (progress - 0.75) / 0.25 : 1;
        mesh.material.transparent = true;
      }
    }
  }

  return enemy.userData.deathTimer > 0;
}

function disposeMesh(mesh) {
  if (!mesh) {
    return;
  }

  mesh.userData.texture?.dispose();
  mesh.geometry?.dispose();
  mesh.material?.dispose();
}

function disposeObject(object) {
  object.traverse((child) => {
    if (child.isMesh) {
      disposeMesh(child);
    }
  });
}

export function disposeEnemy(enemy) {
  const { visualRoot, healthBar } = enemy.userData;

  if (visualRoot) {
    disposeObject(visualRoot);
  }

  if (healthBar?.element?.parentNode) {
    healthBar.element.parentNode.removeChild(healthBar.element);
  }
}
