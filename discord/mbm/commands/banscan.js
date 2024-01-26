const { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder, StringSelectMenuBuilder, ActionRowBuilder } = require("discord.js");

const config = require("../../../config.json");
const utils = require("../../../utils");

const punishmentStore = require("../../../twitch/PunishmentStore");

const command = {
    store: {},
    formatResultMessage(channel, results) {
        const embed = new EmbedBuilder()
            .setAuthor({name: channel.display_name, iconURL: channel.profile_image_url})
            .setTitle(`Ban Scan for ${channel.display_name}`)
            .setColor(0x772ce8);

        let resultString = "";
        results.forEach((result, i) => {
            const str = `${i+1}. [${result.chatter.display_name}](${config.express.domain.root}panel/user/${result.chatter._id}) banned in ${result.channels.map(x => x.display_name).join(", ")}`;
            if (resultString.length + str.length > 1020) {
                resultString = "";
                embed.addFields({
                    name: "Bans",
                    value: resultString,
                    inline: false,
                });
            }
            if (resultString !== "") resultString += "\n";
            resultString += str;
        })

        if (resultString !== "") {
            embed.addFields({
                name: "Bans",
                value: resultString,
                inline: false,
            });
        }

        const viewInfoSelect = new StringSelectMenuBuilder()
            .setCustomId(`user-twitch`)
            .setPlaceholder("View User Info")
            .setMinValues(1)
            .setMaxValues(1);

        const ignoreSelect = new StringSelectMenuBuilder()
            .setCustomId(`bs-ignore-${channel._id}`)
            .setPlaceholder("Ignore Users")
            .setMinValues(1)
            .setMaxValues(Math.min(25, results.length));

        const banSelect = new StringSelectMenuBuilder()
            .setCustomId(`bs-ban-${channel._id}`)
            .setPlaceholder("Crossban Users [NYI!]")
            .setMinValues(1)
            .setMaxValues(Math.min(25, results.length));

        const safeSelect = new StringSelectMenuBuilder()
            .setCustomId(`bs-safe-${channel._id}`)
            .setPlaceholder("Mark as Safe")
            .setMinValues(1)
            .setMaxValues(Math.min(25, results.length));

        for (let i = 0; i < Math.min(25, results.length); i++) {
            const result = results[i];
            const opt = {
                label: result.chatter.display_name,
                description: "Banned in " + result.channels.map(x => x.display_name).join(", "),
                value: result.chatter._id,
            };
            viewInfoSelect.addOptions(opt);
            ignoreSelect.addOptions(opt);
            banSelect.addOptions(opt);
            safeSelect.addOptions(opt);
        }

        return {
            embeds: [embed],
            components: [
                new ActionRowBuilder()
                    .setComponents(viewInfoSelect),
                new ActionRowBuilder()
                    .setComponents(ignoreSelect),
                new ActionRowBuilder()
                    .setComponents(banSelect),
                new ActionRowBuilder()
                    .setComponents(safeSelect),
            ],
        }
    },
    data: new SlashCommandBuilder()
        .setName("banscan")
        .setDescription("Searches a Twitch stream for users that have been banned in another channel.")
        .addStringOption(x => x
            .setName("channel")
            .setDescription("The Twitch channel to reference")
            .setMinLength(3)
            .setMaxLength(25)
            .setRequired(true)
        )
        .setDMPermission(false),
    /**
     * Execution function for this command
     * @param {ChatInputCommandInteraction} interaction 
     */
    async execute(interaction) {
        await interaction.deferReply({ephemeral: true});
        utils.Twitch.getUserByName(interaction.options.getString("channel", true)).then(async channel => {
            const userChats = await utils.Schemas.TwitchUserChat.find({streamer: channel})
                .populate("chatter");
            const results = [];
            for (let i = 0; i < userChats.length; i++) {
                const userChat = userChats[i];
                const bans = punishmentStore.bans.filter(x => x.chatter === userChat.chatter._id && x.streamer !== channel._id);
                if (!userChat.chatter.safe && bans.length > 0) {
                    const channels = [];
                    for (let b = 0; b < bans.length; b++) {
                        if (channels.find(x => x._id === bans[b].streamer)) continue;
                        try {
                            channels.push(await utils.Twitch.getUserById(bans[b].streamer));
                        } catch(err) {
                            console.error(err);
                        }
                    }
                    results.push({chatter: userChat.chatter, channels});
                }
            }

            command.store[channel._id] = {
                channel,
                results,
                interaction,
            };

            if (results.length > 0) {
                interaction.editReply(command.formatResultMessage(channel, results));
            } else {
                interaction.editReply("You're all set! All potential crossbans have been dismissed.");
            }
        }, err => {
            console.error(err);
            interaction.editReply(String(err));
        })
    }
};

module.exports = command;
