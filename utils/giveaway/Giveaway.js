const { EmbedBuilder, codeBlock, cleanCodeBlockContent } = require("discord.js");
const mongoose = require("mongoose");

const GiveawayEntry = require("./GiveawayEntry");

const config = require("../../config.json");

const schema = new mongoose.Schema({
    name: {
        type: String,
        minLength: 3,
        maxLength: 128,
        required: true,
    },
    description: {
        type: String,
        minLength: 3,
        maxLength: 1024,
        required: true,
    },
    item: {
        name: {
            type: String,
            minLength: 2,
            maxLength: 64,
            required: true,
        },
        quantity: {
            type: Number,
            required: true,
        },
    },
    entry: {
        price: {
            type: Number,
            required: true,
        },
        maximum: {
            type: Number,
            required: true,
        },
    },
    start_time: {
        type: Date,
        default: Date.now,
    },
    end_time: {
        type: Date,
        required: true,
    },
});

schema.methods.embed = function() {
    return new EmbedBuilder()
        .setColor(0x6c24d7)
        .setTitle("🚨 New Giveaway Alert! 🚨")
        .setDescription(`**Name:**\n${codeBlock(cleanCodeBlockContent(this.name))}\n**Description:**\n${codeBlock(cleanCodeBlockContent(this.description))}`)
        .addFields({
            name: "Item",
            value: `${this.item.quantity}x ${this.item.name}`,
            inline: true,
        }, {
            name: "Entry Price",
            value: `${this.entry.price > 0 ? `${this.entry.price} point${this.entry.price === 1 ? "" : "s"}` : "Free"}\n` +
                   `\`Maximum Entries: ${this.entry.maximum}\``,
            inline: true,
        }, {
            name: "Start Time",
            value: `${this.discordStartTime("f")}\n${this.discordStartTime("R")}`,
            inline: true,
        }, {
            name: "End Time",
            value: `${this.discordEndTime("f")}\n${this.discordEndTime("R")}`,
            inline: true,
        })
        .setFooter({iconURL: config.iconURI, text: "The Mod Squad"});
}

schema.methods.discordStartTime = function(format) {
    return `<t:${Math.floor(this.start_time.getTime()/1000)}:${format}>`;
}

schema.methods.discordEndTime = function(format) {
    return `<t:${Math.floor(this.end_time.getTime()/1000)}:${format}>`;
}

schema.methods.enter = function(identity) {
    return new Promise(async (resolve, reject) => {
        const entries = await GiveawayEntry.find({
            giveaway: this,
            identity: identity,
        });

        const now = Date.now();
        if (this.start_time.getTime() > now) {
            return reject(`This giveaway has not started yet! Starts ${this.discordStartTime("R")}`);
        }
        if (this.end_time.getTime() < now) {
            return reject(`This giveaway has ended! Ended ${this.discordEndTime("R")}`);
        }

        if (this.entry.maximum > 0 && entries.length >= this.entry.maximum) {
            return reject(`Maximum entries have been reached for this user! (${this.entry.maximum})`);
        }

        global.utils.Points.removePoints(identity, this.entry.price, "giveaway").then(async log => {
            resolve(entries.length + 1);

            await GiveawayEntry.create({
                giveaway: this,
                identity: identity,
            });
        }, reject);
    });
}

module.exports = mongoose.model("Giveaway", schema);
