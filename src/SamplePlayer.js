// ES Module imports
import DubEffects from './DubEffects.js';

class SamplePlayer {
    constructor() {
        this.audioContext = null;
        this.audioBuffer = null;
        this.sourceNode = null;
        this.gainNode = null; // For smooth fade-out
        this.analyserNodeL = null; // VU meter analyser - left channel
        this.analyserNodeR = null; // VU meter analyser - right channel
        this.splitterNode = null; // Channel splitter for stereo VU
        this.isPlaying = false;
        this.startTime = 0;
        this.triggerPoints = new Array(4).fill(null);
        this.currentPadIndex = 0;
        this.animationId = null;
        this.vuAnimationId = null;
        this.playheadPosition = 0;
        this.mediaElements = new Set(); // Track media elements for cleanup
        this.currentSampleUrl = null;
        this.currentSampleName = null; // Track sample display name
        this.dubEffects = null;
        this.draggingIndex = null; // Track which trigger is being dragged

        // VU meter state
        this.peakL = 0;
        this.peakR = 0;
        this.peakHoldTimeL = 0;
        this.peakHoldTimeR = 0;
        this.peakDecayRate = 0.03;
        this.peakHoldDuration = 45; // frames to hold peak

        // Selection state
        this.isSelecting = false;
        this.selectionStart = null; // Time in seconds
        this.selectionEnd = null; // Time in seconds
        this.selectionStartX = null; // Pixel position for drag start
        this.playingSelection = false; // Track if playing selection only
        this.loopingSelection = false; // Track if looping selection
        this.draggingHandle = null; // Track which selection handle is being dragged ('left' or 'right')

        // Playback speed state
        this.playbackSpeed = 1.0;
        this.effectiveDuration = null; // Actual duration accounting for playback speed

        // Master volume state
        this.masterVolume = 1.0;

        this.elements = {
            audioInput: document.getElementById('audioInput'),
            playButton: document.getElementById('playButton'),
            markButton: document.getElementById('markButton'),
            clearButton: document.getElementById('clearButton'),
            waveform: document.getElementById('waveform'),
            spectrogram: document.getElementById('spectrogram'),
            playhead: document.getElementById('playhead'),
            progressOverlay: document.getElementById('progressOverlay'),
            triggerMarkers: document.getElementById('triggerMarkers'),
            padsContainer: document.getElementById('padsContainer'),
            sampleTitle: document.getElementById('sampleTitle'),
            selectionOverlay: document.getElementById('selectionOverlay'),
            playSelectionBtn: document.getElementById('playSelectionBtn'),
            loopSelectionBtn: document.getElementById('loopSelectionBtn'),
            vuFillL: document.getElementById('vuFillL'),
            vuFillR: document.getElementById('vuFillR'),
            vuPeakL: document.getElementById('vuPeakL'),
            vuPeakR: document.getElementById('vuPeakR')
        };

        this.ctx = this.elements.spectrogram.getContext('2d');
        this.elements.spectrogram.width = this.elements.waveform.offsetWidth;
        this.elements.spectrogram.height = this.elements.waveform.offsetHeight;

        this.initializeEventListeners();

        // Cleanup on page unload (not on iframe navigation)
        window.addEventListener('beforeunload', (e) => {
            // Only cleanup if this is a real page unload, not an iframe navigation
            // Check if the event target is the window itself
            if (e.target === document) {
                this.cleanup();
            }
        });
    }

    saveTriggerPoints() {
        if (!this.currentSampleUrl) return;

        const saveData = {
            triggerPoints: this.triggerPoints,
            currentPadIndex: this.currentPadIndex
        };

        try {
            localStorage.setItem(`triggerPoints_${this.currentSampleUrl}`, JSON.stringify(saveData));
            console.log('Saved trigger points for:', this.currentSampleUrl); // Debug log
        } catch (error) {
            console.error('Error saving trigger points:', error);
        }
    }

    loadSavedTriggerPoints() {
        if (!this.currentSampleUrl) return;

        try {
            const savedData = localStorage.getItem(`triggerPoints_${this.currentSampleUrl}`);
            if (!savedData) {
                console.log('No saved data for:', this.currentSampleUrl); // Debug log
                return;
            }

            const { triggerPoints, currentPadIndex } = JSON.parse(savedData);
            this.triggerPoints = triggerPoints;
            this.currentPadIndex = currentPadIndex;

            console.log('Loaded trigger points for:', this.currentSampleUrl); // Debug log

            document.querySelectorAll('.trigger-pad:not(.start-pad)').forEach((pad) => {
                const index = parseInt(pad.dataset.index);
                const triggerTime = this.triggerPoints[index];
                if (triggerTime !== null && triggerTime !== undefined) {
                    pad.classList.add('marked');
                    pad.querySelector('.time-marker').textContent = this.formatTime(triggerTime);
                } else {
                    pad.classList.remove('marked');
                    pad.querySelector('.time-marker').textContent = '';
                }
            });

            this.updateTriggerMarkers();
        } catch (error) {
            console.error('Error loading saved trigger points:', error);
        }
    }

    clearSavedTriggerPoints(url) {
        localStorage.removeItem(`triggerPoints_${url}`);
    }
    async initializeAudioContext() {
        if (!this.audioContext || this.audioContext.state === 'closed') {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.dubEffects = new DubEffects(this.audioContext);
        } else if (this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }
    }

    cleanup() {
        if (this.isPlaying) {
            this.stopPlayback();
        }

        // Cleanup media elements
        this.mediaElements.forEach(element => {
            element.srcObject = null;
            element.remove();
        });
        this.mediaElements.clear();

        // Reset current sample URL
        this.currentSampleUrl = null;

        // Close audio context
        if (this.audioContext && this.audioContext.state !== 'closed') {
            this.audioContext.close();
            this.audioContext = null;
        }

        cancelAnimationFrame(this.animationId);

        if (this.dubEffects) {
            Object.values(this.dubEffects.effects).forEach(effect => {
                effect.wet.disconnect();
                effect.delay.disconnect();
                effect.feedback.disconnect();
                effect.filter.disconnect();
            });
        }
    }

    initializeEventListeners() {
        // Global drag listeners
        document.addEventListener('mousemove', (e) => this.handleDrag(e));
        document.addEventListener('mouseup', (e) => this.handleDragEnd(e));

        // Selection listeners on waveform
        this.elements.waveform.addEventListener('mousedown', (e) => this.handleSelectionStart(e));
        document.addEventListener('mousemove', (e) => this.handleSelectionDrag(e));
        document.addEventListener('mouseup', (e) => this.handleSelectionEnd(e));

        // Selection handle drag listeners
        document.addEventListener('mousemove', (e) => this.handleSelectionHandleDrag(e));
        document.addEventListener('mouseup', (e) => this.handleSelectionHandleDragEnd(e));

        // Play Selection button
        this.elements.playSelectionBtn?.addEventListener('click', () => this.playSelection());

        // Loop Selection button
        this.elements.loopSelectionBtn?.addEventListener('click', () => this.toggleLoopSelection());

        this.elements.audioInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            if (this.isPlaying) {
                this.stopPlayback();
            }

            try {
                await this.initializeAudioContext();

                if (this.sourceNode) {
                    this.sourceNode.disconnect();
                    this.sourceNode = null;
                }

                this.audioBuffer = null;

                const arrayBuffer = await file.arrayBuffer();
                this.audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

                this.ctx.clearRect(0, 0, this.elements.spectrogram.width, this.elements.spectrogram.height);
                this.drawWaveform();

                this.elements.playButton.disabled = false;
                this.elements.markButton.disabled = false;
                this.resetTriggers();

                e.target.value = '';
            } catch (error) {
                console.error('Error loading audio file:', error);
                alert('Error loading audio file. Please try another file.');
                e.target.value = '';
            }
        });

        this.elements.playButton.addEventListener('click', () => {
            if (this.isPlaying) {
                this.stopPlayback();
            } else {
                this.startPlayback(0);
            }
        });

        this.elements.markButton.addEventListener('click', () => this.markTriggerPoint());

        this.elements.clearButton?.addEventListener('click', () => {
            // Clear selection if exists
            this.clearSelection();
            // Clear trigger points if any exist
            if (this.triggerPoints.some(point => point !== null)) {
                this.resetTriggers();
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.repeat) return;

            // Start trigger (0 key)
            if (e.key === '0') {
                if (this.audioBuffer) {
                    this.startPlayback(0);
                }
            }

            // Trigger points (1-4)
            if (e.key >= '1' && e.key <= '4') {
                const index = parseInt(e.key) - 1;
                if (this.triggerPoints[index] !== null) {
                    this.startPlayback(this.triggerPoints[index]);
                }
            }

            // Mark (Space)
            if (e.code === 'Space') {
                e.preventDefault();
                this.markTriggerPoint();
            }

            // Dub Effects (Q, W, E, R, A, S, D, F)
            const pad = document.querySelector(`.dub-pad[data-key="${e.key.toLowerCase()}"]`);
            if (pad) {
                pad.classList.add('active');
                const effect = pad.dataset.effect;
                this.dubEffects?.triggerEffect(effect, true);
            }
        });

        document.addEventListener('keyup', (e) => {
            const pad = document.querySelector(`.dub-pad[data-key="${e.key.toLowerCase()}"]`);
            if (pad) {
                pad.classList.remove('active');
                const effect = pad.dataset.effect;
                this.dubEffects?.triggerEffect(effect, false);
            }
        });

        this.elements.padsContainer.addEventListener('click', (e) => {
            const pad = e.target.closest('.trigger-pad');
            if (pad) {
                const index = parseInt(pad.dataset.index);
                // Start pad (index -1) always plays from beginning
                if (index === -1) {
                    if (this.audioBuffer) {
                        this.startPlayback(0);
                    }
                } else if (this.triggerPoints[index] !== null) {
                    this.startPlayback(this.triggerPoints[index]);
                }
            }
        });

        // Dub pad event listeners
        document.querySelectorAll('.dub-pad').forEach(pad => {
            const effect = pad.dataset.effect;

            // Handle mouse events
            pad.addEventListener('mousedown', () => {
                pad.classList.add('active');
                this.dubEffects?.triggerEffect(effect, true);
            });

            pad.addEventListener('mouseup', () => {
                pad.classList.remove('active');
                this.dubEffects?.triggerEffect(effect, false);
            });

            pad.addEventListener('mouseleave', () => {
                pad.classList.remove('active');
                this.dubEffects?.triggerEffect(effect, false);
            });

            // Handle touch events
            pad.addEventListener('touchstart', (e) => {
                e.preventDefault();
                pad.classList.add('active');
                this.dubEffects?.triggerEffect(effect, true);
            });

            pad.addEventListener('touchend', (e) => {
                e.preventDefault();
                pad.classList.remove('active');
                this.dubEffects?.triggerEffect(effect, false);
            });
        });
    }

    handleDragStart(e, index) {
        if (this.draggingIndex !== null) return;

        e.preventDefault();
        e.stopPropagation();

        this.draggingIndex = index;
        const marker = this.elements.triggerMarkers.children[index];
        if (marker) {
            marker.classList.add('dragging');
        }

        document.body.style.cursor = 'ew-resize';
        document.body.style.userSelect = 'none';
    }

    handleDrag(e) {
        if (this.draggingIndex === null || !this.audioBuffer) return;

        e.preventDefault();

        const rect = this.elements.waveform.getBoundingClientRect();
        const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
        const newTime = (x / rect.width) * this.audioBuffer.duration;

        // Update trigger point
        this.triggerPoints[this.draggingIndex] = newTime;

        // Update marker position
        const marker = document.querySelector(`.trigger-marker[data-index="${this.draggingIndex}"]`);
        if (marker) {
            marker.style.left = `${x}px`;
            marker.dataset.time = newTime;
        }

        // Update pad display
        const pad = document.querySelector(`.trigger-pad[data-index="${this.draggingIndex}"]`);
        if (pad) {
            pad.querySelector('.time-marker').textContent = this.formatTime(newTime);
        }
    }

    handleDragEnd(e) {
        if (this.draggingIndex === null) return;

        const marker = document.querySelector(`.trigger-marker[data-index="${this.draggingIndex}"]`);
        if (marker) {
            marker.classList.remove('dragging');
        }

        this.draggingIndex = null;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';

        // Save changes
        this.saveTriggerPoints();
    }

    // Selection handling methods
    handleSelectionStart(e) {
        // Don't start selection if clicking on a trigger marker or the play/loop selection buttons
        if (e.target.closest('.trigger-marker')) return;
        if (e.target.closest('.play-selection-btn')) return;
        if (e.target.closest('.loop-selection-btn')) return;
        if (!this.audioBuffer) return;

        // Check if clicking on a selection handle
        const handle = e.target.closest('.selection-handle');
        if (handle) {
            this.draggingHandle = handle.dataset.handle; // 'left' or 'right'
            handle.classList.add('dragging');
            document.body.style.cursor = 'ew-resize';
            document.body.style.userSelect = 'none';
            e.preventDefault();
            e.stopPropagation();
            return;
        }

        const rect = this.elements.waveform.getBoundingClientRect();
        const x = e.clientX - rect.left;

        this.isSelecting = true;
        this.selectionStartX = x;
        this.selectionStart = (x / rect.width) * this.audioBuffer.duration;
        this.selectionEnd = this.selectionStart;

        // Hide the selection hint immediately when user starts selecting
        const hint = document.getElementById('selectionHint');
        if (hint) {
            hint.classList.remove('visible');
            localStorage.setItem('selectionHintShown', 'true');
        }

        // Clear any existing selection visual
        this.updateSelectionOverlay();

        document.body.style.userSelect = 'none';
    }

    handleSelectionDrag(e) {
        if (!this.isSelecting || !this.audioBuffer) return;

        const rect = this.elements.waveform.getBoundingClientRect();
        const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
        this.selectionEnd = (x / rect.width) * this.audioBuffer.duration;

        this.updateSelectionOverlay();
    }

    handleSelectionEnd(e) {
        if (!this.isSelecting) return;

        this.isSelecting = false;
        document.body.style.userSelect = '';

        // Only show button if there's a meaningful selection (at least 0.1 seconds)
        const start = Math.min(this.selectionStart, this.selectionEnd);
        const end = Math.max(this.selectionStart, this.selectionEnd);

        if (end - start >= 0.1) {
            this.selectionStart = start;
            this.selectionEnd = end;
            this.showPlaySelectionButton();
        } else {
            this.clearSelection();
        }
    }

    handleSelectionHandleDrag(e) {
        if (!this.draggingHandle || !this.audioBuffer) return;

        e.preventDefault();

        const rect = this.elements.waveform.getBoundingClientRect();
        const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
        const newTime = (x / rect.width) * this.audioBuffer.duration;

        if (this.draggingHandle === 'left') {
            // Don't let left handle go past right handle
            this.selectionStart = Math.min(newTime, this.selectionEnd - 0.05);
        } else if (this.draggingHandle === 'right') {
            // Don't let right handle go past left handle
            this.selectionEnd = Math.max(newTime, this.selectionStart + 0.05);
        }

        this.updateSelectionOverlay();
    }

    handleSelectionHandleDragEnd(e) {
        if (!this.draggingHandle) return;

        // Remove dragging class from handles
        document.querySelectorAll('.selection-handle').forEach(h => h.classList.remove('dragging'));

        this.draggingHandle = null;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
    }

    updateSelectionOverlay() {
        if (!this.elements.selectionOverlay || !this.audioBuffer) return;

        const waveformWidth = this.elements.waveform.offsetWidth;
        const start = Math.min(this.selectionStart, this.selectionEnd);
        const end = Math.max(this.selectionStart, this.selectionEnd);

        const leftPos = (start / this.audioBuffer.duration) * waveformWidth;
        const width = ((end - start) / this.audioBuffer.duration) * waveformWidth;

        this.elements.selectionOverlay.style.left = `${leftPos}px`;
        this.elements.selectionOverlay.style.width = `${width}px`;
        this.elements.selectionOverlay.classList.add('active');
    }

    showPlaySelectionButton() {
        if (!this.elements.playSelectionBtn) return;
        this.elements.playSelectionBtn.classList.add('visible');
        if (this.elements.loopSelectionBtn) {
            this.elements.loopSelectionBtn.classList.add('visible');
        }
    }

    hidePlaySelectionButton() {
        if (!this.elements.playSelectionBtn) return;
        this.elements.playSelectionBtn.classList.remove('visible');
        if (this.elements.loopSelectionBtn) {
            this.elements.loopSelectionBtn.classList.remove('visible');
            this.elements.loopSelectionBtn.classList.remove('active');
        }
        this.loopingSelection = false;
    }

    clearSelection() {
        this.selectionStart = null;
        this.selectionEnd = null;
        this.playingSelection = false;
        this.loopingSelection = false;

        if (this.elements.selectionOverlay) {
            this.elements.selectionOverlay.classList.remove('active');
            this.elements.selectionOverlay.style.width = '0';
        }
        this.hidePlaySelectionButton();
    }

    playSelection() {
        if (this.selectionStart === null || this.selectionEnd === null) return;

        const start = Math.min(this.selectionStart, this.selectionEnd);
        const end = Math.max(this.selectionStart, this.selectionEnd);

        // Store selection end before starting playback
        this.selectionPlayEnd = end;

        // Start playback first, then set the flag (since startPlayback may call stopPlayback which resets it)
        this.startPlayback(start);
        this.playingSelection = true;
    }

    toggleLoopSelection() {
        if (this.selectionStart === null || this.selectionEnd === null) return;

        // Toggle loop mode
        this.loopingSelection = !this.loopingSelection;

        if (this.elements.loopSelectionBtn) {
            this.elements.loopSelectionBtn.classList.toggle('active', this.loopingSelection);
        }

        // If enabling loop and not currently playing selection, start playing
        if (this.loopingSelection && (!this.isPlaying || !this.playingSelection)) {
            const start = Math.min(this.selectionStart, this.selectionEnd);
            const end = Math.max(this.selectionStart, this.selectionEnd);
            this.selectionPlayEnd = end;
            this.startPlayback(start);
            this.playingSelection = true;
        }
    }

    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        const ms = Math.floor((seconds % 1) * 100);
        return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
    }

    updateTriggerMarkers() {
        this.elements.triggerMarkers.innerHTML = '';

        this.triggerPoints.forEach((time, index) => {
            if (time !== null) {
                const position = Math.floor((time / this.audioBuffer.duration) * this.elements.waveform.offsetWidth);
                const marker = document.createElement('div');
                marker.className = 'trigger-marker';
                marker.style.left = `${position}px`;
                marker.dataset.time = time;
                marker.dataset.index = index;

                // Add number label
                const label = document.createElement('div');
                label.className = 'trigger-label';
                label.textContent = index + 1;
                marker.appendChild(label);

                // Add drag start listener
                marker.addEventListener('mousedown', (e) => this.handleDragStart(e, index));

                this.elements.triggerMarkers.appendChild(marker);
            }
        });
    }

    drawWaveform() {
        const data = this.audioBuffer.getChannelData(0);
        const step = Math.ceil(data.length / this.elements.spectrogram.width);
        const amp = this.elements.spectrogram.height / 2;

        this.ctx.clearRect(0, 0, this.elements.spectrogram.width, this.elements.spectrogram.height);
        this.ctx.beginPath();
        this.ctx.moveTo(0, amp);

        for (let i = 0; i < this.elements.spectrogram.width; i++) {
            let min = 1.0;
            let max = -1.0;

            for (let j = 0; j < step; j++) {
                const datum = data[(i * step) + j];
                if (datum < min) min = datum;
                if (datum > max) max = datum;
            }

            this.ctx.lineTo(i, (1 + min) * amp);
            this.ctx.lineTo(i, (1 + max) * amp);
        }

        // Vintage green LCD waveform color
        this.ctx.strokeStyle = '#39ff14';
        this.ctx.lineWidth = 1;
        this.ctx.shadowColor = '#39ff14';
        this.ctx.shadowBlur = 2;
        this.ctx.stroke();
        this.ctx.shadowBlur = 0;
    }

    updatePlayhead() {
        if (!this.isPlaying) return;

        // Account for playback speed when calculating current time
        const speed = this.playbackSpeed || 1.0;
        const currentTime = (this.audioContext.currentTime - this.startTime) * speed;

        // Use ORIGINAL buffer duration for visual positioning (waveform shows original audio)
        const progress = currentTime / this.audioBuffer.duration;
        const position = Math.floor(progress * this.elements.waveform.offsetWidth);

        this.playheadPosition = currentTime;

        const currentPosition = Math.min(position, this.elements.waveform.offsetWidth);
        this.elements.playhead.style.left = `${currentPosition}px`;
        this.elements.progressOverlay.style.width = `${currentPosition}px`;

        // Use effective duration for remaining time display
        if (this.currentSampleName && this.audioBuffer) {
            const effectiveDuration = this.effectiveDuration || this.audioBuffer.duration;
            const remainingTime = Math.max(0, effectiveDuration - currentTime);
            const remainingMins = Math.floor(remainingTime / 60);
            const remainingSecs = Math.floor(remainingTime % 60);
            const remainingText = `${remainingMins}:${remainingSecs.toString().padStart(2, '0')}`;
            this.elements.sampleTitle.textContent = `${this.currentSampleName} • ${remainingText}`;
        }

        // Stop at selection end if playing selection (or loop if looping is enabled)
        if (this.playingSelection && currentTime >= this.selectionPlayEnd) {
            if (this.loopingSelection) {
                // Loop back to selection start - preserve loop state through restart
                const start = Math.min(this.selectionStart, this.selectionEnd);
                const end = Math.max(this.selectionStart, this.selectionEnd);
                this.startPlayback(start);
                this.playingSelection = true;
                this.loopingSelection = true;
                this.selectionPlayEnd = end;
                if (this.elements.loopSelectionBtn) {
                    this.elements.loopSelectionBtn.classList.add('active');
                }
                return;
            } else {
                this.stopPlayback();
                return;
            }
        }

        // Use effective duration for stop condition (prevents early cutoff on pitch down)
        const effectiveDuration = this.effectiveDuration || this.audioBuffer.duration;
        if (currentTime >= effectiveDuration) {
            this.stopPlayback();
            return;
        }

        this.animationId = requestAnimationFrame(() => this.updatePlayhead());
    }

    updateVUMeters() {
        if (!this.isPlaying || !this.analyserNodeL || !this.analyserNodeR) return;

        const bufferLengthL = this.analyserNodeL.fftSize;
        const bufferLengthR = this.analyserNodeR.fftSize;
        const dataArrayL = new Float32Array(bufferLengthL);
        const dataArrayR = new Float32Array(bufferLengthR);

        // Use time domain data for accurate amplitude measurement
        this.analyserNodeL.getFloatTimeDomainData(dataArrayL);
        this.analyserNodeR.getFloatTimeDomainData(dataArrayR);

        // Calculate RMS for left channel
        let sumL = 0;
        for (let i = 0; i < bufferLengthL; i++) {
            sumL += dataArrayL[i] * dataArrayL[i];
        }
        const rmsL = Math.sqrt(sumL / bufferLengthL);

        // Convert to dB scale (-60dB to 0dB range mapped to 0-100%)
        // dB = 20 * log10(rms), where rms of 1.0 = 0dB
        const dbL = rmsL > 0.0001 ? 20 * Math.log10(rmsL) : -60;
        const percentL = Math.max(0, Math.min(100, ((dbL + 60) / 60) * 100));

        // Calculate RMS for right channel
        let sumR = 0;
        for (let i = 0; i < bufferLengthR; i++) {
            sumR += dataArrayR[i] * dataArrayR[i];
        }
        const rmsR = Math.sqrt(sumR / bufferLengthR);

        const dbR = rmsR > 0.0001 ? 20 * Math.log10(rmsR) : -60;
        const percentR = Math.max(0, Math.min(100, ((dbR + 60) / 60) * 100));

        // Update meter fills
        if (this.elements.vuFillL) {
            this.elements.vuFillL.style.width = `${percentL}%`;
            if (percentL > 90) {
                this.elements.vuFillL.classList.add('hot');
            } else {
                this.elements.vuFillL.classList.remove('hot');
            }
        }
        if (this.elements.vuFillR) {
            this.elements.vuFillR.style.width = `${percentR}%`;
            if (percentR > 90) {
                this.elements.vuFillR.classList.add('hot');
            } else {
                this.elements.vuFillR.classList.remove('hot');
            }
        }

        // Peak hold logic - Left channel
        if (percentL > this.peakL) {
            this.peakL = percentL;
            this.peakHoldTimeL = this.peakHoldDuration;
            if (this.elements.vuPeakL) this.elements.vuPeakL.classList.add('active');
        } else {
            if (this.peakHoldTimeL > 0) {
                this.peakHoldTimeL--;
            } else {
                this.peakL = Math.max(0, this.peakL - this.peakDecayRate * 100);
                if (this.peakL < 1 && this.elements.vuPeakL) {
                    this.elements.vuPeakL.classList.remove('active');
                }
            }
        }
        if (this.elements.vuPeakL) this.elements.vuPeakL.style.left = `${this.peakL}%`;

        // Peak hold logic - Right channel
        if (percentR > this.peakR) {
            this.peakR = percentR;
            this.peakHoldTimeR = this.peakHoldDuration;
            if (this.elements.vuPeakR) this.elements.vuPeakR.classList.add('active');
        } else {
            if (this.peakHoldTimeR > 0) {
                this.peakHoldTimeR--;
            } else {
                this.peakR = Math.max(0, this.peakR - this.peakDecayRate * 100);
                if (this.peakR < 1 && this.elements.vuPeakR) {
                    this.elements.vuPeakR.classList.remove('active');
                }
            }
        }
        if (this.elements.vuPeakR) this.elements.vuPeakR.style.left = `${this.peakR}%`;

        this.vuAnimationId = requestAnimationFrame(() => this.updateVUMeters());
    }

    resetVUMeters() {
        this.peakL = 0;
        this.peakR = 0;
        this.peakHoldTimeL = 0;
        this.peakHoldTimeR = 0;

        if (this.elements.vuFillL) {
            this.elements.vuFillL.style.width = '0%';
            this.elements.vuFillL.classList.remove('hot');
        }
        if (this.elements.vuFillR) {
            this.elements.vuFillR.style.width = '0%';
            this.elements.vuFillR.classList.remove('hot');
        }
        if (this.elements.vuPeakL) {
            this.elements.vuPeakL.style.left = '0%';
            this.elements.vuPeakL.classList.remove('active');
        }
        if (this.elements.vuPeakR) {
            this.elements.vuPeakR.style.left = '0%';
            this.elements.vuPeakR.classList.remove('active');
        }
    }

    async startPlayback(offset = 0) {
        if (!this.audioBuffer) return;

        if (this.isPlaying) {
            this.stopPlayback();
        }

        await this.initializeAudioContext();

        // Apply playback speed
        const speed = this.playbackSpeed || 1.0;

        // Calculate effective duration accounting for playback speed
        // Slower speeds (< 1.0) make the sample longer, faster speeds (> 1.0) make it shorter
        this.effectiveDuration = this.audioBuffer.duration / speed;

        // Ensure precise timing
        const startDelay = 0.005; // 5ms scheduling delay for better precision
        const exactStartTime = this.audioContext.currentTime + startDelay;
        // Adjust startTime for playback speed so playhead position calculates correctly
        this.startTime = exactStartTime - (offset / speed);

        this.sourceNode = this.audioContext.createBufferSource();
        this.sourceNode.buffer = this.audioBuffer;

        // Add onended event as safety net for when playback completes
        // Capture reference to current source to prevent old sources from stopping new playback
        const currentSource = this.sourceNode;
        this.sourceNode.onended = () => {
            if (this.isPlaying && this.sourceNode === currentSource) {
                this.stopPlayback();
            }
        };

        // Create gain node for volume control and smooth fade-in/fade-out
        this.gainNode = this.audioContext.createGain();

        // Get target volume (default to 1.0 if not set)
        const targetVolume = this.masterVolume !== undefined ? this.masterVolume : 1.0;

        // Start at 0 and fade in to target volume over 10ms (prevents click at start)
        this.gainNode.gain.setValueAtTime(0, exactStartTime);
        this.gainNode.gain.linearRampToValueAtTime(targetVolume, exactStartTime + 0.010);

        // Create analyser nodes for VU meter
        this.analyserNodeL = this.audioContext.createAnalyser();
        this.analyserNodeR = this.audioContext.createAnalyser();
        this.analyserNodeL.fftSize = 256;
        this.analyserNodeR.fftSize = 256;
        this.analyserNodeL.smoothingTimeConstant = 0.8;
        this.analyserNodeR.smoothingTimeConstant = 0.8;

        // Create channel splitter for stereo metering
        this.splitterNode = this.audioContext.createChannelSplitter(2);

        this.sourceNode.connect(this.gainNode);

        // Connect for VU metering
        this.gainNode.connect(this.splitterNode);
        this.splitterNode.connect(this.analyserNodeL, 0);
        this.splitterNode.connect(this.analyserNodeR, 1);

        if (this.dubEffects) {
            this.dubEffects.connectSource(this.gainNode);
        }
        this.gainNode.connect(this.audioContext.destination);

        const initialPosition = Math.floor((offset / this.audioBuffer.duration) * this.elements.waveform.offsetWidth);
        this.elements.playhead.style.left = `${initialPosition}px`;
        this.elements.progressOverlay.style.width = `${initialPosition}px`;

        // Apply playback speed (speed variable declared earlier)
        this.sourceNode.playbackRate.value = speed;

        this.sourceNode.start(exactStartTime, offset);
        this.isPlaying = true;
        this.playheadPosition = offset;

        this.elements.playButton.textContent = 'Stop';
        this.updatePlayhead();
        this.updateVUMeters();
    }

    stopPlayback() {
        if (!this.isPlaying) return;

        // Quick fade-out to prevent click (30ms for smoother fade)
        const fadeTime = 0.030;
        if (this.gainNode && this.audioContext) {
            const now = this.audioContext.currentTime;
            this.gainNode.gain.setValueAtTime(this.gainNode.gain.value, now);
            this.gainNode.gain.linearRampToValueAtTime(0, now + fadeTime);
        }

        // Stop after fade completes
        try {
            this.sourceNode?.stop(this.audioContext.currentTime + fadeTime);
        } catch (e) {
            // Ignore if already stopped
        }

        // Delay disconnect until after fade completes to prevent click
        const sourceNode = this.sourceNode;
        const gainNode = this.gainNode;
        const analyserL = this.analyserNodeL;
        const analyserR = this.analyserNodeR;
        const splitter = this.splitterNode;

        setTimeout(() => {
            sourceNode?.disconnect();
            gainNode?.disconnect();
            analyserL?.disconnect();
            analyserR?.disconnect();
            splitter?.disconnect();
        }, fadeTime * 1000 + 10);

        this.sourceNode = null;
        this.gainNode = null;

        this.isPlaying = false;
        this.playheadPosition = 0;
        this.playingSelection = false;
        this.loopingSelection = false;

        // Update loop button visual state
        if (this.elements.loopSelectionBtn) {
            this.elements.loopSelectionBtn.classList.remove('active');
        }

        cancelAnimationFrame(this.animationId);
        cancelAnimationFrame(this.vuAnimationId);

        // Reset VU meters
        this.resetVUMeters();

        // Stop and reset analog VU meter
        if (window.analogVuMeter) {
            window.analogVuMeter.stop();
            window.analogVuMeter.reset();
        }

        // Clear analyser references (actual disconnect happens after fade)
        this.analyserNodeL = null;
        this.analyserNodeR = null;
        this.splitterNode = null;

        this.elements.playButton.textContent = 'Play';

        // Reset title to show static duration
        if (this.currentSampleName && this.audioBuffer) {
            const durationMins = Math.floor(this.audioBuffer.duration / 60);
            const durationSecs = Math.floor(this.audioBuffer.duration % 60);
            const durationText = `${durationMins}:${durationSecs.toString().padStart(2, '0')}`;
            this.elements.sampleTitle.textContent = `${this.currentSampleName} • ${durationText}`;
        }
        this.elements.playhead.style.left = '0';
        this.elements.progressOverlay.style.width = '0';
    }

    markTriggerPoint() {
        if (!this.isPlaying) return;

        const playheadElement = this.elements.playhead;
        const playheadPosition = parseInt(playheadElement.style.left);
        const triggerTime = (playheadPosition / this.elements.waveform.offsetWidth) * this.audioBuffer.duration;

        if (triggerTime >= 0 && triggerTime <= this.audioBuffer.duration) {
            this.triggerPoints[this.currentPadIndex] = triggerTime;

            const pad = document.querySelector(`.trigger-pad[data-index="${this.currentPadIndex}"]`);
            pad.classList.add('marked');
            pad.querySelector('.time-marker').textContent = this.formatTime(triggerTime);

            this.updateTriggerMarkers();
            this.currentPadIndex = (this.currentPadIndex + 1) % 4;

            // Save trigger points after marking
            this.saveTriggerPoints();
        }
    }

    resetTriggers() {
        this.triggerPoints = new Array(4).fill(null);
        this.currentPadIndex = 0;

        document.querySelectorAll('.trigger-pad:not(.start-pad)').forEach(pad => {
            pad.classList.remove('marked');
            pad.classList.add('cleared');
            pad.querySelector('.time-marker').textContent = '';

            setTimeout(() => {
                pad.classList.remove('cleared');
            }, 300);
        });

        this.elements.triggerMarkers.innerHTML = '';

        // Clear any selection
        this.clearSelection();

        // Only save if we have a current sample URL
        if (this.currentSampleUrl) {
            console.log('Saving cleared state for:', this.currentSampleUrl); // Debug log
            this.saveTriggerPoints();
        }
    }

    async loadSampleFromUrl(url) {
        if (this.isPlaying) {
            this.stopPlayback();
        }

        // Clear any existing selection
        this.clearSelection();

        this.audioBuffer = null;
        if (this.sourceNode) {
            this.sourceNode.disconnect();
            this.sourceNode = null;
        }

        if (this.elements.audioInput) {
            this.elements.audioInput.value = '';
        }

        // Find the sample name from the URL
        const fileName = url.split('/').pop(); // Gets the file name from URL

        // Find the matching sample from our samples object to get its proper name
        let sampleName = fileName;
        for (const category in window.samples) {
            const sample = window.samples[category].find(s => s.url === url);
            if (sample) {
                sampleName = sample.name;
                break;
            }
        }

        // Store the sample name for use during playback
        this.currentSampleName = sampleName;

        // Update the title with animation (without duration initially)
        this.elements.sampleTitle.textContent = sampleName;
        this.elements.sampleTitle.classList.remove('active');
        // Force browser reflow
        void this.elements.sampleTitle.offsetWidth;
        this.elements.sampleTitle.classList.add('active');

        try {
            await this.initializeAudioContext();

            const audio = new Audio();
            audio.crossOrigin = "anonymous";
            audio.src = url;

            this.mediaElements.add(audio);

            await new Promise((resolve, reject) => {
                audio.addEventListener('canplaythrough', async () => {
                    try {
                        const mediaSource = this.audioContext.createMediaElementSource(audio);
                        const destination = this.audioContext.destination;
                        mediaSource.connect(destination);

                        const response = await fetch(url);
                        if (!response.ok) throw new Error('Network response was not ok');

                        const arrayBuffer = await response.arrayBuffer();
                        this.audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

                        this.ctx.clearRect(0, 0, this.elements.spectrogram.width, this.elements.spectrogram.height);
                        this.drawWaveform();

                        this.elements.playButton.disabled = false;
                        this.elements.markButton.disabled = false;

                        // Update title with duration
                        const durationMins = Math.floor(this.audioBuffer.duration / 60);
                        const durationSecs = Math.floor(this.audioBuffer.duration % 60);
                        const durationText = `${durationMins}:${durationSecs.toString().padStart(2, '0')}`;
                        this.elements.sampleTitle.textContent = `${sampleName} • ${durationText}`;

                        // First check if we have saved trigger points
                        const savedData = localStorage.getItem(`triggerPoints_${url}`);

                        // Update URL after successful load
                        this.currentSampleUrl = url;

                        if (savedData) {
                            // If we have saved data, load it
                            this.loadSavedTriggerPoints();
                        } else {
                            // If no saved data, reset triggers
                            this.resetTriggers();
                        }

                        this.mediaElements.delete(audio);
                        audio.srcObject = null;

                        resolve();
                    } catch (error) {
                        reject(error);
                    }
                });

                audio.addEventListener('error', reject);
            });
        } catch (error) {
            this.elements.sampleTitle.textContent = '';
            this.elements.sampleTitle.classList.remove('active');
            console.error('Error loading sample:', error);
            alert('Error loading sample. Please try again.');
            this.currentSampleUrl = null;
        }
    }
}

// Export the class
export default SamplePlayer;

// Sample library data
export const samples = {
    oss: [
        { name: 'AndNow', url: './audio/AndNow.mp3' },
        { name: 'Old Skool Baby 1', url: './audio/OldSkoolBsby1.mp3' },
        { name: 'CharlieOSS', url: './audio/CharlieOSS.mp3' },
        { name: 'Old Skool Baby 2', url: './audio/OldSkoolBsby2.mp3' },
        { name: 'DJ Chucks ID WJFF', url: './audio/DJChucksIDWJFF.mp3' },
        { name: 'DJ Chucks Long Old ID', url: './audio/DJChucksLegalIDWJFF.mp3' },
        { name: 'Feature Presentation', url: './audio/FeaturePresentation.mp3' },
        { name: 'ForMyNextNumber', url: './audio/ForMyNextNumber.mp3' },
        { name: 'More Power Chucks', url: './audio/MorePowerChucks.mp3' },
        { name: 'More Power Paul', url: './audio/MorePowerPaul.mp3' },
        { name: 'MorePowerCharlie', url: './audio/MorePowerCharlie.mp3' },
        { name: 'OhMyGoshEcho', url: './audio/OhMyGoshECHO.mp3' },
        { name: 'Disclaimer', url: './audio/Disclaimer.mp3' },
        { name: 'OhNoMyBrother-BuyYourOwn', url: './audio/OhNoMyBrother-BuyYourOwn.mp3' },
        { name: 'BarkyStarkey', url: './audio/BarkyStarkey.mp3' },
        { name: 'StarTrekSTRESS', url: './audio/StarTrekSTRESS.mp3' },
        { name: 'SuperBad', url: './audio/SuperBad.mp3' },
        { name: 'WhatchThis', url: './audio/WhatchThis.mp3' },
        { name: 'YouFeelLikeDancing', url: './audio/YouFeelLikeDancing.mp3' },
        { name: 'YourMammy', url: './audio/YourMammy.mp3' },
        { name: 'BossDJ2', url: './audio/BossDJ2.mp3' },
        { name: 'andNOW2', url: './audio/andNOW2.wav' },
        { name: 'classics2', url: './audio/classics2.wav' },
        { name: 'GoBackWayBack', url: './audio/GoBackWayBack.wav' },
    ],
    reggae: [
        { name: 'BedroomMazurka', url: './audio/BedroomMazurka.mp3' },
        { name: 'CallTheDJ', url: './audio/CallTheDJ.mp3' },
        { name: 'Darling', url: './audio/Darling.mp3' },
        { name: 'Darling2', url: './audio/Darling2.mp3' },
        { name: 'GoSakka', url: './audio/GoSakka.mp3' },
        { name: 'Heavy Skit', url: './audio/Heavy.mp3' },
        { name: 'Heavy2', url: './audio/Heavy2.mp3' },
        { name: 'I tell the DJ', url: './audio/I_tell_the_DJ.mp3' },
        { name: 'I Say Old Chap', url: './audio/I_Say_Old_Chap.mp3' },
        { name: 'KarateLion', url: './audio/KarateLion.mp3' },
        { name: 'KnockKnock', url: './audio/KnockKnock.mp3' },
        { name: 'Leave the Studio', url: './audio/Leave_the_Studio.mp3' },
        { name: 'ThisIsRockers', url: './audio/ThisIsRockers.mp3' },
        { name: 'StrictlyRockers2', url: './audio/StrictlyRockers2.mp3' },
        { name: 'Move Ya', url: './audio/MoveYa.mp3' },
        { name: 'Musical Attack', url: './audio/MusicalAttack.mp3' },
        { name: 'MusicMachine', url: './audio/MusicMachine.mp3' },
        { name: 'Na True', url: './audio/NaTrue.mp3' },
        { name: 'StrictlyHardMusic', url: './audio/StrictlyHardMusic.mp3' },
        { name: 'StrictlyRubaDub1', url: './audio/StrictlyRubaDub1.mp3' },
        { name: 'StrictlyRubaDub2', url: './audio/StrictlyRubaDub2.mp3' },
        { name: 'StrictlyRockers', url: './audio/StrictlyRockers.mp3' },
        { name: 'StrongStrongSTrong', url: './audio/StrongStrongSTrong.mp3' },
        { name: 'WhatUpWhatUp', url: './audio/WhatUpWhatUp.mp3' },
    ],
    sirens: [
        { name: 'Bomba', url: './audio/Bomba.mp3' },
        { name: 'Horn', url: './audio/Horn.mp3' },
        { name: 'Pyong Pyong 1', url: './audio/PyongPyong1.mp3' },
    ]
};