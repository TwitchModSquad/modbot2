const {EmbedBuilder} = require("discord.js");
const client = global.client.modbot;

const listener = {
    name: 'commandManager',
    eventName: 'interactionCreate',
    eventType: 'on',
    listener (interaction) {
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

        try {
            console.log(`[MB:${interaction.guild.name}:${interaction.user.username}]: Processing command /${interaction.commandName}`);
            cmd.execute(interaction);
        } catch (error) {
            console.error(error);
            interaction.reply('***There was an error trying to execute that command!***');
        }
    }
};

module.exports = listener;
