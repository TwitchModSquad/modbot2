global.startTime = Date.now();
global.rootDir = __dirname;

const fs = require('fs');

global.client = {};

global.twitchAuthReady = false;
global.twitchChannelsJoined = false;

const utils = require("./utils/");

const grabFiles = path => fs.readdirSync(path).filter(file => file.endsWith('.js'));

const intervals = grabFiles('./intervals/');
const tasks = grabFiles("./tasks/");

global.utils = utils;

utils.schema().then(async () => {
    for (const file of intervals) {
        const interval = require(`./intervals/${file}`);
        setInterval(interval.run, interval.interval);
        if (interval.onStartup) interval.run();
    }

    for (const file of tasks) {
        require(`./tasks/${file}`);
    }

    require("./twitch/");
    require("./discord/");
    require("./express/");

    console.log("Startup completed!");
}, console.error);
