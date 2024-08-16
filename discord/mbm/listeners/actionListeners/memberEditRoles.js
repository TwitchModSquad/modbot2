const { EmbedBuilder, GuildMember, Role } = require("discord.js");

const utils = require("../../../../utils");

const BUFFER_TIME = 10_000;

/**
 * Compares the roles between an old member and a new member
 * @param {GuildMember} oldMember 
 * @param {GuildMember} newMember 
 * @returns {{addedRoles:Role[],removedRoles:Role[]}}
 */
const compareRoles = function(oldMember, newMember) {
    const addedRoles = [];
    const removedRoles = [];

    newMember.roles.cache.each(role => {
        if (role.id === oldMember.guild.roles.everyone.id) return;

        if (!oldMember.roles.cache.has(role.id)) {
            addedRoles.push(role);
        }
    });

    oldMember.roles.cache.each(role => {
        if (role.id === oldMember.guild.roles.everyone.id) return;

        if (!newMember.roles.cache.has(role.id)) {
            removedRoles.push(role);
        }
    });

    return {addedRoles, removedRoles};
}

let newMemberCache = {};

/**
 * Fires the role edit event.
 * This is NOT fired immediately to allow batching of role add/removal,
 * or to cancel out roles that were added then removed (or vice versa)
 * @param {GuildMember} oldMember 
 * @param {number} ts
 */
const fireEvent = function(oldMember, ts) {
    const newMember = newMemberCache[oldMember.id];
    if (!newMember) return;

    const {addedRoles, removedRoles} = compareRoles(oldMember, newMember);

    delete newMemberCache[oldMember.id];

    if (addedRoles.length + removedRoles.length === 0) return;

    const embed = new EmbedBuilder()
        .setFooter({
            text: `${oldMember.guild.name} - The Mod Squad`,
            iconURL: oldMember.guild.iconURL(),
        })
        .setTitle("Member Roles Updated")
        .setColor(0x772ce8)
        .setTimestamp(Date.now())
        .setDescription(`The roles of <@${newMember.id}> was updated at <t:${Math.floor(ts / 1000)}:f>`)
        .setAuthor({
            name: newMember.displayName,
            iconURL: newMember.displayAvatarURL(),
        });

    if (addedRoles.length > 0) {
        embed.addFields({
            name: "Added Roles",
            value: addedRoles.map(x => `<@&${x.id}>`).join("\n"),
        });
    }
    if (removedRoles.length > 0) {
        embed.addFields({
            name: "Removed Roles",
            value: removedRoles.map(x => `<@&${x.id}>`).join("\n"),
        });
    }

    utils.Discord.guildManager.emit(
        newMember.guild.id,
        "memberEdit",
        {embeds: [embed]},
        "memberEditRoles"
    );
}

const listener = {
    name: 'actionMemberEditRoles',
    eventName: 'guildMemberUpdate',
    eventType: 'on',
    /**
     * Listens for deleted messages
     * @param {GuildMember} oldMember 
     * @param {GuildMember} newMember 
     */
    async listener (oldMember, newMember) {
        const {addedRoles, removedRoles} = compareRoles(oldMember, newMember);

        if (addedRoles.length + removedRoles.length === 0) return;
        
        if (!newMemberCache.hasOwnProperty(oldMember.id)) {
            const ts = Date.now();
            setTimeout(() => {
                fireEvent(oldMember, ts);
            }, BUFFER_TIME);
        }

        newMemberCache[oldMember.id] = newMember;
    }
};

module.exports = listener;
