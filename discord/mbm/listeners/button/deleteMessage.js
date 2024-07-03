const { ButtonInteraction } = require("discord.js");
const utils = require("../../../../utils");

const listener = {
    name: 'deleteMessage',
    /**
     * Verifies a button press should be sent to this listener
     * @param {ButtonInteraction} interaction 
     */
    verify(interaction) {
        return interaction.component.customId === "delete-message";
    },
    /**
     * Listener for a button press
     * @param {ButtonInteraction} interaction 
     */
    async listener (interaction) {
        try {
            const referencedMessage = await interaction.message.fetchReference();
            if (referencedMessage && interaction.user.id !== referencedMessage.author.id) {
                return interaction.error("You must be the author of the original message to delete this message!");
            }
        } catch(err) {
            console.error(err);
        }
        interaction.message.delete().then(() => {
            interaction.success("Message successfully deleted!")
        }, err => {
            interaction.error("An error occurred!");
            console.error(err);
        });
    }
};

module.exports = listener;
