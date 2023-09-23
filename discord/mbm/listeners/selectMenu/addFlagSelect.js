const { StringSelectMenuInteraction } = require("discord.js");

const utils = require("../../../../utils/");
const mongoose = require("mongoose");

const listener = {
    name: 'addFlagSelect',
    /**
     * Verifies a select menu interaction should be sent to this listener
     * @param {StringSelectMenuInteraction} interaction 
     */
    verify(interaction) {
        return interaction.component.customId.startsWith("flag-");
    },
    /**
     * Listener for a select menu interaction
     * @param {StringSelectMenuInteraction} interaction 
     */
    async listener (interaction) {
        const [, id] = interaction.component.customId.split("-");
        
        let identity;

        try {
            const discord = await utils.Discord.getUserById(interaction.user.id);
            if (!discord?.identity?.authenticated) {
                return interaction.error("You must be authenticated to use this command! [Make sure you've registered on the website.](https://tms.to/join)");
            }
            identity = discord.identity;
        } catch(err) {
            console.error(err);
            return interaction.error("Unable to recognize you as a TMS member! [Make sure you've registered on the website.](https://tms.to/join)");
        }
        
        const chatter = await utils.Twitch.getUserById(id);
        const addedFlags = [];

        for (let i = 0; i < interaction.values.length; i++) {
            try {
                const flag = await utils.Schemas.Flag.findById(new mongoose.Types.ObjectId(interaction.values[i]));
                const userFlag = await utils.Schemas.UserFlag.findOne({twitchUser: chatter, flag: flag});
                if (!userFlag) {
                    addedFlags.push(await utils.Schemas.UserFlag.create({
                        flag: flag,
                        twitchUser: chatter,
                        addedBy: identity,
                    }));
                }
            } catch(err) {
                console.error(err);
            }
        }
        if (addedFlags.length > 0) {
            interaction.success(`Successfully added \`${addedFlags.length}\` flags: ${addedFlags.map(x => `\`${x.flag.icon ? x.flag.icon + " " : ""}${x.flag.name}\``).join(" ")}`)

            utils.updateUserFlags(chatter);
        } else {
            interaction.error("Unable to add any flags. Try refreshing the select menu");
        }
    }
};

module.exports = listener;
