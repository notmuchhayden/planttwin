# Plant Twin Plan

## Goal

Build a web-based 3D factory layout and digital twin editor, Siemens Plant Simulation-like.

## Phase 1: Core Input

- [x] Right mouse button drag on empty viewport rotates the camera in orbit mode.
- [x] Left mouse button drag on empty viewport pans the viewport.
- [x] Keep input handling isolated from React UI so the 3D engine owns camera interaction.

## Phase 2: Asset Palette

- [x] Add a bottom Asset Palette tab to the UI.
- [x] Show thumbnail tiles for:
  - GLB assets
  - primitive assets such as Box, Sphere, and Cylinder
- [x] Support drag and drop from the palette into the viewport.
- [x] When dropped into the viewport, create and display the selected 3D asset at the drop location.

## Phase 3: GLB Support

- [x] Implement GLB loading in the Three.js engine.
- [x] Cache loaded assets so repeated placement is fast.
- [x] Add thumbnail generation or thumbnail mapping for GLB assets.

## Phase 4: Transform Gizmo

- [x] Show the Three.js editor-style TransformControls translate gizmo for selected objects.
- [x] Add box selection.

## Phase 5: Structure Refactor

- [x] Split `PlantScene.js` into `Viewport.js` and a thin compatibility wrapper, following the Three.js editor structure.
- [x] Make `Editor.js` the source of truth for scenegraph data, including machines, transforms, selection, and layout state.
- [x] Keep `Viewport.js` focused on camera, pointer, selection, and other screen interaction behaviors only.
- [x] Move object lifecycle and scenegraph mutations out of the viewport layer and into the editor model.
- [x] Preserve the `App.jsx` entrypoint through a compatibility wrapper so the UI wiring stays stable.
- [x] Verify the refactor with a build.

## Phase 6: File Loading

- [x] Add a `+` button in the Asset Palette to load local `.glb` files and cache them for later placement.
- [x] Add the foundation for factory cells, stations, and lines.
- [ ] Make the scene suitable for large layouts with future performance optimizations.
- [ ] Extend the UI for inspection, property editing, and layout management.

## Working Notes

- Prioritize engine-owned 3D interactions and keep React focused on UI panels.
- Prefer incremental implementation so each phase remains testable.
- Keep the palette simple first, then expand it with real assets and metadata.
