# Future Development & Enhancements

This document outlines potential features, improvements, and technical debt to address in future iterations of the OSS Sample Player.

## Features

### Audio Engine
- [ ] **Looping**: Add ability to define loop regions for samples.
- [ ] **Pitch/Speed Control**: Real-time pitch shifting and time-stretching.
- [ ] **Master Effects**: Global compressor, limiter, or EQ on the master output.
- [ ] **Recording**: Ability to record the output performance to a downloadable audio file.
- [ ] **Polyphony**: Allow multiple samples to play simultaneously (currently monophonic per player instance, though dub effects add layers).

### Interface (UI/UX)
- [ ] **Zoom & Scroll**: Allow zooming into the waveform for precise trigger placement.
- [ ] **Custom Key Mapping**: Allow users to rebind keys (currently fixed to 1-4 and Space).
- [x] **Keyboard Effects Control**: Map keys to trigger effects momentarily (hold to activate, release to deactivate).
- [ ] **Theming**: Light/Dark mode toggle or custom color themes.
- [ ] **Mobile Optimization**: Better touch controls and layout for mobile devices.
- [ ] **Visualizer**: Enhanced real-time frequency visualizer.

### Data & Storage
- [ ] **Export/Import**: Save and load trigger configurations to/from a JSON file (sharing presets).
- [ ] **Cloud Sync**: Optional integration to sync settings across devices.
- [ ] **Sample Library Management**: Better organization (folders, tags) for the sample browser.

## Technical Improvements

### Code Quality
- [ ] **TypeScript Migration**: Convert `script.js` to TypeScript for better type safety and maintainability.
- [ ] **Testing**: Add unit tests for the audio engine and logic.
- [ ] **Modularization**: Break `script.js` into smaller modules (e.g., `AudioEngine`, `UIManager`, `StorageManager`).

### Infrastructure
- [ ] **Build System**: Set up a bundler (Vite/Webpack) for better asset management and minification.
- [ ] **CI/CD**: specific workflows for automated testing and deployment.
