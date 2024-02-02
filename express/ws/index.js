const express = require("express");
const router = express.Router();
const io = require("@pm2/io");

const utils = require("../../utils/");

const authenticate = async sessionId => {
    try {
        const session = await utils.SessionStore.getSessionById(sessionId);
        if (session.identity.authenticated) {
            return session;
        }
    } catch(err) {}
    return null;
};

let websockets = [];

const websocketsMetric = io.metric({
    id: "app/realtime/websockets",
    name: "Active Websockets",
})

setInterval(() => {
    websocketsMetric.set(websockets.length);
}, 1000);

router.ws("/ban", (ws, req) => {
    ws.id = utils.stringGenerator(32);
    ws.identity = req.session.identity;

    ws.type = "ban";
    ws.scope = "all";

    const expireTimeout = setTimeout(() => {
        ws.close();
    }, 10000);

    ws.on("message", async msg => {
        let json;
        try {
            json = JSON.parse(msg);
        } catch(err) {
            return;
        }

        if (!json?.type) return;

        if (json.type === "authenticate" && json?.session) {
            const session = await authenticate(json.session);
            if (session) {
                clearTimeout(expireTimeout);
                websockets.push(ws);
                ws.session = session;
                ws.send(JSON.stringify({
                    type: "authenticate",
                    ok: true,
                    identity: {
                        id: session.identity._id,
                        authenticated: session.identity.authenticated,
                        twitchUsers: (await session.identity.getTwitchUsers()).map(x => x.public()),
                        discordUsers: (await session.identity.getDiscordUsers()).map(x => x.public()),
                    },
                }));
            } else {
                ws.send(JSON.stringify({
                    type: "authenticate",
                    ok: false,
                    identity: null,
                }));
            }
        }

        if (!ws.session) return;
    });

    ws.on("close", () => {
        websockets = websockets.filter(x => x.id !== ws.id);
    });
});

router.ws("/chat", (ws, req) => {
    ws.id = utils.stringGenerator(32);
    ws.identity = req.session.identity;

    ws.type = "chat";
    ws.scope = "all";

    const expireTimeout = setTimeout(() => {
        ws.close();
    }, 10000);

    ws.on("message", async msg => {
        let json;
        try {
            json = JSON.parse(msg);
        } catch(err) {
            return;
        }

        if (!json?.type) return;

        if (json.type === "authenticate" && json?.session) {
            const session = await authenticate(json.session);
            if (session) {
                clearTimeout(expireTimeout);
                websockets.push(ws);
                ws.session = session;
                ws.send(JSON.stringify({
                    type: "authenticate",
                    ok: true,
                    identity: {
                        id: session.identity._id,
                        authenticated: session.identity.authenticated,
                        twitchUsers: (await session.identity.getTwitchUsers()).map(x => x.public()),
                        discordUsers: (await session.identity.getDiscordUsers()).map(x => x.public()),
                    },
                }));
            } else {
                ws.send(JSON.stringify({
                    type: "authenticate",
                    ok: false,
                    identity: null,
                }));
            }
        }

        if (!ws.session) return;
    });

    ws.on("close", () => {
        websockets = websockets.filter(x => x.id !== ws.id);
    });
});

const sendPartialUpdate = ws => {
    ws.sendJson({
        mostActiveChannels: utils.StatsManager.getMostActiveChannels(),
        recentFollowers: utils.StatsManager.getRecentFollowers(),
        recentSubscriptions: utils.StatsManager.getRecentSubscriptions(),
    });
}

const sendFullUpdate = ws => {
    ws.sendJson({
        mostActiveChannels: utils.StatsManager.getMostActiveChannels(),
        hourlyActivity: utils.StatsManager.getHourlyActivity(),
        general: utils.StatsManager.getGeneralStatistics(),
        recentFollowers: utils.StatsManager.getRecentFollowers(),
        memberStreams: utils.StatsManager.getMemberStreams(),
    });
}

const OVERVIEW_SCOPES = ["scene","chat","follow","subscription"];
router.ws("/overview", (ws, req) => {
    ws.id = utils.stringGenerator(32);
    ws.identity = req.session.identity;

    ws.sendJson = msg => {
        ws.send(JSON.stringify(msg));
    }

    ws.type = "overview";
    ws.scope = [];

    const expireTimeout = setTimeout(() => {
        ws.close();
    }, 10000);

    ws.on("message", async msg => {
        let json;
        try {
            json = JSON.parse(msg);
        } catch(err) {
            return;
        }

        if (!json?.type) return;

        if (json.type === "authenticate" && json?.session) {
            const session = await authenticate(json.session);
            if (session) {
                clearTimeout(expireTimeout);
                websockets.push(ws);
                ws.session = session;
                ws.send(JSON.stringify({
                    type: "authenticate",
                    ok: true,
                    identity: {
                        id: session.identity._id,
                        authenticated: session.identity.authenticated,
                        twitchUsers: (await session.identity.getTwitchUsers()).map(x => x.public()),
                        discordUsers: (await session.identity.getDiscordUsers()).map(x => x.public()),
                    },
                }));
            } else {
                ws.send(JSON.stringify({
                    type: "authenticate",
                    ok: false,
                    identity: null,
                }));
            }
        }

        if (!ws.session) return;

        if (json.type === "ready") {
            sendFullUpdate(ws);
        } else if (json.type === "addScope" && json?.scope) {
            if (typeof(json.scope) === "object") {
                for (let i = 0; i < json.scope.length; i++) {
                    if (!OVERVIEW_SCOPES.includes(json.scope[i]))
                        return console.error(`Ignoring scope request due to invalid scope ${json.scope[i]}`);
                }
                ws.scope = [
                    ...ws.scope,
                    ...json.scope,
                ]
            } else if (typeof(json.scope) === "string") {
                if (!OVERVIEW_SCOPES.includes(json.scope))
                    return console.error(`Ignoring scope request due to invalid scope ${json.scope}`);
                ws.scope.push(json.scope);
            }
        }
    });

    ws.on("close", () => {
        websockets = websockets.filter(x => x.id !== ws.id);
    });
});

const broadcast = (type, scope, msg) => {
    if (typeof(msg) === "object") msg = JSON.stringify(msg);
    const broadcastWs = websockets.filter(x => x.type === type && (x.scope === "all" || x.scope === scope));
    broadcastWs.forEach(ws => {
        try {
            ws.send(msg);
        } catch(e) {
            console.error(e);
        }
    });
}

const overviewBroadcast = (scope, msg) => {
    if (typeof(msg) === "object") msg = JSON.stringify(msg);
    const broadcastWs = websockets.filter(x => x.type === "overview" && x.scope.includes(scope));
    broadcastWs.forEach(ws => {
        console.log(msg)
        try {
            ws.send(msg);
        } catch(e) {
            console.error(e);
        }
    });
}

let intCount = 0;
setInterval(() => {
    websockets.filter(x => x.type === "overview").forEach(ws => {
        if (intCount % 15 === 0) {
            sendFullUpdate(ws);
        } else sendPartialUpdate(ws);
    });
    intCount++;
}, 2500);

global.broadcast = broadcast;
global.overviewBroadcast = overviewBroadcast;

module.exports = {
    router: router,
    broadcast: broadcast,
    overviewBroadcast: overviewBroadcast,
};
