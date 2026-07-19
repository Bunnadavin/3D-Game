import * as THREE from "three";

const bloodColor = 0xb91c1c;
const gravity = 14;

function createBloodParticle() {
  const size = THREE.MathUtils.randFloat(0.06, 0.14);
  const geometry = new THREE.BoxGeometry(size, size * 0.6, size * 0.35);
  const material = new THREE.MeshStandardMaterial({
    color: bloodColor,
    roughness: 0.85,
    metalness: 0,
    transparent: true,
    opacity: 1,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = false;
  mesh.receiveShadow = false;

  return mesh;
}

export function spawnBloodEffect(scene, origin, direction) {
  const group = new THREE.Group();
  group.position.copy(origin);

  const normalizedDirection = direction.lengthSq() > 0 ? direction.clone().normalize() : new THREE.Vector3(0, 0, 1);
  const particles = [];

  for (let index = 0; index < 14; index += 1) {
    const mesh = createBloodParticle();
    const spread = new THREE.Vector3(
      THREE.MathUtils.randFloatSpread(1.4),
      THREE.MathUtils.randFloat(0.2, 1.1),
      THREE.MathUtils.randFloatSpread(1.4),
    );

    const velocity = normalizedDirection
      .clone()
      .multiplyScalar(THREE.MathUtils.randFloat(2.5, 5.5))
      .add(spread);

    mesh.position.set(
      THREE.MathUtils.randFloatSpread(0.25),
      THREE.MathUtils.randFloatSpread(0.15),
      THREE.MathUtils.randFloatSpread(0.25),
    );
    mesh.rotation.set(
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI,
    );

    group.add(mesh);
    particles.push({
      mesh,
      velocity,
      spin: new THREE.Vector3(
        THREE.MathUtils.randFloatSpread(8),
        THREE.MathUtils.randFloatSpread(8),
        THREE.MathUtils.randFloatSpread(8),
      ),
    });
  }

  scene.add(group);

  return {
    group,
    particles,
    life: 0.55,
    maxLife: 0.55,
    update(deltaTime) {
      this.life = Math.max(this.life - deltaTime, 0);
      const fade = this.life / this.maxLife;

      for (const particle of this.particles) {
        particle.velocity.y -= gravity * deltaTime;
        particle.mesh.position.addScaledVector(particle.velocity, deltaTime);
        particle.mesh.rotation.x += particle.spin.x * deltaTime;
        particle.mesh.rotation.y += particle.spin.y * deltaTime;
        particle.mesh.rotation.z += particle.spin.z * deltaTime;
        particle.mesh.material.opacity = fade;
      }

      return this.life > 0;
    },
    dispose() {
      scene.remove(group);

      for (const particle of this.particles) {
        particle.mesh.geometry.dispose();
        particle.mesh.material.dispose();
      }
    },
  };
}
