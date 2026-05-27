import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';

export class PlantScene {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.onSelectionChange = options.onSelectionChange ?? (() => {});
    this.onGizmoChange = options.onGizmoChange ?? (() => {});
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
    this.gltfLoader = new GLTFLoader();
    this._glbCache = new Map();

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this._groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this.machineRoots = new Map();
    this.selectedMachineId = null;
    this._isDisposed = false;

    // Camera controls state
    this._isDragging = false;
    this._dragMode = null; // null, 'orbit', 'pan'
    this._lastPointer = new THREE.Vector2();
    this._cameraTarget = new THREE.Vector3(0, 0, 0); // World origin
    this._cameraDistance = 0;
    this._cameraAzimuth = 0;
    this._cameraPolar = 0;

    // Initialize camera state from current position
    const cameraToTarget = new THREE.Vector3().subVectors(this.camera.position, this._cameraTarget);
    this._cameraDistance = cameraToTarget.length();
    this._cameraAzimuth = Math.atan2(cameraToTarget.z, cameraToTarget.x);
    this._cameraPolar = Math.acos(cameraToTarget.y / this._cameraDistance);

    // TransformControls
    this.transformControls = new TransformControls(this.camera, this.renderer.domElement);
    this.transformControls.mode = 'translate';
    this.transformControls.space = 'world';
    this.scene.add(this.transformControls.getHelper());
    this.transformControls.addEventListener('change', () => {
      const selected = this.transformControls.object;
      if (selected) {
        const machineId = selected.userData.machineId;
        const position = selected.position.clone();
        this.onGizmoChange(machineId, position);
      }
    });

    // Start hidden until a machine is selected.
    this.transformControls.detach();

    this._buildEnvironment();
    this._bindEvents();
    this._bindResizeObserver();
    this.resize();
    this.animate();

    // Set cursor styles
    this.canvas.style.cursor = 'default';
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
    this._onPointerMove = (event) => this.handlePointerMove(event);
    this._onPointerUp = (event) => this.handlePointerUp(event);
    this._onPointerCancel = (event) => this.handlePointerCancel(event);
    this._onWheel = (event) => this.handleWheel(event);
    this._onContextMenu = (event) => event.preventDefault();
    this._onKeyDown = (event) => {
      const key = event.key.toLowerCase();
      if (['w', 'e', 'r', 'q', 'a'].includes(key)) {
        event.preventDefault();
        if (key === 'w') {
          this.transformControls.mode = 'translate';
        } else if (key === 'e') {
          this.transformControls.mode = 'rotate';
        } else if (key === 'r') {
          this.transformControls.mode = 'scale';
        } else if (key === 'q') {
          this.transformControls.space = 'local';
        } else if (key === 'a') {
          this.transformControls.space = 'world';
        }
      }
    };

    window.addEventListener('resize', this._onResize);
    this.canvas.addEventListener('pointerdown', this._onPointerDown);
    this.canvas.addEventListener('pointermove', this._onPointerMove);
    this.canvas.addEventListener('pointerup', this._onPointerUp);
    this.canvas.addEventListener('pointercancel', this._onPointerCancel);
    this.canvas.addEventListener('wheel', this._onWheel, { passive: false });
    this.canvas.addEventListener('contextmenu', this._onContextMenu);
    window.addEventListener('keydown', this._onKeyDown);

    // Set cursor styles
    this.canvas.style.cursor = 'default';
  }

  _bindResizeObserver() {
    if (typeof ResizeObserver === 'undefined') {
      return;
    }

    const resizeTarget = this.canvas.parentElement;
    if (!resizeTarget) {
      return;
    }

    this._resizeObserver = new ResizeObserver(() => {
      this.resize();
    });
    this._resizeObserver.observe(resizeTarget);
  }

  _createMachineNode(machine) {
    const group = new THREE.Group();
    group.position.set(...machine.position);
    group.userData.machineId = machine.id;
    group.userData.baseColor = machine.color;
    group.userData.machineName = machine.name;
    group.userData.assetKind = machine.kind ?? 'machine';

    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: machine.color,
      roughness: 0.45,
      metalness: 0.2,
    });

    const body = this._createAssetGeometry(machine, bodyMaterial);
    body.position.y = machine.size[1] / 2;
    body.castShadow = true;
    body.receiveShadow = true;
    body.visible = machine.kind !== 'glb';
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

    if (machine.kind === 'glb') {
      this._attachGlbModel(group, machine);
    }

    return group;
  }

  _createAssetGeometry(machine, material) {
    const [width, height, depth] = machine.size;

    if (machine.kind === 'primitive') {
      if (machine.primitiveType === 'sphere') {
        return new THREE.Mesh(
          new THREE.SphereGeometry(Math.max(width, height, depth) / 2, 24, 16),
          material,
        );
      }

      if (machine.primitiveType === 'cylinder') {
        return new THREE.Mesh(
          new THREE.CylinderGeometry(width / 2, width / 2, height, 24),
          material,
        );
      }
    }

    return new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
  }

  _attachGlbModel(group, machine) {
    if (!machine.modelUrl) {
      return;
    }

    const token = Symbol('gltf-load');
    group.userData.loadToken = token;

    this._getCachedGlb(machine.modelUrl)
      .then((gltf) => {
        if (this._isDisposed || group.userData.loadToken !== token) {
          return;
        }

        const model = gltf.scene || gltf.scenes?.[0];
        if (!model) {
          return;
        }

        const bounds = new THREE.Box3().setFromObject(model);
        const size = bounds.getSize(new THREE.Vector3());
        const targetSize = new THREE.Vector3(...machine.size);
        const scale = Math.min(
          targetSize.x / Math.max(size.x, 0.0001),
          targetSize.y / Math.max(size.y, 0.0001),
          targetSize.z / Math.max(size.z, 0.0001),
        );
        const center = bounds.getCenter(new THREE.Vector3());

        model.position.sub(center.multiplyScalar(scale));
        model.scale.setScalar(scale);

        if (group.userData.bodyMesh) {
          group.userData.bodyMesh.visible = false;
        }
        group.add(cloneSkeleton(model));
      })
      .catch((error) => {
        if (this._isDisposed || group.userData.loadToken !== token) {
          return;
        }

        console.warn(`Failed to load GLB asset: ${machine.modelUrl}`, error);
        if (group.userData.bodyMesh) {
          group.userData.bodyMesh.visible = true;
        }
      });
  }

  _getCachedGlb(modelUrl) {
    if (this._glbCache.has(modelUrl)) {
      return this._glbCache.get(modelUrl);
    }

    const promise = this.gltfLoader.loadAsync(modelUrl);
    this._glbCache.set(modelUrl, promise);
    return promise;
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

    // Detach gizmo when nothing is selected
    if (!this.selectedMachineId) {
      this.transformControls.detach();
    } else {
      // Attach gizmo to the selected machine root
      const selectedNode = this.machineRoots.get(this.selectedMachineId);
      this.transformControls.attach(selectedNode);
    }
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

  addAsset(asset, position) {
    const nextAsset = {
      kind: asset.kind ?? 'machine',
      primitiveType: asset.primitiveType,
      modelUrl: asset.modelUrl,
      id: asset.id,
      name: asset.name,
      position: position ?? asset.position ?? [0, 0, 0],
      size: asset.size ?? [3, 3, 3],
      color: asset.color ?? 0x7bdff2,
    };

    return this.addMachine(nextAsset);
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
    // Check if we're clicking on a machine
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.pointer, this.camera);
    const intersections = this.raycaster.intersectObjects(
      [...this.machineRoots.values()],
      true,
    );

    // If we clicked on a machine, select it and return immediately
    if (intersections.length > 0) {
      let current = intersections[0].object;
      while (current && !current.userData.machineId) {
        current = current.parent;
      }

      if (current?.userData.machineId) {
        this._setSelection(current.userData.machineId);
        return;
      }
    }

    // Check if we're interacting with the TransformControls gizmo
    if (this.transformControls.object && this.transformControls.axis !== null) {
      return; // Prevent empty-space interaction
    }

    // If we didn't click on a machine, clear selection
    this._setSelection(null);

    // Start dragging only for left/right button on empty space
    // Only start drag state for left mouse button (0) or right mouse button (2)
    if (event.button === 0 || event.button === 2) {
      this._isDragging = true;
      this._lastPointer.set(event.clientX, event.clientY);

      // Set drag mode based on button
      if (event.button === 2) { // Right mouse button - orbit
        this._dragMode = 'orbit';
        this.canvas.style.cursor = 'grab';
        event.preventDefault(); // Prevent context menu
      } else if (event.button === 0) { // Left mouse button - pan
        this._dragMode = 'pan';
        this.canvas.style.cursor = 'grabbing';
      }
    }
  }

  handlePointerMove(event) {
    if (!this._isDragging || !this._dragMode) return;

    const deltaX = event.clientX - this._lastPointer.x;
    const deltaY = event.clientY - this._lastPointer.y;
    this._lastPointer.set(event.clientX, event.clientY);

    if (this._dragMode === 'orbit') { // Right mouse button - orbit
      this._cameraAzimuth += deltaX * 0.01;
      this._cameraPolar -= deltaY * 0.01;
      this._cameraPolar = Math.max(0.01, Math.min(Math.PI - 0.01, this._cameraPolar));
      this._updateCameraPosition();
    } else if (this._dragMode === 'pan') { // Left mouse button - pan
      const panSpeed = 0.002;
      const cameraPosition = this.camera.position;
      const target = this._cameraTarget;

      const forward = new THREE.Vector3()
        .subVectors(target, cameraPosition)
        .setY(0);
      if (forward.lengthSq() === 0) {
        forward.set(0, 0, -1);
      }
      forward.normalize();

      const right = new THREE.Vector3()
        .crossVectors(new THREE.Vector3(0, 1, 0), forward)
        .normalize();

      target.x += right.x * deltaX * panSpeed * this._cameraDistance;
      target.z += right.z * deltaX * panSpeed * this._cameraDistance;
      target.x += forward.x * deltaY * panSpeed * this._cameraDistance;
      target.z += forward.z * deltaY * panSpeed * this._cameraDistance;

      this._updateCameraPosition();
    }
  }

  handlePointerUp(event) {
    this._isDragging = false;
    this._dragMode = null;
    this.canvas.style.cursor = 'default';
  }

  handlePointerCancel(event) {
    this._isDragging = false;
    this._dragMode = null;
    this.canvas.style.cursor = 'default';
  }

  handleWheel(event) {
    event.preventDefault();

    const zoomFactor = Math.exp(event.deltaY * 0.001);
    const minDistance = 6;
    const maxDistance = 140;

    this._cameraDistance = THREE.MathUtils.clamp(
      this._cameraDistance * zoomFactor,
      minDistance,
      maxDistance,
    );
    this._updateCameraPosition();
  }

  screenToGroundPoint(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);

    const hit = new THREE.Vector3();
    return this.raycaster.ray.intersectPlane(this._groundPlane, hit) ? hit : null;
  }

  _updateCameraPosition() {
    const target = this._cameraTarget;
    const distance = this._cameraDistance;

    const x = target.x + distance * Math.sin(this._cameraPolar) * Math.cos(this._cameraAzimuth);
    const y = target.y + distance * Math.cos(this._cameraPolar);
    const z = target.z + distance * Math.sin(this._cameraPolar) * Math.sin(this._cameraAzimuth);

    this.camera.position.set(x, y, z);
    this.camera.lookAt(target);
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
    this._resizeObserver?.disconnect();
    this.canvas.removeEventListener('pointerdown', this._onPointerDown);
    this.canvas.removeEventListener('pointermove', this._onPointerMove);
    this.canvas.removeEventListener('pointerup', this._onPointerUp);
    this.canvas.removeEventListener('pointercancel', this._onPointerCancel);
    this.canvas.removeEventListener('wheel', this._onWheel);
    this.canvas.removeEventListener('contextmenu', this._onContextMenu);
    window.removeEventListener('keydown', this._onKeyDown);
    this.clearMachines();
    this.renderer.dispose();
    this.scene.remove(this.transformControls.getHelper()); // Remove helper from scene
    this.transformControls.dispose();
  }
}
