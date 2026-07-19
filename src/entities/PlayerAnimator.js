import * as THREE from "three";

export class PlayerAnimator {
  constructor(player) {
    this.player = player;
    this.parts = player.userData.parts;
    this.elapsedTime = 0;
  }

  update(deltaTime, state) {
    this.elapsedTime += deltaTime;

    this.resetPose();

    if (state.isFlying) {
      this.applyFlyPose(state);
      this.applyAttackPose(state);
      return;
    }

    if (state.isDashing) {
      this.applyDashPose(state);
      this.applyAttackPose(state);
      return;
    }

    if (!state.isGrounded) {
      this.applyAirPose(state);
      this.applyAttackPose(state);
      return;
    }

    if (state.isMoving) {
      this.applyWalkPose(state);
      this.applyAttackPose(state);
      return;
    }

    this.applyIdlePose();
    this.applyAttackPose(state);
  }

  resetPose() {
    const { body, head, leftArm, rightArm, leftLeg, rightLeg } = this.parts;

    body.position.y = 1.0;
    body.rotation.set(0, 0, 0);
    head.position.y = 1.92;
    head.rotation.set(0, 0, 0);
    leftArm.rotation.set(0, 0, 0.04);
    rightArm.rotation.set(-0.28, 0.08, -0.12);
    leftLeg.rotation.set(0, 0, 0);
    rightLeg.rotation.set(0, 0, 0);
  }

  applyIdlePose() {
    const idleBob = Math.sin(this.elapsedTime * 2.4) * 0.025;

    this.parts.body.position.y = 1.0 + idleBob;
    this.parts.head.position.y = 1.92 + idleBob;
  }

  applyWalkPose(state) {
    const walkCycle = this.elapsedTime * state.walkAnimationSpeed;
    const swing = Math.sin(walkCycle) * 0.72;
    const counterSwing = Math.sin(walkCycle + Math.PI) * 0.72;
    const bodyBob = Math.abs(Math.sin(walkCycle)) * 0.06;

    this.parts.body.position.y = 1.0 + bodyBob;
    this.parts.head.position.y = 1.92 + bodyBob;
    this.parts.leftArm.rotation.x = counterSwing;
    this.parts.rightArm.rotation.x = swing * 0.55 - 0.35;
    this.parts.rightArm.rotation.y = 0.08;
    this.parts.rightArm.rotation.z = -0.12;
    this.parts.leftLeg.rotation.x = swing;
    this.parts.rightLeg.rotation.x = counterSwing;
  }

  applyAirPose(state) {
    const fallingAmount = THREE.MathUtils.clamp(-state.verticalVelocity / 18, 0, 1);

    this.parts.leftArm.rotation.x = -0.45 - fallingAmount * 0.25;
    this.parts.rightArm.rotation.x = -0.7 - fallingAmount * 0.25;
    this.parts.rightArm.rotation.y = 0.08;
    this.parts.rightArm.rotation.z = -0.12;
    this.parts.leftLeg.rotation.x = 0.25;
    this.parts.rightLeg.rotation.x = -0.25;
  }

  applyFlyPose(state) {
    const flyTilt = state.isMoving ? -0.35 : -0.18;
    const glide = Math.sin(this.elapsedTime * 5) * 0.08;

    this.parts.body.rotation.x = flyTilt;
    this.parts.head.rotation.x = -flyTilt * 0.45;
    this.parts.leftArm.rotation.x = -1.05 + glide;
    this.parts.rightArm.rotation.x = -0.95 - glide;
    this.parts.rightArm.rotation.y = 0.08;
    this.parts.rightArm.rotation.z = -0.12;
    this.parts.leftLeg.rotation.x = 0.35;
    this.parts.rightLeg.rotation.x = 0.35;
  }

  applyDashPose(state) {
    const lean = THREE.MathUtils.lerp(-0.42, -0.12, state.dashProgress);
    const armSweep = THREE.MathUtils.lerp(-0.95, -0.2, state.dashProgress);

    this.parts.body.rotation.x = lean;
    this.parts.head.rotation.x = -lean * 0.35;
    this.parts.leftArm.rotation.x = -0.72;
    this.parts.rightArm.rotation.x = armSweep;
    this.parts.rightArm.rotation.y = 0.18;
    this.parts.rightArm.rotation.z = -0.28;
    this.parts.leftLeg.rotation.x = 0.48;
    this.parts.rightLeg.rotation.x = -0.36;
  }

  applyAttackPose(state) {
    if (!state.isAttacking) {
      return;
    }

    const slash = Math.sin(state.attackProgress * Math.PI);
    const windup = THREE.MathUtils.lerp(-1.35, -0.25, state.attackProgress);

    this.parts.rightArm.rotation.x = windup - slash * 1.1;
    this.parts.rightArm.rotation.y = -0.45 + slash * 0.9;
    this.parts.rightArm.rotation.z = -0.35 - slash * 0.45;
    this.parts.body.rotation.y = -slash * 0.16;
    this.parts.head.rotation.y = -slash * 0.08;
  }
}
