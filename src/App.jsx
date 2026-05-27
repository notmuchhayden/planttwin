import { useEffect, useMemo, useRef, useState } from 'react';
import { PlantScene } from './engine/PlantScene';

const initialAssets = [
  {
    id: 'm-001',
    name: 'CNC Router',
    kind: 'machine',
    primitiveType: 'box',
    position: [-8, 0, -3],
    size: [4, 3, 2.2],
    color: 0x7bdff2,
  },
  {
    id: 'm-002',
    name: 'Assembly Cell',
    kind: 'machine',
    primitiveType: 'box',
    position: [0, 0, 2],
    size: [5, 2.4, 3],
    color: 0x90be6d,
  },
  {
    id: 'm-003',
    name: 'Buffer Rack',
    kind: 'machine',
    primitiveType: 'box',
    position: [8, 0, -1],
    size: [3, 4, 2],
    color: 0xf9c74f,
  },
];

const paletteTabs = [
  {
    id: 'primitives',
    label: 'Primitives',
    items: [
      {
        id: 'primitive-box',
        name: 'Box',
        kind: 'primitive',
        primitiveType: 'box',
        size: [3, 2.2, 2],
        color: 0x7bdff2,
        summary: 'Basic block',
        thumbnail: svgThumbnail({
          title: 'BOX',
          subtitle: 'Primitive',
          fill: '#7bdff2',
          accent: '#101826',
          variant: 'box',
        }),
      },
      {
        id: 'primitive-sphere',
        name: 'Sphere',
        kind: 'primitive',
        primitiveType: 'sphere',
        size: [2.6, 2.6, 2.6],
        color: 0x90be6d,
        summary: 'Round asset',
        thumbnail: svgThumbnail({
          title: 'SPHERE',
          subtitle: 'Primitive',
          fill: '#90be6d',
          accent: '#101826',
          variant: 'sphere',
        }),
      },
      {
        id: 'primitive-cylinder',
        name: 'Cylinder',
        kind: 'primitive',
        primitiveType: 'cylinder',
        size: [2.4, 3, 2.4],
        color: 0xf9c74f,
        summary: 'Vertical asset',
        thumbnail: svgThumbnail({
          title: 'CYLINDER',
          subtitle: 'Primitive',
          fill: '#f9c74f',
          accent: '#101826',
          variant: 'cylinder',
        }),
      },
    ],
  },
  {
    id: 'glb',
    label: 'GLB',
    items: [
      {
        id: 'glb-template',
        name: 'GLB Template',
        kind: 'glb',
        modelUrl: '/models/factory-module.glb',
        size: [4, 3, 4],
        color: 0xb8d8ff,
        summary: 'Cached GLB sample',
        thumbnail: svgThumbnail({
          title: 'GLB',
          subtitle: 'factory-module.glb',
          fill: '#b8d8ff',
          accent: '#101826',
          variant: 'box',
        }),
      },
    ],
  },
];

function createAssetId(index) {
  return `a-${String(index + 1).padStart(3, '0')}`;
}

function createPlacedAsset(template, index, position) {
  return {
    ...template,
    id: createAssetId(index),
    position,
  };
}

function svgThumbnail({
  title,
  subtitle,
  fill = '#7bdff2',
  accent = '#101826',
  variant = 'box',
}) {
  const shape =
    variant === 'sphere'
      ? `<circle cx="64" cy="58" r="26" fill="${fill}" />`
      : variant === 'cylinder'
        ? `<ellipse cx="64" cy="35" rx="28" ry="10" fill="${fill}" opacity="0.95" /><rect x="36" y="35" width="56" height="40" rx="14" fill="${fill}" /><ellipse cx="64" cy="75" rx="28" ry="10" fill="${accent}" opacity="0.8" />`
        : `<rect x="34" y="30" width="60" height="46" rx="10" fill="${fill}" />`;

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="180" height="120" viewBox="0 0 180 120">
      <defs>
        <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="#18243a" />
          <stop offset="100%" stop-color="#0d1320" />
        </linearGradient>
        <linearGradient id="shine" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0.35" />
          <stop offset="100%" stop-color="#ffffff" stop-opacity="0" />
        </linearGradient>
      </defs>
      <rect width="180" height="120" rx="20" fill="url(#bg)" />
      <rect x="12" y="12" width="156" height="96" rx="16" fill="url(#shine)" opacity="0.18" />
      ${shape}
      <text x="18" y="26" fill="#dbe8f7" font-family="Segoe UI, Arial, sans-serif" font-size="16" font-weight="700">${title}</text>
      <text x="18" y="98" fill="#9eb0c9" font-family="Segoe UI, Arial, sans-serif" font-size="10">${subtitle}</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg.trim())}`;
}

function getPaletteItems(tabId) {
  return paletteTabs.find((tab) => tab.id === tabId)?.items ?? [];
}

export default function App() {
  const canvasRef = useRef(null);
  const sceneRef = useRef(null);
  const nextAssetIndexRef = useRef(initialAssets.length);
  const [assets, setAssets] = useState(initialAssets);
  const [selectedId, setSelectedId] = useState(initialAssets[1].id);
  const [activePaletteTab, setActivePaletteTab] = useState('primitives');
  const [isPaletteOpen, setIsPaletteOpen] = useState(true);

  const selectedAsset = useMemo(
    () => assets.find((asset) => asset.id === selectedId) ?? null,
    [assets, selectedId],
  );

  const visiblePaletteItems = useMemo(
    () => getPaletteItems(activePaletteTab),
    [activePaletteTab],
  );

  useEffect(() => {
    const scene = new PlantScene(canvasRef.current, {
      onSelectionChange: setSelectedId,
    });

    sceneRef.current = scene;
    scene.replaceMachines(initialAssets);
    scene.selectMachine(initialAssets[1].id);

    return () => {
      scene.dispose();
      sceneRef.current = null;
    };
  }, []);

  const placeAsset = (template, position) => {
    const scene = sceneRef.current;
    if (!scene) {
      return;
    }

    const nextAsset = createPlacedAsset(template, nextAssetIndexRef.current, position);
    nextAssetIndexRef.current += 1;
    scene.addAsset(nextAsset, position);
    setAssets((current) => [...current, nextAsset]);
    setSelectedId(nextAsset.id);
  };

  const addMachine = () => {
    const index = nextAssetIndexRef.current;
    const nextTemplate = {
      name: `Line ${index + 1}`,
      kind: 'primitive',
      primitiveType: 'box',
      position: [-6 + index * 3.5, 0, 6 - (index % 2) * 4],
      size: [3, 2.5, 2.2],
      color: [0xf94144, 0x577590, 0x43aa8b, 0xf8961e][index % 4],
    };

    placeAsset(nextTemplate, nextTemplate.position);
  };

  const resetLayout = () => {
    nextAssetIndexRef.current = initialAssets.length;
    setAssets(initialAssets);
    sceneRef.current?.replaceMachines(initialAssets);
    sceneRef.current?.selectMachine(initialAssets[1].id);
    setSelectedId(initialAssets[1].id);
  };

  const clearLayout = () => {
    nextAssetIndexRef.current = 0;
    setAssets([]);
    sceneRef.current?.clearMachines();
    setSelectedId('');
  };

  const handlePaletteDragStart = (event, item) => {
    event.dataTransfer.effectAllowed = 'copy';
    event.dataTransfer.setData('application/json', JSON.stringify(item));
  };

  const handleViewportDragOver = (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  };

  const handleViewportDrop = (event) => {
    event.preventDefault();

    const rawItem = event.dataTransfer.getData('application/json');
    if (!rawItem) {
      return;
    }

    let template;
    try {
      template = JSON.parse(rawItem);
    } catch {
      return;
    }

    const scene = sceneRef.current;
    if (!scene) {
      return;
    }

    const hit = scene.screenToGroundPoint(event.clientX, event.clientY);
    const position = hit ? [hit.x, 0, hit.z] : [0, 0, 0];
    placeAsset(template, position);
  };

  return (
    <div className="app-shell">
      <div className="workspace">
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
              <span>{assets.length} assets</span>
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
              <span>{selectedAsset ? selectedAsset.id : 'none'}</span>
            </div>

            {selectedAsset ? (
              <dl className="details">
                <div>
                  <dt>Name</dt>
                  <dd>{selectedAsset.name}</dd>
                </div>
                <div>
                  <dt>Kind</dt>
                  <dd>{selectedAsset.kind}</dd>
                </div>
                <div>
                  <dt>Type</dt>
                  <dd>{selectedAsset.primitiveType ?? 'n/a'}</dd>
                </div>
                <div>
                  <dt>Position</dt>
                  <dd>{selectedAsset.position.join(', ')}</dd>
                </div>
                <div>
                  <dt>Size</dt>
                  <dd>{selectedAsset.size.join(' × ')}</dd>
                </div>
                {selectedAsset.modelUrl ? (
                  <div>
                    <dt>Model</dt>
                    <dd>{selectedAsset.modelUrl}</dd>
                  </div>
                ) : null}
              </dl>
            ) : (
              <p className="empty-state">
                Click or drop an asset in the viewport to inspect it.
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

        <div className="content-stack">
          <main className="viewport">
            <div
              className="viewport-frame"
              onDragOver={handleViewportDragOver}
              onDrop={handleViewportDrop}
            >
              <canvas ref={canvasRef} className="scene-canvas" />
              <div className="viewport-badge">
                React UI + vanilla Three.js engine
              </div>
            </div>
          </main>

          <footer className={`asset-palette ${isPaletteOpen ? 'open' : 'closed'}`}>
            <button
              type="button"
              className="asset-palette-header"
              aria-expanded={isPaletteOpen}
              aria-controls="asset-palette-body"
              onClick={() => setIsPaletteOpen((current) => !current)}
            >
              <div className="asset-palette-header-copy">
                <span className="palette-kicker">Asset Palette</span>
                <h2>Drag items into the viewport</h2>
                <p>
                  Primitive tiles are ready now. GLB tiles are wired for later asset
                  drops.
                </p>
              </div>
              <span className="palette-header-caret" aria-hidden="true">
                {isPaletteOpen ? '▾' : '▴'}
              </span>
            </button>

            <div
              id="asset-palette-body"
              className="asset-palette-body"
              aria-hidden={!isPaletteOpen}
            >
              <div className="palette-tabs" role="tablist" aria-label="Asset palette">
                {paletteTabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={activePaletteTab === tab.id}
                    className={`palette-tab ${activePaletteTab === tab.id ? 'active' : ''}`}
                    onClick={() => setActivePaletteTab(tab.id)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="palette-grid">
                {visiblePaletteItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    draggable
                    className="palette-card"
                    onDragStart={(event) => handlePaletteDragStart(event, item)}
                  >
                    <span className={`palette-thumb thumb-${item.kind} thumb-${item.primitiveType ?? 'glb'}`}>
                      <img
                        className="palette-thumb-image"
                        src={item.thumbnail}
                        alt=""
                        aria-hidden="true"
                      />
                      <span className="palette-thumb-label">
                        {item.kind === 'glb' ? 'GLB' : item.primitiveType.toUpperCase()}
                      </span>
                    </span>
                    <span className="palette-card-copy">
                      <strong>{item.name}</strong>
                      <small>{item.summary}</small>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
