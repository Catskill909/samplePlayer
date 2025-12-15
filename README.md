# OSS Sample Player

A web-based audio sample player designed for real-time performance and sound manipulation. Load samples, set trigger points, and apply dub-style effects on the fly.

## Features

### 🎧 Sample Playback
- **Load Samples**: Import local audio files or browse the built-in library of OSS sounds, Reggae skits, and Sirens.
- **Visual Waveform**: Interactive waveform display with a playhead and trigger markers.
- **Enhanced Progress Visualization**: Dark overlay on played portion of waveform for clear visual feedback.
- **Live Playback Overlay**: Top-right corner display showing sample name, current position, and total duration in real-time.
- **Trigger Points**: Set up to 4 cue points per sample to jump to specific parts of the audio instantly.
- **Numbered Triggers**: Each trigger point shows its number (1-4) at the bottom of the marker line.
- **Draggable Triggers**: Fine-tune your cue points by dragging the red trigger lines directly on the waveform.
- **Selection Tool**: Click and drag on the waveform to select a region for focused playback.
- **Loop Selection**: Continuously loop the selected region with the Loop button.

### 🎹 Performance Controls
- **Trigger Pads**: 4 pads mapped to keys `1-4` for instant playback from cue points.
- **Mark Mode**: Use `Spacebar` to drop a cue point at the current playhead position.
- **Keyboard Shortcuts**: Full keyboard control for playback and effects.

### 🎛️ Dub Effects
8 built-in dub-style effects with momentary keyboard control:
- **Echo 1-3** (`Q`, `W`, `E`): Varying delay times.
- **Space** (`R`): Reverb.
- **Tubby** (`A`): Resonant delay.
- **Drop** (`S`): Tape dropout simulation.
- **Spring** (`D`): Spring reverb.
- **Ghost** (`F`): Spectral echo.

### 🎚️ Pitch/Speed Control
- **Speed Fader**: Adjust playback speed from 0.5× (half speed) to 2.0× (double speed).
- **Centered at 1.0×**: Fader naturally centers at normal speed for easy reference.
- **Real-time Control**: Change speed while playing - affects both pitch and tempo together.
- **Reset Button**: Instantly snap back to normal speed.
- **Works with Triggers**: Trigger points play at the current speed setting.

### 🔊 Master Volume
- **Volume Fader**: Smooth 0-100% master output control.
- **Real-time Adjustment**: Change volume while playing without clicks or pops.
- **Green LED Glow**: Visual feedback shows current volume level.
- **Reset Button**: Instantly return to full volume.

## Getting Started

### Development
```bash
npm install        # Install dependencies
npm run dev        # Start dev server at http://localhost:3000
```

### Production Build
```bash
npm run build      # Build to dist/
npm run preview    # Preview production build
```

### Deployment (Coolify/Nixpacks)
The project includes `nixpacks.toml` for automatic deployment:
- Push to git → Coolify auto-deploys
- Builds with Vite, serves static files from `dist/`

### Legacy (direct file serving)
If you just want to serve the source files directly:
1. Run a simple server: `python3 -m http.server 8000`
2. Open `http://localhost:8000`

## Project Structure
```
samplePlayer/
├── src/
│   ├── main.js           # Entry point
│   ├── SamplePlayer.js   # Main player class
│   ├── DubEffects.js     # Audio effects
│   └── styles/           # CSS files
├── public/
│   └── audio/            # Sample files
├── index.html            # Main HTML
├── vite.config.js        # Vite configuration
├── nixpacks.toml         # Coolify deployment
└── package.json          # npm configuration
```

## Technologies
- **Vite** - Build tool with hot reload
- **ES Modules** - Modern JavaScript imports
- **Web Audio API** - Audio playback, effects, pitch control
- **HTML5 Canvas** - Waveform visualization
- **LocalStorage** - Trigger point persistence
- **Nixpacks** - Coolify deployment
