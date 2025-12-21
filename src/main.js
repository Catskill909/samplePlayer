/**
 * OSS Sample Player - Main Entry Point
 * Version 2.0.0
 */

// Import styles
import './styles/styles.css';
import './styles/dubEffects.css';

// Import modules
import SamplePlayer, { samples } from './SamplePlayer.js';

// Initialize app on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    // Create global player instance
    window.player = new SamplePlayer();
    const player = window.player;

    // Make samples available globally for debugging
    window.samples = samples;

    // ==========================================
    // SAMPLE BROWSER & CUSTOM SAMPLES
    // ==========================================
    const browseSamples = document.getElementById('browseSamples');
    const sampleBrowser = document.getElementById('sampleBrowserOverlay');
    const closeBrowser = document.getElementById('closeSampleBrowser');
    const sampleList = document.getElementById('sampleList');
    const tabs = document.querySelectorAll('.tab-button');

    // Save Sample Modal elements
    const saveSampleModal = document.getElementById('saveSampleModal');
    const customSampleTitleInput = document.getElementById('customSampleTitle');
    const cancelSaveSampleBtn = document.getElementById('cancelSaveSample');
    const confirmSaveSampleBtn = document.getElementById('confirmSaveSample');

    // Audio input element
    const audioInput = document.getElementById('audioInput');

    // Custom samples storage
    let customSamples = [];
    let pendingFileData = null; // Stores { name, dataUrl } for file being saved
    let currentTab = 'oss';

    // Load custom samples from localStorage
    function loadCustomSamples() {
        try {
            const stored = localStorage.getItem('customSamples');
            if (stored) {
                customSamples = JSON.parse(stored);
            }
        } catch (e) {
            console.error('Error loading custom samples:', e);
            customSamples = [];
        }
    }

    // Save custom samples to localStorage
    function saveCustomSamples() {
        try {
            localStorage.setItem('customSamples', JSON.stringify(customSamples));
        } catch (e) {
            console.error('Error saving custom samples:', e);
            // Handle quota exceeded
            if (e.name === 'QuotaExceededError') {
                alert('Storage quota exceeded. Try removing some custom samples.');
            }
        }
    }

    // Initialize custom samples from storage
    loadCustomSamples();

    browseSamples?.addEventListener('click', () => {
        sampleBrowser.classList.add('active');
    });

    closeBrowser?.addEventListener('click', () => {
        sampleBrowser.classList.remove('active');
    });

    sampleBrowser?.addEventListener('click', (e) => {
        if (e.target === sampleBrowser) {
            sampleBrowser.classList.remove('active');
        }
    });

    function updateSampleList(category) {
        currentTab = category;
        sampleList.innerHTML = '';

        // Handle custom samples differently
        if (category === 'custom') {
            if (customSamples.length === 0) {
                // Show empty state
                sampleList.innerHTML = `
                    <div class="sample-list-empty">
                        <i class="fas fa-folder-open"></i>
                        <p>No custom samples yet.<br>Load a local file to add samples here.</p>
                    </div>
                `;
                return;
            }

            customSamples.forEach((sample, index) => {
                const item = document.createElement('div');
                item.className = 'sample-item custom-sample';
                item.innerHTML = `
                    <i class="fas fa-music"></i>
                    <span>${sample.name}</span>
                    <button class="delete-sample-btn" data-index="${index}" title="Delete sample">
                        <i class="fas fa-times"></i>
                    </button>
                `;

                // Add click handler for playing (exclude delete button clicks)
                item.addEventListener('click', (e) => {
                    if (!e.target.closest('.delete-sample-btn')) {
                        player.loadSampleFromDataUrl(sample.url, sample.name);
                        sampleBrowser.classList.remove('active');
                    }
                });

                // Add delete handler
                const deleteBtn = item.querySelector('.delete-sample-btn');
                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    deleteCustomSample(index);
                });

                sampleList.appendChild(item);
            });
            return;
        }

        // Handle built-in samples
        const currentSamples = samples[category];
        if (!currentSamples) return;

        currentSamples.forEach(sample => {
            const item = document.createElement('div');
            item.className = 'sample-item';
            item.innerHTML = `<i class="fas fa-music"></i><span>${sample.name}</span>`;

            item.addEventListener('click', () => {
                player.loadSampleFromUrl(sample.url);
                sampleBrowser.classList.remove('active');
            });

            sampleList.appendChild(item);
        });
    }

    function deleteCustomSample(index) {
        if (index >= 0 && index < customSamples.length) {
            customSamples.splice(index, 1);
            saveCustomSamples();
            // Clear any pending file data to prevent state issues
            pendingFileData = null;
            if (currentTab === 'custom') {
                updateSampleList('custom');
            }
        }
    }

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            updateSampleList(tab.dataset.tab);
        });
    });

    // Initialize with OSS samples
    if (tabs.length > 0) {
        updateSampleList('oss');
    }

    // ==========================================
    // SAVE SAMPLE MODAL LOGIC
    // ==========================================

    // Intercept file input to show save modal
    audioInput?.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Read file as data URL
        const reader = new FileReader();
        reader.onload = (event) => {
            const dataUrl = event.target.result;

            // Extract filename without extension for default title
            const defaultName = file.name.replace(/\.[^/.]+$/, '');

            // Store pending file data
            pendingFileData = {
                name: defaultName,
                dataUrl: dataUrl,
                file: file
            };

            // Show save modal
            customSampleTitleInput.value = defaultName;
            saveSampleModal.classList.add('active');
            customSampleTitleInput.focus();
            customSampleTitleInput.select();
        };

        reader.onerror = () => {
            console.error('Error reading file');
            alert('Error reading file. Please try again.');
        };

        reader.readAsDataURL(file);
    });

    // Handle Enter key in title input
    customSampleTitleInput?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            confirmSaveSampleBtn?.click();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            cancelSaveSampleBtn?.click();
        }
    });

    // Cancel button - just load the sample without saving
    cancelSaveSampleBtn?.addEventListener('click', () => {
        saveSampleModal.classList.remove('active');

        if (pendingFileData) {
            // Load the sample directly without saving to library
            player.loadSampleFromFile(pendingFileData.file, pendingFileData.name);
            pendingFileData = null;
        }

        // Clear file input
        if (audioInput) audioInput.value = '';
    });

    // Save button - save to custom library and load
    confirmSaveSampleBtn?.addEventListener('click', () => {
        if (!pendingFileData) {
            saveSampleModal.classList.remove('active');
            return;
        }

        // Get the title (use default if empty)
        let title = customSampleTitleInput.value.trim();
        if (!title) {
            title = pendingFileData.name;
        }

        // Add to custom samples
        customSamples.push({
            name: title,
            url: pendingFileData.dataUrl
        });

        // Save to localStorage
        saveCustomSamples();

        // Close modal
        saveSampleModal.classList.remove('active');

        // Load the sample
        player.loadSampleFromFile(pendingFileData.file, title);

        pendingFileData = null;

        // Clear file input
        if (audioInput) audioInput.value = '';
    });

    // Close modal when clicking outside
    saveSampleModal?.addEventListener('click', (e) => {
        if (e.target === saveSampleModal) {
            // Treat as cancel
            cancelSaveSampleBtn?.click();
        }
    });

    // ==========================================
    // EFFECTS BANK TAB SWITCHING
    // ==========================================
    const effectsTabs = document.querySelectorAll('.effects-tab');
    const effectsPanels = document.querySelectorAll('.effects-panel');

    effectsTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetPanel = tab.dataset.tab;

            // Update tabs
            effectsTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            // Update panels
            effectsPanels.forEach(panel => {
                panel.classList.remove('active');
                if (panel.id === `panel-${targetPanel}`) {
                    panel.classList.add('active');
                }
            });
        });
    });

    // ==========================================
    // PITCH CONTROL SYSTEM
    // ==========================================
    const speedFader = document.getElementById('speedFader');
    const speedValue = document.getElementById('speedValue');
    const faderGlow = document.getElementById('faderGlow');
    const pitchResetBtn = document.getElementById('pitchResetBtn');

    // Convert slider position (0-100) to speed (0.5-2.0) with 50 = 1.0
    function sliderToSpeed(sliderVal) {
        if (sliderVal <= 50) {
            return 0.5 + (sliderVal / 50) * 0.5;
        } else {
            return 1.0 + ((sliderVal - 50) / 50) * 1.0;
        }
    }

    // Convert speed (0.5-2.0) to slider position (0-100) with 1.0 = 50
    function speedToSlider(speed) {
        if (speed <= 1.0) {
            return ((speed - 0.5) / 0.5) * 50;
        } else {
            return 50 + ((speed - 1.0) / 1.0) * 50;
        }
    }

    function updateSpeedFromSlider(sliderVal) {
        const speed = sliderToSpeed(sliderVal);
        updateSpeedDisplay(speed, sliderVal);
    }

    function updateSpeed(speed) {
        const sliderVal = speedToSlider(speed);
        speedFader.value = sliderVal;
        updateSpeedDisplay(speed, sliderVal);
    }

    function updateSpeedDisplay(speed, sliderVal) {
        speedValue.textContent = speed.toFixed(2) + '×';
        faderGlow.style.width = `calc(${sliderVal}% - 8px)`;

        player.playbackSpeed = speed;

        if (player.sourceNode) {
            player.sourceNode.playbackRate.value = speed;
        }
    }

    speedFader?.addEventListener('input', (e) => {
        updateSpeedFromSlider(parseFloat(e.target.value));
    });

    pitchResetBtn?.addEventListener('click', () => updateSpeed(1.0));

    // Initialize
    player.playbackSpeed = 1.0;

    // ==========================================
    // MASTER VOLUME CONTROL
    // ==========================================
    const volumeFader = document.getElementById('volumeFader');
    const volumeValue = document.getElementById('volumeValue');
    const volumeGlow = document.getElementById('volumeGlow');
    const volumeResetBtn = document.getElementById('volumeResetBtn');

    // Initialize master volume
    window.player.masterVolume = 1.0;

    function updateVolumeDisplay(volume) {
        const percent = Math.round(volume * 100);
        volumeValue.textContent = percent + '%';
        volumeGlow.style.width = `calc(${percent}% - 8px)`;

        window.player.masterVolume = volume;

        if (window.player.gainNode && window.player.audioContext) {
            const now = window.player.audioContext.currentTime;
            window.player.gainNode.gain.cancelScheduledValues(now);
            window.player.gainNode.gain.setValueAtTime(volume, now);
        }
    }

    function updateVolume(volume) {
        volumeFader.value = volume * 100;
        updateVolumeDisplay(volume);
    }

    volumeFader?.addEventListener('input', (e) => {
        const volume = parseFloat(e.target.value) / 100;
        updateVolumeDisplay(volume);
    });

    volumeResetBtn?.addEventListener('click', () => updateVolume(1.0));

    // Initialize display
    updateVolumeDisplay(1.0);

    // ==========================================
    // PITCH SHIFT CONTROL (Phase Vocoder)
    // ==========================================
    const pitchShiftFader = document.getElementById('pitchShiftFader');
    const pitchShiftValue = document.getElementById('pitchShiftValue');
    const pitchShiftGlow = document.getElementById('pitchShiftGlow');
    const pitchShiftResetBtn = document.getElementById('pitchShiftResetBtn');

    function updatePitchShiftDisplay(semitones) {
        // Update display text
        const sign = semitones > 0 ? '+' : '';
        pitchShiftValue.textContent = `${sign}${semitones} st`;

        // Update glow position (map -12 to +12 → 0% to 100%)
        const percent = ((semitones + 12) / 24) * 100;
        pitchShiftGlow.style.width = `calc(${percent}% - 8px)`;

        // Apply to player
        window.player.setPitchShift(semitones);
    }

    function updatePitchShift(semitones) {
        pitchShiftFader.value = semitones;
        updatePitchShiftDisplay(semitones);
    }

    pitchShiftFader?.addEventListener('input', (e) => {
        updatePitchShiftDisplay(parseInt(e.target.value));
    });

    pitchShiftResetBtn?.addEventListener('click', () => updatePitchShift(0));

    // Initialize pitch shift display
    if (pitchShiftGlow) {
        pitchShiftGlow.style.width = 'calc(50% - 8px)'; // Center position for 0
    }

    // ==========================================
    // FILTER SWEEPS CONTROL SYSTEM
    // ==========================================
    const lowpassFader = document.getElementById('lowpassFader');
    const lowpassValue = document.getElementById('lowpassValue');
    const lowpassGlow = document.getElementById('lowpassGlow');
    const lowpassResFader = document.getElementById('lowpassResFader');
    const lowpassResValue = document.getElementById('lowpassResValue');

    const highpassFader = document.getElementById('highpassFader');
    const highpassValue = document.getElementById('highpassValue');
    const highpassGlow = document.getElementById('highpassGlow');
    const highpassResFader = document.getElementById('highpassResFader');
    const highpassResValue = document.getElementById('highpassResValue');

    const lowpassResetBtn = document.getElementById('lowpassResetBtn');
    const highpassResetBtn = document.getElementById('highpassResetBtn');

    // Logarithmic frequency mapping for natural filter feel
    function sliderToLowpassFreq(sliderVal) {
        // Map 0-100 to 100Hz-20000Hz logarithmically
        const minFreq = 100;
        const maxFreq = 20000;
        return minFreq * Math.pow(maxFreq / minFreq, sliderVal / 100);
    }

    function sliderToHighpassFreq(sliderVal) {
        // Map 0-100 to 20Hz-8000Hz logarithmically
        const minFreq = 20;
        const maxFreq = 8000;
        return minFreq * Math.pow(maxFreq / minFreq, sliderVal / 100);
    }

    // Resonance mapping - exponential for more control at lower values
    function sliderToResonance(sliderVal) {
        // Map 0-100 to Q of 0.5-20
        return 0.5 + (sliderVal / 100) * 19.5;
    }

    function formatFrequency(freq) {
        if (freq >= 1000) {
            return (freq / 1000).toFixed(1) + 'k';
        }
        return Math.round(freq) + ' Hz';
    }

    // Lowpass filter controls
    function updateLowpassDisplay(sliderVal) {
        const freq = sliderToLowpassFreq(sliderVal);
        lowpassValue.textContent = formatFrequency(freq);
        lowpassGlow.style.width = `calc(${sliderVal}% - 8px)`;

        if (window.player?.filterSweeps) {
            window.player.filterSweeps.setLowpassFrequency(freq);
        }
    }

    function updateLowpassResonance(sliderVal) {
        const q = sliderToResonance(sliderVal);
        lowpassResValue.textContent = q.toFixed(1);

        if (window.player?.filterSweeps) {
            window.player.filterSweeps.setLowpassResonance(q);
        }
    }

    lowpassFader?.addEventListener('input', (e) => {
        updateLowpassDisplay(parseFloat(e.target.value));
    });

    lowpassResFader?.addEventListener('input', (e) => {
        updateLowpassResonance(parseFloat(e.target.value));
    });

    // Highpass filter controls
    function updateHighpassDisplay(sliderVal) {
        const freq = sliderToHighpassFreq(sliderVal);
        highpassValue.textContent = formatFrequency(freq);
        highpassGlow.style.width = `calc(${sliderVal}% - 8px)`;

        if (window.player?.filterSweeps) {
            window.player.filterSweeps.setHighpassFrequency(freq);
        }
    }

    function updateHighpassResonance(sliderVal) {
        const q = sliderToResonance(sliderVal);
        highpassResValue.textContent = q.toFixed(1);

        if (window.player?.filterSweeps) {
            window.player.filterSweeps.setHighpassResonance(q);
        }
    }

    highpassFader?.addEventListener('input', (e) => {
        updateHighpassDisplay(parseFloat(e.target.value));
    });

    highpassResFader?.addEventListener('input', (e) => {
        updateHighpassResonance(parseFloat(e.target.value));
    });

    // Lowpass reset button
    lowpassResetBtn?.addEventListener('click', () => {
        if (lowpassFader) {
            lowpassFader.value = 100;
            updateLowpassDisplay(100);
        }
        if (lowpassResFader) {
            lowpassResFader.value = 10;
            updateLowpassResonance(10);
        }
    });

    // Highpass reset button
    highpassResetBtn?.addEventListener('click', () => {
        if (highpassFader) {
            highpassFader.value = 0;
            updateHighpassDisplay(0);
        }
        if (highpassResFader) {
            highpassResFader.value = 10;
            updateHighpassResonance(10);
        }
    });

    // ==========================================
    // MOD PANEL CONTROLS (Flanger & Phaser)
    // ==========================================
    const flangerToggle = document.getElementById('flangerToggle');
    const flangerRate = document.getElementById('flangerRate');
    const flangerRateValue = document.getElementById('flangerRateValue');
    const flangerDepth = document.getElementById('flangerDepth');
    const flangerDepthValue = document.getElementById('flangerDepthValue');
    const flangerFeedback = document.getElementById('flangerFeedback');
    const flangerFeedbackValue = document.getElementById('flangerFeedbackValue');

    const phaserToggle = document.getElementById('phaserToggle');
    const phaserRate = document.getElementById('phaserRate');
    const phaserRateValue = document.getElementById('phaserRateValue');
    const phaserDepth = document.getElementById('phaserDepth');
    const phaserDepthValue = document.getElementById('phaserDepthValue');
    const phaserFeedback = document.getElementById('phaserFeedback');
    const phaserFeedbackValue = document.getElementById('phaserFeedbackValue');

    // Rate mapping: 0-100 -> 0.05-5 Hz (logarithmic)
    function sliderToRate(val, maxRate = 5) {
        return 0.05 * Math.pow(maxRate / 0.05, val / 100);
    }

    // Flanger toggle
    flangerToggle?.addEventListener('click', () => {
        const isActive = !flangerToggle.classList.contains('active');
        flangerToggle.classList.toggle('active', isActive);
        flangerToggle.innerHTML = isActive
            ? '<i class="fas fa-power-off"></i> ON'
            : '<i class="fas fa-power-off"></i> OFF';
        window.player?.filterSweeps?.toggleFlanger(isActive);
    });

    // Flanger Rate
    flangerRate?.addEventListener('input', (e) => {
        const rate = sliderToRate(parseFloat(e.target.value), 5);
        flangerRateValue.textContent = rate.toFixed(2) + ' Hz';
        window.player?.filterSweeps?.setFlangerRate(rate);
    });

    // Flanger Depth
    flangerDepth?.addEventListener('input', (e) => {
        const depth = parseFloat(e.target.value) / 100;
        flangerDepthValue.textContent = Math.round(depth * 100) + '%';
        window.player?.filterSweeps?.setFlangerDepth(depth);
    });

    // Flanger Feedback
    flangerFeedback?.addEventListener('input', (e) => {
        const feedback = parseFloat(e.target.value) / 100 * 0.95;
        flangerFeedbackValue.textContent = Math.round(parseFloat(e.target.value)) + '%';
        window.player?.filterSweeps?.setFlangerFeedback(feedback);
    });

    // Phaser toggle
    phaserToggle?.addEventListener('click', () => {
        const isActive = !phaserToggle.classList.contains('active');
        phaserToggle.classList.toggle('active', isActive);
        phaserToggle.innerHTML = isActive
            ? '<i class="fas fa-power-off"></i> ON'
            : '<i class="fas fa-power-off"></i> OFF';
        window.player?.filterSweeps?.togglePhaser(isActive);
    });

    // Phaser Rate
    phaserRate?.addEventListener('input', (e) => {
        const rate = sliderToRate(parseFloat(e.target.value), 8);
        phaserRateValue.textContent = rate.toFixed(2) + ' Hz';
        window.player?.filterSweeps?.setPhaserRate(rate);
    });

    // Phaser Depth
    phaserDepth?.addEventListener('input', (e) => {
        const depth = parseFloat(e.target.value) / 100;
        phaserDepthValue.textContent = Math.round(depth * 100) + '%';
        window.player?.filterSweeps?.setPhaserDepth(depth);
    });

    // Phaser Feedback
    phaserFeedback?.addEventListener('input', (e) => {
        const feedback = parseFloat(e.target.value) / 100 * 0.95;
        phaserFeedbackValue.textContent = Math.round(parseFloat(e.target.value)) + '%';
        window.player?.filterSweeps?.setPhaserFeedback(feedback);
    });

    // Initialize filter displays
    if (lowpassFader) updateLowpassDisplay(100);
    if (lowpassResFader) updateLowpassResonance(10);
    if (highpassFader) updateHighpassDisplay(0);
    if (highpassResFader) updateHighpassResonance(10);

    // ==========================================
    // HELP SYSTEM (direct HTML, no iframe)
    // ==========================================
    const helpTrigger = document.getElementById('helpTrigger');
    const helpOverlay = document.getElementById('helpOverlay');
    const closeHelp = document.getElementById('closeHelp');

    helpTrigger?.addEventListener('click', () => {
        helpOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    });

    closeHelp?.addEventListener('click', () => {
        helpOverlay.classList.remove('active');
        document.body.style.overflow = '';
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && helpOverlay.classList.contains('active')) {
            helpOverlay.classList.remove('active');
            document.body.style.overflow = '';
        }
    });

    console.log('OSS Sample Player v2.0.0 initialized');
});
