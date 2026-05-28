class Editor {
  constructor() {
    this.machineRoots = new Map();
    this.selectedMachineId = null;
    this.listeners = [];
  }

  subscribe(listener) {
    this.listeners.push(listener);
  }

  unsubscribe(listener) {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  notifyListeners() {
    this.listeners.forEach(listener => listener(this.machineRoots, this.selectedMachineId));
  }

  addMachine(machine) {
    if (this.machineRoots.has(machine.id)) {
      this.removeMachine(machine.id);
    }

    this.machineRoots.set(machine.id, machine);
    this.notifyListeners();
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

    this.addMachine(nextAsset);
  }

  removeMachine(machineId) {
    if (this.machineRoots.has(machineId)) {
      if (this.selectedMachineId === machineId) {
        this.selectedMachineId = null;
      }
      this.machineRoots.delete(machineId);
      this.notifyListeners();
    }
  }

  replaceMachines(machines) {
    this.clearMachines();
    machines.forEach(machine => this.addMachine(machine));
  }

  clearMachines() {
    this.selectedMachineId = null;
    this.machineRoots.clear();
    this.notifyListeners();
  }

  selectMachine(machineId) {
    this.selectedMachineId = machineId;
    this.notifyListeners();
  }

  updateMachinePosition(machineId, position) {
    if (this.machineRoots.has(machineId)) {
      this.machineRoots.get(machineId).position = position;
      this.notifyListeners();
    }
  }

  getMachine(machineId) {
    return this.machineRoots.get(machineId);
  }

  getSelectedMachine() {
    return this.machineRoots.get(this.selectedMachineId);
  }

  getMachines() {
    return Array.from(this.machineRoots.values());
  }
}

export default Editor;
