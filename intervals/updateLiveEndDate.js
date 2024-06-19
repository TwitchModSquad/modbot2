const STREAMS_PER_PAGE = 100;

const utils = require("../utils/");
const {TwitchLivestream, TwitchGame, TwitchTag, TwitchStreamStatus} = require("../utils/twitch/TwitchStream");

const listenClients = require("../twitch/");

const updateStreams = async streams => {
    let ids = streams.map(x => x.user._id);

    const helixStreams = await utils.Twitch.Helix.streams.getStreams({userId: ids});
    for (let i = 0; i < streams.length; i++) {
        const stream = streams[i];
        const helixStream = helixStreams.data.find(x => x.id === stream._id);
        if (helixStream) {
            const game = await helixStream.getGame();
            const tags = await helixStream.getTags();

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

            let dbStream = await TwitchLivestream.findById(helixStream.id);
            if (!dbStream) {
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
                title: helixStream.title,
                tags: tagsFormatted,
                game: dbGame,
                live: dbStream,
                viewers: helixStream.viewers,
            });
        } else {
            utils.EventManager.fire("offline", stream.user);
            stream.endDate = Date.now();
            await stream.save();
            
            listenClients.partner.part(stream.user.login);
            listenClients.affiliate.part(stream.user.login);
        }
    }
}

const interval = {
    interval: 600000,
    onStartup: true,
    run: async () => {
        const streams = await TwitchLivestream.find({endDate: null, member: {$ne: true}})
                .populate("user");
        console.log(streams.length + " live streams");

        let streamsRecursive = [];
        for (let i = 0; i < streams.length; i++) {
            streamsRecursive.push(streams[i]);
            if (streamsRecursive.length >= 100) {
                await updateStreams(streamsRecursive);
                streamsRecursive = [];
            }
        }
        if (streamsRecursive > 0) await updateStreams(streamsRecursive);
    },
};

module.exports = interval;
