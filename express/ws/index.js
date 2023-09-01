const express = require("express");
const router = express.Router();

const utils = require("../../utils/");

router.use(async (req, res, next) => {
    const {cookies} = req;

    const fail = () => {
        res.json({ok: false, error: "Unauthenticated"});
    }

    if (cookies?.session) {
        const session = await utils.Schemas.Session.findById(cookies.session)
                .populate("identity");
        if (session && session.identity.authenticated) {
            req.session = session;
            next();
        } else {
            fail();
        }
    } else {
        fail();
    }
});

let websockets = [];

router.ws("/ban", (ws, req) => {
    ws.id = utils.stringGenerator(32);
    ws.identity = req.session.identity;

    ws.type = "ban";
    ws.scope = "all";

    websockets.push(ws);

    ws.on("close", () => {
        websockets = websockets.filter(x => x.id !== ws.id);
    });
});

router.ws("/chat", (ws, req) => {
    ws.id = utils.stringGenerator(32);
    ws.identity = req.session.identity;

    ws.type = "chat";
    ws.scope = "all";

    websockets.push(ws);

    ws.on("close", () => {
        websockets = websockets.filter(x => x.id !== ws.id);
    });
});

const sendPartialUpdate = ws => {
    ws.sendJson({
        mostActiveChannels: utils.StatsManager.getMostActiveChannels(),
    });
}

const sendFullUpdate = ws => {
    ws.sendJson({
        mostActiveChannels: utils.StatsManager.getMostActiveChannels(),
        hourlyActivity: utils.StatsManager.getHourlyActivity(),
        general: utils.StatsManager.getGeneralStatistics(),
    });
}

router.ws("/overview", (ws, req) => {
    ws.id = utils.stringGenerator(32);
    ws.identity = req.session.identity;

    ws.sendJson = msg => {
        ws.send(JSON.stringify(msg));
    }

    ws.type = "overview";
    ws.scope = "all";

    websockets.push(ws);

    ws.on("message", msg => {
        let json;
        try {
            json = JSON.parse(msg);
        } catch(err) {
            return;
        }

        if (!json?.type) return;

        if (json.type === "ready") {
            sendFullUpdate(ws);
        }
    });

    ws.on("close", () => {
        websockets = websockets.filter(x => x.id !== ws.id);
    });
});

const broadcast = (type, scope, msg) => {
    const broadcastWs = websockets.filter(x => x.type === type && (x.scope === "all" || x.scope === scope));
    broadcastWs.forEach(ws => {
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

module.exports = {
    router: router,
    broadcast: broadcast,
};
