# Plant Twin Plan

## Goal

Build a Siemens Plant Simulation-like web app for 3D factory layout planning.

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
- [x] 객체 선택시 Three.js editor 의 TransformControls Translate Gizmo 가 표시되도록 하기

## Phase 5: Plant Simulation Direction

- [ ] Add the foundation for factory cells, stations, and lines.
- [ ] Make the scene suitable for large layouts with future performance optimizations.
- [ ] Extend the UI for inspection, property editing, and layout management.

## Working Notes

- Prioritize engine-owned 3D interactions and keep React focused on UI panels.
- Prefer incremental implementation so each phase remains testable.
- Keep the palette simple first, then expand it with real assets and metadata.
