# Pitch Effects Development Research

## 🎯 RECOMMENDED PATH FORWARD (Expert Assessment)

After the Tone.js integration failure, here's the best approach:

### Why Tone.js Failed
- Tone.js creates its own `AudioContext` on import (before user gesture)
- Even with `Tone.setContext()`, internal dependencies conflict with our audio graph
- Their `PitchShift` effect has hidden assumptions about context ownership

### Best Solution: **SoundTouchJS AudioWorklet**

| Package | npm | Why It's Best |
|---------|-----|---------------|
| `@soundtouchjs/audio-worklet` | ✅ Active (2024) | AudioWorklet = runs on separate thread, no main thread blocking |
| Uses WSOLA algorithm | ✅ High quality | Best quality for ±6 semitones, works well up to ±12 |
| Designed for this exact use case | ✅ | Independent pitch/tempo control |

### How AudioWorklet Works (Why It Won't Break Our App)

```
CURRENT (main thread, conflicts with our code):
┌─────────────────────────────────────────────────┐
│ Main Thread                                     │
│  ├── Our SamplePlayer                           │
│  ├── DubEffects                                 │
│  └── Tone.js (CONFLICT - fights for context)    │
└─────────────────────────────────────────────────┘

AUDIOWORKLET (separate audio thread, no conflicts):
┌─────────────────────────────────────────────────┐
│ Main Thread                                     │
│  ├── Our SamplePlayer                           │
│  └── DubEffects                                 │
└─────────────────────────────────────────────────┘
           │
           │ connect()
           ▼
┌─────────────────────────────────────────────────┐
│ Audio Worklet Thread (separate!)                │
│  └── SoundTouchJS PitchShift processor          │
└─────────────────────────────────────────────────┘
```

### Implementation Steps

1. **Install package:**
   ```bash
   npm install @soundtouchjs/audio-worklet
   ```

2. **Copy worklet processor to public folder** (required for worklets)
   
3. **Register the worklet in our AudioContext:**
   ```javascript
   await audioContext.audioWorklet.addModule('/soundtouch-worklet.js');
   ```

4. **Create and connect the worklet node:**
   ```javascript
   this.pitchWorklet = new AudioWorkletNode(audioContext, 'soundtouch-worklet');
   this.pitchWorklet.parameters.get('pitch').value = semitones; // -12 to +12
   
   // Route: source -> pitchWorklet -> gainNode -> destination
   this.sourceNode.connect(this.pitchWorklet);
   this.pitchWorklet.connect(this.gainNode);
   ```

5. **Update pitch in real-time:**
   ```javascript
   setPitchShift(semitones) {
       this.pitchWorklet.parameters.get('pitch').value = semitones;
   }
   ```

### Why This Won't Break Existing Features
- AudioWorklet is just another Web Audio node (like our DubEffects)
- No separate AudioContext conflicts
- Works with our existing connection chain
- Processes audio on a separate thread = no UI jank

### Alternative: Simple "Jungle" Pitch Shifter (Fallback)

If AudioWorklet proves complex, Chris Wilson's "Jungle" algorithm is simpler:
- Uses modulated delay lines (pure Web Audio API)
- Lower quality but zero dependencies
- Already used by `soundbank-pitch-shift` npm package

---

## Current Implementation

Our current pitch control uses `playbackRate` on the `AudioBufferSourceNode`. This is the simplest approach but has a key limitation: **changing pitch also changes speed** (like a vinyl record or tape machine). Pitch down = slower playback, pitch up = faster playback.

---

## The Challenge: Pitch vs. Speed

There are fundamentally two different things:
1. **Pitch + Speed together** (like a turntable) - what we have now
2. **Pitch independent of speed** (pitch shift without time change) - requires DSP algorithms

---

## Pitch Shifting Algorithms

### 1. Phase Vocoder
The gold standard for independent pitch/time control.

**How it works:**
- Uses Short-Time Fourier Transform (STFT) to break audio into frequency bins
- Modifies phase and amplitude of spectral components
- Re-synthesizes using Inverse STFT
- Can shift pitch without changing duration

**Pros:**
- High quality results
- Industry standard (used in Ableton, Pro Tools, etc.)
- Works well for +/- 12 semitones

**Cons:**
- Computationally intensive
- Can introduce "phasiness" artifacts on transients
- Complex to implement from scratch

**JS Libraries:**
- `pitchshift.js` - Phase Vocoder port from C++
- `PhaseVocoder.js` - Web Audio implementation
- `@nickarner/phase-vocoder-web-audio` - AudioWorklet-based

---

### 2. Granular Synthesis
Breaks audio into tiny "grains" and manipulates them.

**How it works:**
- Cuts audio into short overlapping segments (5-50ms "grains")
- Plays grains back at different rates/pitches
- Overlaps grains to create continuous sound
- Can stretch time independent of pitch

**Pros:**
- Creates unique textural effects
- Good for extreme time stretching
- Can create "glitchy" creative effects
- Relatively simple to implement

**Cons:**
- Can sound "granular" or artificially textured
- Not as transparent as Phase Vocoder for small shifts

**JS Libraries:**
- Custom implementations using Web Audio API `AudioBufferSourceNode`
- `Tone.js` has `GrainPlayer` for granular playback

---

### 3. WSOLA (Waveform Similarity Overlap-Add)
Time-domain algorithm that finds optimal overlap points.

**How it works:**
- Cuts audio into overlapping windows
- Finds the best correlation points for smooth transitions
- Adjusts overlap to stretch/compress time
- Combined with resampling for pitch shift

**Pros:**
- Better transient preservation than Phase Vocoder
- Less "phasiness" on percussive material
- Good for speech

**Cons:**
- Can produce "doubling" artifacts
- Less effective for polyphonic music

**JS Libraries:**
- `SoundTouchJS` - Port of C++ SoundTouch library, uses WSOLA
  - npm: `soundtouchjs`
  - Best quality in ±6 semitone range

---

### 4. Simple Delay-Based Pitch Shift
Uses modulated delay lines (the "Jungle" algorithm).

**How it works:**
- Uses a delay node with modulated delay time
- Sawtooth wave modulates the delay, creating Doppler effect
- Results in pitch shift

**Pros:**
- Simple to implement
- Low CPU usage
- Real-time friendly

**Cons:**
- Introduces noticeable modulation artifacts
- "Warbling" sound quality
- Limited pitch range

**JS Libraries:**
- `soundbank-pitch-shift` - Based on Chris Wilson's "Jungle"
- `Tone.js PitchShift` - Uses this approach

---

## Major JavaScript Libraries

### Tone.js
**npm:** `tone`
**Website:** https://tonejs.github.io/

Most popular Web Audio framework. Includes:
- `PitchShift` - Real-time pitch shifting (delay-based)
- `GrainPlayer` - Granular playback with pitch control
- Full synth/effects ecosystem

```javascript
import * as Tone from 'tone';
const pitchShift = new Tone.PitchShift(4).toDestination(); // +4 semitones
```

**Best for:** Quick implementation, good enough quality for effects.

---

### SoundTouchJS
**npm:** `soundtouchjs`
**GitHub:** https://github.com/AnthumChris/SoundTouchJS

JavaScript port of the C++ SoundTouch library. Uses WSOLA algorithm.

- Independent tempo and pitch control
- High quality, especially ±6 semitones
- Can be used with AudioWorklet for better performance

**Best for:** High-quality pitch shift where quality matters more than simplicity.

---

### @descript/kali
**npm:** `@descript/kali`

Real-time time-stretching and pitch-shifting. Used by Descript (podcast editing software).

- Independent tempo and pitch
- Optimized for voice/speech
- Modern API

**Best for:** Voice/spoken word material.

---

### VexWarp
**GitHub:** https://github.com/0xfe/vexwarp

Implements STFT and Phase Vocoder algorithms.

- Time stretching
- Pitch shifting
- Educational/well-documented code

---

### Superpowered
**Website:** https://superpowered.com/

Commercial/freemium SDK with WebAssembly implementation.

- Professional quality
- Real-time pitch shift and time stretch
- Used in commercial apps

**Best for:** Production apps where quality is paramount.

---

## Dub/Reggae-Specific Pitch Effects

### 1. Turntable Stop/Start (What we have enhanced)
Classic vinyl slowdown/speedup effect.
- Already implemented with `playbackRate`
- Could add inertia/momentum simulation
- Could add vinyl noise/crackle during effect

### 2. Tape Stop Effect
Simulates tape machine stopping.
- Similar to turntable but different curve
- Often slower, more dramatic pitch dive
- Can add "wow and flutter" - subtle pitch wobble

### 3. Varispeed
Classic studio effect - like our current fader.
- Continuous pitch/speed control
- Used extensively in dub (King Tubby, Lee Perry)
- Could add "motor" simulation for realistic spin-up/down

### 4. Pitch Dive/Rise
Dramatic pitch sweeps.
- Quick dive down (tape stop)
- Rise up (reverse tape start)
- Could be triggered effects like our dub pads

### 5. Dub Siren Pitch Effects
Classic siren uses pitch modulation.
- LFO modulating pitch (frequency)
- Square or sine wave oscillation
- Could add a siren generator to the player

### 6. Octave Effects
- Octave up (2x frequency)
- Octave down (0.5x frequency)
- Sub-octave for bass reinforcement

---

## Native Web Audio API Options

### AudioBufferSourceNode.playbackRate
**What we use now.** Simple but changes speed with pitch.

### AudioBufferSourceNode.detune
Changes pitch in cents (100 cents = 1 semitone). 
- `detune.value = 1200` = 1 octave up
- Still changes speed proportionally
- Limited browser support for large values

### OscillatorNode.frequency / .detune
For synthetic sounds only.

### BiquadFilterNode
Can create formant-like effects but not true pitch shift.

---

## Recommended Development Path

### Phase 1: Quick Wins (Low Effort)
1. **Tape Stop Effect** - Animated `playbackRate` ramp to 0
2. **Varispeed Inertia** - Add momentum to current fader
3. **Octave Triggers** - Preset buttons for 0.5×, 1×, 2× speed

### Phase 2: Creative Effects (Medium Effort)
1. **Pitch Dive/Rise Dub Pad** - Triggered pitch sweeps
2. **Wow & Flutter** - LFO modulating playback rate
3. **Vinyl Simulation** - Combine pitch wobble with noise

### Phase 3: True Pitch Shift (Higher Effort)
1. **Integrate Tone.js PitchShift** - Easy, decent quality
2. **Integrate SoundTouchJS** - Better quality, more complex
3. **Custom Granular Engine** - Ultimate control, most work

---

## Implementation Ideas for Sample Player

### New Dub Pad Effects
| Effect | Key | Description |
|--------|-----|-------------|
| Dive | ? | Quick pitch dive to 0 |
| Rise | ? | Pitch rise from low |
| Half Speed | ? | Instant 0.5× toggle |
| Double Speed | ? | Instant 2× toggle |
| Warp | ? | Pitch + filter wobble |

### Enhanced Pitch Fader
- Add momentum/inertia
- Add snap points (0.5×, 1×, 2×)
- Add visual tape reel animation

### Pitch Shift Mode Toggle
- Mode A: Varispeed (current - pitch + speed linked)
- Mode B: Pitch Shift (pitch only, preserving time)
  - Requires library integration

---

## Questions for Discussion

1. **Priority:** Quick creative effects or true pitch shifting first?
2. **Quality vs. Simplicity:** Tone.js (easy, ok quality) or SoundTouchJS (harder, better)?
3. **UI:** More dub pads vs. different control paradigm?
4. **Dub Siren:** Add a built-in siren generator?
5. **Performance:** How important is mobile performance?

---

## Resources

- [Tone.js PitchShift Docs](https://tonejs.github.io/docs/latest/classes/PitchShift)
- [SoundTouchJS GitHub](https://github.com/AnthumChris/SoundTouchJS)
- [Web Audio API Spec](https://webaudio.github.io/web-audio-api/)
- [TimeStretch Player Demo](https://29a.ch/timestretch/) - Phase Vocoder example
- [Phase Vocoder Tutorial](https://www.youtube.com/watch?v=PjKlMXhxtTM)
