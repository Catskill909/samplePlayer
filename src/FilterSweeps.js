/**
 * FilterSweeps.js - Filter and Modulation Effects Module
 * Provides sweepable lowpass/highpass filters and modulation effects
 */

import Tuna from 'tunajs';

class FilterSweeps {
    constructor(audioContext) {
        this.context = audioContext;
        this.tuna = new Tuna(audioContext);

        // Input/output nodes for routing
        this.input = this.context.createGain();
        this.output = this.context.createGain();

        // Dry signal path
        this.dryGain = this.context.createGain();
        this.dryGain.gain.value = 1.0;

        // Create filter nodes (pure Web Audio for smooth sweeping)
        this.lowpassFilter = this.context.createBiquadFilter();
        this.lowpassFilter.type = 'lowpass';
        this.lowpassFilter.frequency.value = 20000; // Start wide open
        this.lowpassFilter.Q.value = 1.0;

        this.highpassFilter = this.context.createBiquadFilter();
        this.highpassFilter.type = 'highpass';
        this.highpassFilter.frequency.value = 20; // Start wide open
        this.highpassFilter.Q.value = 1.0;

        // Create modulation effects using Tuna
        this.flanger = new this.tuna.Chorus({
            rate: 0.5,          // LFO rate
            feedback: 0.4,      // Feedback amount
            delay: 0.005,       // Short delay for flanger effect
            depth: 0.7,         // Modulation depth
            bypass: true        // Start bypassed
        });

        this.phaser = new this.tuna.Phaser({
            rate: 0.8,          // LFO rate
            depth: 0.6,         // Modulation depth
            feedback: 0.6,      // Phaser feedback
            stereoPhase: 40,    // Stereo spread
            baseModulationFrequency: 700,
            bypass: true        // Start bypassed
        });

        this.chorus = new this.tuna.Chorus({
            rate: 1.5,
            feedback: 0.2,
            delay: 0.045,       // Longer delay for chorus
            depth: 0.5,
            bypass: true
        });

        this.tremolo = new this.tuna.Tremolo({
            intensity: 0.6,
            rate: 4,
            stereoPhase: 0,
            bypass: true
        });

        // Wire up the signal chain:
        // input -> lowpass -> highpass -> effects -> output
        this.input.connect(this.lowpassFilter);
        this.lowpassFilter.connect(this.highpassFilter);
        this.highpassFilter.connect(this.flanger);
        this.flanger.connect(this.phaser);
        this.phaser.connect(this.chorus);
        this.chorus.connect(this.tremolo);
        this.tremolo.connect(this.output);

        // Store effect states
        this.effectStates = {
            flanger: false,
            phaser: false,
            chorus: false,
            tremolo: false
        };
    }

    /**
     * Connect to the audio routing chain
     */
    connect(destination) {
        this.output.connect(destination);
    }

    /**
     * Get the input node for connecting sources
     */
    getInput() {
        return this.input;
    }

    /**
     * Get the output node for connecting to destination
     */
    getOutput() {
        return this.output;
    }

    // ==========================================
    // FILTER CONTROLS
    // ==========================================

    /**
     * Set lowpass filter frequency
     * @param {number} frequency - Cutoff frequency in Hz (20-20000)
     */
    setLowpassFrequency(frequency) {
        const now = this.context.currentTime;
        this.lowpassFilter.frequency.cancelScheduledValues(now);
        this.lowpassFilter.frequency.setTargetAtTime(
            Math.max(20, Math.min(20000, frequency)),
            now,
            0.01 // Fast response for smooth sweeping
        );
    }

    /**
     * Set lowpass filter resonance (Q)
     * @param {number} q - Resonance value (0.1-20)
     */
    setLowpassResonance(q) {
        const now = this.context.currentTime;
        this.lowpassFilter.Q.cancelScheduledValues(now);
        this.lowpassFilter.Q.setTargetAtTime(
            Math.max(0.1, Math.min(20, q)),
            now,
            0.01
        );
    }

    /**
     * Set highpass filter frequency
     * @param {number} frequency - Cutoff frequency in Hz (20-8000)
     */
    setHighpassFrequency(frequency) {
        const now = this.context.currentTime;
        this.highpassFilter.frequency.cancelScheduledValues(now);
        this.highpassFilter.frequency.setTargetAtTime(
            Math.max(20, Math.min(8000, frequency)),
            now,
            0.01
        );
    }

    /**
     * Set highpass filter resonance (Q)
     * @param {number} q - Resonance value (0.1-20)
     */
    setHighpassResonance(q) {
        const now = this.context.currentTime;
        this.highpassFilter.Q.cancelScheduledValues(now);
        this.highpassFilter.Q.setTargetAtTime(
            Math.max(0.1, Math.min(20, q)),
            now,
            0.01
        );
    }

    /**
     * Reset all filters to default (wide open)
     */
    resetFilters() {
        this.setLowpassFrequency(20000);
        this.setLowpassResonance(1.0);
        this.setHighpassFrequency(20);
        this.setHighpassResonance(1.0);
    }

    // ==========================================
    // MODULATION EFFECT TOGGLES
    // ==========================================

    /**
     * Toggle flanger effect
     * @param {boolean} active - Whether to enable or disable
     */
    toggleFlanger(active) {
        this.flanger.bypass = !active;
        this.effectStates.flanger = active;
    }

    /**
     * Toggle phaser effect
     * @param {boolean} active - Whether to enable or disable
     */
    togglePhaser(active) {
        this.phaser.bypass = !active;
        this.effectStates.phaser = active;
    }

    /**
     * Toggle chorus effect
     * @param {boolean} active - Whether to enable or disable
     */
    toggleChorus(active) {
        this.chorus.bypass = !active;
        this.effectStates.chorus = active;
    }

    /**
     * Toggle tremolo effect
     * @param {boolean} active - Whether to enable or disable
     */
    toggleTremolo(active) {
        this.tremolo.bypass = !active;
        this.effectStates.tremolo = active;
    }

    /**
     * Get current effect state
     * @param {string} effectName - Name of effect
     */
    isEffectActive(effectName) {
        return this.effectStates[effectName] || false;
    }

    // ==========================================
    // FLANGER PARAMETER CONTROLS
    // ==========================================

    /**
     * Set flanger rate (LFO speed)
     * @param {number} rate - Rate in Hz (0.05-5)
     */
    setFlangerRate(rate) {
        this.flanger.rate = Math.max(0.05, Math.min(5, rate));
    }

    /**
     * Set flanger depth (modulation amount)
     * @param {number} depth - Depth 0-1
     */
    setFlangerDepth(depth) {
        this.flanger.depth = Math.max(0, Math.min(1, depth));
    }

    /**
     * Set flanger feedback
     * @param {number} feedback - Feedback 0-0.95
     */
    setFlangerFeedback(feedback) {
        this.flanger.feedback = Math.max(0, Math.min(0.95, feedback));
    }

    // ==========================================
    // PHASER PARAMETER CONTROLS
    // ==========================================

    /**
     * Set phaser rate (LFO speed)
     * @param {number} rate - Rate in Hz (0.05-8)
     */
    setPhaserRate(rate) {
        this.phaser.rate = Math.max(0.05, Math.min(8, rate));
    }

    /**
     * Set phaser depth
     * @param {number} depth - Depth 0-1
     */
    setPhaserDepth(depth) {
        this.phaser.depth = Math.max(0, Math.min(1, depth));
    }

    /**
     * Set phaser feedback
     * @param {number} feedback - Feedback 0-0.95
     */
    setPhaserFeedback(feedback) {
        this.phaser.feedback = Math.max(0, Math.min(0.95, feedback));
    }

    /**
     * Clean up all resources
     */
    cleanup() {
        this.input.disconnect();
        this.output.disconnect();
        this.lowpassFilter.disconnect();
        this.highpassFilter.disconnect();
        this.dryGain.disconnect();
    }
}

export default FilterSweeps;
