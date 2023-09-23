const { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder, codeBlock } = require("discord.js");

const utils = require("../../../utils");
const { default: mongoose } = require("mongoose");

const ADMIN_ONLY = ["create", "delete"];

const command = {
    data: new SlashCommandBuilder()
        .setName("flag")
        .setDescription("Base command for flag manager")
        .addSubcommand(x => x
            .setName("create")
            .setDescription("Creates a new Flag. Admin only, see 'suggest'")
            .addStringOption(y => y
                .setName("name")
                .setDescription("Name for the new Flag")
                .setMinLength(2)
                .setMaxLength(32)
                .setRequired(true)
            )
            .addStringOption(y => y
                .setName("description")
                .setDescription("Description for the new Flag")
                .setMinLength(6)
                .setMaxLength(128)
                .setRequired(true)

            )
            .addStringOption(y => y
                .setName("icon")
                .setDescription("The emote for the Flag. [Use win key + .]")
                .setRequired(false)
            )
        )
        .addSubcommand(x => x
            .setName("delete")
            .setDescription("Deletes a flag. This is permanent. Admin only")
            .addStringOption(y => y
                .setName("flag")
                .setDescription("The ID of the flag with autocomplete by name")
                .setRequired(true)
                .setAutocomplete(true)
            )
        )
        .addSubcommandGroup(x => x
            .setName("user")
            .setDescription("Group for user based Flag commands")
            .addSubcommand(y => y
                .setName("add")
                .setDescription("Adds a flag to a Twitch or Discord user")
                .addStringOption(z => z
                    .setName("flag")
                    .setDescription("The ID of the flag with autocomplete by name")
                    .setRequired(true)
                    .setAutocomplete(true)
                )
                .addStringOption(z => z
                    .setName("twitch-user")
                    .setDescription("The Twitch username to add the flag to")
                    .setMinLength(3)
                    .setMaxLength(25)
                    .setRequired(false)
                    .setAutocomplete(true)
                )
                .addUserOption(z => z
                    .setName("discord-user")
                    .setDescription("The Discord user to add the flag to")
                    .setRequired(false)
                )
                .addStringOption(z => z
                    .setName("discord-id")
                    .setDescription("The Discord ID to add the flag to")
                    .setRequired(false)
                )
            )
            .addSubcommand(y => y
                .setName("remove")
                .setDescription("Removes a flag from a Twitch or Discord user")
                .addStringOption(z => z
                    .setName("flag")
                    .setDescription("The ID of the flag with autocomplete by name")
                    .setRequired(true)
                    .setAutocomplete(true)
                )
                .addStringOption(z => z
                    .setName("twitch-user")
                    .setDescription("The Twitch username to remove the flag from")
                    .setMinLength(3)
                    .setMaxLength(25)
                    .setRequired(false)
                    .setAutocomplete(true)
                )
                .addUserOption(z => z
                    .setName("discord-user")
                    .setDescription("The Discord user to remove the flag from")
                    .setRequired(false)
                )
                .addStringOption(z => z
                    .setName("discord-id")
                    .setDescription("The Discord ID to remove the flag from")
                    .setRequired(false)
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

        if (ADMIN_ONLY.includes(subcommand.toLowerCase())) {
            try {
                const discord = await utils.Discord.getUserById(interaction.user.id);
                if (!discord?.identity?.admin) {
                    return interaction.error("You must be an admin to use this command!");
                }
            } catch(err) {
                console.error(err);
                return interaction.error("Unable to recognize you as a TMS member! [Make sure you've registered on the website.](https://tms.to/join)");
            }
        }

        if (subcommand === "create") {
            const name = interaction.options.getString("name", true);
            const description = interaction.options.getString("description", true);
            let icon = interaction.options.getString("icon", false);

            const checkFlag = await utils.Schemas.Flag.findOne({name: {$regex: new RegExp("^" + name + "$", "i")}});
            if (checkFlag) {
                return interaction.error(`Flag with name \`${name}\` already exists!`);
            }

            try {
                if (icon) {
                    icon = icon.trim();
                }

                const flag = await utils.Schemas.Flag.create({
                    name: name,
                    description: description,
                    icon: icon ? icon : null,
                });
                const embed = new EmbedBuilder()
                    .setColor(0x772ce8)
                    .setTitle("Successfully created new flag!")
                    .setFields({
                        name: "Name",
                        value: `\`${flag.name}\``,
                        inline: true,
                    });

                if (flag.icon) {
                    embed.addFields({
                        name: "Icon",
                        value: `\`${flag.icon}\``,
                        inline: true,
                    })
                }

                embed.addFields({
                    name: "Description",
                    value: codeBlock(flag.description),
                    inline: false,
                })

                interaction.reply({embeds: [embed], ephemeral: true});
            } catch (err) {
                console.error(err);
                interaction.error("An error occurred!")
            }
        } else if (subcommand === "delete") {
            try {
                const flagId = interaction.options.getString("flag", true);
                const flag = await utils.Schemas.Flag.findById(new mongoose.Types.ObjectId(flagId));
                if (flag) {
                    await utils.Schemas.UserFlag.deleteMany({flag: flag._id});
                    await utils.Schemas.Flag.findByIdAndDelete(flag._id);
                    interaction.success(`Successfully deleted flag \`${flag.name}\`!`);
                } else {
                    interaction.error("Flag not found!");
                }
            } catch(err) {
                interaction.error("Unknown flag ID!");
            }
        } else if (subcommandGroup === "user") {
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

            const twitchName = interaction.options.getString("twitch-user", false);
            const discordUser = interaction.options.getUser("discord-user", false);
            let discordId = interaction.options.getString("discord-id", false);

            let twitch = null;
            let discord = null;

            if (twitchName) {
                try {
                    twitch = await utils.Twitch.getUserByName(twitchName, true);
                } catch(err) {
                    return interaction.error(`Unable to retrieve Twitch user with name \`${twitchName}\`!`);
                }
            } else if (discordUser || discordId) {
                if (discordUser) discordId = discordUser.id;
                try {
                    discord = await utils.Discord.getUserById(discordId, true);
                } catch(err) {
                    return interaction.error(`Unable to retrieve Discord user with ID \`${discordId}\`!`);
                }
            } else {
                return interaction.error("You must specify a user!");
            }

            let flagId = interaction.options.getString("flag");
            try {
                flagId = new mongoose.Types.ObjectId(flagId);
            } catch(err) {
                return interaction.error(`Invalid flag ID \`${flagId}\`!`);
            }

            const flag = await utils.Schemas.Flag.findById(flagId);
            if (!flag) {
                return interaction.error(`Unable to find flag \`${String(flagId)}\`!`);
            }

            if (subcommand === "add") {
                let data = {
                    flag: flag,
                };

                if (twitch) {
                    data.twitchUser = twitch;
                } else if (discord) {
                    data.discordUser = discord;
                } else return;

                const searchUserFlag = await utils.Schemas.UserFlag.findOne(data);
                if (searchUserFlag) {
                    return interaction.error("This flag already exists on this user!");
                }

                data.addedBy = identity;

                const userFlag = await utils.Schemas.UserFlag.create(data);
                
                const embed = new EmbedBuilder()
                    .setColor(0x772ce8)
                    .setTitle("Flag was added!");
                const userEmbed = twitch ? await twitch.embed() : await discord.embed();

                interaction.reply({embeds: [embed, userEmbed], ephemeral: true});
            } else if (subcommand === "remove") {
                let data = {
                    flag: flag,
                };

                if (twitch) {
                    data.twitchUser = twitch;
                } else if (discord) {
                    data.discordUser = discord;
                } else return;

                const userFlag = await utils.Schemas.UserFlag.findOne(data);
                if (userFlag) {
                    if (identity.admin || userFlag.addedBy._id === identity._id) {
                        await userFlag.deleteOne();
                
                        const embed = new EmbedBuilder()
                            .setColor(0x772ce8)
                            .setTitle("Flag was removed!");
                        const userEmbed = twitch ? await twitch.embed() : await discord.embed();
        
                        interaction.reply({embeds: [embed, userEmbed], ephemeral: true});
                    } else {
                        return interaction.error("You must be the person that added the flag to remove it!");
                    }
                } else {
                    return interaction.error(`User does not have the flag \`${flag.icon ? flag.icon + " " : ""}${flag.name}\`!`)
                }
            } else {
                return interaction.error(`Unknown subcommand \`${subcommandGroup}/${subcommand}\`!`);
            }

            if (twitch) {
                await utils.updateUserFlags(twitch);
            }
        } else {
            interaction.error(`Unknown subcommand \`${subcommand}\`!`);
        }
    }
};

module.exports = command;
