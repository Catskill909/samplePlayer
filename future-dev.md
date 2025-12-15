# Future Development & Enhancements

This document outlines potential features, improvements, and technical debt to address in future iterations of the OSS Sample Player.

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

---

## 🚧 In Progress

### Pitch Control Panel
Speed control using Web Audio `playbackRate` (note: pitch and speed are linked)

**Controls:**
- [ ] **Speed Fader**: Vertical slider (0.5x to 2.0x playback rate)
- [ ] **Half-Speed Button**: Quick preset to 0.5x
- [ ] **Normal Button**: Reset to 1.0x  
- [ ] **Double-Speed Button**: Quick preset to 2.0x

**Technical Notes:**
- Uses `sourceNode.playbackRate.value` 
- Pitch and speed are inherently linked in Web Audio (slower = lower pitch)
- True pitch-shifting (speed independent) requires complex DSP (future consideration)

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
- [ ] **Filter Sweep**: Lowpass/Highpass filter with knob or keyboard control
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
- [ ] **Unit Tests**: Jest tests for audio logic
- [ ] **State Management**: Centralized state for undo/redo support

### Performance
- [ ] **Web Workers**: Offload waveform rendering to background thread
- [ ] **AudioWorklet**: More precise audio timing
- [ ] **Lazy Loading**: Load samples on-demand from library

### Infrastructure
- [ ] **PWA Support**: Installable app with offline capability
- [ ] **Build System**: Vite for bundling and hot reload
- [ ] **CI/CD**: GitHub Actions for testing and deployment

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
