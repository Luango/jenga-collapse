import * as THREE from 'three';

export class CameraController {
    constructor(camera) {
        this.camera = camera;
        this.phase = 'safe';

        // Phase configurations
        this.configs = {
            safe: {
                position: new THREE.Vector3(3.5, 2.5, 3.5),
                lookAt: new THREE.Vector3(0, 0.8, 0),
                fov: 55,
                shakeIntensity: 0
            },
            anxiety: {
                position: new THREE.Vector3(2.8, 2.2, 2.8),
                lookAt: new THREE.Vector3(0, 0.7, 0),
                fov: 50,
                shakeIntensity: 0.002
            },
            critical: {
                position: new THREE.Vector3(2.2, 1.8, 2.2),
                lookAt: new THREE.Vector3(0, 0.6, 0),
                fov: 35, // Dolly zoom: narrow FOV + closer = vertigo
                shakeIntensity: 0.008
            }
        };

        this.currentConfig = { ...this.configs.safe };
        this.targetConfig = this.configs.safe;
        this.shakeOffset = new THREE.Vector3();
        this.lookAtTarget = new THREE.Vector3(0, 0.8, 0);
        this.time = 0;

        // Initialize camera
        this.camera.position.copy(this.configs.safe.position);
        this.camera.fov = this.configs.safe.fov;
        this.camera.lookAt(this.configs.safe.lookAt);
        this.camera.updateProjectionMatrix();
    }

    setPhase(phase) {
        if (this.configs[phase]) {
            this.phase = phase;
            this.targetConfig = this.configs[phase];
        }
    }

    reset() {
        this.phase = 'safe';
        this.targetConfig = this.configs.safe;
        this.shakeOffset.set(0, 0, 0);
        this.time = 0;
    }

    update(dt) {
        this.time += dt;
        const lerpSpeed = 1.5 * dt;

        // Lerp position
        this.camera.position.lerp(this.targetConfig.position, lerpSpeed);

        // Lerp FOV (dolly zoom effect)
        this.camera.fov += (this.targetConfig.fov - this.camera.fov) * lerpSpeed;
        this.camera.updateProjectionMatrix();

        // Lerp look-at
        this.lookAtTarget.lerp(this.targetConfig.lookAt, lerpSpeed);

        // Camera shake
        const shake = this.targetConfig.shakeIntensity;
        if (shake > 0) {
            this.shakeOffset.set(
                (Math.random() - 0.5) * shake,
                (Math.random() - 0.5) * shake,
                (Math.random() - 0.5) * shake
            );
        } else {
            this.shakeOffset.lerp(new THREE.Vector3(), 0.1);
        }

        // Subtle breathing sway in all phases
        const sway = this.phase === 'safe' ? 0.01 : this.phase === 'anxiety' ? 0.02 : 0.005;
        const swayOffset = new THREE.Vector3(
            Math.sin(this.time * 0.5) * sway,
            Math.cos(this.time * 0.3) * sway * 0.5,
            0
        );

        const finalLookAt = this.lookAtTarget.clone().add(this.shakeOffset).add(swayOffset);
        this.camera.lookAt(finalLookAt);
    }
}
