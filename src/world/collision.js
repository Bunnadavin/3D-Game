import { PLAYER_SETTINGS } from "../utils/constants.js";

function overlapsVertically(feetY, playerHeight, collider) {
  return feetY + playerHeight > collider.minY && feetY < collider.maxY;
}

function pushOutOfCylinder(position, collider, playerRadius) {
  const dx = position.x - collider.x;
  const dz = position.z - collider.z;
  const distance = Math.hypot(dx, dz);
  const minDistance = collider.radius + playerRadius;

  if (distance >= minDistance) {
    return;
  }

  if (distance > 0.0001) {
    const push = (minDistance - distance) / distance;
    position.x += dx * push;
    position.z += dz * push;
    return;
  }

  position.x += minDistance;
}

function pushOutOfBox(position, collider, playerRadius) {
  const dx = position.x - collider.x;
  const dz = position.z - collider.z;
  const overlapX = collider.halfX + playerRadius - Math.abs(dx);
  const overlapZ = collider.halfZ + playerRadius - Math.abs(dz);

  if (overlapX <= 0 || overlapZ <= 0) {
    return;
  }

  if (overlapX < overlapZ) {
    position.x += dx > 0 ? overlapX : -overlapX;
  } else {
    position.z += dz > 0 ? overlapZ : -overlapZ;
  }
}

export function addBoxCollider(colliders, x, y, z, halfX, halfY, halfZ) {
  colliders.push({
    type: "box",
    x,
    y,
    z,
    halfX,
    halfY,
    halfZ,
    minY: y - halfY,
    maxY: y + halfY,
  });
}

export function addCylinderCollider(colliders, x, baseY, z, radius, height) {
  colliders.push({
    type: "cylinder",
    x,
    z,
    radius,
    minY: baseY,
    maxY: baseY + height,
  });
}

export function resolveEnvironmentCollisions(position, colliders, dynamicColliders = []) {
  if (colliders.length === 0 && dynamicColliders.length === 0) {
    return;
  }

  const playerRadius = PLAYER_SETTINGS.collisionRadius;
  const playerHeight = PLAYER_SETTINGS.collisionHeight;
  const feetY = position.y;
  const allColliders = colliders.concat(dynamicColliders);

  for (let iteration = 0; iteration < 5; iteration += 1) {
    for (const collider of allColliders) {
      if (!overlapsVertically(feetY, playerHeight, collider)) {
        continue;
      }

      if (collider.type === "cylinder") {
        pushOutOfCylinder(position, collider, playerRadius);
      } else {
        pushOutOfBox(position, collider, playerRadius);
      }
    }
  }
}

export function createEnemyCollider(enemy) {
  return {
    type: "cylinder",
    x: enemy.position.x,
    z: enemy.position.z,
    radius: PLAYER_SETTINGS.collisionRadius,
    minY: enemy.position.y,
    maxY: enemy.position.y + PLAYER_SETTINGS.collisionHeight,
  };
}
