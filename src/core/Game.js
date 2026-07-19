import * as THREE from "three";
import { CSS2DRenderer } from "../../node_modules/three/examples/jsm/renderers/CSS2DRenderer.js";
import { PlayerController } from "../controllers/PlayerController.js";
import {
  createEnemy,
  disposeEnemy,
  ensureKhmerFontReady,
  flashEnemyHit,
  startEnemyDeath,
  updateEnemyDeathAnimation,
  updateEnemyHealthBar,
  updateEnemyVisuals,
} from "../entities/enemy.js";
import { spawnEnemyDeathBurst } from "../effects/enemyDeathEffect.js";
import { PlayerAnimator } from "../entities/PlayerAnimator.js";
import { createPlayer, applyPlayerSkinColor, applyPlayerClothColor } from "../entities/player.js";
import { spawnBloodEffect } from "../effects/bloodEffect.js";
import { createHeroAura, disposeHeroAura, updateHeroAura } from "../effects/heroAura.js";
import { SoundManager } from "../audio/SoundManager.js";
import { pickEnemyTypeForLevel } from "../systems/enemyScaling.js";
import {
  applyDeathLevelPenalty,
  getExpProgress,
  getExpRequiredForNextLevel,
  getLevelFromExp,
  getPlayerAttackDamage,
  getPlayerDashDamage,
  getPlayerExplosionDamage,
  getPlayerJumpAttackDamage,
  getPlayerMaxHealth,
  getTotalExpForLevel,
  LEVEL_SETTINGS,
} from "../systems/playerProgression.js";
import { KeyboardInput } from "../input/KeyboardInput.js";
import { GameMenu, getSavedClothId, getSavedModeId, getSavedSkinId } from "../ui/GameMenu.js";
import { createStylizedMap, getStylizedTerrainHeight } from "../world/environment.js";
import { createEnemyCollider } from "../world/collision.js";
import { CAMERA_SETTINGS, ENEMY_SETTINGS, GAME_MODES, PLAYER_CLOTHES, PLAYER_SETTINGS, PLAYER_SKINS, RENDER_SETTINGS, WORLD_SETTINGS } from "../utils/constants.js";

const enemyDirection = new THREE.Vector3();
const spawnDirection = new THREE.Vector3();
const aimScreenPoint = new THREE.Vector2(0, CAMERA_SETTINGS.aimScreenY);
const aimDirection = new THREE.Vector3();
const aimToEnemy = new THREE.Vector3();
const bloodOrigin = new THREE.Vector3();
const bloodDirection = new THREE.Vector3();

export class Game {
  constructor(canvas) {
    if (!canvas) {
      throw new Error("Game canvas was not found.");
    }

    this.canvas = canvas;
    this.scene = new THREE.Scene();
    this.camera = this.createCamera();
    this.renderer = this.createRenderer();
    this.clock = new THREE.Clock();
    this.input = new KeyboardInput();
    this.raycaster = new THREE.Raycaster();

    this.player = null;
    this.playerController = null;
    this.playerAnimator = null;
    this.enemies = [];
    this.animationFrameId = null;
    this.playerLevel = LEVEL_SETTINGS.startLevel;
    this.playerExp = 0;
    this.levelUpTimer = 0;
    this.playerHealth = getPlayerMaxHealth(this.playerLevel);
    this.playerHurtCooldown = 0;
    this.timeSincePlayerDamage = PLAYER_SETTINGS.healthRegenDelay;
    this.isGameOver = false;
    this.isPaused = true;
    this.attackHitApplied = false;
    this.dashHitEnemies = new Set();
    this.explosionCooldown = 0;
    this.explosionEffectTimer = 0;
    this.explosionEffect = null;
    this.enemySpawnTimer = 0;
    this.bloodEffects = [];
    this.deathEffects = [];
    this.cameraZoom = CAMERA_SETTINGS.defaultZoom;
    this.wasDashing = false;
    this.attackSwingSoundPlayed = false;
    this.sound = new SoundManager();
    this.css2DRenderer = this.createLabelRenderer();
    this.playerHealthBar = document.querySelector("#player-health-bar");
    this.playerHealthText = document.querySelector("#player-health-text");
    this.playerAttackText = document.querySelector("#player-attack-text");
    this.playerLevelText = document.querySelector("#player-level-text");
    this.playerExpBar = document.querySelector("#player-exp-bar");
    this.playerExpText = document.querySelector("#player-exp-text");
    this.levelUpBanner = document.querySelector("#level-up-banner");
    this.skillCooldownBar = document.querySelector("#skill-cooldown-bar");
    this.skillCooldownText = document.querySelector("#skill-cooldown-text");
    this.selectedSkin = this.getInitialSkin();
    this.selectedCloth = this.getInitialCloth();
    this.gameMode = this.getInitialGameMode();
    this.menu = new GameMenu({
      onPlay: () => this.startPlaying(),
      onResume: () => this.resumeGame(),
      onRestart: () => this.restart(),
      onMainMenu: () => this.returnToMainMenu(),
      onSkinChange: (skinId) => this.setPlayerSkin(skinId),
      onClothChange: (clothId) => this.setPlayerCloth(clothId),
      onModeChange: (modeId) => this.setGameMode(modeId),
      onMusicVolumeChange: (volume) => this.sound.setMusicVolume(volume),
      onSfxVolumeChange: (volume) => this.sound.setSfxVolume(volume),
      initialSkinId: this.selectedSkin.id,
      initialClothId: this.selectedCloth.id,
      initialModeId: this.gameMode.id,
      initialMusicVolume: this.sound.getMusicVolume(),
      initialSfxVolume: this.sound.getSfxVolume(),
    });

    this.handleResize = this.handleResize.bind(this);
  }

  async start() {
    await this.loadAssets();
    this.setupScene();
    this.input.start(this.canvas);
    this.input.setPointerLockExitHandler(() => this.handlePointerLockExit());
    this.handleResize();
    window.addEventListener("resize", this.handleResize);
    this.animate();
  }

  async loadAssets() {
    await ensureKhmerFontReady();
  }

  createLabelRenderer() {
    const renderer = new CSS2DRenderer();
    renderer.domElement.style.position = "absolute";
    renderer.domElement.style.top = "0";
    renderer.domElement.style.left = "0";
    renderer.domElement.style.pointerEvents = "none";
    this.canvas.parentElement?.appendChild(renderer.domElement);

    return renderer;
  }

  setupScene() {
    this.scene.background = new THREE.Color(WORLD_SETTINGS.skyColor);

    this.addLighting();

    const stylizedMap = createStylizedMap();
    this.scene.add(stylizedMap);
    this.scene.fog = stylizedMap.userData.fog;

    this.player = createPlayer(this.selectedSkin.color);
    applyPlayerClothColor(this.player, this.selectedCloth.color);
    this.scene.add(this.player);
    this.playerController = new PlayerController(this.player, this.input);
    this.playerController.setEnvironmentColliders(stylizedMap.userData.colliders ?? []);
    this.playerAnimator = new PlayerAnimator(this.player);

    this.heroAura = createHeroAura();
    this.player.add(this.heroAura.root);

    this.spawnEnemies(ENEMY_SETTINGS.initialCount);
    this.scheduleNextEnemySpawn();

    this.explosionEffect = this.createExplosionEffect();
    this.scene.add(this.explosionEffect);

    this.updateHud();
    this.updateSkillHud();
    this.applyDebugStartLevel();
    this.positionCamera();
    this.menu.showMainMenu();
  }

  createCamera() {
    return new THREE.PerspectiveCamera(
      CAMERA_SETTINGS.fieldOfView,
      window.innerWidth / window.innerHeight,
      CAMERA_SETTINGS.nearPlane,
      CAMERA_SETTINGS.farPlane,
    );
  }

  createRenderer() {
    const renderer = new THREE.WebGLRenderer({
      antialias: RENDER_SETTINGS.antialias,
      canvas: this.canvas,
    });

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, RENDER_SETTINGS.maxPixelRatio));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    return renderer;
  }

  addLighting() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 2.2);
    sunLight.position.set(20, 35, 10);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.set(2048, 2048);
    sunLight.shadow.camera.left = -50;
    sunLight.shadow.camera.right = 50;
    sunLight.shadow.camera.top = 50;
    sunLight.shadow.camera.bottom = -50;
    this.scene.add(sunLight);
  }

  createExplosionEffect() {
    const geometry = new THREE.SphereGeometry(1, 24, 12);
    const material = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0,
      wireframe: true,
    });
    const effect = new THREE.Mesh(geometry, material);
    effect.name = "BodyExplosionEffect";
    effect.visible = false;

    return effect;
  }

  positionCamera() {
    this.camera.position.set(
      CAMERA_SETTINGS.startPosition.x,
      CAMERA_SETTINGS.startPosition.y,
      CAMERA_SETTINGS.startPosition.z,
    );
    this.camera.lookAt(
      CAMERA_SETTINGS.lookAt.x,
      CAMERA_SETTINGS.lookAt.y,
      CAMERA_SETTINGS.lookAt.z,
    );
  }

  animate() {
    this.animationFrameId = window.requestAnimationFrame(() => this.animate());

    const deltaTime = this.clock.getDelta();
    this.update(deltaTime);
    this.renderer.render(this.scene, this.camera);
    this.css2DRenderer.render(this.scene, this.camera);
  }

  update(deltaTime) {
    if (!this.player) {
      return;
    }

    if (this.isGameOver) {
      this.playerAnimator.update(deltaTime, {
        isFlying: false,
        isGrounded: true,
        isMoving: false,
        isAttacking: false,
        attackProgress: 0,
        verticalVelocity: 0,
        isDashing: false,
        dashProgress: 0,
        walkAnimationSpeed: PLAYER_SETTINGS.walkAnimationSpeed,
        yaw: this.player.rotation.y,
      });
      this.updateCamera();
      this.updateHeroAuraVisuals();
      this.input.update();
      return;
    }

    if (this.isPaused) {
      if (this.input.wasPressedThisFrame("Escape")) {
        this.resumeGame();
        this.input.update();
        return;
      }

      this.playerAnimator.update(deltaTime, {
        isFlying: false,
        isGrounded: true,
        isMoving: false,
        isAttacking: false,
        attackProgress: 0,
        verticalVelocity: 0,
        isDashing: false,
        dashProgress: 0,
        walkAnimationSpeed: PLAYER_SETTINGS.walkAnimationSpeed,
        yaw: this.player.rotation.y,
      });
      this.updateCamera();
      this.updateHeroAuraVisuals();
      this.input.update();
      return;
    }

    if (this.input.wasPressedThisFrame("Escape")) {
      this.pauseGame();
      this.input.update();
      return;
    }

    if (this.input.wasMousePressedThisFrame(0)) {
      this.sound.unlock();
    }

    this.updatePlayerCollisions();
    this.playerController.update(deltaTime);
    this.updateExplosionSkill(deltaTime);
    this.updateEnemySpawns(deltaTime);
    this.updateEnemy(deltaTime);
    this.updateEnemyDeaths(deltaTime);
    this.updateBloodEffects(deltaTime);
    this.updateDeathEffects(deltaTime);
    this.updateCombat(deltaTime);
    this.updateCombatSounds();
    this.updatePlayerRecovery(deltaTime);
    this.updateLevelUpBanner(deltaTime);
    this.updateHeroAuraVisuals();
    this.updateCameraZoom();
    this.playerAnimator.update(deltaTime, this.playerController.getAnimationState());
    this.updateCamera();
    this.input.update();
  }

  handlePointerLockExit() {
    if (!this.isPaused && !this.isGameOver) {
      this.pauseGame();
    }
  }

  updateEnemySpawns(deltaTime) {
    this.enemySpawnTimer = Math.max(this.enemySpawnTimer - deltaTime, 0);

    if (this.enemySpawnTimer > 0) {
      return;
    }

    const batchSize = THREE.MathUtils.randInt(
      ENEMY_SETTINGS.spawnBatchMin,
      ENEMY_SETTINGS.spawnBatchMax,
    );

    this.spawnEnemies(batchSize);
    this.scheduleNextEnemySpawn();
  }

  scheduleNextEnemySpawn() {
    this.enemySpawnTimer = THREE.MathUtils.randFloat(
      ENEMY_SETTINGS.spawnIntervalMin,
      ENEMY_SETTINGS.spawnIntervalMax,
    );
  }

  spawnEnemies(count) {
    const openSlots = ENEMY_SETTINGS.maxCount - this.enemies.length;
    const spawnCount = Math.max(Math.min(count, openSlots), 0);

    for (let index = 0; index < spawnCount; index += 1) {
      const enemy = createEnemy(this.getRandomEnemyType());
      this.placeEnemyAroundPlayer(enemy);
      this.enemies.push(enemy);
      this.scene.add(enemy);
    }
  }

  getRandomEnemyType() {
    return pickEnemyTypeForLevel(ENEMY_SETTINGS.types, this.playerLevel);
  }

  placeEnemyAroundPlayer(enemy) {
    const angle = Math.random() * Math.PI * 2;
    const distance = THREE.MathUtils.randFloat(
      ENEMY_SETTINGS.spawnRadiusMin,
      ENEMY_SETTINGS.spawnRadiusMax,
    );

    spawnDirection.set(Math.cos(angle), 0, Math.sin(angle)).multiplyScalar(distance);
    enemy.position.copy(this.player.position).add(spawnDirection);
    enemy.position.y = getStylizedTerrainHeight(enemy.position.x, enemy.position.z) + PLAYER_SETTINGS.groundY;
  }

  updateEnemy(deltaTime) {
    if (this.enemies.length === 0) {
      return;
    }

    for (const enemy of this.enemies) {
      if (enemy.userData.isDying) {
        continue;
      }

      enemyDirection.subVectors(this.player.position, enemy.position);
      enemyDirection.y = 0;

      const distance = enemyDirection.length();

      if (distance <= ENEMY_SETTINGS.chaseDistance && distance > ENEMY_SETTINGS.stopDistance) {
        enemyDirection.normalize();
        enemy.position.addScaledVector(
          enemyDirection,
          enemy.userData.type.moveSpeed * deltaTime,
        );
        enemy.position.y = getStylizedTerrainHeight(enemy.position.x, enemy.position.z) + PLAYER_SETTINGS.groundY;
      }

      if (distance <= ENEMY_SETTINGS.chaseDistance) {
        enemy.lookAt(this.player.position.x, enemy.position.y, this.player.position.z);
      }

      updateEnemyVisuals(enemy, deltaTime);
    }
  }

  updatePlayerCollisions() {
    const dynamicColliders = this.enemies
      .filter((enemy) => !enemy.userData.isDying)
      .map((enemy) => createEnemyCollider(enemy));

    this.playerController.setDynamicColliders(dynamicColliders);
  }

  updateDeathEffects(deltaTime) {
    this.deathEffects = this.deathEffects.filter((effect) => {
      const isAlive = effect.update(deltaTime);

      if (!isAlive) {
        effect.dispose();
      }

      return isAlive;
    });
  }

  updateEnemyDeaths(deltaTime) {
    for (const enemy of [...this.enemies]) {
      if (!enemy.userData.isDying) {
        continue;
      }

      const isAnimating = updateEnemyDeathAnimation(enemy, deltaTime);

      if (!isAnimating) {
        this.finishEnemyDeath(enemy);
      }
    }
  }

  updateBloodEffects(deltaTime) {
    this.bloodEffects = this.bloodEffects.filter((effect) => {
      const isAlive = effect.update(deltaTime);

      if (!isAlive) {
        effect.dispose();
      }

      return isAlive;
    });
  }

  updateCombat(deltaTime) {
    this.playerHurtCooldown = Math.max(this.playerHurtCooldown - deltaTime, 0);

    if (this.enemies.length === 0) {
      return;
    }

    for (const enemy of this.enemies) {
      if (enemy.userData.isDying) {
        continue;
      }

      enemy.userData.attackCooldown = Math.max(enemy.userData.attackCooldown - deltaTime, 0);

      const distanceToEnemy = this.player.position.distanceTo(enemy.position);

      if (distanceToEnemy <= ENEMY_SETTINGS.stopDistance && enemy.userData.attackCooldown === 0) {
        this.damagePlayer(enemy.userData.type.damage);
        enemy.userData.attackCooldown = ENEMY_SETTINGS.attackCooldown;
      }
    }

    const combatState = this.playerController.getCombatState();

    if (combatState.isAttacking && combatState.attackProgress < 0.08 && !this.attackSwingSoundPlayed) {
      this.sound.playAttackSwing();
      this.attackSwingSoundPlayed = true;
    }

    if (!combatState.isAttacking) {
      this.attackSwingSoundPlayed = false;
    }

    if (combatState.isDashing) {
      this.attackEnemiesTouchedByDash();
    } else {
      this.dashHitEnemies.clear();
    }

    if (!combatState.isAttacking) {
      this.attackHitApplied = false;
      return;
    }

    const aimedEnemy = this.findEnemyAtAimPoint(PLAYER_SETTINGS.attackRange);

    const canHitNow =
      !this.attackHitApplied &&
      combatState.attackProgress >= 0.12 &&
      combatState.attackProgress <= 0.88 &&
      aimedEnemy;

    if (!canHitNow) {
      return;
    }

    const attackDamage = combatState.isGrounded
      ? getPlayerAttackDamage(this.playerLevel)
      : getPlayerJumpAttackDamage(this.playerLevel);
    const hitType = combatState.isGrounded ? "melee" : "jumpAttack";

    this.damageEnemy(aimedEnemy, attackDamage, hitType);
    this.attackHitApplied = true;
  }

  updateCombatSounds() {
    const combatState = this.playerController.getCombatState();
    const isDashing = combatState.isDashing;

    if (isDashing && !this.wasDashing) {
      this.sound.playDashStart();
    }

    this.wasDashing = isDashing;
  }

  updateExplosionSkill(deltaTime) {
    this.explosionCooldown = Math.max(this.explosionCooldown - deltaTime, 0);

    if (this.input.wasPressedThisFrame("KeyE") && this.explosionCooldown === 0) {
      this.triggerExplosionSkill();
    }

    this.updateExplosionEffect(deltaTime);
    this.updateSkillHud();
  }

  triggerExplosionSkill() {
    this.explosionCooldown = PLAYER_SETTINGS.explosionCooldown;
    this.explosionEffectTimer = PLAYER_SETTINGS.explosionEffectDuration;
    this.sound.playExplosion();

    if (this.explosionEffect) {
      this.explosionEffect.visible = true;
      this.explosionEffect.position.copy(this.player.position);
      this.explosionEffect.position.y += 1;
      this.explosionEffect.scale.setScalar(0.2);
      this.explosionEffect.material.opacity = 0.8;
    }

    if (this.enemies.length === 0) {
      return;
    }

    for (const enemy of [...this.enemies]) {
      if (enemy.userData.isDying) {
        continue;
      }

      const distanceToEnemy = this.player.position.distanceTo(enemy.position);

      if (distanceToEnemy <= PLAYER_SETTINGS.explosionRange) {
        this.damageEnemy(enemy, getPlayerExplosionDamage(this.playerLevel), "explosion");
      }
    }
  }

  updateExplosionEffect(deltaTime) {
    if (!this.explosionEffect || this.explosionEffectTimer <= 0) {
      return;
    }

    this.explosionEffectTimer = Math.max(this.explosionEffectTimer - deltaTime, 0);
    const progress = 1 - this.explosionEffectTimer / PLAYER_SETTINGS.explosionEffectDuration;
    const scale = THREE.MathUtils.lerp(0.2, PLAYER_SETTINGS.explosionRange, progress);

    this.explosionEffect.position.copy(this.player.position);
    this.explosionEffect.position.y += 1;
    this.explosionEffect.scale.setScalar(scale);
    this.explosionEffect.material.opacity = THREE.MathUtils.lerp(0.8, 0, progress);

    if (this.explosionEffectTimer === 0) {
      this.explosionEffect.visible = false;
    }
  }

  getAimScreenPoint() {
    const crosshair = document.getElementById("cursor-point");

    if (crosshair) {
      const rect = crosshair.getBoundingClientRect();
      aimScreenPoint.x = ((rect.left + rect.width * 0.5) / window.innerWidth) * 2 - 1;
      aimScreenPoint.y = -((rect.top + rect.height * 0.5) / window.innerHeight) * 2 + 1;
    } else {
      aimScreenPoint.set(0, CAMERA_SETTINGS.aimScreenY);
    }

    return aimScreenPoint;
  }

  getCombatDistanceToEnemy(enemy) {
    const dx = enemy.position.x - this.player.position.x;
    const dz = enemy.position.z - this.player.position.z;

    return Math.hypot(dx, dz);
  }

  findEnemyInAimCone(maxDistance, direction) {
    const cone = PLAYER_SETTINGS.attackCone;
    let bestEnemy = null;
    let bestAngle = Infinity;

    for (const enemy of this.enemies) {
      if (enemy.userData.isDying) {
        continue;
      }

      if (this.getCombatDistanceToEnemy(enemy) > maxDistance) {
        continue;
      }

      const targetY = enemy.position.y + enemy.userData.letterHeight * 0.55;
      aimToEnemy.set(
        enemy.position.x - this.player.position.x,
        targetY - (this.player.position.y + 1),
        enemy.position.z - this.player.position.z,
      );

      const distance = aimToEnemy.length();

      if (distance < 0.001) {
        return enemy;
      }

      aimToEnemy.multiplyScalar(1 / distance);
      const angle = direction.angleTo(aimToEnemy);

      if (angle < cone && angle < bestAngle) {
        bestAngle = angle;
        bestEnemy = enemy;
      }
    }

    return bestEnemy;
  }

  findEnemyAtAimPoint(maxDistance) {
    this.raycaster.setFromCamera(this.getAimScreenPoint(), this.camera);
    this.raycaster.far =
      maxDistance + CAMERA_SETTINGS.followOffset.z * this.cameraZoom + 6;

    aimDirection.copy(this.raycaster.ray.direction);

    const enemyMeshes = [];
    const meshToEnemy = new Map();

    for (const enemy of this.enemies) {
      if (enemy.userData.isDying) {
        continue;
      }

      enemy.traverse((child) => {
        if (child.isMesh) {
          enemyMeshes.push(child);
          meshToEnemy.set(child, enemy);
        }
      });
    }

    const hits = this.raycaster.intersectObjects(enemyMeshes, false);

    for (const hit of hits) {
      const enemy = meshToEnemy.get(hit.object);

      if (!enemy) {
        continue;
      }

      if (this.getCombatDistanceToEnemy(enemy) <= maxDistance) {
        return enemy;
      }
    }

    return this.findEnemyInAimCone(maxDistance, aimDirection);
  }

  attackEnemiesTouchedByDash() {
    for (const enemy of this.enemies) {
      if (enemy.userData.isDying) {
        continue;
      }

      if (this.dashHitEnemies.has(enemy.id)) {
        continue;
      }

      const hitDistance = ENEMY_SETTINGS.stopDistance + PLAYER_SETTINGS.collisionRadius * 0.35;

      if (this.player.position.distanceTo(enemy.position) <= hitDistance) {
        this.damageEnemy(enemy, getPlayerDashDamage(this.playerLevel), "dash");
        this.dashHitEnemies.add(enemy.id);
      }
    }
  }

  damagePlayer(amount) {
    if (this.gameMode.id === "invincible" || this.playerHurtCooldown > 0 || this.playerHealth <= 0) {
      return;
    }

    this.playerHealth = Math.max(this.playerHealth - amount, 0);
    this.playerHurtCooldown = PLAYER_SETTINGS.hurtCooldown;
    this.timeSincePlayerDamage = 0;
    this.sound.playPlayerHurt();

    if (this.playerHealth === 0) {
      this.handlePlayerDefeat();
    }

    this.updateHud();
  }

  damageEnemy(enemy, amount, hitType = "melee") {
    if (enemy.userData.isDying) {
      return;
    }

    const wasAlive = enemy.userData.health > 0;
    enemy.userData.health = Math.max(enemy.userData.health - amount, 0);
    updateEnemyHealthBar(enemy);
    flashEnemyHit(enemy);
    this.spawnEnemyBlood(enemy);

    const isKill = wasAlive && enemy.userData.health === 0;

    this.sound.playHitImpact(hitType);

    if (isKill) {
      this.grantExp(enemy.userData.type?.expReward ?? 15);
      this.sound.playEnemyDeath(enemy);
      startEnemyDeath(enemy);
      this.deathEffects.push(spawnEnemyDeathBurst(this.scene, enemy));
    }
  }

  spawnEnemyBlood(enemy) {
    bloodOrigin.copy(enemy.position);
    bloodOrigin.y += enemy.userData.letterHeight * 0.65;

    bloodDirection.subVectors(enemy.position, this.player.position);
    bloodDirection.y = 0.35;

    const effect = spawnBloodEffect(this.scene, bloodOrigin, bloodDirection);
    this.bloodEffects.push(effect);
  }

  grantExp(amount) {
    const previousLevel = this.playerLevel;
    this.playerExp += amount;
    this.playerLevel = getLevelFromExp(this.playerExp);

    if (this.playerLevel > previousLevel) {
      this.playerHealth = getPlayerMaxHealth(this.playerLevel);
      this.levelUpTimer = 2.2;
      this.showLevelUpBanner(this.playerLevel);
    }

    this.updateHud();
  }

  showLevelUpBanner(level) {
    if (!this.levelUpBanner) {
      return;
    }

    this.levelUpBanner.textContent = `Level Up! Lv ${level}`;
    this.levelUpBanner.classList.add("is-visible");
  }

  updateLevelUpBanner(deltaTime) {
    if (this.levelUpTimer <= 0) {
      return;
    }

    this.levelUpTimer = Math.max(this.levelUpTimer - deltaTime, 0);

    if (this.levelUpTimer === 0 && this.levelUpBanner) {
      this.levelUpBanner.classList.remove("is-visible");
    }
  }

  updateHeroAuraVisuals() {
    if (!this.heroAura) {
      return;
    }

    updateHeroAura(this.heroAura, this.playerLevel, this.clock.elapsedTime);
  }

  applyDebugStartLevel() {
    const params = new URLSearchParams(window.location.search);
    const debugLevel = Number.parseInt(params.get("level") ?? "", 10);

    if (!Number.isFinite(debugLevel) || debugLevel < LEVEL_SETTINGS.startLevel) {
      return;
    }

    const cappedLevel = Math.min(debugLevel, LEVEL_SETTINGS.maxLevel);
    this.playerLevel = cappedLevel;
    this.playerExp = getTotalExpForLevel(cappedLevel);
    this.playerHealth = getPlayerMaxHealth(cappedLevel);
    this.updateHud();
  }

  finishEnemyDeath(enemy) {
    disposeEnemy(enemy);
    this.scene.remove(enemy);
    this.enemies = this.enemies.filter((activeEnemy) => activeEnemy !== enemy);
    this.dashHitEnemies.delete(enemy.id);
    this.updateHud();
  }

  getInitialSkin() {
    const savedSkinId = getSavedSkinId();
    const skinId = savedSkinId ?? PLAYER_SETTINGS.defaultSkinId;

    return (
      PLAYER_SKINS.find((skin) => skin.id === skinId) ??
      PLAYER_SKINS[0]
    );
  }

  getInitialGameMode() {
    const savedModeId = getSavedModeId();
    const modeId = savedModeId ?? PLAYER_SETTINGS.defaultGameModeId;

    return (
      GAME_MODES.find((mode) => mode.id === modeId) ??
      GAME_MODES[0]
    );
  }

  setGameMode(modeId) {
    const mode = GAME_MODES.find((entry) => entry.id === modeId);

    if (!mode) {
      return;
    }

    this.gameMode = mode;
    document.body.classList.toggle("mode-invincible", mode.id === "invincible");
    this.updateHud();
  }

  getInitialCloth() {
    const savedClothId = getSavedClothId();
    const clothId = savedClothId ?? PLAYER_SETTINGS.defaultClothId;

    return (
      PLAYER_CLOTHES.find((cloth) => cloth.id === clothId) ??
      PLAYER_CLOTHES[0]
    );
  }

  setPlayerCloth(clothId) {
    const cloth = PLAYER_CLOTHES.find((entry) => entry.id === clothId);

    if (!cloth || !this.player) {
      return;
    }

    this.selectedCloth = cloth;
    applyPlayerClothColor(this.player, cloth.color);
  }

  setPlayerSkin(skinId) {
    const skin = PLAYER_SKINS.find((entry) => entry.id === skinId);

    if (!skin || !this.player) {
      return;
    }

    this.selectedSkin = skin;
    applyPlayerSkinColor(this.player, skin.color);
  }

  async startPlaying() {
    this.isPaused = false;
    this.isGameOver = false;
    this.input.setMouseLookEnabled(true);
    await this.sound.unlock();
    await this.sound.playMusic();
    document.body.classList.add("game-playing");
    document.body.classList.toggle("mode-invincible", this.gameMode.id === "invincible");
    this.menu.hideAll();
  }

  resumeGame() {
    this.startPlaying();
  }

  pauseGame() {
    if (this.isGameOver || this.isPaused) {
      return;
    }

    this.isPaused = true;
    this.input.setMouseLookEnabled(false);
    this.sound.pauseMusic();
    document.body.classList.remove("game-playing");
    this.menu.showPauseMenu();
  }

  returnToMainMenu() {
    this.resetGameState();
    this.isPaused = true;
    this.isGameOver = false;
    this.input.setMouseLookEnabled(false);
    this.sound.stopMusic();
    document.body.classList.remove("game-playing");
    this.menu.showMainMenu();
  }

  restart() {
    this.resetCombatState({ keepProgress: true });
    this.startPlaying();
  }

  resetGameState() {
    this.resetCombatState({ keepProgress: false });
  }

  resetCombatState({ keepProgress = false } = {}) {
    this.clearEnemies();
    this.clearBloodEffects();
    this.clearDeathEffects();

    if (!keepProgress) {
      this.playerLevel = LEVEL_SETTINGS.startLevel;
      this.playerExp = 0;
    }

    this.levelUpTimer = 0;
    this.playerHealth = getPlayerMaxHealth(this.playerLevel);
    this.playerHurtCooldown = 0;
    this.timeSincePlayerDamage = PLAYER_SETTINGS.healthRegenDelay;
    this.attackHitApplied = false;
    this.dashHitEnemies.clear();
    this.wasDashing = false;
    this.attackSwingSoundPlayed = false;
    this.explosionCooldown = 0;
    this.explosionEffectTimer = 0;
    this.enemySpawnTimer = 0;

    if (this.explosionEffect) {
      this.explosionEffect.visible = false;
      this.explosionEffect.material.opacity = 0;
    }

    if (this.player) {
      this.player.position.set(0, PLAYER_SETTINGS.groundY, 0);
      this.player.rotation.set(0, 0, 0);
    }

    if (this.playerController) {
      this.playerController.verticalVelocity = 0;
      this.playerController.isGrounded = true;
      this.playerController.isFlying = false;
      this.playerController.isLandingFromFly = false;
      this.playerController.isMoving = false;
      this.playerController.attackTimer = 0;
      this.playerController.cameraPitch = 0;
      this.playerController.jumpsUsed = 0;
      this.playerController.dashTimer = 0;
      this.playerController.dashCooldown = 0;
      this.playerController.dashDirection.set(0, 0, 0);
      this.playerController.lastShiftTapTime = 0;
      this.playerController.lastMovementTapTimes.clear();
    }

    if (this.levelUpBanner) {
      this.levelUpBanner.classList.remove("is-visible");
    }

    this.spawnEnemies(ENEMY_SETTINGS.initialCount);
    this.scheduleNextEnemySpawn();
    this.updateHud();
    this.updateSkillHud();
    this.positionCamera();
  }

  clearEnemies() {
    for (const enemy of this.enemies) {
      disposeEnemy(enemy);
      this.scene.remove(enemy);
    }

    this.enemies = [];
    this.dashHitEnemies.clear();
  }

  clearBloodEffects() {
    for (const effect of this.bloodEffects) {
      effect.dispose();
    }

    this.bloodEffects = [];
  }

  clearDeathEffects() {
    for (const effect of this.deathEffects) {
      effect.dispose();
    }

    this.deathEffects = [];
  }

  handlePlayerDefeat() {
    const previousLevel = this.playerLevel;
    const penalizedLevel = applyDeathLevelPenalty(previousLevel);
    const levelsLost = previousLevel - penalizedLevel;

    this.playerLevel = penalizedLevel;
    this.playerExp = getTotalExpForLevel(penalizedLevel);
    this.playerHealth = 0;

    this.isGameOver = true;
    this.isPaused = true;
    this.input.setMouseLookEnabled(false);
    this.sound.pauseMusic();
    document.body.classList.remove("game-playing");
    this.updateHud();
    this.updateGameOverMessage(levelsLost, penalizedLevel);
    this.menu.showGameOver();
  }

  updateGameOverMessage(levelsLost, newLevel) {
    const subtitle = document.querySelector("#game-over-menu .menu-subtitle");

    if (!subtitle) {
      return;
    }

    if (levelsLost > 0) {
      subtitle.textContent =
        `Your hero ran out of health and lost ${levelsLost} level${levelsLost === 1 ? "" : "s"} (now Lv ${newLevel}). Try again or return to the main menu.`;
      return;
    }

    subtitle.textContent =
      "Your hero ran out of health. Try again or return to the main menu.";
  }

  updatePlayerRecovery(deltaTime) {
    const maxHealth = getPlayerMaxHealth(this.playerLevel);

    if (this.playerHealth <= 0 || this.playerHealth >= maxHealth) {
      return;
    }

    this.timeSincePlayerDamage += deltaTime;

    if (this.timeSincePlayerDamage < PLAYER_SETTINGS.healthRegenDelay) {
      return;
    }

    this.playerHealth = Math.min(
      this.playerHealth + PLAYER_SETTINGS.healthRegenRate * deltaTime,
      maxHealth,
    );
    this.updateHud();
  }

  updateHud() {
    const maxHealth = getPlayerMaxHealth(this.playerLevel);
    const playerHealthRatio = this.playerHealth / maxHealth;
    const expProgress = getExpProgress(this.playerExp, this.playerLevel);
    const expToNext = getExpRequiredForNextLevel(this.playerLevel);

    if (this.playerHealthBar) {
      this.playerHealthBar.style.transform = `scaleX(${playerHealthRatio})`;
    }

    if (this.playerHealthText) {
      const modeLabel = this.gameMode.id === "invincible" ? " ∞" : "";
      this.playerHealthText.textContent = `${Math.ceil(this.playerHealth)} / ${maxHealth}${modeLabel}`;
    }

    if (this.playerAttackText) {
      this.playerAttackText.textContent = `${getPlayerAttackDamage(this.playerLevel)}`;
    }

    if (this.playerLevelText) {
      this.playerLevelText.textContent = `${this.playerLevel}`;
    }

    if (this.playerExpBar) {
      this.playerExpBar.style.transform = `scaleX(${expProgress})`;
    }

    if (this.playerExpText) {
      if (this.playerLevel >= LEVEL_SETTINGS.maxLevel) {
        this.playerExpText.textContent = `${this.playerExp} (MAX)`;
      } else {
        const expIntoLevel = this.playerExp - getTotalExpForLevel(this.playerLevel);
        this.playerExpText.textContent = `${expIntoLevel} / ${expToNext}`;
      }
    }
  }

  updateSkillHud() {
    const dashState = this.playerController?.getDashCooldownState();
    const readyRatio = dashState
      ? 1 - dashState.remaining / dashState.duration
      : 1;

    if (this.skillCooldownBar) {
      this.skillCooldownBar.style.transform = `scaleX(${readyRatio})`;
    }

    if (this.skillCooldownText) {
      this.skillCooldownText.textContent =
        !dashState || dashState.remaining === 0
          ? "Ready"
          : `${dashState.remaining.toFixed(1)}s`;
    }
  }

  updateCameraZoom() {
    const wheelDelta = this.input.consumeWheelDelta();

    if (wheelDelta === 0) {
      return;
    }

    this.cameraZoom = THREE.MathUtils.clamp(
      this.cameraZoom + wheelDelta * CAMERA_SETTINGS.zoomSpeed,
      CAMERA_SETTINGS.minZoom,
      CAMERA_SETTINGS.maxZoom,
    );
  }

  updateCamera() {
    const cameraOffset = CAMERA_SETTINGS.followOffset;
    const cameraPitch = this.playerController.getCameraPitch();
    const zoom = this.cameraZoom;
    const rotatedOffset = new THREE.Vector3(
      cameraOffset.x,
      cameraOffset.y * THREE.MathUtils.lerp(0.94, 1.06, (zoom - CAMERA_SETTINGS.minZoom) / (CAMERA_SETTINGS.maxZoom - CAMERA_SETTINGS.minZoom)),
      cameraOffset.z * zoom,
    )
      .applyAxisAngle(new THREE.Vector3(1, 0, 0), cameraPitch)
      .applyAxisAngle(new THREE.Vector3(0, 1, 0), this.player.rotation.y);

    this.camera.position.set(
      this.player.position.x + rotatedOffset.x,
      this.player.position.y + rotatedOffset.y,
      this.player.position.z + rotatedOffset.z,
    );

    this.camera.lookAt(
      this.player.position.x,
      this.player.position.y + CAMERA_SETTINGS.targetHeight,
      this.player.position.z,
    );
  }

  handleResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
    this.css2DRenderer.setSize(width, height);
  }
}
