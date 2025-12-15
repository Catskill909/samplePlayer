class DubEffects {
    constructor(audioContext) {
        this.context = audioContext;
        this.effects = {
            // Original effects
            delay1: this.createEffectChain({
                delayTime: 0.4,
                feedbackGain: 0.88,
                filterFreq: 2200,
                name: 'delay1'
            }),
            delay2: this.createEffectChain({
                delayTime: 0.6,
                feedbackGain: 0.85,
                filterFreq: 1800,
                name: 'delay2'
            }),
            delay3: this.createEffectChain({
                delayTime: 0.8,
                feedbackGain: 0.83,
                filterFreq: 1500,
                name: 'delay3'
            }),
            reverb: this.createEffectChain({
                delayTime: 0.1,
                feedbackGain: 0.6,
                filterFreq: 3500,
                name: 'reverb'
            }),
            // New effects!
            tubbySwell: this.createTubbyEffect({
                delayTime: 0.4,
                feedbackGain: 0.89,
                filterFreq: 2200,
                name: 'tubbySwell'
            }),
            dropOut: this.createDropoutEffect({
                delayTime: 0.12,
                feedbackGain: 0.95,
                filterFreq: 1200,
                name: 'dropOut'
            }),
            springs: this.createSpringEffect({
                delayTime: 0.05,
                feedbackGain: 0.75,
                filterFreq: 4000,
                name: 'springs'
            }),
            ghostEcho: this.createGhostEffect({
                delayTime: 0.33,
                feedbackGain: 0.92,
                filterFreq: 2800,
                name: 'ghostEcho'
            })
        };
    }

    createEffectChain(settings) {
        const delay = this.context.createDelay(2.0);
        delay.delayTime.value = settings.delayTime;

        const feedback = this.context.createGain();
        feedback.gain.value = 0;

        const filter = this.context.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = settings.filterFreq;

        const wet = this.context.createGain();
        wet.gain.value = 0;

        delay.connect(filter);
        filter.connect(feedback);
        feedback.connect(delay);
        delay.connect(wet);

        return {
            delay,
            feedback,
            filter,
            wet,
            settings: {
                delayTime: settings.delayTime,
                feedbackGain: settings.feedbackGain,
                filterFreq: settings.filterFreq
            }
        };
    }

    createTubbyEffect(settings) {
        const chain = this.createEffectChain(settings);

        // Create bandpass filter for frequency sweep
        const resonantFilter = this.context.createBiquadFilter();
        resonantFilter.type = 'bandpass';
        resonantFilter.frequency.value = 1200;
        resonantFilter.Q.value = 4.0;

        // Create second filter for more psychedelic effect
        const resonantFilter2 = this.context.createBiquadFilter();
        resonantFilter2.type = 'lowpass';
        resonantFilter2.frequency.value = 2000;
        resonantFilter2.Q.value = 2.0;

        // Extra gain node for filter path
        const filterGain = this.context.createGain();
        filterGain.gain.value = 0.8;

        // Delay path: source -> delay -> resonantFilter -> resonantFilter2 -> filter -> feedback -> delay
        // Also: delay -> wet (direct path for original signal)
        chain.delay.disconnect();

        // Main effect path
        chain.delay.connect(resonantFilter);
        resonantFilter.connect(resonantFilter2);
        resonantFilter2.connect(filterGain);
        filterGain.connect(chain.filter);
        chain.filter.connect(chain.feedback);
        chain.feedback.connect(chain.delay);

        // Direct delay to wet for blending
        chain.delay.connect(chain.wet);

        // Store everything we need to control
        chain.resonantFilter = resonantFilter;
        chain.resonantFilter2 = resonantFilter2;
        chain.filterGain = filterGain;
        chain.type = 'tubby';

        // Override settings for more extreme effect
        chain.settings = {
            delayTime: 0.4,
            feedbackGain: 0.89,
            filterFreq: 2200,
            name: 'tubbySwell'
        };

        chain.delay.delayTime.value = chain.settings.delayTime;

        return chain;
    }

    createDropoutEffect(settings) {
        const chain = this.createEffectChain(settings);

        const tapeFilter = this.context.createBiquadFilter();
        tapeFilter.type = 'highshelf';
        tapeFilter.frequency.value = 7000;
        tapeFilter.gain.value = -6;

        const waveshaper = this.context.createWaveShaper();
        const distortionCurve = new Float32Array(44100);
        for (let i = 0; i < 44100; i++) {
            const x = (i * 2) / 44100 - 1;
            distortionCurve[i] = (3 + 2) * x * 20 * (Math.PI / 180) / (Math.PI + 2 * Math.abs(x));
        }
        waveshaper.curve = distortionCurve;

        chain.delay.disconnect();
        chain.delay.connect(tapeFilter);
        tapeFilter.connect(waveshaper);
        waveshaper.connect(chain.filter);
        chain.filter.connect(chain.feedback);
        chain.feedback.connect(chain.delay);
        chain.delay.connect(chain.wet);

        chain.tapeFilter = tapeFilter;
        chain.waveshaper = waveshaper;
        chain.type = 'dropout';

        return chain;
    }

    createSpringEffect(settings) {
        const chain = this.createEffectChain(settings);

        const allpass1 = this.context.createBiquadFilter();
        const allpass2 = this.context.createBiquadFilter();
        allpass1.type = allpass2.type = 'allpass';
        allpass1.frequency.value = 1400;
        allpass2.frequency.value = 500;
        allpass1.Q.value = allpass2.Q.value = 3.0;

        chain.delay.disconnect();
        chain.delay.connect(allpass1);
        allpass1.connect(allpass2);
        allpass2.connect(chain.filter);
        chain.filter.connect(chain.feedback);
        chain.feedback.connect(chain.delay);
        chain.delay.connect(chain.wet);

        chain.allpass1 = allpass1;
        chain.allpass2 = allpass2;
        chain.type = 'spring';

        return chain;
    }

    createGhostEffect(settings) {
        const chain = this.createEffectChain(settings);

        const pitchDelay = this.context.createDelay(0.1);
        pitchDelay.delayTime.value = 0.03;

        const lfo = this.context.createOscillator();
        const lfoGain = this.context.createGain();
        lfo.frequency.value = 0.5;
        lfoGain.gain.value = 0.001;
        lfo.connect(lfoGain);
        lfoGain.connect(pitchDelay.delayTime);
        lfo.start();

        chain.delay.disconnect();
        chain.delay.connect(pitchDelay);
        pitchDelay.connect(chain.filter);
        chain.filter.connect(chain.feedback);
        chain.feedback.connect(chain.delay);
        chain.delay.connect(chain.wet);

        chain.pitchDelay = pitchDelay;
        chain.lfo = lfo;
        chain.lfoGain = lfoGain;
        chain.type = 'ghost';

        return chain;
    }

    connectSource(sourceNode) {
        Object.values(this.effects).forEach(effect => {
            sourceNode.connect(effect.delay);
            effect.wet.connect(this.context.destination);
        });
    }

    triggerEffect(effectName, active) {
        const effect = this.effects[effectName];
        if (!effect) return;

        const currentTime = this.context.currentTime;

        if (active) {
            effect.feedback.gain.cancelScheduledValues(currentTime);
            effect.wet.gain.cancelScheduledValues(currentTime);

            switch (effect.type) {
                case 'tubby':
                    effect.resonantFilter.frequency.setValueAtTime(400, currentTime);
                    effect.resonantFilter.frequency.exponentialRampToValueAtTime(2400, currentTime + 0.8);
                    effect.resonantFilter2.frequency.setValueAtTime(2000, currentTime);
                    effect.resonantFilter2.frequency.exponentialRampToValueAtTime(800, currentTime + 1.2);
                    effect.filterGain.gain.setTargetAtTime(0.8, currentTime, 0.1);
                    effect.feedback.gain.setTargetAtTime(0.89, currentTime, 0.05);
                    effect.wet.gain.setTargetAtTime(0.8, currentTime, 0.1);
                    break;

                case 'dropout':
                    effect.tapeFilter.frequency.setValueAtTime(7000, currentTime);
                    effect.tapeFilter.frequency.exponentialRampToValueAtTime(4000, currentTime + 0.2);
                    effect.feedback.gain.setTargetAtTime(effect.settings.feedbackGain, currentTime, 0.01);
                    effect.wet.gain.setTargetAtTime(0.75, currentTime, 0.01);
                    break;

                case 'spring':
                    effect.feedback.gain.setTargetAtTime(effect.settings.feedbackGain, currentTime, 0.005);
                    effect.wet.gain.setTargetAtTime(0.65, currentTime, 0.005);
                    break;

                case 'ghost':
                    effect.feedback.gain.setTargetAtTime(effect.settings.feedbackGain, currentTime, 0.1);
                    effect.wet.gain.setTargetAtTime(0.7, currentTime, 0.2);
                    effect.lfoGain.gain.setTargetAtTime(0.002, currentTime, 0.1);
                    break;

                default:
                    effect.feedback.gain.setTargetAtTime(effect.settings.feedbackGain, currentTime, 0.01);
                    effect.wet.gain.setTargetAtTime(0.7, currentTime, 0.01);
            }
        } else {
            effect.feedback.gain.cancelScheduledValues(currentTime);
            effect.wet.gain.cancelScheduledValues(currentTime);

            switch (effect.type) {
                case 'tubby':
                    effect.resonantFilter.frequency.exponentialRampToValueAtTime(200, currentTime + 2.0);
                    effect.resonantFilter2.frequency.exponentialRampToValueAtTime(400, currentTime + 1.5);
                    effect.filterGain.gain.setTargetAtTime(0.4, currentTime, 0.5);
                    effect.feedback.gain.setTargetAtTime(0.7, currentTime, 0.5);
                    effect.feedback.gain.setTargetAtTime(0.5, currentTime + 1.0, 0.5);
                    effect.feedback.gain.setTargetAtTime(0, currentTime + 2.0, 1.0);
                    effect.wet.gain.setTargetAtTime(0.6, currentTime, 0.5);
                    effect.wet.gain.setTargetAtTime(0, currentTime + 2.0, 1.5);
                    break;

                case 'dropout':
                    effect.tapeFilter.frequency.exponentialRampToValueAtTime(2000, currentTime + 0.5);
                    effect.feedback.gain.setTargetAtTime(0, currentTime, 1.0);
                    effect.wet.gain.setTargetAtTime(0, currentTime, 1.5);
                    break;

                case 'spring':
                    effect.feedback.gain.setTargetAtTime(0, currentTime, 0.5);
                    effect.wet.gain.setTargetAtTime(0, currentTime, 1.0);
                    break;

                case 'ghost':
                    effect.lfoGain.gain.setTargetAtTime(0, currentTime, 0.5);
                    effect.feedback.gain.setTargetAtTime(0, currentTime, 2.0);
                    effect.wet.gain.setTargetAtTime(0, currentTime, 2.5);
                    break;

                default:
                    if (effectName === 'reverb') {
                        effect.feedback.gain.setTargetAtTime(0, currentTime, 0.2);
                        effect.wet.gain.setTargetAtTime(0, currentTime, 0.8);
                    } else {
                        effect.feedback.gain.setTargetAtTime(effect.settings.feedbackGain * 0.7, currentTime, 0.5);
                        effect.feedback.gain.setTargetAtTime(effect.settings.feedbackGain * 0.5, currentTime + 0.5, 0.5);
                        effect.feedback.gain.setTargetAtTime(0, currentTime + 1, 1.5);
                        effect.wet.gain.setTargetAtTime(effect.wet.gain.value * 0.95, currentTime, 0.3);
                        effect.wet.gain.setTargetAtTime(0, currentTime + 1, 2.0);
                    }
            }
        }
    }

    cleanup() {
        Object.values(this.effects).forEach(effect => {
            if (effect.lfo) effect.lfo.stop();

            effect.feedback.gain.value = 0;
            effect.wet.gain.value = 0;

            effect.delay.disconnect();
            effect.feedback.disconnect();
            effect.filter.disconnect();
            effect.wet.disconnect();

            if (effect.resonantFilter) effect.resonantFilter.disconnect();
            if (effect.resonantFilter2) effect.resonantFilter2.disconnect();
            if (effect.filterGain) effect.filterGain.disconnect();
            if (effect.tapeFilter) effect.tapeFilter.disconnect();
            if (effect.waveshaper) effect.waveshaper.disconnect();
            if (effect.allpass1) effect.allpass1.disconnect();
            if (effect.allpass2) effect.allpass2.disconnect();
            if (effect.pitchDelay) effect.pitchDelay.disconnect();
            if (effect.lfoGain) effect.lfoGain.disconnect();
        });
    }
}

// ES Module export
export default DubEffects;