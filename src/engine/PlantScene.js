import * as THREE from 'three';

export class PlantScene {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.onSelectionChange = options.onSelectionChange ?? (() => {});
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0b1020);
    this.scene.fog = new THREE.Fog(0x0b1020, 35, 120);

    this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 500);
    this.camera.position.set(18, 18, 18);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.machineRoots = new Map();
    this.selectedMachineId = null;
    this._isDisposed = false;

    this._buildEnvironment();
    this._bindEvents();
    this.resize();
    this.animate();
  }

  _buildEnvironment() {
    const ambient = new THREE.HemisphereLight(0xb8d8ff, 0x1a233a, 1.5);
    this.scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.5);
    keyLight.position.set(18, 24, 12);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(2048, 2048);
    keyLight.shadow.camera.near = 1;
    keyLight.shadow.camera.far = 100;
    keyLight.shadow.camera.left = -40;
    keyLight.shadow.camera.right = 40;
    keyLight.shadow.camera.top = 40;
    keyLight.shadow.camera.bottom = -40;
    this.scene.add(keyLight);

    const grid = new THREE.GridHelper(120, 60, 0x2a3757, 0x152038);
    grid.position.y = 0.01;
    this.scene.add(grid);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(120, 120),
      new THREE.MeshStandardMaterial({
        color: 0x11182b,
        roughness: 1,
        metalness: 0,
      }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    const axis = new THREE.AxesHelper(8);
    axis.position.y = 0.05;
    this.scene.add(axis);
  }

  _bindEvents() {
    this._onResize = () => this.resize();
    this._onPointerDown = (event) => this.handlePointerDown(event);

    window.addEventListener('resize', this._onResize);
    this.canvas.addEventListener('pointerdown', this._onPointerDown);
  }

  _createMachineNode(machine) {
    const group = new THREE.Group();
    group.position.set(...machine.position);
    group.userData.machineId = machine.id;
    group.userData.baseColor = machine.color;
    group.userData.machineName = machine.name;

    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: machine.color,
      roughness: 0.45,
      metalness: 0.2,
    });

    const body = new THREE.Mesh(
      new THREE.BoxGeometry(machine.size[0], machine.size[1], machine.size[2]),
      bodyMaterial,
    );
    body.position.y = machine.size[1] / 2;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    const accent = new THREE.Mesh(
      new THREE.BoxGeometry(
        machine.size[0] * 0.6,
        Math.max(0.12, machine.size[1] * 0.12),
        machine.size[2] * 0.62,
      ),
      new THREE.MeshStandardMaterial({
        color: 0x0f1321,
        roughness: 0.7,
        metalness: 0.1,
      }),
    );
    accent.position.y = machine.size[1] * 0.96;
    accent.castShadow = true;
    accent.receiveShadow = true;
    group.add(accent);

    const selectionRing = new THREE.Mesh(
      new THREE.TorusGeometry(
        Math.max(machine.size[0], machine.size[2]) * 0.55,
        0.08,
        12,
        48,
      ),
      new THREE.MeshBasicMaterial({ color: 0xffd166 }),
    );
    selectionRing.rotation.x = Math.PI / 2;
    selectionRing.position.y = machine.size[1] + 0.18;
    selectionRing.visible = false;
    selectionRing.renderOrder = 10;
    group.add(selectionRing);

    group.userData.selectionRing = selectionRing;
    group.userData.bodyMaterial = bodyMaterial;
    group.userData.bodyMesh = body;

    return group;
  }

  _setSelection(machineId) {
    if (this.selectedMachineId === machineId) {
      return;
    }

    const previous = this.machineRoots.get(this.selectedMachineId);
    if (previous) {
      previous.userData.selectionRing.visible = false;
      previous.userData.bodyMaterial.emissive.setHex(0x000000);
    }

    this.selectedMachineId = machineId || null;

    const next = this.machineRoots.get(this.selectedMachineId);
    if (next) {
      next.userData.selectionRing.visible = true;
      next.userData.bodyMaterial.emissive.setHex(0x1b1f2c);
    }

    this.onSelectionChange(this.selectedMachineId);
  }

  addMachine(machine) {
    if (this.machineRoots.has(machine.id)) {
      this.removeMachine(machine.id);
    }

    const node = this._createMachineNode(machine);
    this.machineRoots.set(machine.id, node);
    this.scene.add(node);
    return node;
  }

  removeMachine(machineId) {
    const node = this.machineRoots.get(machineId);
    if (!node) {
      return;
    }

    if (this.selectedMachineId === machineId) {
      this._setSelection(null);
    }

    this.scene.remove(node);
    node.traverse((child) => {
      if (child.isMesh) {
        child.geometry?.dispose?.();
        child.material?.dispose?.();
      }
    });
    this.machineRoots.delete(machineId);
  }

  replaceMachines(machines) {
    this.clearMachines();
    machines.forEach((machine) => this.addMachine(machine));
  }

  clearMachines() {
    for (const machineId of [...this.machineRoots.keys()]) {
      this.removeMachine(machineId);
    }
    this._setSelection(null);
  }

  selectMachine(machineId) {
    this._setSelection(machineId);
  }

  handlePointerDown(event) {
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.pointer, this.camera);
    const intersections = this.raycaster.intersectObjects(
      [...this.machineRoots.values()],
      true,
    );

    if (!intersections.length) {
      this._setSelection(null);
      return;
    }

    let current = intersections[0].object;
    while (current && !current.userData.machineId) {
      current = current.parent;
    }

    if (current?.userData.machineId) {
      this._setSelection(current.userData.machineId);
    }
  }

  resize() {
    if (!this.canvas) {
      return;
    }

    const { width, height } = this.canvas.getBoundingClientRect();
    const safeWidth = Math.max(1, width);
    const safeHeight = Math.max(1, height);

    this.camera.aspect = safeWidth / safeHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(safeWidth, safeHeight, false);
  }

  animate() {
    if (this._isDisposed) {
      return;
    }

    this.renderer.render(this.scene, this.camera);
    this._rafId = requestAnimationFrame(() => this.animate());
  }

  dispose() {
    this._isDisposed = true;
    if (this._rafId) {
      cancelAnimationFrame(this._rafId);
    }

    window.removeEventListener('resize', this._onResize);
    this.canvas.removeEventListener('pointerdown', this._onPointerDown);
    this.clearMachines();
    this.renderer.dispose();
  }
}
