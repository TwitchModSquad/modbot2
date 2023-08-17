const express = require("express");
const path = require("path");
const config = require("../config.json");
const cookieParser = require("cookie-parser");

const app = express();
const expressWs = require("express-ws")(app);

const controllers = require("./controllers/");
const ws = require("./ws/");

app.set("view engine", "ejs");

app.use(cookieParser());

app.set("views", path.join(__dirname, "/views"));

app.use(express.static("express/static"));

app.use(controllers);
app.use("/ws", ws.router);

app.listen(config.express.port, () => {
    console.log(`Express server started on port ${config.express.port}`);
});
