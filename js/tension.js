import * as THREE from 'three';

// Tension Phase Manager - orchestrates camera, lighting, audio, UI based on pull count

export class TensionManager {
    constructor(scene, cameraCtrl, audioEngine, tower) {
        this.scene = scene;
        this.cameraCtrl = cameraCtrl;
        this.audio = audioEngine;
        this.tower = tower;
        this.phase = 'safe';
        this.pullCount = 0;

        // Lighting setup
        this.ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
        this.scene.add(this.ambientLight);

        // Warm top light (safe phase)
        this.topLight = new THREE.DirectionalLight(0xFFF4E0, 1.0);
        this.topLight.position.set(2, 6, 2);
        this.topLight.castShadow = true;
        this.topLight.shadow.mapSize.width = 1024;
        this.topLight.shadow.mapSize.height = 1024;
        this.topLight.shadow.camera.near = 0.5;
        this.topLight.shadow.camera.far = 15;
        this.topLight.shadow.camera.left = -3;
        this.topLight.shadow.camera.right = 3;
        this.topLight.shadow.camera.top = 3;
        this.topLight.shadow.camera.bottom = -3;
        this.scene.add(this.topLight);

        // Cold side light (anxiety phase)
        this.sideLight = new THREE.SpotLight(0x4466AA, 0);
        this.sideLight.position.set(-4, 3, 0);
        this.sideLight.angle = Math.PI / 4;
        this.sideLight.penumbra = 0.5;
        this.scene.add(this.sideLight);

        // Red alert light (critical phase)
        this.alertLight = new THREE.PointLight(0xFF2200, 0, 8);
        this.alertLight.position.set(0, -0.5, 0);
        this.scene.add(this.alertLight);

        // Floor
        this.floor = this._createFloor();
        this.scene.add(this.floor);

        // Background
        this.scene.background = new THREE.Color(0x1a1a2e);
        this.scene.fog = new THREE.Fog(0x1a1a2e, 8, 20);

        this.time = 0;
        this.targetLighting = { top: 1.0, side: 0, alert: 0, ambient: 0.3 };
    }

    _createFloor() {
        const geo = new THREE.PlaneGeometry(20, 20);
        const mat = new THREE.MeshStandardMaterial({
            color: 0x2a2a3e,
            roughness: 0.9,
            metalness: 0.1
        });
        const floor = new THREE.Mesh(geo, mat);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        return floor;
    }

    setPhase(phase, pullCount) {
        this.phase = phase;
        this.pullCount = pullCount;

        this.cameraCtrl.setPhase(phase);
        this.audio.setPhase(phase);

        switch (phase) {
            case 'safe':
                this.targetLighting = { top: 1.0, side: 0, alert: 0, ambient: 0.3 };
                this.scene.background = new THREE.Color(0x1a1a2e);
                this.scene.fog.color = new THREE.Color(0x1a1a2e);
                this.tower.setTremor(false);
                break;

            case 'anxiety':
                this.targetLighting = { top: 0.4, side: 1.5, alert: 0, ambient: 0.15 };
                this.scene.background = new THREE.Color(0x121225);
                this.scene.fog.color = new THREE.Color(0x121225);
                this.tower.addSettlement(pullCount - 3);
                this.tower.setTremor(false);
                break;

            case 'critical':
                const intensity = Math.min((pullCount - 7) * 0.3 + 0.5, 2.0);
                this.targetLighting = { top: 0.15, side: 0.5, alert: intensity, ambient: 0.05 };
                this.scene.background = new THREE.Color(0x0a0a15);
                this.scene.fog.color = new THREE.Color(0x0a0a15);
                this.tower.setTremor(true, intensity);
                break;
        }
    }

    onPull(pullCount) {
        this.pullCount = pullCount;
        const phase = pullCount <= 3 ? 'safe' : pullCount <= 7 ? 'anxiety' : 'critical';

        if (phase !== this.phase) {
            this.setPhase(phase, pullCount);
        }

        // Phase-specific pull feedback
        if (phase === 'safe') {
            this.audio.playPullSound();
            this.audio.playCoinSound();
        } else if (phase === 'anxiety') {
            this.audio.playPullSound();
            this.audio.playCreakSound();
            this.audio.playCoinSound();
            this.tower.addSettlement(1);
        } else {
            this.audio.playPullSound();
            this.audio.playCreakSound();
            this.audio.playCoinSound();
            this.tower.addSettlement(0.5);
            // Increase tremor
            const intensity = Math.min((pullCount - 7) * 0.3 + 0.5, 2.0);
            this.tower.setTremor(true, intensity);
        }
    }

    onBust() {
        this.audio.killAll();
        setTimeout(() => this.audio.playExplosionSound(), 50);
        this.tower.explode();

        // Flash alert
        this.alertLight.intensity = 5;

        // Reset lighting after a beat
        setTimeout(() => {
            this.targetLighting = { top: 0.1, side: 0, alert: 0, ambient: 0.1 };
        }, 300);
    }

    onCashOut() {
        this.audio.stopHeartbeat();
        this.audio.stopTensionWire();
        this.audio.playCashOutSound();
        this.tower.setTremor(false);
    }

    reset() {
        this.phase = 'safe';
        this.pullCount = 0;
        this.cameraCtrl.reset();
        this.audio.stopHeartbeat();
        this.audio.stopTensionWire();
        this.setPhase('safe', 0);
    }

    update(dt) {
        this.time += dt;
        const lerpSpeed = 2 * dt;

        // Lerp lighting
        this.topLight.intensity += (this.targetLighting.top - this.topLight.intensity) * lerpSpeed;
        this.sideLight.intensity += (this.targetLighting.side - this.sideLight.intensity) * lerpSpeed;
        this.ambientLight.intensity += (this.targetLighting.ambient - this.ambientLight.intensity) * lerpSpeed;

        // Alert light: flicker in critical phase
        if (this.phase === 'critical') {
            const flicker = Math.sin(this.time * 8) * 0.5 + 0.5;
            const targetAlert = this.targetLighting.alert * (0.5 + flicker * 0.5);
            this.alertLight.intensity += (targetAlert - this.alertLight.intensity) * 0.2;
        } else {
            this.alertLight.intensity += (this.targetLighting.alert - this.alertLight.intensity) * lerpSpeed;
        }

        this.cameraCtrl.update(dt);
    }
}
