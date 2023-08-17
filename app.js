global.startTime = Date.now();

const fs = require('fs');

global.client = {};

const utils = require("./utils/");

const grabFiles = path => fs.readdirSync(path).filter(file => file.endsWith('.js'));
const intervals = grabFiles('./intervals/');

utils.schema().then(async () => {
    global.utils = utils;
    
    for (const file of intervals) {
        const interval = require(`./intervals/${file}`);
        setInterval(interval.run, interval.interval);
        if (interval.onStartup) interval.run();
    }

    require("./twitch/");
    require("./discord/");
    require("./express/");
}, console.error);
