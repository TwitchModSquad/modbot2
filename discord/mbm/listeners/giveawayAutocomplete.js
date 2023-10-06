const { AutocompleteInteraction } = require("discord.js");

const utils = require("../../../utils/");

const listener = {
    name: 'giveawayAutocomplete',
    eventName: 'interactionCreate',
    eventType: 'on',
    /**
     * Fired on autocomplete interaction
     * @param {AutocompleteInteraction} interaction 
     */
    async listener (interaction) {
        if (!interaction.isAutocomplete()) return;
        const opt = interaction.options.getFocused(true);
    
        if (opt.name !== "giveaway") return;

        const validGiveaways = await utils.Schemas.Giveaway.find({
                name: {
                    $regex: new RegExp(`^${utils.escapeRegExp(opt.value)}`, "i"),
                },
            })
            .sort({name: 1});

        interaction.respond(validGiveaways.map(x => {return {
            name: x.name,
            value: String(x._id),
        }}));
    }
};

module.exports = listener;
