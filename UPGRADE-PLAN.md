# OSS Sample Player - npm/Vite Upgrade Plan

> **Date:** December 15, 2025  
> **Status:** ✅ COMPLETED  
> **Goal:** Convert to modern npm-based architecture while maintaining simplicity

---

## 📋 Executive Summary

~~Upgrade the current vanilla JS app to a Vite-powered npm project to:~~
- ✅ Access the npm ecosystem (VU meters, audio DSP libraries, UI components)
- ✅ Improve developer experience with hot reload
- ✅ Better code organization with ES modules
- ✅ Maintain simple deployment via Coolify/Nixpacks

### ✅ Completed December 15, 2025
- Converted to Vite 7.3.0 with ES modules
- Project restructured: `src/` for code, `public/` for static assets
- Coolify/Nixpacks deployment working via `nixpacks.toml`
- Build command: `npm run build` → `dist/`
- Dev command: `npm run dev` → localhost:3000

---

## 🗄️ Data Storage Recommendation

### LocalStorage vs Database Analysis

| Factor | LocalStorage | Database |
|--------|--------------|----------|
| **Latency** | ✅ Instant (client-side) | ⚠️ Network round-trip |
| **Complexity** | ✅ Zero backend | ❌ API + auth needed |
| **Offline** | ✅ Works offline | ❌ Requires connection |
| **Multi-device sync** | ❌ No | ✅ Yes |
| **Data recovery** | ❌ Lost if browser cleared | ✅ Backed up |
| **Cost** | ✅ Free | ⚠️ Hosting costs |
| **Privacy** | ✅ Data stays local | ⚠️ Stored on server |

### 🎯 Recommendation: **Keep LocalStorage + Add Export/Import**

**Why LocalStorage is RIGHT for this app:**

1. **Performance tool** - DJs/performers need instant response, not network latency
2. **Minimal data** - Trigger points are tiny (few KB per sample)
3. **Single-device use case** - You set up your triggers on the device you perform with
4. **Simplicity** - No backend = nothing to maintain or pay for
5. **Privacy** - Users' setups stay private

**Enhancement: JSON Export/Import**

Add ability to:
- Export all settings to a `.json` file (backup/share)
- Import settings from a `.json` file (restore/sync manually)
- Optional: Store exports in a GitHub Gist for "cloud backup"

This gives users data portability WITHOUT the complexity of a database.

### Future Option: Optional Cloud Sync

If demand exists later, add optional Firebase/Supabase sync:
- Free tier covers light usage
- Users can opt-in
- LocalStorage remains the primary/offline source

---

## 📁 New Project Structure

```
samplePlayer/
├── package.json
├── vite.config.js
├── index.html              # Entry point (stays at root for Vite)
├── nixpacks.toml           # Coolify/Nixpacks config
├── public/
│   └── audio/              # Static audio samples (copied as-is)
│       ├── AndNow.mp3
│       ├── OldSkoolBsby1.mp3
│       └── ... (all existing samples)
├── src/
│   ├── main.js             # Entry point - initializes app
│   ├── player/
│   │   ├── SamplePlayer.js # Main player class (ES module)
│   │   ├── AudioEngine.js  # Web Audio setup, playback
│   │   └── TriggerManager.js # Trigger points logic
│   ├── effects/
│   │   ├── DubEffects.js   # Existing dub effects (converted)
│   │   └── index.js        # Effect exports
│   ├── ui/
│   │   ├── Waveform.js     # Waveform display
│   │   ├── VUMeter.js      # VU meter component
│   │   ├── PitchControl.js # Pitch fader
│   │   └── VolumeControl.js # Volume fader
│   ├── storage/
│   │   ├── LocalStorage.js # Trigger point persistence
│   │   └── ExportImport.js # JSON export/import
│   ├── styles/
│   │   ├── main.css        # Main styles
│   │   ├── hardware.css    # Hardware UI aesthetic
│   │   └── effects.css     # Effects panel styles
│   └── utils/
│       └── helpers.js      # Utility functions
└── dist/                   # Build output (gitignored)
```

---

## 📦 Recommended npm Packages

### Audio & Visualization
| Package | Purpose | Notes |
|---------|---------|-------|
| `vu-meter` or `audio-meter` | Realistic VU meters | Research best option |
| `peaks.js` | Advanced waveform display | BBC's library, very powerful |
| `tone.js` | Advanced audio synthesis | For future effects |
| `standardized-audio-context` | Cross-browser Web Audio | Polyfills edge cases |

### UI Components
| Package | Purpose | Notes |
|---------|---------|-------|
| `@radix-ui/react-slider` | Accessible sliders | If we go React later |
| `lucide` | Modern icons | Replace Font Awesome CDN |

### Build & Dev
| Package | Purpose | Notes |
|---------|---------|-------|
| `vite` | Build tool | Fast, simple |
| `vite-plugin-static-copy` | Copy audio folder | Keep samples in public |

---

## 🚀 Deployment (Coolify + Nixpacks)

### nixpacks.toml
```toml
[phases.setup]
nixPkgs = ["nodejs_20"]

[phases.install]
cmds = ["npm ci"]

[phases.build]
cmds = ["npm run build"]

[start]
cmd = "npx serve dist -s -l 3000"
```

### Build Output
- Vite outputs to `/dist` folder
- Static files only (HTML, JS, CSS, audio)
- No Node.js server needed in production
- Serve with any static file server

### Environment Variables
```env
VITE_APP_VERSION=2.0.0
# Add any future config here
```

---

## 🛠️ Migration Steps

### Phase 1: Setup (30 min) ✅ COMPLETED
- [x] Initialize npm project
- [x] Install Vite and dependencies
- [x] Create basic vite.config.js
- [x] Move audio files to public/
- [x] Verify build works

### Phase 2: Module Conversion (1-2 hours) ✅ COMPLETED
- [x] Convert script.js → src/SamplePlayer.js (ES module)
- [x] Convert dubEffects.js → src/DubEffects.js
- [x] Move CSS to src/styles/
- [x] Update index.html imports
- [x] Test all functionality

### Phase 3: Code Organization (1 hour) ✅ COMPLETED
- [x] Create main.js entry point
- [x] ES module exports/imports
- [x] Clean up global scope (window.player)

### Phase 4: npm Packages ✅ READY
- [x] npm ecosystem now available
- [x] Can install any package with `npm install`
- [ ] Future: Add packages as needed (see future-dev.md)

### Phase 5: Deploy (30 min) ✅ COMPLETED
- [x] Create nixpacks.toml
- [x] Test build locally
- [x] Push to git
- [x] Deploy via Coolify
- [x] Verify production works

---

## 📊 Settings Export/Import Format (Future)

```json
{
  "version": "2.0.0",
  "exportDate": "2025-12-15T10:30:00Z",
  "samples": {
    "./audio/AndNow.mp3": {
      "triggerPoints": [2.56, 4.75, null, null],
      "currentPadIndex": 2
    },
    "./audio/OldSkoolBsby1.mp3": {
      "triggerPoints": [1.2, 3.4, 5.6, 7.8],
      "currentPadIndex": 0
    }
  },
  "preferences": {
    "defaultVolume": 1.0,
    "defaultSpeed": 1.0
  }
}
```

UI buttons:
- **Export Settings** → Downloads `oss-sampler-backup.json`
- **Import Settings** → File picker, loads and merges

---

## ✅ Success Criteria

After migration, the app should:
- [x] Build successfully with `npm run build`
- [x] Deploy to Coolify without changes
- [x] All existing features work identically
- [x] Hot reload works in development
- [x] Can install and use npm packages
- [ ] Settings export/import works (future)
- [x] No performance regression

---

## 🗓️ Timeline Estimate

| Phase | Time | Status |
|-------|------|--------|
| Phase 1: Setup | 30 min | ✅ Done |
| Phase 2: Convert | 1-2 hours | ✅ Done |
| Phase 3: Organize | 1 hour | ✅ Done |
| Phase 4: Packages | Ready | ✅ npm available |
| Phase 5: Deploy | 30 min | ✅ Done |

**Total initial conversion: ✅ COMPLETED December 15, 2025**

---

## 🤔 Next Steps

See `future-dev.md` for feature roadmap. Key opportunities with npm/Vite:

1. **Settings Export/Import** - JSON backup/restore feature
2. **PWA Support** - Make it installable (easy with `vite-plugin-pwa`)
3. **Audio Libraries** - Tone.js, Howler.js for advanced features
4. **UI Components** - Any npm package now available
5. **TypeScript** - Add type safety if codebase grows

---

## 📝 Notes

- Keep the hardware aesthetic - it's part of the app's identity
- Maintain keyboard shortcuts - essential for performance use
- Don't over-engineer - simplicity is a feature
- Test on actual hardware/performance scenarios
- Current LED VU meters work great - no need to change
