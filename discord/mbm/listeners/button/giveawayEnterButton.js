const { ButtonInteraction } = require("discord.js");
const utils = require("../../../../utils");

const listener = {
    name: 'giveawayEnterButton',
    /**
     * Verifies a button press should be sent to this listener
     * @param {ButtonInteraction} interaction 
     */
    verify(interaction) {
        return interaction.component.customId === "giveaway-enter";
    },
    /**
     * Listener for a button press
     * @param {ButtonInteraction} interaction 
     */
    async listener (interaction) {
        let identity;
        try {
            const discord = await utils.Discord.getUserById(interaction.user.id, true, true);
            if (!discord?.identity) {
                return interaction.error("You must be authenticated to use this command! [Make sure you've registered on the website.](https://tms.to/join)");
            }
            identity = discord.identity;
        } catch(err) {
            console.error(err);
            return interaction.error("Unable to recognize you as a TMS member! [Make sure you've registered on the website.](https://tms.to/join)");
        }

        const discordMessage = await utils.Schemas.DiscordMessage.findById(interaction.message.id)
            .populate("giveaway");
        if (!discordMessage || !discordMessage.giveaway) {
            return interaction.error("Unable to resolve giveaway from this message!");
        }

        discordMessage.giveaway.enter(identity).then(entries => {
            interaction.success(`You successfully purchased 1 entry to \`${discordMessage.giveaway.name}\`! Total entries: \`${entries}\``)
        }, err => {
            interaction.error(err);
        });
    }
};

module.exports = listener;
