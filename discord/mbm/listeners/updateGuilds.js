const client = global.client.modbot;

const listener = {
    name: 'updateGuilds',
    eventName: 'ready',
    eventType: 'once',
    async listener () {
        const guilds = await client.guilds.fetch();
        guilds.forEach(async guild => {
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
        });
        console.log(`[MBM] Found and updated ${guilds.size} guild(s)`);
    }
};

module.exports = listener;
