const {EmbedBuilder, ChatInputCommandInteraction} = require("discord.js");
const client = global.client.mbm;

const utils = require("../../../utils");
const config = require("../../../config.json");

const listener = {
    name: 'commandManager',
    eventName: 'interactionCreate',
    eventType: 'on',
    /**
     * Execution function for this command
     * @param {ChatInputCommandInteraction} interaction 
     */
    async listener (interaction) {
        if (!interaction.isCommand()) return;
    
        if (!client.commands.has(interaction.commandName)) return;
    
        let cmd = client.commands.get(interaction.commandName);

        const success = message => {
            const embed = new EmbedBuilder()
                .setTitle("Success!")
                .setDescription(message)
                .setColor(0x772ce8);

            interaction.reply({embeds: [embed], ephemeral: true})
        }

        const error = message => {
            const embed = new EmbedBuilder()
                .setTitle("Error!")
                .setDescription(message)
                .setColor(0xe83b3b);

            interaction.reply({embeds: [embed], ephemeral: true})
        }

        interaction.success = success;
        interaction.error = error;

        interaction.tms = {
            guild: await utils.Schemas.DiscordGuild.findById(interaction.guildId),
            user: await utils.Discord.getUserById(interaction.user.id, false, true),
        };

        if (!interaction.tms.user?.identity?.authenticated) {
            return interaction.error(`You must be authenticated to use TMS commands! [Authenticate](${config.express.domain.root}auth/login)`)
        }

        if (interaction.tms.guild && interaction.tms.guild.commands[interaction.commandName]) {
            try {
                cmd.execute(interaction);
            } catch (error) {
                global.api.Logger.warning(error);
                interaction.reply('***There was an error trying to execute that command!***');
            }
        } else {
            interaction.error(`This command is disabled in this guild!${interaction?.guild?.ownerId === interaction?.user?.id ? `\nSince you own this guild, you may enable this command at ${config.express.domain.root}panel/commands/discord/${interaction.guildId}` : ""}`);
        }
    }
};

module.exports = listener;
