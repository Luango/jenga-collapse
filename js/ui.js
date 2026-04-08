// UI Manager - handles DOM elements, overlays, animations

export class UIManager {
    constructor() {
        this.elements = {
            multiplier: document.getElementById('multiplier-display'),
            betScreen: document.getElementById('bet-screen'),
            gameHud: document.getElementById('game-hud'),
            bustedScreen: document.getElementById('busted-screen'),
            winScreen: document.getElementById('win-screen'),
            betInput: document.getElementById('bet-input'),
            balanceAmount: document.getElementById('balance-amount'),
            startBtn: document.getElementById('start-btn'),
            pullBtn: document.getElementById('pull-btn'),
            cashoutBtn: document.getElementById('cashout-btn'),
            cashoutAmount: document.getElementById('cashout-amount'),
            pullCount: document.getElementById('pull-count'),
            winAmount: document.getElementById('win-amount'),
            lostAmount: document.getElementById('lost-amount'),
            wonAmount: document.getElementById('won-amount'),
            winMultiplier: document.getElementById('win-multiplier'),
            bustedContinue: document.getElementById('busted-continue'),
            winContinue: document.getElementById('win-continue'),
            screenCrack: document.getElementById('screen-crack'),
            potentialWin: document.getElementById('potential-win')
        };

        this.phase = 'safe';
        this.breathingAnim = null;
        this._setupBetControls();
    }

    _setupBetControls() {
        // Bet adjustment buttons
        document.querySelectorAll('.bet-adjust').forEach(btn => {
            btn.addEventListener('click', () => {
                const input = this.elements.betInput;
                const current = parseInt(input.value) || 0;
                if (btn.dataset.action === 'half') {
                    input.value = Math.max(1, Math.floor(current / 2));
                } else if (btn.dataset.action === 'double') {
                    input.value = current * 2;
                }
            });
        });

        // Preset buttons
        document.querySelectorAll('.bet-preset').forEach(btn => {
            btn.addEventListener('click', () => {
                if (btn.dataset.action === 'max') {
                    // Will be set by game logic via setMaxBet
                    this.elements.betInput.value = this.elements.betInput.max || 1000;
                } else {
                    this.elements.betInput.value = btn.dataset.amount;
                }
            });
        });
    }

    setMaxBet(max) {
        this.elements.betInput.max = max;
    }

    getBetAmount() {
        return parseInt(this.elements.betInput.value) || 0;
    }

    showScreen(screenName) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));

        switch (screenName) {
            case 'bet':
                this.elements.betScreen.classList.add('active');
                this.elements.multiplier.classList.remove('visible');
                break;
            case 'game':
                this.elements.gameHud.classList.add('active');
                this.elements.multiplier.classList.add('visible');
                break;
            case 'busted':
                this.elements.bustedScreen.classList.add('active');
                this.elements.multiplier.classList.remove('visible');
                break;
            case 'win':
                this.elements.winScreen.classList.add('active');
                this.elements.multiplier.classList.remove('visible');
                break;
        }
    }

    updateBalance(amount) {
        this.elements.balanceAmount.textContent = amount.toLocaleString();
    }

    updateMultiplier(value) {
        this.elements.multiplier.textContent = value.toFixed(2) + 'x';
    }

    updatePullCount(count) {
        this.elements.pullCount.textContent = `PULL ${count}`;
    }

    updateCashoutAmount(amount) {
        this.elements.cashoutAmount.textContent = amount.toLocaleString();
    }

    updatePotentialWin(amount) {
        this.elements.winAmount.textContent = amount.toLocaleString();
    }

    setPhase(phase) {
        this.phase = phase;
        const multiplier = this.elements.multiplier;
        const pullBtn = this.elements.pullBtn;

        multiplier.classList.remove('phase-safe', 'phase-anxiety', 'phase-critical');
        pullBtn.classList.remove('phase-safe', 'phase-anxiety', 'phase-critical');

        multiplier.classList.add(`phase-${phase}`);
        pullBtn.classList.add(`phase-${phase}`);

        if (phase === 'critical') {
            this.elements.gameHud.classList.add('critical');
        } else {
            this.elements.gameHud.classList.remove('critical');
        }
    }

    showBusted(lostAmount) {
        this.elements.lostAmount.textContent = `-${lostAmount.toLocaleString()}`;
        this.elements.screenCrack.classList.add('active');
        this.showScreen('busted');

        // Remove crack after a delay
        setTimeout(() => {
            this.elements.screenCrack.classList.remove('active');
        }, 2000);
    }

    showWin(multiplier, wonAmount) {
        this.elements.winMultiplier.textContent = multiplier.toFixed(2) + 'x';
        this.elements.wonAmount.textContent = `+${wonAmount.toLocaleString()}`;
        this.showScreen('win');
    }

    disablePull() {
        this.elements.pullBtn.disabled = true;
    }

    enablePull() {
        this.elements.pullBtn.disabled = false;
    }

    onStart(callback) {
        this.elements.startBtn.addEventListener('click', callback);
    }

    onPull(callback) {
        this.elements.pullBtn.addEventListener('click', callback);
    }

    onCashOut(callback) {
        this.elements.cashoutBtn.addEventListener('click', callback);
    }

    onBustedContinue(callback) {
        this.elements.bustedContinue.addEventListener('click', callback);
    }

    onWinContinue(callback) {
        this.elements.winContinue.addEventListener('click', callback);
    }
}
