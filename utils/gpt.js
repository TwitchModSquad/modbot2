const {OpenAI} = require("openai");

const config = require("../config.json");

const oai = new OpenAI({
    apiKey: config.gpt.key,
});

module.exports = oai;
