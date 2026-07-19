import * as THREE from "three";
import { PLAYER_SETTINGS } from "../utils/constants.js";

const bodyParts = {
  head: null,
  body: null,
  leftArm: null,
  rightArm: null,
  leftLeg: null,
  rightLeg: null,
  sword: null,
};

const HEAD_FRONT_Z = 0.365;

function createBoxPart(name, size, position, color) {
  const geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.65,
    metalness: 0.02,
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

function createFace() {
  const face = new THREE.Group();
  face.name = "Face";

  const leftEye = createBoxPart(
    "LeftEye",
    { x: 0.12, y: 0.12, z: 0.025 },
    { x: -0.16, y: 0.1, z: HEAD_FRONT_Z },
    0x111827,
  );
  const rightEye = createBoxPart(
    "RightEye",
    { x: 0.12, y: 0.12, z: 0.025 },
    { x: 0.16, y: 0.1, z: HEAD_FRONT_Z },
    0x111827,
  );
  const leftBrow = createBoxPart(
    "LeftBrow",
    { x: 0.18, y: 0.045, z: 0.026 },
    { x: -0.16, y: 0.23, z: HEAD_FRONT_Z + 0.002 },
    0x3f2414,
  );
  const rightBrow = createBoxPart(
    "RightBrow",
    { x: 0.18, y: 0.045, z: 0.026 },
    { x: 0.16, y: 0.23, z: HEAD_FRONT_Z + 0.002 },
    0x3f2414,
  );
  const mouth = createBoxPart(
    "Mouth",
    { x: 0.24, y: 0.055, z: 0.026 },
    { x: 0, y: -0.16, z: HEAD_FRONT_Z + 0.004 },
    0x7f1d1d,
  );

  face.add(leftEye, rightEye, leftBrow, rightBrow, mouth);

  return face;
}

function createSword() {
  const sword = new THREE.Group();
  sword.name = "Sword";
  sword.position.set(0.08, -0.86, 0.18);
  sword.rotation.set(-0.75, 0.15, -0.48);

  const blade = createBoxPart(
    "SwordBlade",
    { x: 0.12, y: 1.05, z: 0.12 },
    { x: 0, y: -0.64, z: 0 },
    0xd6dde8,
  );
  const guard = createBoxPart(
    "SwordGuard",
    { x: 0.52, y: 0.1, z: 0.16 },
    { x: 0, y: -0.1, z: 0 },
    0xfacc15,
  );
  const handle = createBoxPart(
    "SwordHandle",
    { x: 0.14, y: 0.34, z: 0.14 },
    { x: 0, y: 0.12, z: 0 },
    0x5b3417,
  );

  sword.add(blade, guard, handle);

  return sword;
}

function getSkinMeshes(parts) {
  return [parts.head, parts.leftArm.children[0], parts.rightArm.children[0]];
}

export function applyPlayerClothColor(player, clothColor) {
  const parts = player.userData.parts;

  if (!parts?.body?.material) {
    return;
  }

  parts.body.material.color.setHex(clothColor);
  player.userData.clothColor = clothColor;
}

export function applyPlayerSkinColor(player, skinColor) {
  const parts = player.userData.parts;

  if (!parts) {
    return;
  }

  for (const mesh of getSkinMeshes(parts)) {
    if (mesh?.material) {
      mesh.material.color.setHex(skinColor);
    }
  }

  player.userData.skinColor = skinColor;
}

export function createPlayer(skinColor = 0xf2c39b) {
  const player = new THREE.Group();
  player.name = "Player";
  player.position.set(0, 0.5, 0);

  const visualRoot = new THREE.Group();
  visualRoot.name = "PlayerVisualRoot";
  visualRoot.rotation.y = Math.PI;
  visualRoot.scale.setScalar(PLAYER_SETTINGS.visualScale);

  bodyParts.body = createBoxPart(
    "Body",
    { x: 0.9, y: 1.1, z: 0.42 },
    { x: 0, y: 1.0, z: 0 },
    0x2563eb,
  );

  bodyParts.head = createBoxPart(
    "Head",
    { x: 0.72, y: 0.72, z: 0.72 },
    { x: 0, y: 1.92, z: 0 },
    0xf2c39b,
  );
  bodyParts.head.add(createFace());

  bodyParts.leftArm = createLimb(
    "LeftArm",
    { x: 0.28, y: 0.95, z: 0.32 },
    { x: -0.62, y: 1.42, z: 0 },
    { x: 0, y: -0.42, z: 0 },
    0xf2c39b,
  );

  bodyParts.rightArm = createLimb(
    "RightArm",
    { x: 0.28, y: 0.95, z: 0.32 },
    { x: 0.62, y: 1.42, z: 0 },
    { x: 0, y: -0.42, z: 0 },
    0xf2c39b,
  );
  bodyParts.sword = createSword();
  bodyParts.rightArm.add(bodyParts.sword);

  bodyParts.leftLeg = createLimb(
    "LeftLeg",
    { x: 0.34, y: 1.0, z: 0.34 },
    { x: -0.24, y: 0.5, z: 0 },
    { x: 0, y: -0.5, z: 0 },
    0x1e293b,
  );

  bodyParts.rightLeg = createLimb(
    "RightLeg",
    { x: 0.34, y: 1.0, z: 0.34 },
    { x: 0.24, y: 0.5, z: 0 },
    { x: 0, y: -0.5, z: 0 },
    0x1e293b,
  );

  visualRoot.add(
    bodyParts.body,
    bodyParts.head,
    bodyParts.leftArm,
    bodyParts.rightArm,
    bodyParts.leftLeg,
    bodyParts.rightLeg,
  );

  player.add(visualRoot);
  player.userData.parts = bodyParts;
  applyPlayerSkinColor(player, skinColor);

  return player;
}
