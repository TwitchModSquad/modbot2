const { StringSelectMenuInteraction, EmbedBuilder } = require("discord.js");

const utils = require("../../../../utils/");
const config = require("../../../../config.json");

const listener = {
    name: 'adSelectMenu',
    store: {},
    /**
     * Verifies a select menu interaction should be sent to this listener
     * @param {StringSelectMenuInteraction} interaction 
     */
    verify(interaction) {
        return interaction.component.customId.startsWith("ad-");
    },
    /**
     * Listener for a select menu interaction
     * @param {StringSelectMenuInteraction} interaction 
     */
    async listener (interaction) {
        if (!this.store.hasOwnProperty(interaction.user.id)) {
            this.store[interaction.user.id] = {};
        }

        if (interaction.component.customId === "ad-streamer") {
            const streamers = [];
            for (let i = 0; i < interaction.values.length; i++) {
                try {
                    streamers.push(await utils.Twitch.getUserById(interaction.values[i]));
                } catch(err) {
                    console.error(err);
                    return interaction.error(`Unable to retrieve user with ID ${interaction.values[i]}!`);
                }
            }
            this.store[interaction.user.id].streamer = streamers;
        } else if (interaction.component.customId === "ad-channels") {
            const channels = [];
            for (let i = 0; i < interaction.values.length; i++) {
                try {
                    channels.push(await global.client.mbm.channels.fetch(interaction.values[i]));
                } catch(err) {
                    console.error(err);
                    return interaction.error(`Unable to retrieve channel with ID ${interaction.values[i]}!`);
                }
            }
            this.store[interaction.user.id].channels = channels;
        } else return;

        const userStore = this.store[interaction.user.id];
        if (userStore?.streamer && userStore?.channels) {
            let identity;
    
            try {
                const discord = await utils.Discord.getUserById(interaction.user.id);
                if (!discord?.identity) {
                    return interaction.error("You must be authenticated to use this command! [Make sure you've registered on the website.](https://tms.to/join)");
                }
                identity = discord.identity;
            } catch(err) {
                console.error(err);
                return interaction.error("Unable to recognize you as a TMS member! [Make sure you've registered on the website.](https://tms.to/join)");
            }

            let points;
            let pointLog;
            try {
                switch (userStore.channels.length) {
                    case 1:
                        points = config.points.ad.price[0];
                        break;
                    case 2:
                        points = config.points.ad.price[1];
                        break;
                    case 3:
                        points = config.points.ad.price[2];
                        break;
                    default:
                        return interaction.error("Unable to identity point amount. Are there more than 3 channels selected?");
                }

                pointLog = await utils.Points.removePoints(identity, points, "ad");
            } catch(err) {
                return interaction.error(err);
            }
            
            const cancelTransaction = async () => {
                identity.points += points;
                await identity.save();
                pointLog.cancelDate = Date.now();
                await pointLog.save();
            }
            
            for (let i = 0; i < userStore.streamer.length; i++) {
                const streamer = userStore.streamer[i];
                const stream = await utils.Schemas.TwitchLivestream.findOne({user: streamer, endDate: null});
                if (!stream) {
                    await cancelTransaction();
                    return interaction.error(`Missing active livestream for ${streamer.display_name}!`);
                }

                let activity = await utils.Schemas.TwitchStreamStatus.find({live: stream})
                    .populate("game")
                    .sort({timestamp: -1})
                    .limit(1);
                if (activity.length === 0) {
                    await cancelTransaction();
                    return interaction.error(`Missing active stream status for ${streamer.display_name}!`);
                }
                activity = activity[0];

                const embed = new EmbedBuilder()
                        .setColor(0x772ce8)
                        .setAuthor({name: `🔴 ${streamer.display_name} is now live!`})
                        .setTitle(activity.title)
                        .setThumbnail(activity.game.boxArtUrl.replace("{width}","64").replace("{height}", "64"))
                        .setURL(`https://twitch.tv/${streamer.login}`)
                        .addFields({
                            name: "Game",
                            value: activity.game.name,
                            inline: true,
                        }, {
                            name: "Viewers",
                            value: String(activity.viewers),
                            inline: true,
                        })
                        .setFooter({text: `${streamer.display_name} : Live 🔴`, iconURL: streamer.profile_image_url})
                        .setTimestamp(stream.startDate);

                const sentMessages = [];
                for (let c = 0; c < userStore.channels.length; c++) {
                    const channel = userStore.channels[c];
                    try {
                        const message = await channel.send({content: `Posted by <@${interaction.user.id}>`,embeds: [embed]});
                        sentMessages.push(message);
                        utils.Schemas.DiscordMessage.create({
                            _id: message.id,
                            guild: message.guild.id,
                            channel: message.channel.id,
                            live: stream,
                        }).catch(console.error);
                    } catch(err) {
                        console.error(err);
                        for (let m = 0; m < sentMessages.length; m++) {
                            try {
                                await sentMessages[m].delete({reason: "Ad posting failed"});
                            } catch(err2) {
                                console.error(err2);
                            }
                        }
                        await cancelTransaction();
                        return interaction.error(`Failed to send message to <#${channel.id}>!`);
                    }
                }
                interaction.success(`Successfully sent ${sentMessages.length} ad messages!`);
            }
        } else {
            const embed = new EmbedBuilder()
                .setColor(0x772ce8)
                .setTitle("Success!")
                .setDescription("Successfully updated ad details.");

            if (userStore.streamer) {
                embed.addFields({
                    name: "Streamer",
                    value: userStore.streamer.map(x => x.display_name).join(" "),
                    inline: true,
                });
            }
            if (userStore.channels) {
                embed.addFields({
                    name: "Channels",
                    value: userStore.channels.map(x => `<#${x.id}>`).join(" "),
                    inline: true,
                });
            }

            interaction.reply({
                embeds: [embed],
                ephemeral: true,
            });
        }
    }
};

module.exports = listener;
