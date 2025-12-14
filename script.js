class SamplePlayer {
    constructor() {
        this.audioContext = null;
        this.audioBuffer = null;
        this.sourceNode = null;
        this.isPlaying = false;
        this.startTime = 0;
        this.triggerPoints = new Array(4).fill(null);
        this.currentPadIndex = 0;
        this.animationId = null;
        this.playheadPosition = 0;
        this.mediaElements = new Set(); // Track media elements for cleanup
        this.currentSampleUrl = null;
        this.currentSampleName = null; // Track sample display name
        this.dubEffects = null;
        this.draggingIndex = null; // Track which trigger is being dragged

        // Selection state
        this.isSelecting = false;
        this.selectionStart = null; // Time in seconds
        this.selectionEnd = null; // Time in seconds
        this.selectionStartX = null; // Pixel position for drag start
        this.playingSelection = false; // Track if playing selection only
        this.draggingHandle = null; // Track which selection handle is being dragged ('left' or 'right')

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
            playSelectionBtn: document.getElementById('playSelectionBtn')
        };

        this.ctx = this.elements.spectrogram.getContext('2d');
        this.elements.spectrogram.width = this.elements.waveform.offsetWidth;
        this.elements.spectrogram.height = this.elements.waveform.offsetHeight;

        this.initializeEventListeners();

        // Cleanup on page unload
        window.addEventListener('beforeunload', () => {
            this.cleanup();
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

            document.querySelectorAll('.trigger-pad').forEach((pad, index) => {
                const triggerTime = this.triggerPoints[index];
                if (triggerTime !== null) {
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
            if (this.triggerPoints.some(point => point !== null)) {
                this.resetTriggers();
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.repeat) return;

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
                if (this.triggerPoints[index] !== null) {
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
        // Don't start selection if clicking on a trigger marker or the play selection button
        if (e.target.closest('.trigger-marker')) return;
        if (e.target.closest('.play-selection-btn')) return;
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
    }

    hidePlaySelectionButton() {
        if (!this.elements.playSelectionBtn) return;
        this.elements.playSelectionBtn.classList.remove('visible');
    }

    clearSelection() {
        this.selectionStart = null;
        this.selectionEnd = null;
        this.playingSelection = false;

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

        this.ctx.strokeStyle = '#bb86fc';
        this.ctx.stroke();
    }

    updatePlayhead() {
        if (!this.isPlaying) return;

        const currentTime = this.audioContext.currentTime - this.startTime;
        const progress = currentTime / this.audioBuffer.duration;
        const position = Math.floor(progress * this.elements.waveform.offsetWidth);

        this.playheadPosition = currentTime;

        const currentPosition = Math.min(position, this.elements.waveform.offsetWidth);
        this.elements.playhead.style.left = `${currentPosition}px`;
        this.elements.progressOverlay.style.width = `${currentPosition}px`;

        // Update title with current playback position
        if (this.currentSampleName && this.audioBuffer) {
            const currentMins = Math.floor(currentTime / 60);
            const currentSecs = Math.floor(currentTime % 60);
            const totalMins = Math.floor(this.audioBuffer.duration / 60);
            const totalSecs = Math.floor(this.audioBuffer.duration % 60);
            const currentText = `${currentMins}:${currentSecs.toString().padStart(2, '0')}`;
            const totalText = `${totalMins}:${totalSecs.toString().padStart(2, '0')}`;
            this.elements.sampleTitle.textContent = `${this.currentSampleName} • ${currentText} / ${totalText}`;
        }

        // Stop at selection end if playing selection
        if (this.playingSelection && currentTime >= this.selectionPlayEnd) {
            this.stopPlayback();
            return;
        }

        if (currentTime >= this.audioBuffer.duration) {
            this.stopPlayback();
            return;
        }

        this.animationId = requestAnimationFrame(() => this.updatePlayhead());
    }

    async startPlayback(offset = 0) {
        if (!this.audioBuffer) return;

        if (this.isPlaying) {
            this.stopPlayback();
        }

        await this.initializeAudioContext();

        // Ensure precise timing
        const startDelay = 0.005; // 5ms scheduling delay for better precision
        const exactStartTime = this.audioContext.currentTime + startDelay;
        this.startTime = exactStartTime - offset;

        this.sourceNode = this.audioContext.createBufferSource();
        this.sourceNode.buffer = this.audioBuffer;
        if (this.dubEffects) {
            this.dubEffects.connectSource(this.sourceNode);
        }
        this.sourceNode.connect(this.audioContext.destination);

        const initialPosition = Math.floor((offset / this.audioBuffer.duration) * this.elements.waveform.offsetWidth);
        this.elements.playhead.style.left = `${initialPosition}px`;
        this.elements.progressOverlay.style.width = `${initialPosition}px`;

        this.sourceNode.start(exactStartTime, offset);
        this.isPlaying = true;
        this.playheadPosition = offset;

        this.elements.playButton.textContent = 'Stop';
        this.updatePlayhead();
    }

    stopPlayback() {
        if (!this.isPlaying) return;

        this.sourceNode.stop();
        this.sourceNode.disconnect();
        this.sourceNode = null;
        this.isPlaying = false;
        this.playheadPosition = 0;
        this.playingSelection = false;
        cancelAnimationFrame(this.animationId);

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

        document.querySelectorAll('.trigger-pad').forEach(pad => {
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
// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    const player = new SamplePlayer();

    const browseSamples = document.getElementById('browseSamples');
    const sampleBrowser = document.getElementById('sampleBrowserOverlay');
    const closeBrowser = document.getElementById('closeSampleBrowser');
    const sampleList = document.getElementById('sampleList');

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

    const tabs = document.querySelectorAll('.tab-button');
    let currentSamples = [];

    const samples = {
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

    window.samples = samples;

    function updateSampleList(category) {
        currentSamples = samples[category];
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

    if (tabs.length > 0) {
        updateSampleList('oss');
    }
});