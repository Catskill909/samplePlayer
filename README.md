# OSS Sample Player

A web-based audio sample player designed for real-time performance and sound manipulation. Load samples, set trigger points, and apply dub-style effects on the fly.

## Features

### 🎧 Sample Playback
- **Load Samples**: Import local audio files or browse the built-in library of OSS sounds, Reggae skits, and Sirens.
- **Visual Waveform**: Interactive waveform display with a playhead and trigger markers.
- **Trigger Points**: Set up to 4 cue points per sample to jump to specific parts of the audio instantly.
- **Draggable Triggers**: Fine-tune your cue points by dragging the red trigger lines directly on the waveform.

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

## Getting Started

1.  **Open the App**:
    - For local development, run a simple server (e.g., `python3 -m http.server 8000`) and open `http://localhost:8000`.
2.  **Load Audio**: Click "Load Sample" or "Browse Samples".
3.  **Play**: Click "Play" or use the trigger pads.
4.  **Set Triggers**: Press `Space` while playing to mark a spot. Drag the red line to adjust.
5.  **Apply Effects**: Hold down effect keys (`Q`-`F`) to apply effects momentarily.

## Technologies
- HTML5 Audio API / Web Audio API
- Vanilla JavaScript (ES6+)
- CSS3 (Flexbox, Grid, Animations)
