const { ChatMessage } = require("@twurple/chat");
const ListenClient = require("../ListenClient");
const utils = require("../../utils/");

let isLocked = false;
const command = {
    name: "scene",
    /**
     * Listener for a message
     * @param {ListenClient} client 
     * @param {utils.Schemas.TwitchUser} streamer 
     * @param {utils.Schemas.TwitchUser} chatter 
     * @param {string[]} args
     * @param {ChatMessage} msg 
     * @param {string} message
     * @param {function} reply
     */
    execute: async (client, streamer, chatter, args, msg, message, reply) => {
        if (args.length > 0) {
            if (isLocked && !tags.mod)
                return reply("scene changing is currently locked!");

            const sceneName = args[0].toLowerCase();
            if (sceneName === "tms" || sceneName === "overview") {
                global.overviewBroadcast("scene", {
                    changeScene: "TMS Overview",
                });
            } else if (sceneName === "wos") {
                global.overviewBroadcast("scene", {
                    changeScene: "WOS",
                });
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
