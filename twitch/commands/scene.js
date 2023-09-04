const tmi = require("tmi.js");

let isLocked = false;
const command = {
    name: "scene",
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
                return reply("scene changing is currently locked!");

            const sceneName = args[0].toLowerCase();
            if (sceneName === "tms" || sceneName === "overview") {
                global.broadcast("overview", "all", JSON.stringify({
                    changeScene: "TMS Overview",
                }));
            } else if (sceneName === "wos") {
                global.broadcast("overview", "all", JSON.stringify({
                    changeScene: "WOS",
                }));
            } else if (sceneName === "lock" && tags.mod) {
                isLocked = true;
                return reply("scene changing locked!");
            } else if (sceneName === "unlock" && tags.mod) {
                isLocked = false;
                return reply("scene changing unlocked!");
            } else {
                return reply(`unknown scene '${sceneName}'!`);
            }
            return reply(`scene changed to '${sceneName}'!`);
        }
    }
}

module.exports = command;
