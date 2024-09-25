const { ChatInputCommandInteraction, SlashCommandBuilder } = require("discord.js");

const utils = require("../../../utils");

const command = {
    data: new SlashCommandBuilder()
        .setName("regex")
        .setDescription("Manage channel regexes")
        .addSubcommandGroup(g => g
            .setName("group")
            .setDescription("Modify channel regex groups")
            .addSubcommand(s => s
                .setName("create")
                .setDescription("Create a regex group")
                .addStringOption(o => o
                    .setName("name")
                    .setDescription("The name of the regex group")
                    .setRequired(true)
                    .setMinLength(3)
                    .setMaxLength(32)
                )
            )
            .addSubcommand(s => s
                .setName("edit")
                .setDescription("Edit a channel regex group")
                .addStringOption(o => o
                    .setName("group")
                    .setDescription("The regex group to modify")
                    .setRequired(true)
                    .setAutocomplete(true)
                )
                .addStringOption(o => o
                    .setName("name")
                    .setDescription("The name of the regex group")
                    .setRequired(false)
                    .setMinLength(3)
                    .setMaxLength(32)
                )
            )
            .addSubcommand(s => s
                .setName("delete")
                .setDescription("Deletes a channel regex group")
                .addStringOption(o => o
                    .setName("group")
                    .setDescription("The regex group to delete")
                    .setRequired(true)
                    .setAutocomplete(true)
                )
            )
        )
        .addSubcommandGroup(g => g
            .setName("regex")
            .setDescription("Modify channel regex")
            .addSubcommand(s => s
                .setName("create")
                .setDescription("Create a regex")
                .addStringOption(o => o
                    .setName("group")
                    .setDescription("The regex group to add to")
                    .setRequired(true)
                    .setAutocomplete(true)
                )
                .addStringOption(o => o
                    .setName("regex")
                    .setDescription("The regex to add")
                    .setRequired(true)
                    .setMinLength(3)
                    .setMaxLength(32)
                )
            )
            .addSubcommand(s => s
                .setName("edit")
                .setDescription("Edit a channel regex")
                .addStringOption(o => o
                    .setName("regex")
                    .setDescription("The regex to modify")
                    .setRequired(true)
                    .setAutocomplete(true)
                )
                .addStringOption(o => o
                    .setName("new-regex")
                    .setDescription("The new regex")
                    .setRequired(true)
                    .setMinLength(3)
                    .setMaxLength(32)
                )
            )
            .addSubcommand(s => s
                .setName("delete")
                .setDescription("Deletes a channel regex group")
                .addStringOption(o => o
                    .setName("group")
                    .setDescription("The regex group to delete")
                    .setRequired(true)
                    .setAutocomplete(true)
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

    }
};

module.exports = command;

