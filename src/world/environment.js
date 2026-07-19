import * as THREE from "three";
import { addBoxCollider, addCylinderCollider } from "./collision.js";

const MAP_SIZE = 260;
const HALF_MAP = MAP_SIZE / 2;
const MAIN_SEED = 8732;

const COLORS = {
  skyTop: 0x5eb0f0,
  skyHorizon: 0xb8e4fb,
  cloudWhite: 0xf4fbff,
  cloudBlue: 0xc5e8f8,
  grassShadow: 0x4a8f4a,
  grassMid: 0x6fb754,
  grassLight: 0x9fd66a,
  grassGold: 0xc8d878,
  barkDark: 0x3f2a1c,
  barkWarm: 0x6b4a2f,
  barkMoss: 0x4a6740,
  leafShadow: 0x2d6840,
  leafMid: 0x4f9a48,
  leafLight: 0x8ecf62,
  rockShadow: 0x5a6068,
  rockMid: 0x8a9088,
  rockLight: 0xb8c0b8,
  rockWarm: 0x9a8e7a,
  rockMoss: 0x5a7a48,
  moss: 0x6a9a52,
  mossBright: 0x8ecf62,
  bushGreen: 0x4f8f44,
  sandstoneLight: 0xd8ccb0,
  sandstoneMid: 0xb8a888,
  sandstoneDark: 0x8f8168,
  sandstoneDeep: 0x6f6450,
  mossStone: 0x7a9468,
  birdDark: 0x2f3542,
  birdLight: 0x4a5568,
};

const scratchMatrix = new THREE.Matrix4();
const scratchPosition = new THREE.Vector3();
const scratchRotation = new THREE.Euler();
const scratchQuaternion = new THREE.Quaternion();
const scratchScale = new THREE.Vector3();
const scratchColor = new THREE.Color();

function createRandom(seed) {
  let state = seed >>> 0;

  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function heightAt(x, z) {
  const centerDistance = Math.hypot(x, z);
  const playableFlat = THREE.MathUtils.smoothstep(centerDistance, 8, 42);
  const edgeLift = THREE.MathUtils.smoothstep(centerDistance, 48, HALF_MAP);
  const rolling =
    Math.sin(x * 0.04) * 0.55 +
    Math.cos(z * 0.045) * 0.42 +
    Math.sin((x + z) * 0.024) * 0.75;

  return rolling * (1 - playableFlat * 0.88) + edgeLift * 1.2;
}

export function getStylizedTerrainHeight(x, z) {
  return heightAt(x, z) - 0.08;
}

function setInstance(mesh, index, position, rotation, scale, color = null) {
  scratchQuaternion.setFromEuler(rotation);
  scratchMatrix.compose(position, scratchQuaternion, scale);
  mesh.setMatrixAt(index, scratchMatrix);

  if (color) {
    mesh.setColorAt(index, color);
  }
}

function makeStandardMaterial(color, options = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.92,
    metalness: 0,
    flatShading: true,
    ...options,
  });
}

function createBarkTexture() {
  const random = createRandom(44102);
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");

  const gradient = context.createLinearGradient(0, 0, 0, size);
  gradient.addColorStop(0, "#7a5538");
  gradient.addColorStop(0.45, "#6b4a2f");
  gradient.addColorStop(1, "#3f2a1c");
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);

  for (let index = 0; index < 120; index += 1) {
    context.globalAlpha = 0.08 + random() * 0.18;
    context.strokeStyle = random() > 0.5 ? "#2f1f14" : "#8a6244";
    context.lineWidth = 1 + random() * 2;
    context.beginPath();
    context.moveTo(random() * size, 0);
    context.bezierCurveTo(
      random() * size,
      size * 0.35,
      random() * size,
      size * 0.65,
      random() * size,
      size,
    );
    context.stroke();
  }

  for (let index = 0; index < 40; index += 1) {
    context.globalAlpha = 0.12 + random() * 0.2;
    context.fillStyle = random() > 0.6 ? "#4a6740" : "#5a4630";
    context.fillRect(random() * size, random() * size, 6 + random() * 14, 3 + random() * 8);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 3);
  texture.colorSpace = THREE.SRGBColorSpace;

  return texture;
}

function createRockTexture() {
  const random = createRandom(55213);
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");

  context.fillStyle = "#8a9088";
  context.fillRect(0, 0, size, size);

  for (let index = 0; index < 1800; index += 1) {
    const shade = random();
    context.globalAlpha = 0.15 + random() * 0.35;
    context.fillStyle = shade > 0.66 ? "#c8d0c8" : shade > 0.33 ? "#6a7078" : "#9a8e7a";
    context.fillRect(random() * size, random() * size, 1 + random() * 3, 1 + random() * 3);
  }

  for (let index = 0; index < 24; index += 1) {
    context.globalAlpha = 0.18 + random() * 0.22;
    context.fillStyle = "#5a7a48";
    const patchSize = 12 + random() * 28;
    context.beginPath();
    context.ellipse(random() * size, random() * size, patchSize, patchSize * 0.55, random() * Math.PI, 0, Math.PI * 2);
    context.fill();
  }

  for (let index = 0; index < 8; index += 1) {
    context.globalAlpha = 0.1 + random() * 0.15;
    context.strokeStyle = "#4a5058";
    context.lineWidth = 1 + random() * 2;
    context.beginPath();
    context.moveTo(random() * size, random() * size);
    context.lineTo(random() * size, random() * size);
    context.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  texture.colorSpace = THREE.SRGBColorSpace;

  return texture;
}

function createLeafTexture() {
  const random = createRandom(66324);
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");

  context.fillStyle = "#4f9a48";
  context.fillRect(0, 0, size, size);

  for (let index = 0; index < 80; index += 1) {
    context.globalAlpha = 0.2 + random() * 0.35;
    context.fillStyle = random() > 0.5 ? "#8ecf62" : "#2d6840";
    context.beginPath();
    context.ellipse(
      random() * size,
      random() * size,
      4 + random() * 10,
      2 + random() * 6,
      random() * Math.PI,
      0,
      Math.PI * 2,
    );
    context.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  texture.colorSpace = THREE.SRGBColorSpace;

  return texture;
}

function createDeformedRockGeometry(seed) {
  const random = createRandom(seed);
  const geometry = new THREE.IcosahedronGeometry(1, 1);
  const position = geometry.attributes.position;

  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index);
    const y = position.getY(index);
    const z = position.getZ(index);
    const length = Math.hypot(x, y, z) || 1;
    const nx = x / length;
    const ny = y / length;
    const nz = z / length;
    const squash = ny > 0 ? 0.62 + random() * 0.12 : 0.88 + random() * 0.18;
    const stretch = 0.78 + random() * 0.38;

    position.setXYZ(
      index,
      nx * stretch * (nx > 0 ? 1.05 : 0.95),
      ny * squash,
      nz * stretch * (nz > 0 ? 1.02 : 0.98),
    );
  }

  geometry.computeVertexNormals();
  return geometry;
}

function createSkyDome() {
  const geometry = new THREE.SphereGeometry(430, 24, 14);
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      topColor: { value: new THREE.Color(COLORS.skyTop) },
      horizonColor: { value: new THREE.Color(COLORS.skyHorizon) },
    },
    vertexShader: `
      varying vec3 vWorldPosition;

      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vWorldPosition;
      uniform vec3 topColor;
      uniform vec3 horizonColor;

      void main() {
        float gradient = smoothstep(-0.05, 0.68, normalize(vWorldPosition).y);
        gl_FragColor = vec4(mix(horizonColor, topColor, gradient), 1.0);
      }
    `,
  });

  const sky = new THREE.Mesh(geometry, material);
  sky.name = "KhmerDaytimeSkyDome";
  sky.renderOrder = -20;

  return sky;
}

function addCloudBlock(group, material, x, y, z, width, depth, opacity = 1) {
  const block = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material.clone());
  block.name = "LowPolyCloudBlock";
  block.position.set(x, y, z);
  block.scale.set(width, 0.2, depth);
  block.material.opacity *= opacity;
  block.renderOrder = -10;
  group.add(block);
}

function createCloudCluster(group, random, centerX, centerZ, baseY, scale, blocks) {
  const cloudMaterial = new THREE.MeshBasicMaterial({
    color: COLORS.cloudWhite,
    transparent: true,
    opacity: 0.82,
    depthWrite: false,
    fog: false,
  });
  const shadowMaterial = new THREE.MeshBasicMaterial({
    color: COLORS.cloudBlue,
    transparent: true,
    opacity: 0.28,
    depthWrite: false,
    fog: false,
  });

  for (const [x, z, width, depth, shade = 1] of blocks) {
    const jitterX = (random() - 0.5) * 0.8 * scale;
    const jitterZ = (random() - 0.5) * 0.8 * scale;
    const cloudX = centerX + x * scale + jitterX;
    const cloudZ = centerZ + z * scale + jitterZ;

    addCloudBlock(
      group,
      shadowMaterial,
      cloudX + scale * 0.3,
      baseY - scale * 0.07,
      cloudZ + scale * 0.4,
      width * scale,
      depth * scale,
      shade,
    );
    addCloudBlock(
      group,
      cloudMaterial,
      cloudX,
      baseY,
      cloudZ,
      width * scale,
      depth * scale,
      shade,
    );
  }
}

function createClouds(random) {
  const group = new THREE.Group();
  group.name = "KhmerSkyClouds";

  const cloudPatch = [
    [-3.5, 0, 3.2, 1.3],
    [-0.8, 0.1, 3.0, 1.5],
    [2.1, -0.1, 2.8, 1.1],
    [4.2, 0.15, 1.8, 0.9],
    [-2.4, 1.2, 2.2, 0.95, 0.85],
    [1.0, 1.3, 3.4, 1.05],
  ];
  const smallPatch = [
    [-1.0, 0, 1.3, 0.55],
    [0.7, 0.08, 1.4, 0.6],
    [1.6, -0.15, 0.85, 0.42, 0.7],
  ];

  const clusters = [
    [-40, -72, 74, 5.0, cloudPatch],
    [52, -58, 70, 4.0, cloudPatch],
    [-88, 10, 76, 5.5, cloudPatch],
    [78, 28, 72, 4.2, cloudPatch],
    [-18, 48, 68, 3.0, smallPatch],
    [96, -82, 73, 2.6, smallPatch],
    [0, -30, 78, 3.4, cloudPatch],
  ];

  for (const [x, z, y, scale, patch] of clusters) {
    createCloudCluster(group, random, x, z, y, scale, patch);
  }

  return group;
}

function createBirds() {
  const group = new THREE.Group();
  group.name = "LowPolySkyBirds";

  const wingMaterial = new THREE.MeshStandardMaterial({
    color: COLORS.birdDark,
    flatShading: true,
    roughness: 1,
  });
  const bodyMaterial = makeStandardMaterial(COLORS.birdLight);

  const birdSpots = [
    [-18, 58, -42, 1.1, 0.4],
    [24, 62, -28, 0.9, -0.6],
    [-42, 54, 18, 1.2, 0.2],
    [38, 66, 8, 0.85, -0.3],
    [8, 52, 52, 1.0, 0.8],
    [-58, 60, -12, 0.95, -0.5],
  ];

  for (const [x, y, z, scale, yaw] of birdSpots) {
    const bird = new THREE.Group();
    bird.name = "StylizedBird";
    bird.position.set(x, y, z);
    bird.rotation.y = yaw;

    const body = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.42, 4), bodyMaterial);
    body.rotation.x = Math.PI / 2;
    bird.add(body);

    const leftWing = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.04, 0.18), wingMaterial);
    leftWing.position.set(-0.22, 0, 0);
    leftWing.rotation.z = 0.35;
    bird.add(leftWing);

    const rightWing = leftWing.clone();
    rightWing.position.x = 0.22;
    rightWing.rotation.z = -0.35;
    bird.add(rightWing);

    bird.scale.setScalar(scale);
    group.add(bird);
  }

  return group;
}

function createGrassTexture() {
  const random = createRandom(22091);
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");

  const gradient = context.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, "#5a9a52");
  gradient.addColorStop(0.5, "#6fb754");
  gradient.addColorStop(1, "#4a8f4a");
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);

  for (let index = 0; index < 90; index += 1) {
    context.globalAlpha = 0.15 + random() * 0.2;
    context.fillStyle = random() > 0.5 ? "#8ecf62" : "#3f7d43";
    context.fillRect(random() * size, random() * size, 8 + random() * 24, 4 + random() * 10);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(6, 6);
  texture.colorSpace = THREE.SRGBColorSpace;

  return texture;
}

function createTerrain() {
  const geometry = new THREE.PlaneGeometry(MAP_SIZE, MAP_SIZE, 80, 80);
  geometry.rotateX(-Math.PI / 2);

  const position = geometry.attributes.position;
  const colors = [];

  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index);
    const z = position.getZ(index);
    const y = getStylizedTerrainHeight(x, z);
    const hillTint = THREE.MathUtils.clamp((y + 0.5) / 2.5, 0, 1);
    const templePath = Math.abs(x) < 14 && z < -8 && z > -95;

    position.setY(index, y);

    if (templePath) {
      scratchColor.set(COLORS.grassGold).lerp(new THREE.Color(COLORS.grassLight), 0.35);
    } else {
      scratchColor.set(COLORS.grassShadow).lerp(new THREE.Color(COLORS.grassLight), hillTint);
    }

    colors.push(scratchColor.r, scratchColor.g, scratchColor.b);
  }

  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();

  const terrain = new THREE.Mesh(
    geometry,
    makeStandardMaterial(0xffffff, {
      map: createGrassTexture(),
      vertexColors: true,
      roughness: 1,
    }),
  );
  terrain.name = "KhmerTempleGrassField";
  terrain.receiveShadow = true;

  return terrain;
}

function addBox(parent, material, x, y, z, sx, sy, sz, rotation = [0, 0, 0]) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material);
  mesh.position.set(x, y, z);
  mesh.scale.set(sx, sy, sz);
  mesh.rotation.set(rotation[0], rotation[1], rotation[2]);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function createKhmerPrasat(materials, heightScale = 1) {
  const tower = new THREE.Group();
  tower.name = "KhmerPrasatTower";

  const { light, mid, dark, deep } = materials;
  const h = heightScale;

  addBox(tower, deep, 0, 0.55 * h, 0, 3.6 * h, 1.1 * h, 3.6 * h);
  addBox(tower, dark, 0, 1.45 * h, 0, 3.0 * h, 0.9 * h, 3.0 * h);
  addBox(tower, mid, 0, 2.25 * h, 0, 2.3 * h, 0.75 * h, 2.3 * h);
  addBox(tower, light, 0, 2.95 * h, 0, 1.7 * h, 0.55 * h, 1.7 * h);
  addBox(tower, light, 0, 3.55 * h, 0, 1.1 * h, 0.45 * h, 1.1 * h);
  addBox(tower, mid, 0, 4.05 * h, 0, 0.75 * h, 0.85 * h, 0.75 * h);
  addBox(tower, light, 0, 4.75 * h, 0, 0.42 * h, 1.1 * h, 0.42 * h);

  for (const offset of [-1.35, 1.35]) {
    addBox(tower, dark, offset * h, 1.0 * h, 1.55 * h, 0.18 * h, 1.6 * h, 0.18 * h);
    addBox(tower, dark, offset * h, 1.0 * h, -1.55 * h, 0.18 * h, 1.6 * h, 0.18 * h);
  }

  return tower;
}

function createAngkorTemple(colliders) {
  const group = new THREE.Group();
  group.name = "AngkorStyleTempleComplex";
  const baseY = heightAt(0, -92);
  group.position.set(0, baseY, -92);

  const tz = -92;

  const materials = {
    light: makeStandardMaterial(COLORS.sandstoneLight),
    mid: makeStandardMaterial(COLORS.sandstoneMid),
    dark: makeStandardMaterial(COLORS.sandstoneDark),
    deep: makeStandardMaterial(COLORS.sandstoneDeep),
    moss: makeStandardMaterial(COLORS.mossStone, { roughness: 1 }),
  };

  const platform = new THREE.Group();
  platform.name = "TempleTerrace";

  addBox(platform, materials.deep, 0, 0.35, 0, 52, 0.7, 38);
  addBox(platform, materials.dark, 0, 0.95, 0, 46, 0.55, 33);
  addBox(platform, materials.mid, 0, 1.45, 0, 40, 0.45, 28);
  group.add(platform);

  const gallery = new THREE.Group();
  gallery.name = "TempleGalleryWalls";

  addBox(gallery, materials.mid, 0, 2.35, 14.5, 38, 1.8, 1.2);
  addBox(gallery, materials.mid, 0, 2.35, -14.5, 38, 1.8, 1.2);
  addBox(gallery, materials.mid, -19.5, 2.35, 0, 1.2, 1.8, 26);
  addBox(gallery, materials.mid, 19.5, 2.35, 0, 1.2, 1.8, 26);

  for (const x of [-16, -8, 0, 8, 16]) {
    addBox(gallery, materials.dark, x, 3.55, 14.5, 1.4, 0.35, 1.4);
    addBox(gallery, materials.dark, x, 3.55, -14.5, 1.4, 0.35, 1.4);
  }

  group.add(gallery);

  const towerPositions = [
    [0, 0, 0, 1.35],
    [-14, 0, -10, 0.82],
    [14, 0, -10, 0.82],
    [-14, 0, 10, 0.82],
    [14, 0, 10, 0.82],
  ];

  for (const [x, , z, scale] of towerPositions) {
    const prasat = createKhmerPrasat(materials, scale);
    prasat.position.set(x, 1.45, z);
    group.add(prasat);
  }

  addBox(group, materials.moss, -22, 1.6, 16, 4, 0.8, 3, [0, 0.2, 0]);
  addBox(group, materials.moss, 20, 1.5, -15, 5, 0.7, 2.5, [0, -0.15, 0]);

  const gate = new THREE.Group();
  gate.name = "TempleFrontGate";
  gate.position.set(0, 0, 22);
  addBox(gate, materials.dark, -4.5, 2.2, 0, 1.4, 4.4, 1.4);
  addBox(gate, materials.dark, 4.5, 2.2, 0, 1.4, 4.4, 1.4);
  addBox(gate, materials.mid, 0, 4.6, 0, 10.5, 0.8, 1.2);
  addBox(gate, materials.light, 0, 5.2, 0, 8.5, 0.35, 1.0);
  group.add(gate);

  const causeway = new THREE.Group();
  causeway.name = "TempleCauseway";
  causeway.position.set(0, 0, 38);
  addBox(causeway, materials.dark, 0, 0.18, 0, 8, 0.36, 28);
  addBox(causeway, materials.mid, 0, 0.42, 0, 6.5, 0.18, 26);
  group.add(causeway);

  addBoxCollider(colliders, 0, baseY + 1.5, tz, 26, 1.6, 19);
  addBoxCollider(colliders, 0, baseY + 3.2, tz + 14.5, 19, 1.2, 0.8);
  addBoxCollider(colliders, 0, baseY + 3.2, tz - 14.5, 19, 1.2, 0.8);
  addBoxCollider(colliders, -19.5, baseY + 3.2, tz, 0.8, 1.2, 13);
  addBoxCollider(colliders, 19.5, baseY + 3.2, tz, 0.8, 1.2, 13);
  addCylinderCollider(colliders, 0, baseY, tz, 3.8, 11.5);
  addCylinderCollider(colliders, -14, baseY + 1, tz - 10, 2.6, 8.5);
  addCylinderCollider(colliders, 14, baseY + 1, tz - 10, 2.6, 8.5);
  addCylinderCollider(colliders, -14, baseY + 1, tz + 10, 2.6, 8.5);
  addCylinderCollider(colliders, 14, baseY + 1, tz + 10, 2.6, 8.5);
  addBoxCollider(colliders, -4.5, baseY + 2.2, tz + 22, 0.9, 2.6, 0.9);
  addBoxCollider(colliders, 4.5, baseY + 2.2, tz + 22, 0.9, 2.6, 0.9);
  addBoxCollider(colliders, 0, baseY + 4.8, tz + 22, 5.4, 0.6, 0.8);
  addBoxCollider(colliders, -22, baseY + 1.6, tz + 16, 2.2, 0.6, 1.7);
  addBoxCollider(colliders, 20, baseY + 1.5, tz - 15, 2.7, 0.55, 1.4);
  addBoxCollider(colliders, 0, baseY + 0.35, tz + 38, 3.8, 0.5, 13.5);

  return group;
}

function createHeroAncientTree(colliders) {
  const group = new THREE.Group();
  group.name = "ForegroundAncientTree";
  const treeX = -24;
  const treeZ = 6;
  const treeBase = heightAt(treeX, treeZ);
  group.position.set(treeX, treeBase, treeZ);

  addCylinderCollider(colliders, treeX, treeBase, treeZ, 2.4, 14.5);
  addCylinderCollider(colliders, treeX, treeBase + 10, treeZ, 4.8, 8.5);

  const barkTexture = createBarkTexture();
  const leafTexture = createLeafTexture();
  const trunkMaterial = makeStandardMaterial(COLORS.barkWarm, {
    map: barkTexture,
    roughness: 0.96,
  });
  const barkDarkMaterial = makeStandardMaterial(COLORS.barkDark, {
    map: barkTexture,
    roughness: 1,
  });
  const rootMaterial = makeStandardMaterial(COLORS.barkMoss, { map: barkTexture, roughness: 1 });
  const leafMaterial = makeStandardMaterial(COLORS.leafMid, { map: leafTexture, roughness: 1 });
  const leafLightMaterial = makeStandardMaterial(COLORS.leafLight, { map: leafTexture, roughness: 1 });
  const leafShadowMaterial = makeStandardMaterial(COLORS.leafShadow, { map: leafTexture, roughness: 1 });
  const mossMaterial = makeStandardMaterial(COLORS.mossBright, { roughness: 1 });

  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 2.05, 11.5, 10), trunkMaterial);
  trunk.name = "AncientTreeTrunk";
  trunk.position.y = 5.75;
  trunk.castShadow = true;
  trunk.receiveShadow = true;
  group.add(trunk);

  const trunkUpper = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.25, 4.5, 9), barkDarkMaterial);
  trunkUpper.position.y = 12.2;
  trunkUpper.castShadow = true;
  group.add(trunkUpper);

  const branchSpecs = [
    [-1.1, 8.5, 0.4, 0.55, 0.22, 2.8, 0.35, -0.5],
    [1.0, 9.8, -0.3, 0.48, 0.2, 2.4, -0.35, 0.45],
    [-0.7, 11.2, 0.9, 0.42, 0.18, 2.0, 0.25, -0.8],
    [0.85, 10.6, -0.85, 0.4, 0.16, 1.8, -0.55, 0.6],
  ];

  for (const [x, y, z, sx, sy, length, rotY, rotZ] of branchSpecs) {
    const branch = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), barkDarkMaterial);
    branch.position.set(x + Math.sin(rotY) * length * 0.35, y, z + Math.cos(rotY) * length * 0.35);
    branch.scale.set(sx, sy, length);
    branch.rotation.set(0.15, rotY, rotZ);
    branch.castShadow = true;
    group.add(branch);
  }

  for (const [x, z, sx, rot] of [
    [-1.8, 1.2, 1.2, 0.35],
    [1.6, 0.8, 1.0, -0.28],
    [-0.8, -1.5, 1.1, 0.18],
    [1.2, -1.1, 0.9, -0.42],
    [-2.4, -0.4, 0.85, 0.62],
    [2.1, 0.2, 0.9, -0.55],
  ]) {
    const root = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), rootMaterial);
    root.position.set(x, 0.45, z);
    root.scale.set(sx * 2.2, 0.55, sx * 1.6);
    root.rotation.y = rot;
    root.castShadow = true;
    group.add(root);
  }

  for (const [x, y, z, sx, sy] of [
    [-1.4, 4.2, 1.1, 0.35, 1.8],
    [1.2, 6.8, -0.9, 0.3, 1.5],
    [-0.5, 9.5, -1.2, 0.28, 1.3],
  ]) {
    const vine = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), mossMaterial);
    vine.position.set(x, y, z);
    vine.scale.set(sx, sy, sx * 0.6);
    vine.rotation.set(0.1, Math.atan2(x, z), 0.08);
    vine.castShadow = true;
    group.add(vine);
  }

  const canopySpecs = [
    [0, 14.2, 0, 5.2, leafMaterial],
    [-2.8, 13.2, 1.4, 3.6, leafShadowMaterial],
    [2.6, 13.5, -1.0, 3.4, leafLightMaterial],
    [-1.2, 15.8, -1.8, 2.8, leafLightMaterial],
    [1.8, 15.5, 1.6, 3.0, leafMaterial],
    [0.2, 16.8, 0.4, 2.4, leafLightMaterial],
    [-3.4, 14.8, -1.2, 2.2, leafShadowMaterial],
    [3.1, 14.0, 1.8, 2.5, leafMaterial],
    [-1.6, 13.6, -0.6, 2.0, leafShadowMaterial],
    [2.2, 14.4, 0.5, 2.1, leafLightMaterial],
    [0.6, 15.2, -2.2, 1.9, leafMaterial],
    [-0.4, 17.2, 1.8, 1.7, leafLightMaterial],
  ];

  for (const [x, y, z, size, material] of canopySpecs) {
    const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(size * 0.42, 1), material);
    leaf.position.set(x, y, z);
    leaf.scale.set(size * 0.55, size * 0.38, size * 0.5);
    leaf.castShadow = true;
    group.add(leaf);
  }

  return group;
}

function createSmallTrees(random, colliders) {
  const group = new THREE.Group();
  group.name = "ScatteredSmallTrees";

  const count = 22;
  const barkTexture = createBarkTexture();
  const leafTexture = createLeafTexture();
  const trunkGeometry = new THREE.CylinderGeometry(0.28, 0.42, 3.2, 8);
  const canopyGeometry = new THREE.IcosahedronGeometry(1, 1);
  const canopyAccentGeometry = new THREE.IcosahedronGeometry(0.62, 1);
  const trunkMaterial = makeStandardMaterial(COLORS.barkWarm, { map: barkTexture, roughness: 0.96 });
  const canopyMaterial = makeStandardMaterial(COLORS.leafMid, {
    map: leafTexture,
    vertexColors: true,
    roughness: 1,
  });
  const canopyAccentMaterial = makeStandardMaterial(COLORS.leafLight, {
    map: leafTexture,
    vertexColors: true,
    roughness: 1,
  });
  const trunks = new THREE.InstancedMesh(trunkGeometry, trunkMaterial, count);
  const canopies = new THREE.InstancedMesh(canopyGeometry, canopyMaterial, count);
  const canopyAccents = new THREE.InstancedMesh(canopyAccentGeometry, canopyAccentMaterial, count);

  trunks.castShadow = true;
  canopies.castShadow = true;
  canopyAccents.castShadow = true;

  for (let index = 0; index < count; index += 1) {
    let x;
    let z;

    do {
      const angle = random() * Math.PI * 2;
      const radius = 28 + random() * 78;
      x = Math.cos(angle) * radius;
      z = Math.sin(angle) * radius;
    } while (x < -8 && x > -38 && z > -10 && z < 22);

    const y = heightAt(x, z);
    const scale = 0.65 + random() * 0.55;
    const yaw = random() * Math.PI;
    const accentOffsetX = (random() - 0.5) * 0.35 * scale;
    const accentOffsetZ = (random() - 0.5) * 0.35 * scale;

    scratchPosition.set(x, y + 1.6 * scale, z);
    scratchRotation.set(0, yaw, 0);
    scratchScale.set(scale, scale, scale);
    setInstance(trunks, index, scratchPosition, scratchRotation, scratchScale);

    scratchPosition.set(x, y + 3.5 * scale, z);
    scratchScale.set(scale * 1.15, scale * 0.85, scale * 1.1);
    scratchColor.set(random() > 0.45 ? COLORS.leafMid : COLORS.leafLight);
    setInstance(canopies, index, scratchPosition, scratchRotation, scratchScale, scratchColor);

    scratchPosition.set(x + accentOffsetX, y + 3.95 * scale, z + accentOffsetZ);
    scratchScale.set(scale * 0.72, scale * 0.55, scale * 0.68);
    scratchColor.set(random() > 0.5 ? COLORS.leafLight : COLORS.leafShadow);
    setInstance(canopyAccents, index, scratchPosition, scratchRotation, scratchScale, scratchColor);

    addCylinderCollider(colliders, x, y, z, 0.55 * scale, 4.2 * scale);
  }

  trunks.instanceMatrix.needsUpdate = true;
  canopies.instanceMatrix.needsUpdate = true;
  canopies.instanceColor.needsUpdate = true;
  canopyAccents.instanceMatrix.needsUpdate = true;
  canopyAccents.instanceColor.needsUpdate = true;
  group.add(trunks, canopies, canopyAccents);

  return group;
}

function createRockCluster(group, random, x, z, scale, colliders, rockTexture) {
  const y = heightAt(x, z);
  const rockMaterial = makeStandardMaterial(COLORS.rockMid, {
    map: rockTexture,
    vertexColors: true,
    roughness: 0.98,
  });
  const mossMaterial = makeStandardMaterial(COLORS.rockMoss, { roughness: 1 });

  const cluster = new THREE.Group();
  cluster.name = "HeroRockCluster";
  cluster.position.set(x, y, z);

  const rockCount = 2 + Math.floor(random() * 3);

  for (let index = 0; index < rockCount; index += 1) {
    const pieceScale = scale * (0.55 + random() * 0.65);
    const offsetX = (random() - 0.5) * scale * 1.4;
    const offsetZ = (random() - 0.5) * scale * 1.4;
    const offsetY = pieceScale * 0.22 + random() * pieceScale * 0.15;
    const geometry = createDeformedRockGeometry(8800 + index * 97 + Math.floor(x * 13 + z * 7));

    const rock = new THREE.Mesh(geometry, rockMaterial);
    rock.position.set(offsetX, offsetY, offsetZ);
    rock.rotation.set(random() * 0.35, random() * Math.PI, random() * 0.25);
    rock.scale.set(pieceScale * 1.15, pieceScale * 0.62, pieceScale * 0.95);
    rock.castShadow = true;
    rock.receiveShadow = true;
    cluster.add(rock);

    if (random() > 0.35) {
      const moss = new THREE.Mesh(new THREE.IcosahedronGeometry(pieceScale * 0.28, 1), mossMaterial);
      moss.position.set(offsetX, offsetY + pieceScale * 0.35, offsetZ);
      moss.scale.set(1.2, 0.45, 1.1);
      moss.castShadow = true;
      cluster.add(moss);
    }

    addBoxCollider(
      colliders,
      x + offsetX,
      y + offsetY + pieceScale * 0.15,
      z + offsetZ,
      pieceScale * 0.7,
      pieceScale * 0.4,
      pieceScale * 0.6,
    );
  }

  group.add(cluster);
}

function createRocks(random, colliders) {
  const group = new THREE.Group();
  group.name = "ScatteredFieldRocks";

  const count = 52;
  const mossCapCount = 22;
  const rockTexture = createRockTexture();
  const rockGeometry = createDeformedRockGeometry(9911);
  const rockMaterial = makeStandardMaterial(COLORS.rockMid, {
    map: rockTexture,
    vertexColors: true,
    roughness: 0.98,
  });
  const mossMaterial = makeStandardMaterial(COLORS.rockMoss, { roughness: 1 });
  const rocks = new THREE.InstancedMesh(rockGeometry, rockMaterial, count);
  const mossCaps = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.55, 1), mossMaterial, mossCapCount);
  rocks.castShadow = true;
  rocks.receiveShadow = true;
  mossCaps.castShadow = true;

  const heroClusters = [
    [18, 12, 1.35],
    [-32, -18, 1.55],
    [42, -28, 1.2],
    [-14, 34, 1.0],
  ];

  for (const [x, z, scale] of heroClusters) {
    createRockCluster(group, random, x, z, scale, colliders, rockTexture);
  }

  let mossIndex = 0;

  for (let index = 0; index < count; index += 1) {
    const angle = random() * Math.PI * 2;
    const radius = 14 + random() * 88;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const y = heightAt(x, z) + 0.15;
    const scale = 0.35 + random() * 1.1;

    scratchPosition.set(x, y, z);
    scratchRotation.set(random() * 0.3, random() * Math.PI, random() * 0.2);
    scratchScale.set(scale * 1.15, scale * 0.58, scale * 0.92);
    scratchColor
      .set(COLORS.rockLight)
      .lerp(new THREE.Color(COLORS.rockShadow), random() * 0.45)
      .lerp(new THREE.Color(COLORS.rockWarm), random() * 0.18);
    setInstance(rocks, index, scratchPosition, scratchRotation, scratchScale, scratchColor);

    if (random() > 0.58 && mossIndex < mossCapCount) {
      scratchPosition.set(x, y + scale * 0.42, z);
      scratchRotation.set(0, random() * Math.PI, 0);
      scratchScale.set(scale * 0.85, scale * 0.35, scale * 0.8);
      setInstance(mossCaps, mossIndex, scratchPosition, scratchRotation, scratchScale);
      mossIndex += 1;
    }

    addBoxCollider(
      colliders,
      x,
      y + scale * 0.25,
      z,
      scale * 0.65,
      scale * 0.35,
      scale * 0.55,
    );
  }

  rocks.instanceMatrix.needsUpdate = true;
  rocks.instanceColor.needsUpdate = true;
  mossCaps.instanceMatrix.needsUpdate = true;
  group.add(rocks, mossCaps);

  return group;
}

function createBushes(random, colliders) {
  const group = new THREE.Group();
  group.name = "LowPolyBushes";

  const count = 64;
  const bushGeometry = new THREE.IcosahedronGeometry(0.75, 0);
  const bushMaterial = makeStandardMaterial(COLORS.bushGreen, { roughness: 1 });
  const bushes = new THREE.InstancedMesh(bushGeometry, bushMaterial, count);
  bushes.castShadow = true;

  for (let index = 0; index < count; index += 1) {
    const angle = random() * Math.PI * 2;
    const radius = 12 + random() * 72;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const y = heightAt(x, z) + 0.28;

    scratchPosition.set(x, y, z);
    scratchRotation.set(0, random() * Math.PI, 0);
    scratchScale.set(0.8 + random(), 0.45 + random() * 0.35, 0.8 + random());
    setInstance(bushes, index, scratchPosition, scratchRotation, scratchScale);

    const bushRadius = 0.55 + random() * 0.35;
    addCylinderCollider(colliders, x, y, z, bushRadius, 1.1 + random() * 0.4);
  }

  bushes.instanceMatrix.needsUpdate = true;
  group.add(bushes);

  return group;
}

function createAtmosphere(random) {
  const group = new THREE.Group();
  group.name = "KhmerDaytimeAtmosphere";

  const ambient = new THREE.HemisphereLight(0xe8f4ff, 0x7ea86a, 1.05);
  const sun = new THREE.DirectionalLight(0xfff4d6, 0.75);
  const fill = new THREE.DirectionalLight(0xc8e4ff, 0.28);
  sun.position.set(-30, 48, 26);
  fill.position.set(24, 22, -18);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -90;
  sun.shadow.camera.right = 90;
  sun.shadow.camera.top = 90;
  sun.shadow.camera.bottom = -90;

  group.add(createSkyDome(), createClouds(random), createBirds(), ambient, sun, fill);

  return group;
}

export function createStylizedMap(scene) {
  const random = createRandom(MAIN_SEED);
  const colliders = [];
  const environment = new THREE.Group();
  environment.name = "KhmerAngkorTempleEnvironment";
  environment.userData.fog = new THREE.FogExp2(0xb8dff5, 0.0068);
  environment.userData.colliders = colliders;

  environment.add(
    createTerrain(),
    createAngkorTemple(colliders),
    createHeroAncientTree(colliders),
    createSmallTrees(random, colliders),
    createRocks(random, colliders),
    createBushes(random, colliders),
    createAtmosphere(random),
  );

  if (scene) {
    scene.add(environment);
    scene.fog = environment.userData.fog;
  }

  return environment;
}
