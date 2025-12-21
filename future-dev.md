# Future Development & Enhancements

This document outlines potential features, improvements, and technical debt to address in future iterations of the OSS Sample Player.

> **Now powered by npm/Vite** - Full access to npm ecosystem for packages!

---

## ✅ Recently Completed
- [x] **Selection Tool**: Click and drag on waveform to select a region, with draggable handles
- [x] **Play Selection**: Button to play only the selected region
- [x] **Start Pad**: Dedicated pad to retrigger from 0:00 (keyboard: `0`)
- [x] **Hardware UI Redesign**: Realistic MPC/sampler-inspired styling with brushed metal, LCD waveform, rubber pads
- [x] **Smooth Fade-out**: Eliminated audio clicks at end of playback
- [x] **Smooth Fade-in**: Eliminated audio clicks at start of playback
- [x] **Enlarged Interface**: Bigger pads, waveform, and controls for better usability
- [x] **Selection Hint**: Tooltip on waveform hover to guide users
- [x] **Countdown Timer**: Shows remaining time instead of elapsed
- [x] **Loop Selection**: Toggle to loop the selected region continuously
- [x] **Effects Bank Tabs**: DUB FX, PITCH, MASTER tabs for organized effects
- [x] **Pitch/Speed Control**: Fader from 0.5× to 2.0× with centered 1.0× and reset button
- [x] **Speed-Aware Triggers**: Trigger points work correctly at any playback speed
- [x] **Master Volume Control**: 0-100% volume fader with green LED glow and reset button
- [x] **VU Meters**: LED bar stereo meters with peak hold
- [x] **npm/Vite Conversion**: Modern build system, ES modules, hot reload
- [x] **Coolify/Nixpacks Deploy**: Auto-deploy from git push
- [x] **Filter Sweeps Tab**: Lowpass/Highpass filters with resonance, plus Flanger, Phaser, Chorus, Tremolo (Tuna.js)

---

## 🎯 High Priority Features

### Audio Engine
- [ ] **Chop Mode**: Auto-divide sample into equal segments (4, 8, 16 slices)
- [ ] **BPM Detection**: Analyze sample tempo for synced loops
- [ ] **Recording**: Capture performance output to downloadable WAV/MP3

### Selection Enhancements
- [ ] **Multiple Selections**: Save multiple regions as "cue points" 
- [ ] **Selection to Trigger**: Convert current selection into a trigger point
- [ ] **Waveform Click-to-Seek**: Click anywhere to jump playhead (not just create selection)
- [ ] **Fine-Tune Handles**: Keyboard arrow keys to nudge selection ±10ms

### Effects
- [ ] **Effect Intensity Knobs**: Adjustable wet/dry, feedback, delay time per effect
- [ ] **Vinyl Stop/Start**: Pitch down/up effect for DJ-style stops
- [ ] **Stutter/Gate**: Rhythmic chopping effect

---

## 🎨 UI/UX Improvements

### Visual Enhancements
- [ ] **VU Meter**: Real-time level meter next to waveform
- [ ] **LED Indicators**: Glowing LEDs when pads are triggered
- [ ] **Pad Velocity Colors**: Pads glow brighter based on audio intensity
- [ ] **Waveform Zoom**: Pinch/scroll to zoom into waveform for precision
- [ ] **Stereo Waveform**: Show L/R channels separately

### Layout Options
- [ ] **Compact Mode**: Minimal layout for smaller screens
- [ ] **Fullscreen Mode**: Theater mode for performances
- [ ] **Vertical Layout**: Mobile-friendly orientation
- [ ] **Customizable Pad Count**: 4, 8, or 16 trigger pads

### Theming
- [ ] **Color Themes**: Classic Roland, Akai MPC, Teenage Engineering, Neon
- [ ] **Custom Colors**: User-defined accent colors
- [ ] **Light Mode**: High-contrast option for bright environments

---

## 🔧 Technical Improvements

### Code Quality
- [ ] **TypeScript Migration**: Better type safety and maintainability
- [ ] **Modularization**: Split into `AudioEngine`, `UIManager`, `SelectionManager`, `EffectsManager`
- [ ] **Unit Tests**: Jest/Vitest tests for audio logic
- [ ] **State Management**: Centralized state for undo/redo support

### Performance
- [ ] **Web Workers**: Offload waveform rendering to background thread
- [ ] **AudioWorklet**: More precise audio timing
- [ ] **Lazy Loading**: Load samples on-demand from library

### Infrastructure ✅ COMPLETED
- [x] **PWA Support**: Easy with `vite-plugin-pwa` (npm package available)
- [x] **Build System**: Vite for bundling and hot reload
- [ ] **CI/CD**: GitHub Actions for testing and deployment

### 📦 npm Packages Now Available
With Vite, we can now use any npm package! Some ideas:
- `tone.js` - Advanced audio synthesis and effects
- `howler.js` - Cross-browser audio library
- `vite-plugin-pwa` - Make app installable
- `peaks.js` - BBC's advanced waveform library
- `wavesurfer.js` - Alternative waveform display
- `standardized-audio-context` - Cross-browser Web Audio polyfill

---

## 💡 Creative Ideas (Brainstorm)

### Performance Features
- [ ] **MIDI Support**: Map hardware controllers to pads/effects
- [ ] **Ableton Link**: Sync with other music software
- [ ] **Scene/Preset System**: Save entire configurations (sample + triggers + effects)
- [ ] **Live Looper**: Record and layer loops in real-time

### Social/Sharing
- [ ] **Share Performance**: Generate shareable link with sample + trigger config
- [ ] **Export to SoundCloud**: One-click upload of recorded performance
- [ ] **Collaborative Mode**: Multiple users control different aspects

### Advanced Audio
- [ ] **Sample Layering**: Stack multiple samples on one pad
- [ ] **Sidechain**: Duck audio when certain pads are hit
- [ ] **Granular Mode**: Granular synthesis from selection
- [ ] **AI Auto-Chop**: ML-based transient detection for smart slicing

---

## 🐛 Known Issues / Tech Debt
- [ ] Clean up localStorage when samples are deleted
- [ ] Handle audio context suspension on mobile browsers
- [ ] Improve touch responsiveness on effect pads
- [ ] Add error boundaries for failed sample loads
