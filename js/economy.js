// Economy system: bust probability, multiplier curve, balance management

export class Economy {
    constructor() {
        this.balance = 1000;
        this.currentBet = 0;
        this.pullCount = 0;

        // Bust probability per pull index (0-indexed)
        // Pulls 0-2: 0%, then escalating
        this.bustProbabilities = [
            0, 0, 0,        // pulls 1-3: safe
            0.02, 0.05,     // pulls 4-5: low risk
            0.09, 0.14,     // pulls 6-7: medium risk
            0.20, 0.27,     // pulls 8-9: high risk
            0.35, 0.44,     // pulls 10-11: very high
            0.54, 0.65,     // pulls 12-13: extreme
            0.75, 0.85,     // pulls 14-15: near certain
            0.95, 0.99      // pulls 16-17: basically dead
        ];

        // Multiplier at each pull count
        this.multipliers = [
            1.00,           // start (no pulls yet)
            1.10, 1.20, 1.30,          // pulls 1-3: +0.1x
            1.50, 1.90, 2.60, 3.60,    // pulls 4-7: accelerating
            5.20, 7.60,                 // pulls 8-9: big jumps
            11.00, 16.00,               // pulls 10-11: huge
            24.00, 36.00,               // pulls 12-13: massive
            54.00, 81.00,               // pulls 14-15: insane
            120.00, 180.00              // pulls 16-17: legendary
        ];
    }

    placeBet(amount) {
        amount = Math.floor(amount);
        if (amount < 1 || amount > this.balance) return false;
        this.currentBet = amount;
        this.balance -= amount;
        this.pullCount = 0;
        return true;
    }

    getCurrentMultiplier() {
        const idx = Math.min(this.pullCount, this.multipliers.length - 1);
        return this.multipliers[idx];
    }

    getNextMultiplier() {
        const idx = Math.min(this.pullCount + 1, this.multipliers.length - 1);
        return this.multipliers[idx];
    }

    getPotentialWin() {
        return Math.floor(this.currentBet * this.getCurrentMultiplier());
    }

    getBustProbability() {
        const idx = Math.min(this.pullCount, this.bustProbabilities.length - 1);
        return this.bustProbabilities[idx];
    }

    // Returns true if busted, false if survived
    pull() {
        const prob = this.getBustProbability();
        const roll = Math.random();
        const busted = roll < prob;

        if (!busted) {
            this.pullCount++;
        }

        return busted;
    }

    cashOut() {
        const winnings = this.getPotentialWin();
        this.balance += winnings;
        const profit = winnings - this.currentBet;
        return { winnings, profit, multiplier: this.getCurrentMultiplier() };
    }

    bust() {
        return { lost: this.currentBet };
    }

    getPhase() {
        if (this.pullCount <= 3) return 'safe';
        if (this.pullCount <= 7) return 'anxiety';
        return 'critical';
    }
}
