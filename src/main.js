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
    // SAMPLE BROWSER
    // ==========================================
    const browseSamples = document.getElementById('browseSamples');
    const sampleBrowser = document.getElementById('sampleBrowserOverlay');
    const closeBrowser = document.getElementById('closeSampleBrowser');
    const sampleList = document.getElementById('sampleList');
    const tabs = document.querySelectorAll('.tab-button');

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
        const currentSamples = samples[category];
        sampleList.innerHTML = '';

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
    // HELP SYSTEM
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
