const con = require("./database");
const utils = require("../../utils/");

(async function() {

await utils.schema();
global.utils = utils;

console.log("Getting twitch users...");let users = []
// let users = await con.pquery("select * from twitch__user;");
console.log(`Got ${users.length} Twitch users`);

console.log("Importing...");
for (let i = 0; i < users.length; i++) {
    if (i % 50 === 0) {
        console.log(`Imported ${i} / ${users.length} (${(i / users.length * 100).toFixed(2)})`)
    }
    const user = users[i];
    await utils.Schemas.TwitchUser.findOneAndUpdate({
        _id: user.id,
    }, {
        _id: user.id,
        login: user.login === "" ? user.display_name.toLowerCase() : user.login,
        display_name: user.display_name,
        type: "",
        broadcaster_type: user.affiliation === null ? "" : user.affiliation,
        follower_count: user.follower_count,
        description: user.description,
        profile_image_url: user.profile_image_url,
        offline_image_url: user.offline_image_url,
        migrated: true,
    }, {
        upsert: true,
        new: true,
    })

    if (user.refresh_token && user.scope) {
        await utils.Schemas.TwitchToken.create({
            user: user.id,
            scope: user.scope,
            refresh_token: user.refresh_token
        })
    }
}
console.log("Imported Twitch users!");
console.log("Getting discord users...")
// users = await con.pquery("select * from discord__user;");
console.log(`Got ${users.length} Discord users`);

console.log("Importing...");
for (let i = 0; i < users.length; i++) {
    if (i % 50 === 0) {
        console.log(`Imported ${i} / ${users.length} (${(i / users.length * 100).toFixed(2)})`)
    }
    const user = users[i];
    await utils.Schemas.DiscordUser.findOneAndUpdate({
        _id: user.id,
    }, {
        globalName: user.name,
        displayName: user.name,
        discriminator: user.discriminator,
        avatar: user.avatar,
        migrated: true,
    }, {
        upsert: true,
        new: true,
    });
}
console.log("Imported discord users");

console.log("Getting identities");
identities = []
// let identities = await con.pquery("select * from identity;");
console.log(`Got ${identities.length} identities`);

for (let i = 0; i < identities.length; i++) {
    if (i % 50 === 0) {
        console.log(`Imported ${i} / ${identities.length} (${(i / identities.length * 100).toFixed(2)})`)
    }
    const identity = identities[i];
    const tUsers = await con.pquery("select id from twitch__user where identity_id = ?;", [identity.id]);
    const dUsers = await con.pquery("select id from discord__user where identity_id = ?;", [identity.id]);
    let twitchUsers = [];
    let discordUsers = [];

    if (tUsers.length === 0 && dUsers.length === 0) continue;

    for (let t = 0; t < tUsers.length; t++) {
        twitchUsers.push(await utils.Twitch.getUserById(tUsers[t].id, false, true));
    }
    for (let d = 0; d < dUsers.length; d++) {
        discordUsers.push(await utils.Discord.getUserById(dUsers[d].id, false, true));
    }
    const newIdentity = await utils.consolidateIdentites(twitchUsers, discordUsers);
    newIdentity.authenticated = identity.authenticated == "1";
    await newIdentity.save();

    const modfor = await con.pquery("select identity_id from identity__moderator where modfor_id = ? and active = true;", [identity.id]);
    if (modfor.length > 0) {
        for (let t = 0; t < twitchUsers.length; t++) {
            twitchUsers[t].chat_listen = true;
            await twitchUsers[t].save();
        }
    }
}

console.log("Imported identities");

const tokens = await con.pquery("select * from twitch__token where `type` = 'modbot';");
console.log(`Got ${tokens.length} tokens`)

for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    await utils.Schemas.TwitchToken.findOneAndUpdate({
        user: token.user_id,
    }, {
        user: token.user_id,
        refresh_token: token.token,
        scope: token.scopes,
        created_at: token.created,
    });
}

console.log("Done!");

})();
