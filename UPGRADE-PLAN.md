# OSS Sample Player - npm/Vite Upgrade Plan

> **Date:** December 15, 2025  
> **Goal:** Convert to modern npm-based architecture while maintaining simplicity

---

## 📋 Executive Summary

Upgrade the current vanilla JS app to a Vite-powered npm project to:
- Access the npm ecosystem (VU meters, audio DSP libraries, UI components)
- Improve developer experience with hot reload
- Better code organization with ES modules
- Maintain simple deployment via Coolify/Nixpacks

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

### Phase 1: Setup (30 min)
- [ ] Initialize npm project
- [ ] Install Vite and dependencies
- [ ] Create basic vite.config.js
- [ ] Move audio files to public/
- [ ] Verify build works

### Phase 2: Module Conversion (1-2 hours)
- [ ] Convert script.js → src/player/SamplePlayer.js (ES module)
- [ ] Convert dubEffects.js → src/effects/DubEffects.js
- [ ] Move CSS to src/styles/
- [ ] Update index.html imports
- [ ] Test all functionality

### Phase 3: Code Organization (1 hour)
- [ ] Split SamplePlayer into smaller modules
- [ ] Create UI component modules
- [ ] Add export/import settings feature
- [ ] Clean up global scope

### Phase 4: npm Packages (ongoing)
- [ ] Research and test VU meter packages
- [ ] Integrate chosen packages
- [ ] Add any other desired packages

### Phase 5: Deploy (30 min)
- [ ] Create nixpacks.toml
- [ ] Test build locally
- [ ] Push to git
- [ ] Deploy via Coolify
- [ ] Verify production works

---

## 🎨 VU Meter Options to Research

### Option 1: CSS/Canvas Custom (Current)
- Pros: Full control, no dependencies
- Cons: Basic appearance

### Option 2: npm Package
Research these:
- `vu-meter` - Simple, lightweight
- `react-vu-meter` - If going React
- `audio-visualizer` - Various styles

### Option 3: Web Component Libraries
- Look for vintage/analog meter web components
- Can integrate with vanilla JS

### Recommendation
Start by researching npm, then decide if custom or package is better.

---

## 📊 Settings Export/Import Format

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
- [ ] Build successfully with `npm run build`
- [ ] Deploy to Coolify without changes
- [ ] All existing features work identically
- [ ] Hot reload works in development
- [ ] Can install and use npm packages
- [ ] Settings export/import works
- [ ] No performance regression

---

## 🗓️ Timeline Estimate

| Phase | Time | Notes |
|-------|------|-------|
| Phase 1: Setup | 30 min | Basic Vite scaffold |
| Phase 2: Convert | 1-2 hours | Module conversion |
| Phase 3: Organize | 1 hour | Code splitting |
| Phase 4: Packages | Ongoing | As needed |
| Phase 5: Deploy | 30 min | Coolify config |

**Total initial conversion: ~3-4 hours**

---

## 🤔 Questions to Decide

1. **VU Meters** - Research packages first or upgrade first?
2. **React?** - Stay vanilla JS or migrate to React later?
3. **TypeScript?** - Add type safety? (Optional, can add later)
4. **PWA?** - Make it installable as an app? (Easy with Vite)

---

## 📝 Notes

- Keep the hardware aesthetic - it's part of the app's identity
- Maintain keyboard shortcuts - essential for performance use
- Don't over-engineer - simplicity is a feature
- Test on actual hardware/performance scenarios

---

**Ready to proceed? Let me know and I'll start the conversion!**
