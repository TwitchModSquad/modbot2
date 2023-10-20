const mongoose = require("mongoose");

const gameSchema = new mongoose.Schema({
    gameType: {
        type: String,
        required: true,
        enum: ["wos", "sudoku", "crossmath"],
    },
    sudoku: {
        unsolved: [Number],
        board: [Number],
        solution: [Number],
        difficulty: Number,
    },
    leaderboard: {
        type: [[String, Number]],
        default: [],
    },
    start_time: {
        type: Date,
        default: Date.now,
    },
    end_time: {
        type: Date,
        default: null,
    },
});

gameSchema.methods.getLeaderboard = async function() {
    this.leaderboard.sort((a,b) => b[1] - a[1]);
    let leaderboard = [];
    for (let i = 0; i < this.leaderboard.length; i++) {
        leaderboard.push({
            user: (await global.utils.Twitch.getUserById(this.leaderboard[i][0])).public(),
            score: this.leaderboard[i][1],
        });
    }
    return leaderboard;
}

gameSchema.methods.getRemainingSudoku = function() {
    if (this.gameType !== "sudoku") return null;

    let remaining = [9,9,9,9,9,9,9,9,9];
    this.sudoku.board.forEach(x => {
        remaining[x-1]--;
    });
    return remaining;
}

gameSchema.methods.getTimeElapsedSeconds = function() {
    let endTime = this.end_time;
    if (!endTime) endTime = Date.now();
    return (endTime - this.start_time) / 1000;
}

gameSchema.methods.getFormattedTimeElapsed = function() {
    let elapsedSeconds = this.getTimeElapsedSeconds();

    let minutes = Math.floor(elapsedSeconds / 60);
    let seconds = elapsedSeconds % 60;

    return `${minutes > 0 ? ` ${minutes} minute${minutes === 1 ? "" : "s"} ` : ""}${seconds} second${seconds === 1 ? "" : "s"}`.trim();
}

module.exports = mongoose.model("TwitchChatGame", gameSchema);
