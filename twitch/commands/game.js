const tmi = require("tmi.js");
const sudoku = require("sudoku");

const utils = require("../../utils/");

const VALID_GAMES = ["wos", "sudoku"];

let isLocked = false;
const command = {
    name: "game",
    game: null,
    /**
     * Listener for a message
     * @param {ListenClient} client 
     * @param {any} streamer 
     * @param {any} chatter 
     * @param {tmi.ChatUserstate} tags 
     * @param {string} message 
     * @param {function} reply
     */
    execute: async (client, streamer, chatter, args, tags, message, reply) => {
        if (args.length > 0) {
            if (isLocked && !tags.mod)
                return reply("game changing is currently locked!");

            const game = args[0].toLowerCase();
            if (VALID_GAMES.includes(game)) {
                let data = {
                    gameType: game,
                }

                if (game === "sudoku") {
                    let puzzle = sudoku.makepuzzle();
                    let solution = sudoku.solvepuzzle(puzzle);
                    const difficulty = sudoku.ratepuzzle(puzzle, 10);

                    puzzle = puzzle.map(x => x === null ? null : x + 1);
                    solution = solution.map(x => x === null ? null : x + 1);

                    data.sudoku = {
                        unsolved: puzzle,
                        board: puzzle,
                        solution: solution,
                        difficulty: difficulty,
                    };
                }
                
                command.game = await utils.Schemas.TwitchChatGame.create(data);
                global.overviewBroadcast("game", {
                    startGame: command.game,
                });
            } else if (game === "lock" && tags.mod) {
                isLocked = true;
                return reply("game changing locked!");
            } else if (game === "unlock" && tags.mod) {
                isLocked = false;
                return reply("game changing unlocked!");
            } else {
                return reply(`unknown game '${game}'!`);
            }
            return reply(`game changed to '${game}'!`);
        }
    }
}

setTimeout(async () => {
    const game = await utils.Schemas.TwitchChatGame.findOne({end_time: null});
    if (game) {
        command.game = game;
    }
}, 50);

module.exports = command;
