const { ButtonInteraction } = require("discord.js");
const utils = require("../../../../utils");

const listener = {
    name: 'reinstateBanButton',
    /**
     * Verifies a button press should be sent to this listener
     * @param {ButtonInteraction} interaction 
     */
    verify(interaction) {
        return interaction.component.customId === "reinstate-ban";
    },
    /**
     * Listener for a button press
     * @param {ButtonInteraction} interaction 
     */
    async listener (interaction) {
        const banMessage = await utils.Schemas.DiscordMessage.findById(interaction.message.id)
            .populate("twitchBan");

        if (!banMessage || !banMessage.twitchBan) {
            return interaction.error("No ban record found for this message!");
        }
        
        const message = await banMessage.twitchBan.message(true, true, null);

        const logMessage = async message => {
            try {
                await utils.Schemas.DiscordMessage.create({
                    _id: message.id,
                    guild: message.guild.id,
                    channel: message.channel.id,
                    twitchBan: banMessage.twitchBan._id,
                });
            } catch(e) {
                console.error(e);
            }
        }

        utils.Discord.channels.ban.tms.send(message).then(logMessage, console.error);
        utils.Discord.channels.ban.tlms.send(message).then(logMessage, console.error);

        interaction.message.delete().then(() => {
            banMessage.deleteOne().catch(console.error);
        }, console.error);
        interaction.success("Successfully reinstated ban!");
    }
};

module.exports = listener;
