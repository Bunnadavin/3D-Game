import * as THREE from "three";
import { PLAYER_SETTINGS } from "../utils/constants.js";
import { getStylizedTerrainHeight } from "../world/environment.js";
import { resolveEnvironmentCollisions } from "../world/collision.js";

const movementDirection = new THREE.Vector3();
const horizontalDirection = new THREE.Vector3();
const facingForward = new THREE.Vector3();
const facingRight = new THREE.Vector3();
const dashInputDirection = new THREE.Vector3();

export class PlayerController {
  constructor(player, input) {
    this.player = player;
    this.input = input;
    this.verticalVelocity = 0;
    this.isGrounded = true;
    this.isFlying = false;
    this.isLandingFromFly = false;
    this.isMoving = false;
    this.attackTimer = 0;
    this.lastShiftTapTime = 0;
    this.cameraPitch = 0;
    this.jumpsUsed = 0;
    this.dashTimer = 0;
    this.dashCooldown = 0;
    this.dashDirection = new THREE.Vector3();
    this.lastMovementTapTimes = new Map();
    this.environmentColliders = [];
    this.dynamicColliders = [];
  }

  setEnvironmentColliders(colliders) {
    this.environmentColliders = colliders;
  }

  setDynamicColliders(colliders) {
    this.dynamicColliders = colliders;
  }

  resolveCollisions() {
    resolveEnvironmentCollisions(
      this.player.position,
      this.environmentColliders,
      this.dynamicColliders,
    );
  }

  update(deltaTime) {
    this.isMoving = false;
    this.updateMouseLook();
    this.handleModeToggle();
    this.handleDashInput();
    this.updateAttack(deltaTime);
    this.updateMovement(deltaTime);
    this.updateVerticalMotion(deltaTime);
    this.resolveCollisions();
  }

  getAnimationState() {
    return {
      isFlying: this.isFlying,
      isGrounded: this.isGrounded,
      isMoving: this.isMoving,
      isAttacking: this.attackTimer > 0,
      attackProgress: this.getAttackProgress(),
      verticalVelocity: this.verticalVelocity,
      isDashing: this.dashTimer > 0,
      dashProgress: this.getDashProgress(),
      walkAnimationSpeed: this.isRunning()
        ? PLAYER_SETTINGS.runAnimationSpeed
        : PLAYER_SETTINGS.walkAnimationSpeed,
      yaw: this.player.rotation.y,
    };
  }

  getAttackProgress() {
    if (this.attackTimer <= 0) {
      return 0;
    }

    return 1 - this.attackTimer / PLAYER_SETTINGS.attackDuration;
  }

  getDashProgress() {
    if (this.dashTimer <= 0) {
      return 0;
    }

    return 1 - this.dashTimer / PLAYER_SETTINGS.dashDuration;
  }

  getCameraPitch() {
    return this.cameraPitch;
  }

  getCombatState() {
    return {
      isGrounded: this.isGrounded,
      isAttacking: this.attackTimer > 0,
      isDashing: this.dashTimer > 0,
      attackProgress: this.getAttackProgress(),
      dashProgress: this.getDashProgress(),
      verticalVelocity: this.verticalVelocity,
    };
  }

  getDashCooldownState() {
    return {
      remaining: this.dashCooldown,
      duration: PLAYER_SETTINGS.dashCooldown,
      isDashing: this.dashTimer > 0,
    };
  }

  isRunning() {
    return (
      this.isGrounded &&
      !this.isFlying &&
      (this.input.isPressed("ShiftLeft") || this.input.isPressed("ShiftRight"))
    );
  }

  handleModeToggle() {
    if (!this.input.wasPressedThisFrame("ShiftLeft") && !this.input.wasPressedThisFrame("ShiftRight")) {
      return;
    }

    const now = performance.now();
    const tapDelay = now - this.lastShiftTapTime;

    if (tapDelay <= PLAYER_SETTINGS.doubleTapDelayMs) {
      this.verticalVelocity = 0;
      this.lastShiftTapTime = 0;

      if (this.isFlying) {
        this.isFlying = false;
        this.isLandingFromFly = true;
        this.isGrounded = false;
      } else {
        this.isFlying = true;
        this.isLandingFromFly = false;
        this.isGrounded = false;
      }

      return;
    }

    this.lastShiftTapTime = now;
  }

  updateMouseLook() {
    const mouseDeltaX = this.input.consumeMouseDeltaX();
    const mouseDeltaY = this.input.consumeMouseDeltaY();

    if (mouseDeltaX !== 0) {
      this.player.rotation.y -= mouseDeltaX * PLAYER_SETTINGS.mouseLookSensitivity;
    }

    if (mouseDeltaY !== 0) {
      this.cameraPitch = THREE.MathUtils.clamp(
        this.cameraPitch + mouseDeltaY * PLAYER_SETTINGS.verticalMouseLookSensitivity,
        PLAYER_SETTINGS.minCameraPitch,
        PLAYER_SETTINGS.maxCameraPitch,
      );
    }
  }

  updateAttack(deltaTime) {
    if (this.input.wasPressedThisFrame("KeyF") || this.input.wasMousePressedThisFrame(0)) {
      this.attackTimer = PLAYER_SETTINGS.attackDuration;
    }

    this.attackTimer = Math.max(this.attackTimer - deltaTime, 0);
  }

  handleDashInput() {
    if (this.isFlying || this.dashCooldown > 0) {
      return;
    }

    dashInputDirection.set(0, 0, 0);
    this.addDashTap("KeyW", "forward", 0, 1);
    this.addDashTap("ArrowUp", "forward", 0, 1);
    this.addDashTap("KeyS", "back", 0, -1);
    this.addDashTap("ArrowDown", "back", 0, -1);
    this.addDashTap("KeyA", "left", -1, 0);
    this.addDashTap("ArrowLeft", "left", -1, 0);
    this.addDashTap("KeyD", "right", 1, 0);
    this.addDashTap("ArrowRight", "right", 1, 0);
  }

  addDashTap(code, directionName, x, z) {
    if (!this.input.wasPressedThisFrame(code) || this.dashTimer > 0) {
      return;
    }

    const now = performance.now();
    const lastTapTime = this.lastMovementTapTimes.get(directionName) ?? -Infinity;
    this.lastMovementTapTimes.set(directionName, now);

    if (now - lastTapTime > PLAYER_SETTINGS.comboTapDelayMs) {
      return;
    }

    facingForward.set(
      -Math.sin(this.player.rotation.y),
      0,
      -Math.cos(this.player.rotation.y),
    );
    facingRight.set(
      Math.cos(this.player.rotation.y),
      0,
      -Math.sin(this.player.rotation.y),
    );
    dashInputDirection
      .copy(facingForward)
      .multiplyScalar(z)
      .addScaledVector(facingRight, x)
      .normalize();

    this.dashDirection.copy(dashInputDirection);
    this.dashTimer = PLAYER_SETTINGS.dashDuration;
    this.dashCooldown = PLAYER_SETTINGS.dashCooldown;
  }

  updateMovement(deltaTime) {
    this.dashCooldown = Math.max(this.dashCooldown - deltaTime, 0);

    if (this.dashTimer > 0) {
      const dashStep = Math.min(deltaTime, this.dashTimer);
      const progress = this.getDashProgress();
      const easedProgress = 1 - Math.pow(1 - progress, 2);
      const dashSpeed = THREE.MathUtils.lerp(
        PLAYER_SETTINGS.dashSpeed,
        PLAYER_SETTINGS.dashEndSpeed,
        easedProgress,
      );

      this.player.position.addScaledVector(
        this.dashDirection,
        dashSpeed * dashStep,
      );
      this.dashTimer = Math.max(this.dashTimer - deltaTime, 0);
      this.isMoving = true;
      return;
    }

    movementDirection.set(0, 0, 0);
    horizontalDirection.set(0, 0, 0);

    if (this.input.isPressed("KeyW") || this.input.isPressed("ArrowUp")) {
      movementDirection.z += 1;
    }

    if (this.input.isPressed("KeyS") || this.input.isPressed("ArrowDown")) {
      movementDirection.z -= 1;
    }

    if (this.input.isPressed("KeyA") || this.input.isPressed("ArrowLeft")) {
      movementDirection.x -= 1;
    }

    if (this.input.isPressed("KeyD") || this.input.isPressed("ArrowRight")) {
      movementDirection.x += 1;
    }

    if (this.isFlying) {
      if (this.input.isPressed("Space")) {
        movementDirection.y += 1;
      }

      if (this.input.isPressed("ControlLeft") || this.input.isPressed("ControlRight") || this.input.isPressed("KeyC")) {
        movementDirection.y -= 1;
      }
    }

    if (movementDirection.lengthSq() === 0) {
      return;
    }

    this.isMoving = movementDirection.x !== 0 || movementDirection.z !== 0;

    const speed = this.isFlying
      ? PLAYER_SETTINGS.flySpeed
      : this.isRunning()
        ? PLAYER_SETTINGS.runSpeed
        : PLAYER_SETTINGS.walkSpeed;
    movementDirection.normalize();

    facingForward.set(
      -Math.sin(this.player.rotation.y),
      0,
      -Math.cos(this.player.rotation.y),
    );
    facingRight.set(
      Math.cos(this.player.rotation.y),
      0,
      -Math.sin(this.player.rotation.y),
    );
    horizontalDirection
      .copy(facingForward)
      .multiplyScalar(movementDirection.z)
      .addScaledVector(facingRight, movementDirection.x);

    if (horizontalDirection.lengthSq() > 0) {
      horizontalDirection.normalize();
    }

    this.player.position.x += horizontalDirection.x * speed * deltaTime;
    this.player.position.y += movementDirection.y * speed * deltaTime;
    this.player.position.z += horizontalDirection.z * speed * deltaTime;
  }

  updateVerticalMotion(deltaTime) {
    const groundY = this.getGroundY();

    if (this.isFlying) {
      this.player.position.y = Math.max(this.player.position.y, groundY);
      this.isGrounded = false;
      return;
    }

    if (this.isLandingFromFly) {
      this.landFromFlyMode(deltaTime);
      return;
    }

    if (this.input.wasPressedThisFrame("Space")) {
      if (this.isGrounded) {
        this.verticalVelocity = PLAYER_SETTINGS.jumpVelocity;
        this.isGrounded = false;
        this.jumpsUsed = 1;
      } else if (this.jumpsUsed < PLAYER_SETTINGS.maxJumps) {
        this.verticalVelocity = PLAYER_SETTINGS.doubleJumpVelocity;
        this.jumpsUsed += 1;
      }
    }

    if (this.isGrounded) {
      this.snapToGround();
      return;
    }

    const gravity =
      this.verticalVelocity < 0
        ? PLAYER_SETTINGS.gravity * PLAYER_SETTINGS.fallGravityMultiplier
        : PLAYER_SETTINGS.gravity;

    this.verticalVelocity = Math.max(
      this.verticalVelocity - gravity * deltaTime,
      -PLAYER_SETTINGS.maxFallSpeed,
    );
    this.player.position.y += this.verticalVelocity * deltaTime;

    if (this.player.position.y <= groundY) {
      this.snapToGround();
    }
  }

  landFromFlyMode(deltaTime) {
    const groundY = this.getGroundY();

    this.player.position.y -= PLAYER_SETTINGS.flyLandingSpeed * deltaTime;

    if (this.player.position.y <= groundY) {
      this.isLandingFromFly = false;
      this.snapToGround();
    }
  }

  getGroundY() {
    return (
      getStylizedTerrainHeight(this.player.position.x, this.player.position.z) +
      PLAYER_SETTINGS.groundY
    );
  }

  snapToGround() {
    this.player.position.y = this.getGroundY();
    this.verticalVelocity = 0;
    this.isGrounded = true;
    this.jumpsUsed = 0;
  }
}
