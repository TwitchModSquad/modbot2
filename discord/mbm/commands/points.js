const { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder, codeBlock, StringSelectMenuBuilder, ActionRowBuilder, cleanCodeBlockContent } = require("discord.js");

const utils = require("../../../utils");
const config = require("../../../config.json");

const {store} = require("../listeners/selectMenu/adSelectMenu");

const PRETTY_REASON = {
    daily: "Daily Reward",
    message: "Message Reward",
    wos: "WOS Reward",
    ad: "Ad Purchase",
}

const TOP_LIMIT = 20;

const command = {
    data: new SlashCommandBuilder()
        .setName("points")
        .setDescription("Commands for points. Only available in TMS guilds")
        .addSubcommand(x => x
            .setName("daily")
            .setDescription("Collect daily points")
        )
        .addSubcommand(x => x
            .setName("has")
            .setDescription("View someone's point value")
            .addUserOption(y => y
                .setName("user")
                .setDescription("The user to view points of")
                .setRequired(false)
            )
        )
        .addSubcommand(x => x
            .setName("log")
            .setDescription("View your point transaction log")
            .addUserOption(y => y
                .setName("user")
                .setDescription("Mod+ only, views a user's transaction log")
                .setRequired(false)
            )
        )
        .addSubcommand(x => x
            .setName("audit")
            .setDescription("Admin only. Audits point values for discrepancies.")
        )
        .addSubcommand(x => x
            .setName("ad")
            .setDescription("Posts a livestream ad for a selected linked user or streamer")
        )
        .addSubcommand(x => x
            .setName("top")
            .setDescription("View TMS members with the top points!")
            .addIntegerOption(y => y
                .setName("page")
                .setDescription("Page number to view")
                .setMinValue(1)
                .setMaxValue(10)
                .setRequired(false)
            )
        )
        .setDefaultMemberPermissions(0)
        .setDMPermission(false),
    /**
     * Execution function for this command
     * @param {ChatInputCommandInteraction} interaction 
     */
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand(true);

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

        if (subcommand === "daily") {
            try {
                const addedPoints = await utils.Points.collectDaily(identity);
                interaction.success(
                    `Collected \`${addedPoints} points\` from daily rewards!\n` +
                    `You currently have \`${identity.points} points\``
                );
            } catch(err) {
                interaction.error(err);
            }
        } else if (subcommand === "has") {
            let user = interaction.options.getUser("user");
            let target = identity;
            if (user) {
                try {
                    target = (await utils.Discord.getUserById(user.id, true, true)).identity;
                } catch(err) {}
            } else {
                user = interaction.user;
            }
            if (!target) {
                return interaction.error(`User <@${user.id}> is not authenticated with TMS!`);
            }

            const points = target.points ? target.points : 0;
            const embed = new EmbedBuilder()
                .setColor(0x772ce8)
                .setTitle("TMS Points")
                .setDescription(`<@${user.id}>'s points: \`${points} point${points === 1 ? "" : "s"}\``);
            interaction.reply({embeds: [embed], ephemeral: true});
        } else if (subcommand === "log") {
            let targetIdentity = identity;
            let targetUser = interaction.user;

            if (identity.admin || identity.moderator) {
                let user = interaction.options.getUser("user", false);
                if (user) {
                    try {
                        const tmsUser = await utils.Discord.getUserById(user.id, true, true);
                        targetIdentity = await tmsUser.createIdentity();
                        targetUser = user;
                    } catch(err) {
                        console.error(err);
                        interaction.error("Failed to retrieve the user inputted!");
                        return;
                    }
                }
            }

            const logs = await utils.Schemas.PointLog.find({identity: targetIdentity})
                .sort({transferDate: -1})
                .limit(20);

            let logString = logs
                .map(x => `${utils.parseDate(x.transferDate)} - ${(x.amount + x.bonus)} point${(x.amount + x.bonus) === 1 ? "" : "s"}${x.bonus ? ` (${x.amount}+${x.bonus})` : ""} - ${PRETTY_REASON.hasOwnProperty(x.reason) ? PRETTY_REASON[x.reason] : x.reason}${x.cancelDate !== null ? " [cancelled]" : ""}`)
                .join("\n");
            
            if (logString === "") logString = "No transaction logs!";

            const embed = new EmbedBuilder()
                .setColor(0x772ce8)
                .setTitle("Transaction Log")
                .setDescription(`<@${targetUser.id}>'s transaction log: \`${targetIdentity.printPoints()}\`\n${codeBlock(logString)}`);

            interaction.reply({embeds: [embed], ephemeral: true});
        } else if (subcommand === "audit") {
            if (!identity.admin) {
                return interaction.error("You must be an admin to use this command!");
            }

            await interaction.deferReply({ephemeral: true});

            const identities = await utils.Schemas.Identity.find({
                points: {
                    $gt: 0,
                },
            });

            let discrepancies = [["Name", "Expected", "Actual", "Difference"]];
            for (let i = 0; i < identities.length; i++) {
                const identity = identities[i];
                const logs = await utils.Schemas.PointLog.find({
                    identity: identity,
                });
                let expectedValue = 0;
                for (let l = 0; l < logs.length; l++) {
                    const log = logs[l];
                    expectedValue += log.amount + log.bonus;
                }
                if (identity.points !== expectedValue) {
                    const twitchUsers = await identity.getTwitchUsers();

                    const difference = identity.points - expectedValue;
                    discrepancies.push([
                        twitchUsers.length > 0 ? twitchUsers[0].display_name : String(identity._id),
                        String(expectedValue),
                        String(identity.points),
                        (difference > 0 ? "+" : "") + difference,
                    ]);
                }
            }

            const embed = new EmbedBuilder()
                .setColor(0x772ce8)
                .setTitle("Audit Results");

            if (discrepancies.length === 1) {
                embed.setDescription("All identities audited with no discrepancies!");
            } else {
                embed.setDescription(codeBlock(cleanCodeBlockContent(utils.stringTable(discrepancies, 3, 6, false))));
            }
            interaction.editReply({embeds: [embed]});
        } else if (subcommand === "ad") {
            delete store[interaction.user.id];

            const twitchUsers = await identity.getTwitchUsers();
            const validStreamers = (await identity.getStreamers()).map(x => x.streamer);
            for (let i = 0; i < twitchUsers.length; i++) {
                if (!validStreamers.find(x => x._id === twitchUsers[i]._id)) {
                    validStreamers.push(twitchUsers[i]);
                }
            }
            let liveStreamers = [];
            for (let i = 0; i < validStreamers.length; i++) {
                const streamer = validStreamers[i];
                const live = await utils.Schemas.TwitchLivestream.findOne({user: streamer._id, endDate: null});
                if (live) {
                    const status = await utils.Schemas.TwitchStreamStatus.find({live: live})
                        .populate("live")
                        .populate("game")
                        .sort({timestamp: -1})
                        .limit(1);
                    if (status.length === 0) continue;

                    liveStreamers.push({
                        streamer: streamer,
                        live: status[0],
                    });
                }
            }

            if (liveStreamers.length === 0) {
                return interaction.error("No linked Twitch users or moderated streams are live!");
            }

            liveStreamers = liveStreamers.map(x => {
                return {
                    label: `${x.streamer.display_name}${x.live?.game?.name ? ` (${x.live.game.name})` : ""}`,
                    value: String(x.streamer._id),
                };
            });

            const embed = new EmbedBuilder()
                .setColor(0x772ce8)
                .setTitle("Post an Ad")
                .setDescription("Use the select menus below to post an ad to a livestream.")
                .addFields({
                    name: "Pricing",
                    value: codeBlock(
                            "Advertisement In: \n" +
                            `1 guild  - ${config.points.ad.price[0]} points\n` +
                            `2 guilds - ${config.points.ad.price[1]} points\n` +
                            `3 guilds - ${config.points.ad.price[2]} points`
                        ),
                    inline: false,
                });

            const streamerSelect = new StringSelectMenuBuilder()
                .setCustomId("ad-streamer")
                .setPlaceholder("Select a Streamer (MUST be live)")
                .setMinValues(1)
                .setMaxValues(1)
                .setOptions(liveStreamers);

            let guilds = [
                {
                    label: utils.Discord.guilds.tms.name,
                    value: config.discord.channels.ad.modsquad,
                },
                {
                    label: utils.Discord.guilds.tlms.name,
                    value: config.discord.channels.ad.little_modsquad,
                },
                {
                    label: utils.Discord.guilds.cl.name,
                    value: config.discord.channels.ad.community_lobbies,
                },
            ];

            try {
                await utils.Discord.guilds.tms.members.fetch(interaction.user.id);
            } catch(err) {
                guilds = guilds.filter(x => x.value !== config.discord.channels.ad.modsquad);
            }
            try {
                await utils.Discord.guilds.tlms.members.fetch(interaction.user.id);
            } catch(err) {
                guilds = guilds.filter(x => x.value !== config.discord.channels.ad.little_modsquad);
            }
            try {
                await utils.Discord.guilds.cl.members.fetch(interaction.user.id);
            } catch(err) {
                guilds = guilds.filter(x => x.value !== config.discord.channels.ad.community_lobbies);
            }

            if (guilds.length === 0) {
                return interaction.error("Unable to find any guilds to advertise to!");
            }

            const channelSelect = new StringSelectMenuBuilder()
                .setCustomId("ad-channels")
                .setPlaceholder("Select Channels")
                .setMinValues(1)
                .setMaxValues(guilds.length)
                .setOptions(guilds);

            interaction.reply({
                embeds: [embed],
                components: [
                    new ActionRowBuilder()
                        .setComponents(streamerSelect),
                    new ActionRowBuilder()
                        .setComponents(channelSelect),
                ],
                ephemeral: true,
            });
        } else if (subcommand === "top") {
            let page = interaction.options.getInteger("page", false);

            if (!page) {
                page = 1;
            }

            const top = await utils.Schemas.Identity.find({})
                .sort({points: -1})
                .limit(TOP_LIMIT)
                .skip((page - 1) * TOP_LIMIT);

            let topString = "";
            const positionOffset = 1 + ((page - 1) * TOP_LIMIT);
            for (let i = 0; i < top.length; i++) {
                const identity = top[i];
                const discordUsers = await identity.getDiscordUsers();
                let name = "Unknown";
                if (discordUsers.length > 0) {
                    name = `<@${discordUsers[0]._id}>`;
                } else {
                    const twitchUsers = await identity.getTwitchUsers();
                    if (twitchUsers.length > 0) {
                        name = twitchUsers[0].display_name;
                    }
                }

                if (i > 0) topString += "\n";
                topString += `${i + positionOffset}. ${name}: \`${identity.printPoints()}\``;
            }
            if (topString === "") {
                topString = "No users found on this page!";
            }
            const embed = new EmbedBuilder()
                .setColor(0x772ce8)
                .setTitle("Points: Top Users")
                .setDescription(topString);
            interaction.reply({embeds: [embed], ephemeral: true});
        } else {
            interaction.error(`Unknown subcommand \`${subcommand}\``);
        }
    }
};

module.exports = command;
