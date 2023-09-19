const utils = require("../utils/");

const MINIMUM_AGE = 3 * 24 * 60 * 60 * 1000;

let running = false;
const interval = {
    interval: 30000,
    onStartup: true,
    run: async () => {
        if (running) return;
        running = true;

        let users = await utils.Schemas.TwitchUser
                .where("updated_at")
                .lt(Date.now() - MINIMUM_AGE)
                .sort({updated_at: 1})
                .limit(100);
        
        users = users.map(x => x.id);
        
        const helixUsers = await utils.Twitch.Helix.helix.users.getUsersByIds(users);

        for (let i = 0; i < helixUsers.length; i++) {
            const user = helixUsers[i];
            const dbUser = await utils.Schemas.TwitchUser.findById(user.id);
            dbUser.login = user.name;
            dbUser.display_name = user.displayName;
            dbUser.type = user.type;
            dbUser.broadcaster_type = user.broadcasterType;
            dbUser.description = user.description;
            dbUser.profile_image_url = user.profilePictureUrl;
            dbUser.offline_image_url = user.offlinePlaceholderUrl;
            
            try {
                await dbUser.fetchFollowers();
            } catch(e) {
                console.error(e);
            }

            await dbUser.save();
        }

        running = false;
    },
};

module.exports = interval;
