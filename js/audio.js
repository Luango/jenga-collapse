// Audio engine using Web Audio API - no external files needed

export class AudioEngine {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.heartbeatInterval = null;
        this.tensionOsc = null;
        this.tensionGain = null;
        this.phase = 'safe';
        this.initialized = false;
    }

    init() {
        if (this.initialized) return;
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.6;
        this.masterGain.connect(this.ctx.destination);
        this.initialized = true;
    }

    resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    // Short percussive wood knock sound
    playPullSound() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;

        // Noise burst for wood impact
        const bufferSize = this.ctx.sampleRate * 0.08;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.1));
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 800;
        filter.Q.value = 2;

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.5, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);
        noise.start(now);
        noise.stop(now + 0.1);
    }

    // Coin ding sound
    playCoinSound() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200, now);
        osc.frequency.exponentialRampToValueAtTime(800, now + 0.15);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.3);
    }

    // Wood creak sound
    playCreakSound() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;

        const bufferSize = this.ctx.sampleRate * 0.4;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        let phase = 0;
        for (let i = 0; i < bufferSize; i++) {
            const t = i / this.ctx.sampleRate;
            phase += (200 + Math.sin(t * 8) * 100) / this.ctx.sampleRate;
            data[i] = Math.sin(phase * Math.PI * 2) * 0.3 * Math.exp(-t * 4)
                     + (Math.random() * 2 - 1) * 0.1 * Math.exp(-t * 6);
        }

        const source = this.ctx.createBufferSource();
        source.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 400;
        filter.Q.value = 3;

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

        source.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);
        source.start(now);
    }

    // Explosion boom
    playExplosionSound() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;

        // Low boom
        const osc = this.ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(80, now);
        osc.frequency.exponentialRampToValueAtTime(20, now + 0.5);

        const oscGain = this.ctx.createGain();
        oscGain.gain.setValueAtTime(0.8, now);
        oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

        osc.connect(oscGain);
        oscGain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.6);

        // Noise crash
        const bufferSize = this.ctx.sampleRate * 0.3;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.15));
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.6, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

        noise.connect(noiseGain);
        noiseGain.connect(this.masterGain);
        noise.start(now);
    }

    // Cash out success chime
    playCashOutSound() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;

        const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
        notes.forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.value = freq;

            const gain = this.ctx.createGain();
            const t = now + i * 0.1;
            gain.gain.setValueAtTime(0, t);
            gain.gain.linearRampToValueAtTime(0.2, t + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(t);
            osc.stop(t + 0.5);
        });
    }

    // Heartbeat - continuous pulsing
    startHeartbeat(bpm) {
        this.stopHeartbeat();
        if (!this.ctx) return;

        const interval = 60000 / bpm;
        const beat = () => {
            if (!this.ctx) return;
            const now = this.ctx.currentTime;

            // Double thump
            for (let i = 0; i < 2; i++) {
                const osc = this.ctx.createOscillator();
                osc.type = 'sine';
                const t = now + i * 0.12;
                osc.frequency.setValueAtTime(i === 0 ? 60 : 50, t);
                osc.frequency.exponentialRampToValueAtTime(30, t + 0.15);

                const gain = this.ctx.createGain();
                gain.gain.setValueAtTime(i === 0 ? 0.4 : 0.25, t);
                gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

                osc.connect(gain);
                gain.connect(this.masterGain);
                osc.start(t);
                osc.stop(t + 0.2);
            }
        };

        beat();
        this.heartbeatInterval = setInterval(beat, interval);
    }

    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    // High tension wire sound
    startTensionWire(intensity) {
        this.stopTensionWire();
        if (!this.ctx) return;

        this.tensionOsc = this.ctx.createOscillator();
        this.tensionOsc.type = 'sawtooth';
        this.tensionOsc.frequency.value = 2000 + intensity * 1500;

        this.tensionGain = this.ctx.createGain();
        this.tensionGain.gain.value = 0.03 * intensity;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 3000;

        this.tensionOsc.connect(filter);
        filter.connect(this.tensionGain);
        this.tensionGain.connect(this.masterGain);
        this.tensionOsc.start();
    }

    stopTensionWire() {
        if (this.tensionOsc) {
            try { this.tensionOsc.stop(); } catch (e) {}
            this.tensionOsc = null;
        }
    }

    // Kill all audio instantly (for bust)
    killAll() {
        this.stopHeartbeat();
        this.stopTensionWire();
        if (this.masterGain) {
            this.masterGain.gain.setValueAtTime(0, this.ctx.currentTime);
            setTimeout(() => {
                if (this.masterGain) {
                    this.masterGain.gain.setValueAtTime(0.6, this.ctx.currentTime);
                }
            }, 100);
        }
    }

    setPhase(phase) {
        this.phase = phase;
        if (!this.ctx) return;

        switch (phase) {
            case 'safe':
                this.stopHeartbeat();
                this.stopTensionWire();
                break;
            case 'anxiety':
                this.startHeartbeat(70);
                this.stopTensionWire();
                break;
            case 'critical':
                this.startHeartbeat(140);
                this.startTensionWire(0.7);
                break;
        }
    }
}
