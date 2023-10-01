const utils = require("../utils/");
const config = require("../config.json");
const {TwitchLivestream, TwitchGame, TwitchTag, TwitchStreamStatus} = require("../utils/twitch/TwitchStream");
const { HelixStream } = require("twitch");

const interval = {
    interval: 30000,
    onStartup: false,
    run: async () => {
        const users = await utils.Schemas.TwitchUser.find({chat_listen: true});

        /**
         * @type {HelixStream[]}
         */
        let streams = [];
        let activeStreams = await TwitchLivestream.find({endDate: null, member: true})
                .populate("user");

        const getStreams = async users => {
            streams = [
                ...streams,
                ...(await utils.Twitch.Helix.helix.streams.getStreams({userId: users})).data,
            ]
        }

        let getUsers = [];
        for (let i = 0; i < users.length; i++) {
            getUsers.push(users[i]._id);

            if (getUsers.length >= 100) {
                await getStreams(getUsers);
                getUsers = [];
            }
        }
        if (getUsers.length > 0) await getStreams(getUsers);

        for (let i = 0; i < streams.length; i++) {
            const stream = streams[i];
            let livestream = await TwitchLivestream.findById(stream.id);
            let newLivestream = false;
            if (!livestream) {
                livestream = await TwitchLivestream.create({
                    _id: stream.id,
                    startDate: stream.startDate,
                    language: stream.language,
                    user: stream.userId,
                    member: true,
                });
                newLivestream = true;
            }
            let game = await TwitchGame.findById(stream.gameId);
            if (!game) {
                const gameObj = await stream.getGame();
                if (!gameObj) continue;
                game = await TwitchGame.create({
                    _id: gameObj.id,
                    boxArtUrl: gameObj.boxArtUrl,
                    name: gameObj.name,
                });
            }
            const activity = await TwitchStreamStatus.create({
                live: livestream,
                game: game,
                tags: [],
                title: stream.title,
                viewers: stream.viewers,
            });
            const user = await utils.Twitch.getUserById(stream.userId);
            if (newLivestream) {
                utils.EventManager.fire("member_live", user, stream, activity);
            } else {
                const discordMessages = await utils.Schemas.DiscordMessage.find({live: livestream._id});
                const messages = [];
                for (let m = 0; m < discordMessages.length; m++) {
                    const discordMessage = discordMessages[m];
                    let channel = utils.Discord.channels.live;
                    if (discordMessage.channel && channel.id !== discordMessage.channel) {
                        channel = await global.client.mbm.channels.fetch(discordMessage.channel);
                    }
                    try {
                        messages.push(await channel.messages.fetch(discordMessage._id));
                    } catch(err) {
                        console.error(err);
                    }
                }
                utils.EventManager.fire("member_live_update", user, stream, activity, messages);
            }
            activeStreams = activeStreams.filter(x => x._id !== livestream._id);
        }

        for (let i = 0; i < activeStreams.length; i++) {
            const livestream = activeStreams[i];
            livestream.endDate = Date.now();
            await livestream.save();
            const discordMessages = await utils.Schemas.DiscordMessage.find({live: livestream._id});
            const messages = [];
            for (let m = 0; m < discordMessages.length; m++) {
                const discordMessage = discordMessages[m];
                let channel = utils.Discord.channels.live;
                if (discordMessage.channel && channel.id !== discordMessage.channel) {
                    channel = await global.client.mbm.channels.fetch(discordMessage.channel);
                }
                try {
                    messages.push(await channel.messages.fetch(discordMessage._id));
                } catch(err) {
                    console.error(err);
                }
            }
            utils.EventManager.fire("member_live_offline", livestream, messages);
        }
    },
};

module.exports = interval;
