const express = require("express");
const router = express.Router();

const bodyParser = require("body-parser");
router.use(bodyParser.json({extended: true}));

const utils = require("../../../../utils");
const commands = utils.Discord.guildManager.discordCommands;

const convertToDotNotation = (obj, newObj = {}, prefix = "") => {
    for(let key in obj) {
        if (typeof obj[key] === "object") {
            convertToDotNotation(obj[key], newObj, prefix + key + ".");
        } else {
            newObj[prefix + key] = obj[key];
        }
    }
    return newObj;
}

router.post("/", async (req, res) => {
    const newData = {};
    let errors = [];
    for (let i = 0; i < commands.length; i++) {
        const name = commands[i].name;
        if (typeof(req?.body[name]) === "boolean") {
            newData[name] = req.body[name];
        } else {
            errors.push("Missing boolean parameter " + name);
        }
    }

    if (errors.length > 0) {
        return res.json({ok: false, error: errors.join(", ")});
    }

    const guild = await utils.Schemas.DiscordGuild.findByIdAndUpdate(req.guild.id, convertToDotNotation({commands: newData}));

    res.json({ok: true, guild: guild.public()});
});

module.exports = router;
