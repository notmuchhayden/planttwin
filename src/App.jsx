import { useEffect, useMemo, useRef, useState } from 'react';
import { PlantScene } from './engine/PlantScene';

const initialMachines = [
  {
    id: 'm-001',
    name: 'CNC Router',
    type: 'Machining',
    position: [-8, 0, -3],
    size: [4, 3, 2.2],
    color: 0x7bdff2,
  },
  {
    id: 'm-002',
    name: 'Assembly Cell',
    type: 'Assembly',
    position: [0, 0, 2],
    size: [5, 2.4, 3],
    color: 0x90be6d,
  },
  {
    id: 'm-003',
    name: 'Buffer Rack',
    type: 'Storage',
    position: [8, 0, -1],
    size: [3, 4, 2],
    color: 0xf9c74f,
  },
];

function createMachineId(index) {
  return `m-${String(index + 1).padStart(3, '0')}`;
}

export default function App() {
  const canvasRef = useRef(null);
  const sceneRef = useRef(null);
  const [machines, setMachines] = useState(initialMachines);
  const [selectedId, setSelectedId] = useState(initialMachines[1].id);

  const selectedMachine = useMemo(
    () => machines.find((machine) => machine.id === selectedId) ?? null,
    [machines, selectedId],
  );

  useEffect(() => {
    const scene = new PlantScene(canvasRef.current, {
      onSelectionChange: setSelectedId,
    });

    sceneRef.current = scene;
    scene.replaceMachines(initialMachines);
    scene.selectMachine(initialMachines[1].id);

    return () => {
      scene.dispose();
      sceneRef.current = null;
    };
  }, []);

  const addMachine = () => {
    const index = machines.length;
    const id = createMachineId(index);
    const nextMachine = {
      id,
      name: `Line ${index + 1}`,
      type: 'Conveyor',
      position: [-6 + index * 3.5, 0, 6 - (index % 2) * 4],
      size: [3 + (index % 2), 2 + ((index + 1) % 2) * 0.5, 2.2],
      color: [0xf94144, 0x577590, 0x43aa8b, 0xf8961e][index % 4],
    };

    setMachines((current) => [...current, nextMachine]);
    sceneRef.current?.addMachine(nextMachine);
    setSelectedId(id);
  };

  const resetLayout = () => {
    setMachines(initialMachines);
    sceneRef.current?.replaceMachines(initialMachines);
    sceneRef.current?.selectMachine(initialMachines[1].id);
    setSelectedId(initialMachines[1].id);
  };

  const clearLayout = () => {
    setMachines([]);
    sceneRef.current?.clearMachines();
    setSelectedId('');
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-kicker">Plant Twin</span>
          <h1>Factory layout control</h1>
          <p>
            React handles planning and control. Three.js handles the scene.
          </p>
        </div>

        <section className="panel">
          <div className="panel-head">
            <h2>Layout</h2>
            <span>{machines.length} assets</span>
          </div>

          <div className="button-row">
            <button type="button" onClick={addMachine}>
              Add machine
            </button>
            <button type="button" className="secondary" onClick={resetLayout}>
              Reset demo
            </button>
            <button type="button" className="ghost" onClick={clearLayout}>
              Clear all
            </button>
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2>Selected</h2>
            <span>{selectedMachine ? selectedMachine.id : 'none'}</span>
          </div>

          {selectedMachine ? (
            <dl className="details">
              <div>
                <dt>Name</dt>
                <dd>{selectedMachine.name}</dd>
              </div>
              <div>
                <dt>Type</dt>
                <dd>{selectedMachine.type}</dd>
              </div>
              <div>
                <dt>Position</dt>
                <dd>{selectedMachine.position.join(', ')}</dd>
              </div>
              <div>
                <dt>Size</dt>
                <dd>{selectedMachine.size.join(' × ')}</dd>
              </div>
            </dl>
          ) : (
            <p className="empty-state">
              Click a machine in the viewport to inspect it.
            </p>
          )}
        </section>

        <section className="panel hint">
          <h2>Architecture</h2>
          <p>
            UI events should call engine methods. The engine owns rendering,
            selection, and scene updates.
          </p>
        </section>
      </aside>

      <main className="viewport">
        <div className="viewport-frame">
          <canvas ref={canvasRef} className="scene-canvas" />
          <div className="viewport-badge">
            React UI + vanilla Three.js engine
          </div>
        </div>
      </main>
    </div>
  );
}

