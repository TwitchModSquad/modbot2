const { ChatInputCommandInteraction, SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

const config = require("../../../config.json");
const utils = require("../../../utils");
const { default: mongoose } = require("mongoose");

const MAX_START_TIME_DIFFERENCE = 2 * 30 * 24 * 60 * 60 * 1000;
const MAX_START_TIME_STRING = "2 months";

const command = {
    data: new SlashCommandBuilder()
        .setName("giveaway")
        .setDescription("Commands related to the TMS Giveaway system")
        .addSubcommandGroup(x => x
            .setName("admin")
            .setDescription("Administrative commands")
            .addSubcommand(y => y
                .setName("create")
                .setDescription("Create a new Giveaway")
                .addStringOption(z => z
                    .setName("name")
                    .setDescription("The name of the giveaway")
                    .setMinLength(3)
                    .setMaxLength(128)
                    .setRequired(true)
                )
                .addStringOption(z => z
                    .setName("description")
                    .setDescription("The description of the giveaway")
                    .setMinLength(3)
                    .setMaxLength(1024)
                    .setRequired(true)
                )
                .addStringOption(z => z
                    .setName("item")
                    .setDescription("The item being given")
                    .setMinLength(2)
                    .setMaxLength(64)
                    .setRequired(true)
                )
                .addIntegerOption(z => z
                    .setName("quantity")
                    .setDescription("The quantity of items being given away")
                    .setMinValue(1)
                    .setMaxValue(10)
                    .setRequired(true)
                )
                .addIntegerOption(z => z
                    .setName("entry-price")
                    .setDescription("The token price to enter")
                    .setMinValue(0)
                    .setMaxValue(100000)
                    .setRequired(true)
                )
                .addIntegerOption(z => z
                    .setName("entry-maximum")
                    .setDescription("The maximum times a user may enter. 0 = infinite")
                    .setMinValue(0)
                    .setMaxValue(100)
                    .setRequired(true)
                )
                .addIntegerOption(z => z
                    .setName("end-time")
                    .setDescription("The end time of the giveaway (Unix milliseconds)")
                    .setRequired(true)
                )
                .addIntegerOption(z => z
                    .setName("start-time")
                    .setDescription("The start time of the giveaway. (Unix milliseconds) Defaults to now")
                )
            )
            .addSubcommand(y => y
                .setName("choose")
                .setDescription("Choose winners for a specified Giveaway")
                .addStringOption(z => z
                    .setName("giveaway")
                    .setDescription("The giveaway to complete")
                    .setRequired(true)
                    .setAutocomplete(true)
                )
            )
        )
        .addSubcommand(x => x
            .setName("enter")
            .setDescription("Enter a Giveaway!")
            .addStringOption(z => z
                .setName("giveaway")
                .setDescription("The giveaway to enter")
                .setRequired(true)
                .setAutocomplete(true)
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

        if (subcommandGroup === "admin") {
            if (!identity.admin) {
                return interaction.error("You must be an administrator to use this command!");
            }

            if (subcommand === "create") {
                const name = interaction.options.getString("name", true);
                const description = interaction.options.getString("description", true);
                const item = interaction.options.getString("item", true);
                const quantity = interaction.options.getInteger("quantity", true);
                const entryPrice = interaction.options.getInteger("entry-price", true);
                const entryMaximum = interaction.options.getInteger("entry-maximum", true);
                const endTime = new Date(interaction.options.getInteger("end-time", true));
                let startTime = interaction.options.getInteger("start-time", false);

                if (startTime) {
                    startTime = new Date(startTime);
                } else {
                    startTime = new Date();
                }

                if (endTime.getTime() < Date.now()) {
                    return interaction.error(`End time <t:${Math.floor(endTime.getTime()/1000)}:f> happened before now (<t:${Math.floor(Date.now()/1000)}:f>)!`);
                }

                if (Math.abs(startTime.getTime() - Date.now()) > MAX_START_TIME_DIFFERENCE) {
                    return interaction.error(`Start time <t:${Math.floor(startTime.getTime()/1000)}:f> has greater than ${MAX_START_TIME_STRING} difference between now (<t:${Math.floor(Date.now()/1000)}:f>)!`);
                }

                const giveaway = await utils.Schemas.Giveaway.create({
                    name: name,
                    description: description,
                    item: {
                        name: item,
                        quantity: quantity,
                    },
                    entry: {
                        price: entryPrice,
                        maximum: entryMaximum,
                    },
                    end_time: endTime,
                    start_time: startTime,
                });

                const enterButton = new ButtonBuilder()
                    .setCustomId("giveaway-enter")
                    .setLabel("Enter")
                    .setEmoji('📥')
                    .setStyle(ButtonStyle.Primary);
                
                interaction.channel.send({
                    embeds: [giveaway.embed()],
                    components: [
                        new ActionRowBuilder()
                            .setComponents(enterButton),
                    ],
                }).then(message => {
                    interaction.success(`Giveaway \`${name}\` was successfully created!`);
                    utils.Schemas.DiscordMessage.create({
                        _id: message.id,
                        guild: message.guild.id,
                        channel: message.channel.id,
                        giveaway: giveaway,
                    }).catch(console.error);
                }, err => {
                    console.error(err);
                    interaction.error(String(err));
                });
            } else {
                interaction.error("Unknown subcommand!");
            }
        } else if (subcommand === "enter") {
            const id = interaction.options.getString("giveaway", true);
            try {
                const giveaway = await utils.Schemas.Giveaway.findById(new mongoose.Types.ObjectId(id));
                if (giveaway) {
                    giveaway.enter(identity).then(entryCount => {
                        interaction.success(`Purchased 1 entry to \`${giveaway.name}\`!\nYou currently have ${entryCount} ${entryCount === 1 ? "entry" : "entries"} into this giveaway.\nWe will be drawing for this giveaway in about ${giveaway.discordEndTime("R")}`)
                    }, err => {
                        interaction.error(err);
                    });
                    return;
                }
            } catch(err) {
                console.error(err);
            }
            interaction.error(`Unable to find giveaway with ID ${id}!`);
        } else {
            interaction.error("Unknown subcommand!");
        }
    }
};

module.exports = command;
