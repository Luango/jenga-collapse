import * as THREE from 'three';
import { Tower } from './tower.js';
import { CameraController } from './camera.js';
import { AudioEngine } from './audio.js';
import { TensionManager } from './tension.js';
import { UIManager } from './ui.js';
import { Economy } from './economy.js';

// Game States
const STATE = {
    BETTING: 'betting',
    PLAYING: 'playing',
    PULLING: 'pulling', // animation lock
    BUSTED: 'busted',
    CASHED_OUT: 'cashed_out'
};

class Game {
    constructor() {
        this.state = STATE.BETTING;
        this.economy = new Economy();

        // Three.js setup
        this.canvas = document.getElementById('game-canvas');
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true,
            alpha: false
        });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;

        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 100);

        // Systems
        this.cameraCtrl = new CameraController(this.camera);
        this.audio = new AudioEngine();
        this.tower = new Tower(this.scene);
        this.tension = new TensionManager(this.scene, this.cameraCtrl, this.audio, this.tower);
        this.ui = new UIManager();

        this._setupEvents();
        this._resize();
        window.addEventListener('resize', () => this._resize());

        // Initial state
        this.ui.updateBalance(this.economy.balance);
        this.ui.setMaxBet(this.economy.balance);
        this.ui.showScreen('bet');

        // Build tower for background visual
        this.tower.build();

        // Start render loop
        this.clock = new THREE.Clock();
        this._animate();
    }

    _resize() {
        const w = window.innerWidth;
        const h = window.innerHeight;
        this.renderer.setSize(w, h);
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
    }

    _setupEvents() {
        this.ui.onStart(() => this._startGame());
        this.ui.onPull(() => this._pull());
        this.ui.onCashOut(() => this._cashOut());
        this.ui.onBustedContinue(() => this._returnToBetting());
        this.ui.onWinContinue(() => this._returnToBetting());

        // Initialize audio on first user interaction
        document.addEventListener('click', () => {
            this.audio.init();
            this.audio.resume();
        }, { once: true });
    }

    _startGame() {
        if (this.state !== STATE.BETTING) return;

        const betAmount = this.ui.getBetAmount();
        if (!this.economy.placeBet(betAmount)) {
            // Invalid bet - flash the input
            this.ui.elements.betInput.classList.add('error');
            setTimeout(() => this.ui.elements.betInput.classList.remove('error'), 500);
            return;
        }

        this.audio.init();
        this.audio.resume();

        this.state = STATE.PLAYING;
        this.tower.build();
        this.tension.reset();

        this.ui.updateBalance(this.economy.balance);
        this.ui.updateMultiplier(this.economy.getCurrentMultiplier());
        this.ui.updateCashoutAmount(this.economy.getPotentialWin());
        this.ui.updatePotentialWin(this.economy.getPotentialWin());
        this.ui.updatePullCount(0);
        this.ui.setPhase('safe');
        this.ui.showScreen('game');
        this.ui.enablePull();
    }

    _pull() {
        if (this.state !== STATE.PLAYING) return;

        // Temporarily lock to prevent spam
        this.state = STATE.PULLING;
        this.ui.disablePull();

        const busted = this.economy.pull();

        if (busted) {
            this.state = STATE.BUSTED;
            const result = this.economy.bust();
            this.tension.onBust();

            // Delay showing bust screen for explosion effect
            setTimeout(() => {
                this.ui.showBusted(result.lost);
                this.ui.updateBalance(this.economy.balance);
            }, 800);
        } else {
            // Successful pull
            this.tower.pullRandom();
            this.tension.onPull(this.economy.pullCount);

            const phase = this.economy.getPhase();
            this.ui.setPhase(phase);
            this.ui.updateMultiplier(this.economy.getCurrentMultiplier());
            this.ui.updateCashoutAmount(this.economy.getPotentialWin());
            this.ui.updatePotentialWin(this.economy.getPotentialWin());
            this.ui.updatePullCount(this.economy.pullCount);

            // Re-enable after brief animation delay
            setTimeout(() => {
                if (this.state === STATE.PULLING) {
                    this.state = STATE.PLAYING;
                    this.ui.enablePull();
                }
            }, 400);
        }
    }

    _cashOut() {
        if (this.state !== STATE.PLAYING && this.state !== STATE.PULLING) return;

        this.state = STATE.CASHED_OUT;
        const result = this.economy.cashOut();
        this.tension.onCashOut();

        setTimeout(() => {
            this.ui.showWin(result.multiplier, result.profit);
            this.ui.updateBalance(this.economy.balance);
        }, 300);
    }

    _returnToBetting() {
        this.state = STATE.BETTING;
        this.tension.reset();
        this.tower.build();

        this.ui.updateBalance(this.economy.balance);
        this.ui.setMaxBet(this.economy.balance);

        // Check if player is broke
        if (this.economy.balance <= 0) {
            this.economy.balance = 1000; // Free refill
            this.ui.updateBalance(this.economy.balance);
            this.ui.setMaxBet(this.economy.balance);
        }

        this.ui.showScreen('bet');
    }

    _animate() {
        requestAnimationFrame(() => this._animate());

        const dt = Math.min(this.clock.getDelta(), 0.05); // Cap delta

        this.tower.update(dt);
        this.tension.update(dt);
        this.renderer.render(this.scene, this.camera);
    }
}

// Boot
new Game();
