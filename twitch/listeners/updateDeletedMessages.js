const utils = require("../../utils/");

const listener = {
    name: "updateDeletedMessages",
    eventName: "messageDeleted",
    listener: async (channel, username, deletedMessage, userstate) => {
        try {
            console.log(userstate);
            const message = await utils.Schemas.TwitchChat.findById(userstate.id);
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