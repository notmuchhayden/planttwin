function cloneVector3(value, fallback = [0, 0, 0]) {
  if (!Array.isArray(value) || value.length < 3) {
    return [...fallback];
  }

  return [value[0] ?? fallback[0], value[1] ?? fallback[1], value[2] ?? fallback[2]];
}

function cloneVectorPath(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((point) => cloneVector3(point));
}

function normalizePlacementEntity(entity, defaults = {}) {
  const next = { ...entity };
  next.kind = next.kind ?? defaults.kind;
  next.name = next.name ?? defaults.name;
  next.position = cloneVector3(next.position, defaults.position ?? [0, 0, 0]);
  next.size = cloneVector3(next.size, defaults.size ?? [3, 3, 3]);
  next.color = next.color ?? defaults.color ?? 0x7bdff2;
  return next;
}

function normalizeLineEntity(entity, defaults = {}) {
  const next = { ...entity };
  next.kind = next.kind ?? 'line';
  next.name = next.name ?? defaults.name;
  next.fromId = next.fromId ?? defaults.fromId ?? null;
  next.toId = next.toId ?? defaults.toId ?? null;
  next.points = cloneVectorPath(next.points ?? next.path ?? defaults.points);
  next.path = cloneVectorPath(next.path ?? next.points ?? defaults.path);
  next.position = cloneVector3(next.position, defaults.position ?? [0, 0, 0]);
  next.size = cloneVector3(next.size, defaults.size ?? [0, 0, 0]);
  next.color = next.color ?? defaults.color ?? 0x7bdff2;
  next.thickness = next.thickness ?? defaults.thickness ?? 0.35;
  return next;
}

class Editor {
  constructor() {
    this.machineRoots = new Map();
    this.cellRoots = new Map();
    this.stationRoots = new Map();
    this.lineRoots = new Map();
    this.selectedMachineId = null;
    this.selectedEntityKind = null;
    this.selectedEntityId = null;
    this.listeners = [];
  }

  subscribe(listener) {
    this.listeners.push(listener);
  }

  unsubscribe(listener) {
    this.listeners = this.listeners.filter((l) => l !== listener);
  }

  notifyListeners() {
    const snapshot = this.getLayoutSnapshot();
    this.listeners.forEach((listener) => listener(this.machineRoots, this.selectedMachineId, snapshot));
  }

  _getStore(kind) {
    if (kind === 'machine') {
      return this.machineRoots;
    }
    if (kind === 'cell') {
      return this.cellRoots;
    }
    if (kind === 'station') {
      return this.stationRoots;
    }
    if (kind === 'line') {
      return this.lineRoots;
    }

    throw new Error(`Unsupported entity kind: ${kind}`);
  }

  _normalizeEntity(kind, entity, position) {
    if (kind === 'line') {
      return normalizeLineEntity({ ...entity, position: position ?? entity.position }, { kind, position });
    }

    return normalizePlacementEntity({ ...entity, position: position ?? entity.position }, { kind, position });
  }

  _upsert(kind, entity, position) {
    const store = this._getStore(kind);
    const nextEntity = this._normalizeEntity(kind, entity, position);

    if (store.has(nextEntity.id)) {
      store.delete(nextEntity.id);
    }

    store.set(nextEntity.id, nextEntity);
    this.notifyListeners();
    return nextEntity;
  }

  _remove(kind, entityId) {
    const store = this._getStore(kind);
    if (!store.has(entityId)) {
      return;
    }

    if (kind === this.selectedEntityKind && this.selectedEntityId === entityId) {
      this.selectedEntityKind = null;
      this.selectedEntityId = null;
      this.selectedMachineId = null;
    }

    store.delete(entityId);
    this.notifyListeners();
  }

  _replace(kind, entities) {
    const store = this._getStore(kind);
    const nextStore = new Map();

    for (const entity of entities) {
      const normalized = this._normalizeEntity(kind, entity);
      nextStore.set(normalized.id, normalized);
    }

    store.clear();
    for (const [id, entity] of nextStore.entries()) {
      store.set(id, entity);
    }

    if (kind === this.selectedEntityKind && this.selectedEntityId && !store.has(this.selectedEntityId)) {
      this.selectedEntityKind = null;
      this.selectedEntityId = null;
      this.selectedMachineId = null;
    }

    this.notifyListeners();
  }

  _clear(kind) {
    const store = this._getStore(kind);
    store.clear();

    if (kind === this.selectedEntityKind) {
      this.selectedEntityKind = null;
      this.selectedEntityId = null;
      this.selectedMachineId = null;
    }

    this.notifyListeners();
  }

  _select(kind, entityId) {
    this.selectedEntityKind = kind;
    this.selectedEntityId = entityId ?? null;
    this.selectedMachineId = kind === 'machine' ? entityId ?? null : null;
    this.notifyListeners();
  }

  addMachine(machine) {
    return this._upsert('machine', machine);
  }

  addCell(cell) {
    return this._upsert('cell', cell);
  }

  addStation(station) {
    return this._upsert('station', station);
  }

  addLine(line) {
    return this._upsert('line', line);
  }

  addAsset(asset, position) {
    return this.addMachine({
      kind: asset.kind ?? 'machine',
      primitiveType: asset.primitiveType,
      modelUrl: asset.modelUrl,
      id: asset.id,
      name: asset.name,
      position: position ?? asset.position ?? [0, 0, 0],
      size: asset.size ?? [3, 3, 3],
      color: asset.color ?? 0x7bdff2,
    });
  }

  removeMachine(machineId) {
    this._remove('machine', machineId);
  }

  removeCell(cellId) {
    this._remove('cell', cellId);
  }

  removeStation(stationId) {
    this._remove('station', stationId);
  }

  removeLine(lineId) {
    this._remove('line', lineId);
  }

  replaceMachines(machines) {
    this._replace('machine', machines);
  }

  replaceCells(cells) {
    this._replace('cell', cells);
  }

  replaceStations(stations) {
    this._replace('station', stations);
  }

  replaceLines(lines) {
    this._replace('line', lines);
  }

  clearMachines() {
    this._clear('machine');
  }

  clearCells() {
    this._clear('cell');
  }

  clearStations() {
    this._clear('station');
  }

  clearLines() {
    this._clear('line');
  }

  clearLayout() {
    this.machineRoots.clear();
    this.cellRoots.clear();
    this.stationRoots.clear();
    this.lineRoots.clear();
    this.selectedMachineId = null;
    this.selectedEntityKind = null;
    this.selectedEntityId = null;
    this.notifyListeners();
  }

  selectMachine(machineId) {
    this._select('machine', machineId);
  }

  selectCell(cellId) {
    this._select('cell', cellId);
  }

  selectStation(stationId) {
    this._select('station', stationId);
  }

  selectLine(lineId) {
    this._select('line', lineId);
  }

  updateMachinePosition(machineId, position) {
    if (!this.machineRoots.has(machineId)) {
      return;
    }

    this.machineRoots.get(machineId).position = cloneVector3(position);
    this.notifyListeners();
  }

  updateCellPosition(cellId, position) {
    if (!this.cellRoots.has(cellId)) {
      return;
    }

    this.cellRoots.get(cellId).position = cloneVector3(position);
    this.notifyListeners();
  }

  updateStationPosition(stationId, position) {
    if (!this.stationRoots.has(stationId)) {
      return;
    }

    this.stationRoots.get(stationId).position = cloneVector3(position);
    this.notifyListeners();
  }

  updateLinePath(lineId, path) {
    if (!this.lineRoots.has(lineId)) {
      return;
    }

    const normalizedPath = cloneVectorPath(path);
    const line = this.lineRoots.get(lineId);
    line.path = normalizedPath;
    line.points = cloneVectorPath(path);
    this.notifyListeners();
  }

  getMachine(machineId) {
    return this.machineRoots.get(machineId);
  }

  getCell(cellId) {
    return this.cellRoots.get(cellId);
  }

  getStation(stationId) {
    return this.stationRoots.get(stationId);
  }

  getLine(lineId) {
    return this.lineRoots.get(lineId);
  }

  getSelectedMachine() {
    return this.machineRoots.get(this.selectedMachineId);
  }

  getSelectedEntity() {
    if (!this.selectedEntityKind || !this.selectedEntityId) {
      return null;
    }

    return this._getStore(this.selectedEntityKind).get(this.selectedEntityId) ?? null;
  }

  getMachines() {
    return Array.from(this.machineRoots.values());
  }

  getCells() {
    return Array.from(this.cellRoots.values());
  }

  getStations() {
    return Array.from(this.stationRoots.values());
  }

  getLines() {
    return Array.from(this.lineRoots.values());
  }

  getLayoutSnapshot() {
    return {
      machines: this.getMachines(),
      cells: this.getCells(),
      stations: this.getStations(),
      lines: this.getLines(),
      selected: {
        kind: this.selectedEntityKind,
        id: this.selectedEntityId,
      },
    };
  }
}

export default Editor;
