const { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder, codeBlock, ActionRowBuilder, StringSelectMenuBuilder } = require("discord.js");

const config = require("../../../config.json");
const utils = require("../../../utils");
const mongoose = require("mongoose");

const command = {
    data: new SlashCommandBuilder()
        .setName("archive")
        .setDescription("Commands related to the TMS Archive system")
        .addSubcommand(x => x
            .setName("search")
            .setDescription("Search within the Archive system and recorded bans")
            .addStringOption(y => y
                .setName("query")
                .setDescription("The query to search with")
                .setMinLength(3)
                .setMaxLength(100)
                .setRequired(true)
            )
        )
        .addSubcommand(x => x
            .setName("create")
            .setDescription("Sends a link to create a new Archive entry")
        )
        .addSubcommandGroup(x => x
            .setName("set")
            .setDescription("Sets an option of an Entry. Admin only")
            .addSubcommand(y => y
                .setName("owner")
                .setDescription("Sets the owner of an entry. Admin only")
                .addStringOption(z => z
                    .setName("id")
                    .setDescription("The archive entry ID")
                    .setMinLength(24)
                    .setMaxLength(24)
                    .setRequired(true)
                )
                .addUserOption(y => y
                    .setName("owner")
                    .setDescription("The new owner")
                    .setRequired(true)
                )
            )
            .addSubcommand(x => x
                .setName("channel")
                .setDescription("Sets the channel of an entry. Admin only")
                .addStringOption(z => z
                    .setName("id")
                    .setDescription("The archive entry ID")
                    .setMinLength(24)
                    .setMaxLength(24)
                    .setRequired(true)
                )
                .addStringOption(y => y
                    .setName("channel")
                    .setDescription("The channel to move it to")
                    .setRequired(true)
                    .setChoices(...config.discord.modbot.channels.archive_sort_targets.map(x => {return {name: x.label, value: x.value}}))
                )
            )
        )
        .setDefaultMemberPermissions(0)
        .setDMPermission(false),
    /**
     * Execution function for this command
     * @param {ChatInputCommandInteraction} interaction 
     */
    async execute(interaction) {
        const subcommandGroup = interaction.options.getSubcommandGroup(false);
        const subcommand = interaction.options.getSubcommand(true);

        if (!subcommandGroup && subcommand === "search") {
            const query = utils.escapeRegExp(interaction.options.getString("query", true));

            if (query.length < 3)
                return interaction.error("Query must contain at least 3 characters!");
    
            let exactSearch = null;
            let twitchUsers = [];
            let discordUsers = [];
            let bans = [];

            let archiveEntries = [];

            await interaction.deferReply({ephemeral: !config.discord.modbot.channels.archive_search.includes(interaction.channel.id)});

            let migrateError = null;
            try {
                exactSearch = await utils.Twitch.getUserByName(query, true);
                try {
                    await exactSearch.migrateData();
                } catch(err) {
                    migrateError = String(err);
                    console.error(err);
                }
                twitchUsers = [exactSearch];
            } catch(err) {}
            if (!exactSearch) {
                try {
                    exactSearch = await utils.Discord.getUserById(query, false, true);
                    discordUsers = [exactSearch];
                } catch(err) {}
            }

            if (exactSearch) {
                archiveEntries = (await utils.Schemas.ArchiveUser.find({$or: [{twitchUser: exactSearch._id}, {discordUser: exactSearch._id}, {raw: exactSearch.display_name}]})
                        .populate("entry")
                        .populate("discordUser")
                        .populate("twitchUser"));
                if (exactSearch.display_name)
                    bans = await exactSearch.getBans();
            }
            
            const twitchQuery = await utils.Schemas.TwitchUser.find({
                    login: {
                        $regex: new RegExp("^" + query.toLowerCase()),
                    }
                })
                .sort({follower_count: -1})
                .limit(10);
            for (let i = 0; i < twitchQuery.length; i++) {
                const hit = twitchQuery[i];
                const user = await utils.Schemas.TwitchUser.findById(hit._id);
                if (user._id !== exactSearch?._id) {
                    twitchUsers.push(user);
                    bans = [
                        ...bans,
                        ...await user.getBans(),
                    ]
                    archiveEntries = [
                        ...archiveEntries,
                        (await utils.Schemas.ArchiveUser.find({$or: [{twitchUser: user._id}, {raw: user.display_name}]})
                            .populate("entry")
                            .populate("discordUser")
                            .populate("twitchUser"))
                    ];
                }
            }
            
            const discordQuery = await utils.Schemas.DiscordUser.find({
                    globalName: {
                        $regex: new RegExp("^" + query.toLowerCase()),
                    }
                })
                .limit(10);
            for (let i = 0; i < discordQuery.length; i++) {
                const hit = discordQuery[i];
                const user = await utils.Schemas.DiscordUser.findById(hit._id);
                if (user._id !== exactSearch?._id)
                    discordUsers.push(user);
                archiveEntries = [
                    ...archiveEntries,
                    (await utils.Schemas.ArchiveUser.find({$or: [{discordUser: user._id}, {raw: user.displayName}]})
                        .populate("entry")
                        .populate("discordUser")
                        .populate("twitchUser"))
                ];
            }

            const embed = new EmbedBuilder()
                .setColor(0x772ce8)
                .setTitle("Archive Search Results")
                .setDescription(`We found \`${twitchUsers.length}\` twitch and \`${discordUsers.length}\` discord users with similar names to \`${query}\``);

            if (exactSearch) {
                embed.addFields({
                    name: "Exact Search",
                    value: codeBlock(exactSearch.display_name ? `${exactSearch.display_name} on Twitch - ${migrateError ? "Migration Error: " + migrateError : "Migration Successful"}` : `${exactSearch.displayName} on Discord`),
                })
            }

            if (bans.length > 0) {
                let banString = "";
                const addField = () => {
                    embed.addFields({
                        name: "Bans",
                        value: banString,
                        inline: false
                    });
                    banString = "";
                }
                bans.forEach((ban, i) => {
                    if (i > 0) banString += "\n";
                    const message = `${ban.chatter.display_name} banned in #${ban.streamer.login} on ${ban.time_start.toLocaleDateString()}`;
                    if (ban.message) {
                        banString += `${i+1}. [${message}](https://discord.com/channels/${config.discord.guilds.modsquad}/${config.discord.channels.ban.tms}/${ban.message._id})`;
                    } else {
                        banString += `${i+1}. ${message}`;
                    }
                    if (banString.length > 900) {
                        addField();
                    }
                });
                addField();
            }

            archiveEntries = archiveEntries.filter(x => x.entry ? true : false);

            if (archiveEntries.length > 0) {
                let archiveString = "";
                for (let i = 0; i < archiveEntries.length; i++) {
                    if (i > 0) archiveString += "\n";
                    const entry = archiveEntries[i];
                    const messages = await entry.entry.getMessages();
                    let username = (entry.twitchUser ? entry.twitchUser.display_name : "") + (entry.discordUser ? entry.discordUser.displayName : "");
                    const message = `Entry ${String(entry.entry._id).substring(String(entry.entry._id).length - 6)} on ${username}: ${entry.entry.offense}`;
                    if (messages.length > 0) {
                        archiveString += `${i+1}. [${message}](https://discord.com/channels/${config.discord.guilds.modsquad}/${messages[0].channel}/${messages[0].message})`;
                    } else {
                        archiveString += `${i+1}. ${message}`;
                    }
                }
                embed.addFields({
                    name: "Archive Entries",
                    value: archiveString,
                    inline: false,
                });
            }

            const components = [];

            if (twitchUsers.length > 0) {
                components.push(new ActionRowBuilder()
                    .setComponents(utils.userSelect("twitch", twitchUsers))
                );
            }

            if (discordUsers.length > 0) {
                components.push(new ActionRowBuilder()
                    .setComponents(utils.userSelect("discord", discordUsers))
                );
            }

            if (bans.length > 0) {
                const banSelect = new StringSelectMenuBuilder()
                    .setCustomId("ban")
                    .setPlaceholder("View ban information")
                    .setMinValues(1)
                    .setMaxValues(1);

                bans.forEach((ban, i) => {
                    if (i > 24) return;
                    banSelect.addOptions({
                        label: `Ban in #${ban.streamer.login} on ${utils.parseDate(ban.time_start)}${ban.time_end ? " (inactive)" : ""}`,
                        value: String(ban._id),
                    });
                });

                components.push(new ActionRowBuilder()
                    .setComponents(banSelect)
                );
            }

            if (archiveEntries.length > 0) {
                const entrySelect = new StringSelectMenuBuilder()
                    .setCustomId("entry")
                    .setPlaceholder("View archive entry information")
                    .setMinValues(1)
                    .setMaxValues(1)
                    .setOptions(
                        archiveEntries.map(x => {return {
                            label: (x.twitchUser ? x.twitchUser.display_name : "") + (x.discordUser ? x.discordUser.displayName : "") + ": " + x.entry.offense,
                            value: String(x.entry._id),
                        }})
                    );
                components.push(new ActionRowBuilder()
                    .setComponents(entrySelect));
            }

            interaction.editReply({embeds: [embed], components: components, ephemeral: !config.discord.modbot.channels.archive_search.includes(interaction.channel.id)});
        } else if (!subcommandGroup && subcommand === "create") {
            interaction.success(`[Create a new Archive entry](${config.express.domain.root}panel/archive/create)`);
        } else if (subcommandGroup) {
            if (subcommandGroup === "set") {
                if (interaction.guild.id !== config.discord.guilds.modsquad)
                    return interaction.error("This subcommand must be executed on the main TMS guild!");

                if (!interaction.tms.user?.identity?.admin)
                    return interaction.error("This subcommand may only be executed by a TMS administrator!");


                const id = interaction.options.getString("id", true);
                try {
                    const entry = await utils.Schemas.Archive.findById(new mongoose.Types.ObjectId(id));
                    if (!entry) return interaction.error("Archive entry not found!");

                    if (subcommand === "owner") {
                        const owner = interaction.options.getUser("owner", true);
                        const user = await utils.Discord.getUserById(owner.id, false, true);
                        entry.owner = await user.createIdentity();
                        await entry.save();
                        interaction.success(`Archive entry owner successfully changed to <@${user.id}>!`);
                    } else if (subcommand === "channel") {
                        const channelId = interaction.options.getString("channel", true);
                        const channel = await global.client.modbot.channels.fetch(channelId);
                        const messages = await entry.getMessages();
                        for (let i = 0; i < messages.length; i++) {
                            try {
                                const channel = await global.client.modbot.channels.fetch(messages[i].channel);
                                const message = await channel.messages.fetch(messages[i].message);
                                await message.delete();
                                await messages[i].remove();
                            } catch(err) {
                                console.error(err);
                            }
                        }
                        channel.send({embeds: [await entry.embed()]}).then(msg => {
                            utils.Schemas.ArchiveMessage.create({
                                entry,
                                message: msg.id,
                                channel: msg.channelId,
                            }).catch(console.error);
                            interaction.success(`Successfully moved! View the message: ${msg.url}`);
                        }, err => {
                            console.error(err)
                            interaction.error("Failed to send message!");
                        });
                    }
                } catch(err) {
                    console.error(err);
                    interaction.error("An unknown error occurred!");
                }
            }
        }
    }
};

module.exports = command;
