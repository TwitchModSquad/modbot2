const config = require("../../config.json");
const utils = require("../../utils");

const CHOICE_REGEX = /([a-i][1-9]) ([1-9])/i

const gameCommand = require("../commands/game");

const INCORRECT_ANSWER_TIME = 3; // minutes

const MISTAKE_TIMEOUT_OFFSET = -15;
const MISTAKE_TIMEOUT_MULTIPLIER = 15;

const COLUMNS = ["A","B","C","D","E","F","G","H","I"];
/**
 * Converts string position (A1) to number (0, range 0-80)
 * @param {string} position 
 * @returns {number}
 */
const calculatePosition = position => {
    if (position.length !== 2) return null;
    const column = COLUMNS.indexOf(position.toUpperCase()[0]);
    const row = Number(position[1]) - 1;
    if (column !== null && row !== null) {
        return (row * 9) + column;
    } else return null;
}

let incorrectAnswers = {};
let timeouts = {};
const listener = {
    name: "sudokuListener",
    eventName: "message",
    listener: async (client, streamer, chatter, tags, message, self) => {
        if (streamer._id !== config.twitch.id) return;
        if (!gameCommand.game || gameCommand.game.gameType !== "sudoku") return;

        if (timeouts.hasOwnProperty(chatter._id)) {
            if (Date.now() <= timeouts[chatter._id]) {
                console.log(chatter.login + " on timeout");
                return;
            } else {
                delete timeouts[chatter._id];
            }
        }

        const result = CHOICE_REGEX.exec(message);

        if (!result) return;

        const position = calculatePosition(result[1]);
        const guess = Number(result[2]);

        if (position === null) return;
        if (isNaN(guess)) return;

        let broadcast = {
            sudokuAnswer: {
                position: position,
                guess: guess,
                user: chatter.public(),
                result: "incorrect",
            },
        };

        if (!incorrectAnswers.hasOwnProperty(chatter._id)) {
            incorrectAnswers[chatter._id] = [];
        }
        incorrectAnswers[chatter._id] = incorrectAnswers[chatter._id].filter(
            x => Date.now() - x < INCORRECT_ANSWER_TIME * 60 * 1000
        );

        let lbPosition = gameCommand.game.leaderboard.find(x => x[0] === chatter._id);
        if (!lbPosition) {
            lbPosition = [chatter._id, 0];
            gameCommand.game.leaderboard.push(lbPosition);
        }

        const reply = msg => {
            client.client.say(streamer.login, `${chatter.display_name}, ${msg}`);
        }

        if (gameCommand.game.sudoku.board[position] === null) {
            if (gameCommand.game.sudoku.solution[position] === guess) {
                gameCommand.game.sudoku.board[position] = guess;
                reply(`correct position! ${guess} -> ${result[1].toUpperCase()}`);
                broadcast.sudokuAnswer.result = "correct";
                lbPosition[1]++;
            } else {
                const mistakes = incorrectAnswers[chatter._id].length;
                const subtract = Math.min(mistakes, 3);
                incorrectAnswers[chatter._id].push(Date.now());
                let message = `incorrect position! You have made ${mistakes+1} mistake${mistakes === 0 ? "" : "s"} in the past ${INCORRECT_ANSWER_TIME} minutes (-${subtract} point${subtract === 1 ? "" : "s"})`;
                if (mistakes > 1) {
                    const timeoutLength = (mistakes * MISTAKE_TIMEOUT_MULTIPLIER) + MISTAKE_TIMEOUT_OFFSET;
                    message += ` and will be timed out for ${timeoutLength} seconds`;
                    timeouts[chatter._id] = Date.now() + (timeoutLength * 1000);
                }
                reply(message);
                lbPosition[1] -= subtract;
            }
        } else {
            broadcast.sudokuAnswer.result = "incompatible";
        }
        broadcast.leaderboardUpdate = await gameCommand.game.getLeaderboard();
        broadcast.remainingSudoku = gameCommand.game.getRemainingSudoku();

        let finished = true;
        broadcast.remainingSudoku.forEach(x => {
            if (x !== 0) finished = false;
        });

        global.overviewBroadcast("game", broadcast);
        await gameCommand.game.save();

        if (finished) {
            gameCommand.game.end_time = Date.now();
            await gameCommand.game.save();
            client.client.say(streamer.login, `Sudoku game completed in ${gameCommand.game.getFormattedTimeElapsed()}!`);
            setTimeout(() => {
                global.overviewBroadcast("game", {endGame: true});
            }, 2000);
            gameCommand.game = null;
        }
    }
};

module.exports = listener;