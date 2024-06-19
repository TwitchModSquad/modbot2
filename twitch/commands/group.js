const mongoose = require("mongoose");

const { ChatMessage } = require("@twurple/chat");
const ListenClient = require("../ListenClient");
const utils = require("../../utils/");

const GROUP_TIME_CUTOFF = 6 * 60 * 60 * 1000;

const command = {
    name: "group",
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
            if (args[0].toLowerCase() === "join" && (msg.userInfo.isMod || msg.userInfo.isBroadcaster)) {
                if (args.length > 1) {
                    try {
                        const group = await utils.Schemas.Group.findById(new mongoose.Types.ObjectId(args[1]))
                            .populate("posted_by")
                            .populate("game");

                        if (group) {
                            await utils.Schemas.GroupUser.create({
                                group: group._id,
                                user: streamer._id,
                            });

                            group.updateMessage().catch(console.error);

                            reply(`Successfully joined group ID ${group._id}${group?.game?.name ? ` playing ${group.game.name}` : ""}`, false)
                        } else {
                            reply(`${args[1]} is not a valid group ID!`);
                        }
                    } catch(e) {
                        reply(`${args[1]} is not a valid group ID!`);
                    }
                } else {
                    reply("not enough arguments!");
                }
                return;
            }
        }


        const groupUsers = await utils.Schemas.GroupUser.find({user: streamer._id})
                .populate("group");

        for (let i = 0; i < groupUsers.length; i++) {
            const group = groupUsers[i].group;
            if (!group.start_time) return;
            if (Date.now() < group.start_time) return;
            if (group?.end_time && Date.now() > group.end_time) return;
            if (Date.now() > group.start_time + GROUP_TIME_CUTOFF) return;

            const users = await group.getUsers();

            reply(`${streamer.display_name} is playing with ${users.filter(x => x.user._id !== streamer._id).map(x => x.user.display_name).join(", ")}`, false);

            return;
        }

        reply(`No group was found for ${streamer.display_name}!`, false)
    }
}

module.exports = command;
