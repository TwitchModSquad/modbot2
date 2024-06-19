const { ChatMessage } = require("@twurple/chat");
const ListenClient = require("../ListenClient");
const utils = require("../../utils/");

const command = {
    name: "s",
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
        if (args.length === 0) return reply("you must specify a streamer login!");

        try {
            const retrievedStreamer = await utils.Twitch.getUserByName(args[0]);

            const stream = utils.StatsManager.getMemberStreams().find(x => x.user.id === retrievedStreamer._id);
            if (stream) {
                reply(`${retrievedStreamer.display_name} is currently streaming "${stream.game.name}" to ${utils.comma(stream.viewers)} viewer${stream.viewers === 1 ? "" : "s"} with title "${stream.title}" - visit them at twitch.tv/${retrievedStreamer.login}`);
            } else {
                reply(`${retrievedStreamer.display_name} is currently not streaming!`);
            }
        } catch(err) {
            console.error(err);
            reply("Streamer not found!");
        }
    }
}

module.exports = command;
