const { ClearMsg } = require("@twurple/chat");
const utils = require("../../utils/");

const listener = {
    name: "updateDeletedMessages",
    eventName: "onMessageRemove",
    /**
     * 
     * @param {string} channel 
     * @param {string} messageId 
     * @param {ClearMsg} msg 
     */
    listener: async (channel, messageId, msg) => {
        try {
            const message = await utils.Schemas.TwitchChat.findById(messageId);
            if (message) {
                message.deleted = true;
                await message.save();
            }
        } catch(e) {
            console.error(e);
        }
    }
};

module.exports = listener;