import * as THREE from 'three';

const BLOCK_WIDTH = 0.75;
const BLOCK_HEIGHT = 0.3;
const BLOCK_DEPTH = 2.25;
const LAYERS = 6;
const BLOCKS_PER_LAYER = 3;
const GAP = 0.02;

export class Tower {
    constructor(scene) {
        this.scene = scene;
        this.group = new THREE.Group();
        this.blocks = [];
        this.removedBlocks = [];
        this.flyingBlocks = [];
        this.explodingBlocks = [];
        this.dustParticles = null;
        this.tremor = { active: false, intensity: 0 };
        this.settlement = { offset: 0, tiltX: 0, tiltZ: 0 };
        this.basePosition = new THREE.Vector3(0, 0, 0);

        this.scene.add(this.group);
        this._createMaterials();
    }

    _createMaterials() {
        // Wood-like materials with slight color variation
        this.woodColors = [
            0xDEB887, 0xD2B48C, 0xC4A882,
            0xBFA07A, 0xCDB79E, 0xE8D5B7
        ];

        this.blockMaterials = this.woodColors.map(color =>
            new THREE.MeshStandardMaterial({
                color,
                roughness: 0.8,
                metalness: 0.05,
                flatShading: false
            })
        );
    }

    build() {
        this.clear();

        const blockGeo = new THREE.BoxGeometry(BLOCK_WIDTH, BLOCK_HEIGHT, BLOCK_DEPTH);

        for (let layer = 0; layer < LAYERS; layer++) {
            const isEven = layer % 2 === 0;
            const y = layer * (BLOCK_HEIGHT + GAP) + BLOCK_HEIGHT / 2;

            for (let i = 0; i < BLOCKS_PER_LAYER; i++) {
                const mat = this.blockMaterials[
                    Math.floor(Math.random() * this.blockMaterials.length)
                ].clone();

                const mesh = new THREE.Mesh(blockGeo, mat);

                if (isEven) {
                    const x = (i - 1) * (BLOCK_WIDTH + GAP);
                    mesh.position.set(x, y, 0);
                } else {
                    const z = (i - 1) * (BLOCK_WIDTH + GAP);
                    mesh.position.set(0, y, z);
                    mesh.rotation.y = Math.PI / 2;
                }

                mesh.castShadow = true;
                mesh.receiveShadow = true;
                mesh.userData = { layer, index: i, removable: true, originalPos: mesh.position.clone() };

                this.group.add(mesh);
                this.blocks.push(mesh);
            }
        }

        this.group.position.copy(this.basePosition);
        this.settlement = { offset: 0, tiltX: 0, tiltZ: 0 };
        this.tremor = { active: false, intensity: 0 };
    }

    clear() {
        this.blocks.forEach(b => {
            this.group.remove(b);
            b.geometry.dispose();
            b.material.dispose();
        });
        this.blocks = [];
        this.removedBlocks = [];
        this.flyingBlocks = [];
        this.explodingBlocks = [];
        if (this.dustParticles) {
            this.scene.remove(this.dustParticles);
            this.dustParticles = null;
        }
    }

    getRemovableBlocks() {
        return this.blocks.filter(b =>
            b.userData.removable && !this.removedBlocks.includes(b)
        );
    }

    pullRandom() {
        const removable = this.getRemovableBlocks();
        if (removable.length === 0) return null;

        // Prefer middle blocks for more dramatic visuals
        const sorted = removable.sort((a, b) => {
            const aMid = a.userData.index === 1 ? 0 : 1;
            const bMid = b.userData.index === 1 ? 0 : 1;
            return aMid - bMid;
        });

        // Pick from top candidates with some randomness
        const pickIdx = Math.random() < 0.6 ? 0 : Math.floor(Math.random() * sorted.length);
        const block = sorted[pickIdx];

        this.removedBlocks.push(block);
        this._animatePull(block);

        return block;
    }

    _animatePull(block) {
        const isEvenLayer = block.userData.layer % 2 === 0;
        const direction = new THREE.Vector3();

        if (isEvenLayer) {
            direction.set(0, 0, (Math.random() > 0.5 ? 1 : -1) * 4);
        } else {
            direction.set((Math.random() > 0.5 ? 1 : -1) * 4, 0, 0);
        }

        this.flyingBlocks.push({
            mesh: block,
            velocity: direction,
            rotVelocity: new THREE.Vector3(
                (Math.random() - 0.5) * 3,
                (Math.random() - 0.5) * 3,
                (Math.random() - 0.5) * 3
            ),
            time: 0,
            maxTime: 0.6
        });
    }

    addSettlement(amount) {
        this.settlement.offset += amount * 0.03;
        this.settlement.tiltX += (Math.random() - 0.5) * amount * 0.02;
        this.settlement.tiltZ += (Math.random() - 0.5) * amount * 0.02;
    }

    setTremor(active, intensity = 0) {
        this.tremor.active = active;
        this.tremor.intensity = intensity;
    }

    explode() {
        this.tremor.active = false;
        const remaining = this.blocks.filter(b => !this.removedBlocks.includes(b));

        remaining.forEach(block => {
            const dir = new THREE.Vector3(
                (Math.random() - 0.5) * 2,
                Math.random() * 1.5 + 0.5,
                (Math.random() - 0.5) * 2
            ).normalize();

            const speed = 8 + Math.random() * 12;

            this.explodingBlocks.push({
                mesh: block,
                velocity: dir.multiplyScalar(speed),
                rotVelocity: new THREE.Vector3(
                    (Math.random() - 0.5) * 15,
                    (Math.random() - 0.5) * 15,
                    (Math.random() - 0.5) * 15
                ),
                gravity: -20,
                time: 0
            });
        });

        // Create dust particles
        this._createDustBurst();

        return remaining;
    }

    _createDustBurst() {
        const count = 200;
        const geo = new THREE.BufferGeometry();
        const positions = new Float32Array(count * 3);
        const velocities = [];
        const towerCenter = new THREE.Vector3(0, LAYERS * BLOCK_HEIGHT / 2, 0);

        for (let i = 0; i < count; i++) {
            positions[i * 3] = towerCenter.x + (Math.random() - 0.5) * 1.5;
            positions[i * 3 + 1] = towerCenter.y + (Math.random() - 0.5) * LAYERS * BLOCK_HEIGHT;
            positions[i * 3 + 2] = towerCenter.z + (Math.random() - 0.5) * 1.5;

            velocities.push(new THREE.Vector3(
                (Math.random() - 0.5) * 6,
                Math.random() * 3,
                (Math.random() - 0.5) * 6
            ));
        }

        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const mat = new THREE.PointsMaterial({
            color: 0xD2B48C,
            size: 0.06,
            transparent: true,
            opacity: 0.8,
            sizeAttenuation: true
        });

        this.dustParticles = new THREE.Points(geo, mat);
        this.dustParticles.userData.velocities = velocities;
        this.dustParticles.userData.time = 0;
        this.scene.add(this.dustParticles);
    }

    createAmbientDust() {
        if (this.ambientDust) {
            this.scene.remove(this.ambientDust);
        }

        const count = 50;
        const geo = new THREE.BufferGeometry();
        const positions = new Float32Array(count * 3);
        const velocities = [];

        for (let i = 0; i < count; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 2;
            positions[i * 3 + 1] = Math.random() * LAYERS * BLOCK_HEIGHT + 0.5;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 2;

            velocities.push(new THREE.Vector3(
                (Math.random() - 0.5) * 0.3,
                -Math.random() * 0.2 - 0.05,
                (Math.random() - 0.5) * 0.3
            ));
        }

        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const mat = new THREE.PointsMaterial({
            color: 0xD2B48C,
            size: 0.03,
            transparent: true,
            opacity: 0.4,
            sizeAttenuation: true
        });

        this.ambientDust = new THREE.Points(geo, mat);
        this.ambientDust.userData.velocities = velocities;
        this.scene.add(this.ambientDust);
    }

    removeAmbientDust() {
        if (this.ambientDust) {
            this.scene.remove(this.ambientDust);
            this.ambientDust = null;
        }
    }

    getTowerHeight() {
        return LAYERS * (BLOCK_HEIGHT + GAP);
    }

    update(dt) {
        // Settlement and tremor
        const targetY = this.basePosition.y - this.settlement.offset;
        this.group.position.y += (targetY - this.group.position.y) * 0.05;
        this.group.rotation.x += (this.settlement.tiltX - this.group.rotation.x) * 0.03;
        this.group.rotation.z += (this.settlement.tiltZ - this.group.rotation.z) * 0.03;

        if (this.tremor.active) {
            const i = this.tremor.intensity;
            this.group.position.x = this.basePosition.x + (Math.random() - 0.5) * i * 0.05;
            this.group.position.z = this.basePosition.z + (Math.random() - 0.5) * i * 0.05;
            this.group.rotation.x += (Math.random() - 0.5) * i * 0.003;
            this.group.rotation.z += (Math.random() - 0.5) * i * 0.003;
        }

        // Animate flying blocks (pulled)
        for (let i = this.flyingBlocks.length - 1; i >= 0; i--) {
            const fb = this.flyingBlocks[i];
            fb.time += dt;
            fb.mesh.position.add(fb.velocity.clone().multiplyScalar(dt));
            fb.mesh.rotation.x += fb.rotVelocity.x * dt;
            fb.mesh.rotation.y += fb.rotVelocity.y * dt;
            fb.mesh.rotation.z += fb.rotVelocity.z * dt;
            fb.mesh.material.opacity = 1 - (fb.time / fb.maxTime);
            fb.mesh.material.transparent = true;

            if (fb.time >= fb.maxTime) {
                this.group.remove(fb.mesh);
                this.flyingBlocks.splice(i, 1);
            }
        }

        // Animate exploding blocks
        for (let i = this.explodingBlocks.length - 1; i >= 0; i--) {
            const eb = this.explodingBlocks[i];
            eb.time += dt;
            eb.velocity.y += eb.gravity * dt;
            eb.mesh.position.add(eb.velocity.clone().multiplyScalar(dt));
            eb.mesh.rotation.x += eb.rotVelocity.x * dt;
            eb.mesh.rotation.y += eb.rotVelocity.y * dt;
            eb.mesh.rotation.z += eb.rotVelocity.z * dt;

            if (eb.time > 2) {
                eb.mesh.material.opacity = Math.max(0, 1 - (eb.time - 2));
                eb.mesh.material.transparent = true;
            }

            if (eb.time > 3) {
                this.group.remove(eb.mesh);
                this.explodingBlocks.splice(i, 1);
            }
        }

        // Dust particles (explosion)
        if (this.dustParticles) {
            this.dustParticles.userData.time += dt;
            const positions = this.dustParticles.geometry.attributes.position.array;
            const vels = this.dustParticles.userData.velocities;

            for (let i = 0; i < vels.length; i++) {
                positions[i * 3] += vels[i].x * dt;
                positions[i * 3 + 1] += vels[i].y * dt;
                positions[i * 3 + 2] += vels[i].z * dt;
                vels[i].y -= 2 * dt;
            }

            this.dustParticles.geometry.attributes.position.needsUpdate = true;
            this.dustParticles.material.opacity = Math.max(0, 0.8 - this.dustParticles.userData.time * 0.4);

            if (this.dustParticles.userData.time > 2) {
                this.scene.remove(this.dustParticles);
                this.dustParticles = null;
            }
        }

        // Ambient dust
        if (this.ambientDust) {
            const positions = this.ambientDust.geometry.attributes.position.array;
            const vels = this.ambientDust.userData.velocities;
            const h = LAYERS * BLOCK_HEIGHT;

            for (let i = 0; i < vels.length; i++) {
                positions[i * 3] += vels[i].x * dt;
                positions[i * 3 + 1] += vels[i].y * dt;
                positions[i * 3 + 2] += vels[i].z * dt;

                // Reset particles that fall below ground
                if (positions[i * 3 + 1] < 0) {
                    positions[i * 3] = (Math.random() - 0.5) * 2;
                    positions[i * 3 + 1] = h + Math.random() * 0.5;
                    positions[i * 3 + 2] = (Math.random() - 0.5) * 2;
                }
            }

            this.ambientDust.geometry.attributes.position.needsUpdate = true;
        }
    }
}
