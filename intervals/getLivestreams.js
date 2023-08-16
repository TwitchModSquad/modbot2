const STREAMS_PER_PAGE = 100;

const utils = require("../utils/");
const config = require("../config.json");
const {TwitchLivestream, TwitchGame, TwitchTag, TwitchStreamStatus} = require("../utils/twitch/TwitchStream");

const listenClients = require("../twitch/");

const sleep = ms => {
    return new Promise(resolve => {
        setTimeout(resolve, ms);
    });
}

let lastCursor = null;
const interval = {
    interval: 600000,
    onStartup: true,
    run: async () => {
        if (!config.crawl) return;

        try {
            const streams = await utils.Twitch.Helix.helix.streams.getStreams({after: lastCursor, limit: STREAMS_PER_PAGE, language: "en"});
            lastCursor = streams.cursor;

            for (let i = 0; i < streams.data.length; i++) {
                const stream = streams.data[i];
                const game = await stream.getGame();
                const tags = await stream.getTags();
                const user = await utils.Twitch.getUserById(stream.userId, false, true);

                if (user.chat_listen) continue;
                if (stream.language !== "en") continue;

                let tagsFormatted = [];
                for (let t = 0; t < tags.length; t++) {
                    const tag = tags[t];
                    let dbTag = await TwitchTag.findById(tag.id);
                    if (!dbTag) {
                        dbTag = await TwitchTag.create({
                            _id: tag.id,
                            name: tag.getName("en"),
                            description: tag.getDescription(),
                            isAuto: tag.isAuto,
                        });
                    }
                    tagsFormatted.push(dbTag);
                }

                let dbStream = await TwitchLivestream.findById(stream.id);
                let newStream = false;
                if (!dbStream) {
                    newStream = true;
                    dbStream = await TwitchLivestream.create({
                        _id: stream.id,
                        startDate: stream.startDate,
                        language: stream.language,
                        user: user,
                    });
                }

                let dbGame = null;
                if (game?.id) {
                    dbGame = await TwitchGame.findById(game.id);
                    if (!dbGame && game.id) {
                        dbGame = await TwitchGame.create({
                            _id: game.id,
                            boxArtUrl: game.boxArtUrl,
                            name: game.name,
                        });
                    }
                }

                const addedStream = await TwitchStreamStatus.create({
                    title: stream.title,
                    tags: tagsFormatted,
                    game: dbGame,
                    live: dbStream,
                    viewers: stream.viewers,
                });

                if (user.broadcaster_type === "partner") {
                    listenClients.partner.join(user.login);
                } else if (user.broadcaster_type === "affiliate") {
                    listenClients.affiliate.join(user.login);
                }

                if (newStream)
                    utils.EventManager.fire("live", user, stream, addedStream);

                await sleep(5000);
            }
        } catch(e) {
            console.error(e);
        }
    },
};

module.exports = interval;
