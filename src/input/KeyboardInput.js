export class KeyboardInput {
  constructor() {
    this.keys = new Set();
    this.previousKeys = new Set();
    this.mouseButtons = new Set();
    this.previousMouseButtons = new Set();
    this.pointerLockElement = null;
    this.mouseLookEnabled = false;
    this.mouseDeltaX = 0;
    this.mouseDeltaY = 0;
    this.wheelDelta = 0;

    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleWheel = this.handleWheel.bind(this);
    this.handleContextMenu = this.handleContextMenu.bind(this);
    this.handlePointerLockChange = this.handlePointerLockChange.bind(this);
    this.handleWindowBlur = this.handleWindowBlur.bind(this);
  }

  start(pointerLockElement = null) {
    this.pointerLockElement = pointerLockElement;

    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);
    window.addEventListener("mousedown", this.handleMouseDown);
    window.addEventListener("mouseup", this.handleMouseUp);
    window.addEventListener("mousemove", this.handleMouseMove);
    window.addEventListener("wheel", this.handleWheel, { passive: false });
    window.addEventListener("contextmenu", this.handleContextMenu);
    window.addEventListener("blur", this.handleWindowBlur);
    document.addEventListener("pointerlockchange", this.handlePointerLockChange);
  }

  stop() {
    window.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("keyup", this.handleKeyUp);
    window.removeEventListener("mousedown", this.handleMouseDown);
    window.removeEventListener("mouseup", this.handleMouseUp);
    window.removeEventListener("mousemove", this.handleMouseMove);
    window.removeEventListener("wheel", this.handleWheel);
    window.removeEventListener("contextmenu", this.handleContextMenu);
    window.removeEventListener("blur", this.handleWindowBlur);
    document.removeEventListener("pointerlockchange", this.handlePointerLockChange);
    this.releasePointerLock();
    this.keys.clear();
    this.mouseButtons.clear();
  }

  setMouseLookEnabled(enabled) {
    this.mouseLookEnabled = enabled;

    if (!enabled) {
      this.mouseDeltaX = 0;
      this.mouseDeltaY = 0;
      this.releasePointerLock();
      return;
    }

    this.requestPointerLock();
  }

  setPointerLockExitHandler(handler) {
    this.onPointerLockExit = handler;
  }

  requestPointerLock() {
    if (!this.mouseLookEnabled || !this.pointerLockElement) {
      return;
    }

    if (document.pointerLockElement !== this.pointerLockElement) {
      this.pointerLockElement.requestPointerLock();
    }
  }

  releasePointerLock() {
    if (document.pointerLockElement === this.pointerLockElement) {
      document.exitPointerLock();
    }
  }

  isPointerLocked() {
    return document.pointerLockElement === this.pointerLockElement;
  }

  isPressed(code) {
    return this.keys.has(code);
  }

  wasPressedThisFrame(code) {
    return this.keys.has(code) && !this.previousKeys.has(code);
  }

  wasMousePressedThisFrame(button) {
    return this.mouseButtons.has(button) && !this.previousMouseButtons.has(button);
  }

  consumeMouseDeltaX() {
    const deltaX = this.mouseDeltaX;
    this.mouseDeltaX = 0;
    return deltaX;
  }

  consumeMouseDeltaY() {
    const deltaY = this.mouseDeltaY;
    this.mouseDeltaY = 0;
    return deltaY;
  }

  consumeWheelDelta() {
    const delta = this.wheelDelta;
    this.wheelDelta = 0;
    return delta;
  }

  update() {
    this.previousKeys = new Set(this.keys);
    this.previousMouseButtons = new Set(this.mouseButtons);
  }

  handleKeyDown(event) {
    this.keys.add(event.code);
  }

  handleKeyUp(event) {
    this.keys.delete(event.code);
  }

  handleMouseDown(event) {
    this.mouseButtons.add(event.button);

    if (this.mouseLookEnabled) {
      this.requestPointerLock();
    }
  }

  handleMouseUp(event) {
    this.mouseButtons.delete(event.button);
  }

  handleMouseMove(event) {
    if (!this.mouseLookEnabled || !this.isPointerLocked()) {
      return;
    }

    this.mouseDeltaX += event.movementX;
    this.mouseDeltaY += event.movementY;
  }

  handleWheel(event) {
    if (this.mouseLookEnabled) {
      event.preventDefault();
      this.wheelDelta += event.deltaY;
    }
  }

  handleContextMenu(event) {
    if (this.mouseLookEnabled) {
      event.preventDefault();
    }
  }

  handlePointerLockChange() {
    if (!this.mouseLookEnabled) {
      return;
    }

    if (!this.isPointerLocked()) {
      this.mouseDeltaX = 0;
      this.mouseDeltaY = 0;
      // Browsers often consume Esc to exit pointer lock without a reliable key event.
      this.onPointerLockExit?.();
    }
  }

  handleWindowBlur() {
    this.keys.clear();
    this.mouseButtons.clear();
    this.mouseDeltaX = 0;
    this.mouseDeltaY = 0;
    this.wheelDelta = 0;
  }
}
