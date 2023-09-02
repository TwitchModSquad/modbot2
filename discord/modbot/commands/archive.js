const { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder, codeBlock, ActionRowBuilder } = require("discord.js");

const config = require("../../../config.json");
const utils = require("../../../utils");
const { default: mongoose } = require("mongoose");

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
            const query = interaction.options.getString("query", true);
    
            let exactSearch = null;
            let twitchUsers = [];
            let discordUsers = [];
            let bans = [];

            let archiveEntries = [];

            try {
                exactSearch = await utils.Twitch.getUserByName(query, true);
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
                        .populate("entry")).map(x => x.entry);
                if (exactSearch.display_name)
                    bans = await exactSearch.getBans();
            }
            
            const twitchQuery = await utils.Schemas.TwitchUser.search({
                query_string: {
                    query: query,
                }
            });
            for (let i = 0; i < twitchQuery.body.hits.hits.length; i++) {
                const hit = twitchQuery.body.hits.hits[i];
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
                            .populate("entry")).map(x => x.entry)
                    ];
                }
            }
            
            const discordQuery = await utils.Schemas.DiscordUser.search({
                query_string: {
                    query: query,
                }
            });
            for (let i = 0; i < discordQuery.body.hits.hits.length; i++) {
                const hit = discordQuery.body.hits.hits[i];
                const user = await utils.Schemas.DiscordUser.findById(hit._id);
                if (user._id !== exactSearch?._id)
                    discordUsers.push(user);
                archiveEntries = [
                    ...archiveEntries,
                    (await utils.Schemas.ArchiveUser.find({$or: [{discordUser: user._id}, {raw: user.displayName}]})
                        .populate("entry")).map(x => x.entry)
                ];
            }

            const embed = new EmbedBuilder()
                .setColor(0x772ce8)
                .setTitle("Archive Search Results")
                .setDescription(`We found \`${twitchUsers.length}\` twitch and \`${discordUsers.length}\` discord users with similar names to \`${query}\``);

            if (exactSearch) {
                embed.addFields({
                    name: "Exact Search",
                    value: codeBlock(exactSearch.display_name ? `${exactSearch.display_name} on Twitch` : `${exactSearch.displayName} on Discord`),
                })
            }

            if (bans.length > 0) {
                let banString = "";
                bans.forEach((ban, i) => {
                    if (i > 0) banString += "\n";
                    const message = `${ban.chatter.display_name} banned in #${ban.streamer.login} on ${ban.time_start.toLocaleDateString()}`;
                    if (ban.message) {
                        banString += `${i+1}. [${message}](https://discord.com/channels/${config.discord.guilds.modsquad}/${config.discord.modbot.channels.ban}/${ban.message._id})`;
                    } else {
                        banString += `${i+1}. ${message}`;
                    }
                });
                embed.addFields({
                    name: "Bans",
                    value: banString,
                    inline: false
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

            interaction.reply({embeds: [embed], components: components, ephemeral: interaction.channel.id !== config.discord.modbot.channels.archive_search});
        } else if (!subcommandGroup && subcommand === "create") {
            interaction.success(`[Create a new Archive entry](${config.express.domain.root}panel/archive/create)`);
        } else if (subcommandGroup) {
            if (subcommandGroup === "set") {
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
                    }
                } catch(err) {
                    interaction.error("Archive entry not found!");
                }
            }
        }
    }
};

module.exports = command;
