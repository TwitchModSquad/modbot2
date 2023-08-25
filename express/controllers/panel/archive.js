const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const router = express.Router();

const utils = require("../../../utils/");

const VALID_MIME = [
    "image/apng",
    "image/avif",
    "image/gif",
    "image/jpeg",
    "image/png",
    "image/webp",
];

router.get("/create", (req, res) => {
    res.render("panel/pages/archive/create", {comma: utils.comma});
});

router.get("/:id", async (req, res) => {
    try {
        const archive = await utils.Schemas.Archive.findById(new mongoose.Types.ObjectId(req.params.id))
                .populate("owner");
        if (archive) {
            const users = await archive.getUsers();
            const files = await archive.getFiles();
            const owners = await archive.owner.getTwitchUsers();

            res.render("panel/pages/archive/view", {
                archive: archive,
                users: users,
                files: files,
                owners: owners,
                comma: utils.comma
            });
        } else {
            res.send("Archive not found");
        }
    } catch(err) {
        console.error(err);
        res.send("An error occurred!");
    }
});

router.get("/image/:id", async (req, res) => {
    try {
        const file = await utils.Schemas.ArchiveFile.findById(new mongoose.Types.ObjectId(req.params.id));
        if (file?.image?.data) {
            res.writeHead(200, {"Content-Type": file.image.contentType});
            res.end(Buffer.from(file.image.data, "base64"));
        } else {
            res.send("File not found");
        }
    } catch(err) {
        console.error(err);
        res.send("An error occurred!");
    }
});

router.use(bodyParser.urlencoded({extended: true}));

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads");
    },
    filename: (req, file, cb) => {
        cb(null, file.fieldname + "-" + Date.now());
    }
});

const upload = multer({storage: storage});

router.post("/create", upload.any(), async (req, res) => {
    let archive;
    let files = [];
    let users = [];
    
    try {
        archive = await utils.Schemas.Archive.create({
            owner: req.session.identity._id,
            offense: req.body.offense,
            description: req.body.description,
        });

        if (req.body["user-twitch"]) {
            for (let i = 0; i < req.body["user-twitch"].length; i++) {
                const id = req.body["user-twitch"][i];
                const user = await utils.Twitch.getUserById(id, false, true);
                users.push(await utils.Schemas.ArchiveUser.create({
                    entry: archive._id,
                    twitchUser: user._id,
                }));
            }
        }
        if (req.body["user-discord"]) {
            for (let i = 0; i < req.body["user-discord"].length; i++) {
                const id = req.body["user-discord"][i];
                const user = await utils.Discord.getUserById(id, false, true);
                users.push(await utils.Schemas.ArchiveUser.create({
                    entry: archive._id,
                    discordUser: user._id,
                }));
            }
        }
        if (req.body["user-raw"]) {
            for (let i = 0; i < req.body["user-raw"].length; i++) {
                const input = req.body["user-raw"][i];
                if (!isNaN(Number(input))) {
                    try {
                        const user = await utils.Discord.getUserById(input, true, true);
                        users.push(await utils.Schemas.ArchiveUser.create({
                            entry: archive._id,
                            discordUser: user._id,
                        }));
                        continue;
                    } catch(e) {}
                    try {
                        if (input.length < 10) {
                            const user = await utils.Twitch.getUserById(input, true, true);
                            users.push(await utils.Schemas.ArchiveUser.create({
                                entry: archive._id,
                                twitchUser: user._id,
                            }));
                            continue;
                        }
                    } catch(e) {}
                }
                users.push(await utils.Schemas.ArchiveUser.create({
                    entry: archive._id,
                    raw: input,
                }));
            }
        }

        if (users.length === 0) {
            throw "No users were added!";
        }

        for (let i = 0; i < 250; i++) {
            if (req.body[`file-name-${i}`]) {
                if (req.body[`file-link-${i}`]) {
                    files.push(await utils.Schemas.ArchiveFile.create({
                        entry: archive._id,
                        label: req.body[`file-name-${i}`],
                        remote: req.body[`file-link-${i}`],
                    }));
                }
            }
        }

        for (let i = 0; i < req.files.length; i++) {
            const file = req.files[i];
            const label = req.body[file.fieldname.replace("file-", "file-name-")];
            if (!VALID_MIME.includes(file.mimetype)) continue;
            if (label) {
                files.push(await utils.Schemas.ArchiveFile.create({
                    entry: archive._id,
                    label: label,
                    image: {
                        contentType: file.mimetype,
                        data: fs.readFileSync(path.join(global.rootDir + "/uploads/" + file.filename)),
                    }
                }));
            }
        }
        res.redirect(`/panel/archive/${archive._id}`);
    } catch(err) {
        console.error(err);
        res.send("An error occurred! :(");

        if (archive) await archive.deleteOne();
        for (let i = 0; i < files.length; i++) {
            await files[i].deleteOne(0);
        }
        for (let i = 0; i < users.length; i++) {
            await users[i].deleteOne(0);
        }
    }
});

module.exports = router;
