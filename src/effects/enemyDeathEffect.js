import * as THREE from "three";
import { ENEMY_DEATH_SETTINGS } from "../utils/constants.js";

const flashColors = [0xfff176, 0xff8a65, 0xf06292, 0xba68c8, 0x4fc3f7, 0xffffff, 0xffeb3b];

function createSparkParticle(color) {
  const size = THREE.MathUtils.randFloat(0.1, 0.28);
  const geometry = new THREE.BoxGeometry(size, size, size);
  const material = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 1,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.set(
    Math.random() * Math.PI,
    Math.random() * Math.PI,
    Math.random() * Math.PI,
  );

  return mesh;
}

function createShockRing(color, innerRadius, outerRadius) {
  const geometry = new THREE.RingGeometry(innerRadius, outerRadius, 32);
  const material = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.95,
    side: THREE.DoubleSide,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.x = -Math.PI / 2;

  return mesh;
}

function createFlashCore(color) {
  const geometry = new THREE.SphereGeometry(0.35, 12, 12);
  const material = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 1,
  });

  return new THREE.Mesh(geometry, material);
}

export function spawnEnemyDeathBurst(scene, enemy) {
  const group = new THREE.Group();
  const originY = enemy.userData.letterHeight * 0.55;
  group.position.copy(enemy.position);
  group.position.y += originY;

  const baseColor = enemy.userData.type.bodyColor;
  const particles = [];
  const rings = [];
  const flashCore = createFlashCore(0xffffff);
  group.add(flashCore);

  const flashLight = new THREE.PointLight(
    baseColor,
    ENEMY_DEATH_SETTINGS.flashLightIntensity,
    8,
  );
  flashLight.position.set(0, 0.4, 0);
  group.add(flashLight);

  for (let index = 0; index < ENEMY_DEATH_SETTINGS.burstParticleCount; index += 1) {
    const mesh = createSparkParticle(
      flashColors[index % flashColors.length] ?? baseColor,
    );
    const velocity = new THREE.Vector3(
      THREE.MathUtils.randFloatSpread(10),
      THREE.MathUtils.randFloat(3, 11),
      THREE.MathUtils.randFloatSpread(10),
    );
    const spin = new THREE.Vector3(
      THREE.MathUtils.randFloatSpread(18),
      THREE.MathUtils.randFloatSpread(18),
      THREE.MathUtils.randFloatSpread(18),
    );

    group.add(mesh);
    particles.push({ mesh, velocity, spin });
  }

  const ringColors = [0xfff59d, 0xff7043, 0xab47bc];
  for (let index = 0; index < ENEMY_DEATH_SETTINGS.ringCount; index += 1) {
    const ring = createShockRing(ringColors[index], 0.15 + index * 0.08, 0.32 + index * 0.1);
    ring.position.y = 0.05 + index * 0.04;
    group.add(ring);
    rings.push(ring);
  }

  scene.add(group);

  return {
    group,
    particles,
    rings,
    flashCore,
    flashLight,
    life: ENEMY_DEATH_SETTINGS.duration,
    maxLife: ENEMY_DEATH_SETTINGS.duration,
    update(deltaTime) {
      this.life = Math.max(this.life - deltaTime, 0);
      const fade = this.life / this.maxLife;
      const expand = 1 - fade;
      const pulse = Math.sin(expand * Math.PI * 6) * 0.5 + 0.5;

      for (const particle of this.particles) {
        particle.velocity.y -= 12 * deltaTime;
        particle.mesh.position.addScaledVector(particle.velocity, deltaTime);
        particle.mesh.rotation.x += particle.spin.x * deltaTime;
        particle.mesh.rotation.y += particle.spin.y * deltaTime;
        particle.mesh.rotation.z += particle.spin.z * deltaTime;
        particle.mesh.material.opacity = fade;
        particle.mesh.scale.setScalar(1 + expand * 1.4 + pulse * 0.3);
      }

      for (const [index, ring] of this.rings.entries()) {
        const ringScale = 1 + expand * (5.5 + index * 2.2);
        ring.scale.set(ringScale, ringScale, ringScale);
        ring.material.opacity = fade * (0.95 - index * 0.2);
        ring.rotation.z += deltaTime * (2 + index);
      }

      this.flashCore.scale.setScalar(1 + expand * 3.5 + pulse * 0.8);
      this.flashCore.material.opacity = fade * (0.9 + pulse * 0.4);
      this.flashLight.intensity = ENEMY_DEATH_SETTINGS.flashLightIntensity * fade * (0.6 + pulse * 0.8);

      return this.life > 0;
    },
    dispose() {
      scene.remove(group);

      for (const particle of this.particles) {
        particle.mesh.geometry.dispose();
        particle.mesh.material.dispose();
      }

      for (const ring of this.rings) {
        ring.geometry.dispose();
        ring.material.dispose();
      }

      this.flashCore.geometry.dispose();
      this.flashCore.material.dispose();
    },
  };
}
