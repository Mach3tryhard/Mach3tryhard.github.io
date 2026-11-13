import * as THREE from "three";

/**
 * Deliberately small FPS controller: pointer-lock look, WASD movement, a light
 * head-bob and movement through a union of walkable rectangles (the entrance
 * hall, the doorway throats and the seven hallways).
 */

const KEY_FORWARD = new Set(["KeyW", "ArrowUp"]);
const KEY_BACK = new Set(["KeyS", "ArrowDown"]);
const KEY_LEFT = new Set(["KeyA", "ArrowLeft"]);
const KEY_RIGHT = new Set(["KeyD", "ArrowRight"]);

export class Player {
  constructor({
    camera,
    canvas,
    walkable = [],
    obstacles = [],
    eyeHeight = 1.66,
    startX = 0,
    startZ = 0,
    startYaw = 0,
    startPitch = 0,
  }) {
    this.camera = camera;
    this.canvas = canvas;
    this.walkable = walkable;
    this.obstacles = obstacles;
    this.eyeHeight = eyeHeight;

    this.position = new THREE.Vector3(startX, eyeHeight, startZ);
    this.velocity = new THREE.Vector3();
    this.yaw = startYaw;
    this.pitch = startPitch;
    this.active = false;
    this.started = false;
    this.locked = false;
    this.usingTouch = false;
    this.keys = new Set();
    this.touchMove = new THREE.Vector2();
    this.lookSensitivity = 0.00185;
    this.walkSpeed = 3.8;
    this.sprintSpeed = 5.4;
    this.jumpSpeed = 5.0;
    this.gravity = 14;
    this.jumpOffset = 0;
    this.verticalVelocity = 0;
    this.grounded = true;
    this.acceleration = 20;
    this.damping = 10;
    this.playerRadius = 0.3;
    this.bobTime = 0;
    this.stepDistance = 0;
    this.lastStepAt = 0;
    this.lookReadyAt = 0;
    this.lookEventCount = 0;
    this.pendingLookX = 0;
    this.pendingLookY = 0;
    this.onLockChange = null;
    this.onStep = null;
    this.onTargetHint = null;

    this._onPointerMove = this._onPointerMove.bind(this);
    this._onPointerLockChange = this._onPointerLockChange.bind(this);
    this._onKeyDown = this._onKeyDown.bind(this);
    this._onKeyUp = this._onKeyUp.bind(this);
    this._onPointerLockError = this._onPointerLockError.bind(this);

    this._bind();
    this.applyPose();
  }

  _bind() {
    document.addEventListener("pointerlockchange", this._onPointerLockChange);
    document.addEventListener("pointerlockerror", this._onPointerLockError);
    document.addEventListener("mousemove", this._onPointerMove);
    document.addEventListener("keydown", this._onKeyDown);
    document.addEventListener("keyup", this._onKeyUp);
  }

  _onPointerLockChange() {
    this.locked = document.pointerLockElement === this.canvas;
    // Browsers can emit one large synthetic movement event right after the
    // lock is acquired — sometimes late, when the cursor is first moved.
    // Ignore an initial beat and the first couple of events so the view never
    // jumps when entering or resuming.
    if (this.locked) {
      this.lookReadyAt = performance.now() + 280;
      this.lookEventCount = 0;
      this.pendingLookX = 0;
      this.pendingLookY = 0;
    }
    this.onLockChange?.(this.locked);
  }

  _onPointerLockError() {
    // The app-level pointerlockerror handler updates the button labels. Do not
    // route this through onLockChange: a failed lock request must not look like
    // the visitor pressed Escape.
  }

  _onPointerMove(event) {
    if (!this.active || !this.locked || performance.now() < this.lookReadyAt) return;

    // Drop the initial pointer-lock hand-off events. After that, every normal
    // movement event is applied.
    if (this.lookEventCount < 6) {
      this.lookEventCount += 1;
      return;
    }

    // Collect movement and apply it once per frame. A burst of synthetic
    // pointer-lock events, or a single high-DPI outlier, can no longer rotate
    // the camera instantly: the frame step is capped in update().
    this.pendingLookX += THREE.MathUtils.clamp(event.movementX || 0, -220, 220);
    this.pendingLookY += THREE.MathUtils.clamp(event.movementY || 0, -220, 220);
  }

  _onKeyDown(event) {
    if (!this.active && !this.started) return;
    if (event.code === "Escape") return;

    if (event.code === "Space") {
      if (this.active) {
        event.preventDefault();
        if (!event.repeat) this.jump();
      }
      return;
    }

    if (
      KEY_FORWARD.has(event.code) ||
      KEY_BACK.has(event.code) ||
      KEY_LEFT.has(event.code) ||
      KEY_RIGHT.has(event.code) ||
      event.code === "ShiftLeft" ||
      event.code === "ShiftRight"
    ) {
      if (this.active) event.preventDefault();
      this.keys.add(event.code);
    }
  }

  _onKeyUp(event) {
    this.keys.delete(event.code);
  }

  requestLock() {
    if (!this.canvas.requestPointerLock) return false;
    try {
      this.canvas.requestPointerLock();
    } catch {
      return false;
    }
    return true;
  }

  start({ touch = false } = {}) {
    this.started = true;
    this.active = true;
    this.usingTouch = touch;
    if (touch) this.locked = true;
  }

  pause() {
    this.active = false;
    this.velocity.set(0, 0, 0);
    this.pendingLookX = 0;
    this.pendingLookY = 0;
    this.keys.clear();
    this.touchMove.set(0, 0);
    this.jumpOffset = 0;
    this.verticalVelocity = 0;
    this.grounded = true;
  }

  resume() {
    if (!this.started) return;
    this.active = true;
    this.usingTouch = false;
  }

  jump() {
    if (!this.active || !this.grounded) return;
    this.verticalVelocity = this.jumpSpeed;
    this.grounded = false;
  }

  setTouchMove(x, z) {
    this.touchMove.set(x, z);
  }

  addLookDelta(x, y, sensitivity = 0.0028) {
    if (!this.active || (this.locked && !this.usingTouch)) return;
    this.yaw -= x * sensitivity;
    this.pitch -= y * sensitivity;
    this.pitch = THREE.MathUtils.clamp(this.pitch, -1.25, 1.25);
  }

  applyPose() {
    this.camera.rotation.order = "YXZ";
    this.camera.rotation.set(this.pitch, this.yaw, 0);
    this.camera.position.copy(this.position);
  }

  /** True when the player's centre can stand at x/z inside any walkable box. */
  isWalkable(x, z) {
    const radius = this.playerRadius;
    for (const rect of this.walkable) {
      if (
        x > rect.minX + radius &&
        x < rect.maxX - radius &&
        z > rect.minZ + radius &&
        z < rect.maxZ - radius
      ) {
        for (const obstacle of this.obstacles) {
          if (
            x > obstacle.minX - radius &&
            x < obstacle.maxX + radius &&
            z > obstacle.minZ - radius &&
            z < obstacle.maxZ + radius
          ) {
            return false;
          }
        }
        return true;
      }
    }
    return false;
  }

  update(dt, time) {
    if (!this.active) {
      this.applyPose();
      return;
    }

    // A maximum of roughly 4.4 degrees of rotation per frame. Normal mouse
    // movement stays far below this; only an outlier is clipped.
    const lookX = THREE.MathUtils.clamp(this.pendingLookX, -42, 42);
    const lookY = THREE.MathUtils.clamp(this.pendingLookY, -42, 42);
    this.pendingLookX = 0;
    this.pendingLookY = 0;
    if (lookX !== 0 || lookY !== 0) {
      this.yaw -= lookX * this.lookSensitivity;
      this.pitch = THREE.MathUtils.clamp(
        this.pitch - lookY * this.lookSensitivity,
        -1.25,
        1.25
      );
    }

    const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));

    let wishX = 0;
    let wishZ = 0;
    const moveForward =
      (this.keys.has("KeyW") || this.keys.has("ArrowUp") ? 1 : 0) -
      (this.keys.has("KeyS") || this.keys.has("ArrowDown") ? 1 : 0);
    const moveRight =
      (this.keys.has("KeyD") || this.keys.has("ArrowRight") ? 1 : 0) -
      (this.keys.has("KeyA") || this.keys.has("ArrowLeft") ? 1 : 0);

    wishX += forward.x * moveForward + right.x * moveRight;
    wishZ += forward.z * moveForward + right.z * moveRight;
    wishX += this.touchMove.x;
    wishZ += this.touchMove.y;

    const wishLength = Math.hypot(wishX, wishZ);
    if (wishLength > 1) {
      wishX /= wishLength;
      wishZ /= wishLength;
    }

    const sprinting = this.keys.has("ShiftLeft") || this.keys.has("ShiftRight");
    const targetSpeed = sprinting ? this.sprintSpeed : this.walkSpeed;
    const targetX = wishX * targetSpeed;
    const targetZ = wishZ * targetSpeed;
    const smoothing = 1 - Math.exp(-this.acceleration * dt);

    this.velocity.x += (targetX - this.velocity.x) * smoothing;
    this.velocity.z += (targetZ - this.velocity.z) * smoothing;

    if (wishLength < 0.01) {
      const drag = 1 - Math.exp(-this.damping * dt);
      this.velocity.x *= 1 - drag;
      this.velocity.z *= 1 - drag;
    }

    const previousX = this.position.x;
    const previousZ = this.position.z;
    const nextX = this.position.x + this.velocity.x * dt;
    const nextZ = this.position.z + this.velocity.z * dt;

    if (this.isWalkable(nextX, nextZ)) {
      this.position.x = nextX;
      this.position.z = nextZ;
    } else if (this.isWalkable(nextX, this.position.z)) {
      this.position.x = nextX;
      this.velocity.z = 0;
    } else if (this.isWalkable(this.position.x, nextZ)) {
      this.position.z = nextZ;
      this.velocity.x = 0;
    } else {
      this.velocity.x = 0;
      this.velocity.z = 0;
    }

    const moved = Math.hypot(this.position.x - previousX, this.position.z - previousZ);
    this.stepDistance += moved;
    const speed = Math.hypot(this.velocity.x, this.velocity.z);
    if (speed > 0.18 && moved > 0.0001) {
      this.bobTime += dt * (5.2 + speed * 1.3);
      if (this.stepDistance > (sprinting ? 0.94 : 0.78)) {
        this.stepDistance = 0;
        this.lastStepAt = time;
        this.onStep?.({ speed, sprinting });
      }
    } else {
      this.bobTime += dt * 0.55;
    }

    const bobStrength = THREE.MathUtils.clamp(speed / this.walkSpeed, 0, 1.35);
    const bobY = Math.sin(this.bobTime * 2) * 0.013 * bobStrength;
    const sway = Math.sin(this.bobTime) * 0.007 * bobStrength;
    const bobRoll = Math.sin(this.bobTime) * 0.0014 * bobStrength;

    if (!this.grounded) {
      this.verticalVelocity -= this.gravity * dt;
      this.jumpOffset += this.verticalVelocity * dt;
      if (this.jumpOffset <= 0) {
        this.jumpOffset = 0;
        this.verticalVelocity = 0;
        this.grounded = true;
      }
    }

    this.camera.rotation.order = "YXZ";
    this.camera.rotation.set(this.pitch + sway, this.yaw, bobRoll);
    this.camera.position.set(
      this.position.x,
      this.eyeHeight + bobY + this.jumpOffset,
      this.position.z
    );
  }

  dispose() {
    document.removeEventListener("pointerlockchange", this._onPointerLockChange);
    document.removeEventListener("pointerlockerror", this._onPointerLockError);
    document.removeEventListener("mousemove", this._onPointerMove);
    document.removeEventListener("keydown", this._onKeyDown);
    document.removeEventListener("keyup", this._onKeyUp);
  }
}
