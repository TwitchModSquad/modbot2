const { StringSelectMenuInteraction } = require("discord.js");

const utils = require("../../../../utils/");

const bsCommand = require("../../commands/banscan");

const listener = {
    name: 'banScanSelect',
    /**
     * Verifies a select menu interaction should be sent to this listener
     * @param {StringSelectMenuInteraction} interaction 
     */
    verify(interaction) {
        return interaction.component.customId.startsWith("bs-");
    },
    /**
     * Listener for a select menu interaction
     * @param {StringSelectMenuInteraction} interaction 
     */
    async listener (interaction) {
        const [, type, channelId] = interaction.component.customId.split("-");

        const cache = bsCommand.store[channelId];

        if (!cache) {
            return interaction.error("Unable to retrieve cached scan! Please use the `/banscan` command again.");
        }

        if (type === "safe") {
            for (let i = 0; i < interaction.values.length; i++) {
                try {
                    const user = await utils.Twitch.getUserById(interaction.values[i]);
                    utils.safe = true;
                    await user.save();
                } catch(err) {
                    console.error(err);
                }
            }
        }
        
        cache.results = cache.results.filter(x => !interaction.values.includes(x.chatter._id));
        
        if (cache.results.length === 0) {
            return interaction.success("All results of the ban scan have been analyzed!");
        }

        cache.interaction.editReply(bsCommand.formatResultMessage(cache.channel, cache.results));

        interaction.reply({content: "Updated", ephemeral: true});
    }
};

module.exports = listener;
