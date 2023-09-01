const client = global.client.mbm;

const listener = {
    name: 'updateGuilds',
    eventName: 'ready',
    eventType: 'once',
    async listener () {
        const guilds = await client.guilds.fetch();
        for (const [, guild] of client.guilds.cache) {
            try {
                await global.utils.Schemas.DiscordGuild.findOneAndUpdate({
                    _id: guild.id,
                }, {
                    _id: guild.id,
                    name: guild.name,
                    icon: guild.icon,
                    banner: guild.banner,
                }, {
                    upsert: true,
                    new: true,
                });
            } catch(e) {
                console.error(e);
            }
        }
        console.log(`[MBM] Found and updated ${client.guilds.cache.size} guild(s)`);
    }
};

module.exports = listener;
