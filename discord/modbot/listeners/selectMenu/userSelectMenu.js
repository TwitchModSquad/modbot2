const { StringSelectMenuInteraction } = require("discord.js");

const utils = require("../../../../utils/");

const listener = {
    name: 'userSelectMenu',
    /**
     * Verifies a select menu interaction should be sent to this listener
     * @param {StringSelectMenuInteraction} interaction 
     */
    verify(interaction) {
        return interaction.component.customId.startsWith("user-");
    },
    /**
     * Listener for a select menu interaction
     * @param {StringSelectMenuInteraction} interaction 
     */
    async listener (interaction) {
        const [, type] = interaction.component.customId.split("-");
        const id = interaction.values[0];

        let message;
        if (type === "twitch") {
            let executingTwitchUser = null;
            try {
                const discordUser = await utils.Discord.getUserById(interaction.user.id);
                if (discordUser?.identity) {
                    const twitchUsers = await discordUser.identity.getTwitchUsers();
                    if (twitchUsers.length > 0) {
                        executingTwitchUser = twitchUsers[0];
                    }
                }
            } catch(err) {
                console.error(err);
            }
            message = await (await utils.Twitch.getUserById(id)).message(executingTwitchUser);
        } else if (type === "discord") {
            message = await (await utils.Discord.getUserById(id)).message();
        }

        interaction.reply(message);
    }
};

module.exports = listener;
