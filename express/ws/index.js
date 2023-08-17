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

module.exports = {
    router: router,
    broadcast: broadcast,
};
