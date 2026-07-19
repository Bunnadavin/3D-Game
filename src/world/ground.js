import * as THREE from "three";
import { WORLD_SETTINGS } from "../utils/constants.js";

export function createGround() {
  const geometry = new THREE.PlaneGeometry(WORLD_SETTINGS.groundSize, WORLD_SETTINGS.groundSize);
  const material = new THREE.MeshStandardMaterial({
    color: WORLD_SETTINGS.groundColor,
    roughness: 0.85,
    metalness: 0,
  });

  const ground = new THREE.Mesh(geometry, material);
  ground.name = "Ground";
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;

  return ground;
}
