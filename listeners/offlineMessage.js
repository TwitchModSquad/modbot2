const { HelixStream } = require("twitch")

const listener = {
    event: "offline",
    /**
     * @param {*} user 
     */
    func: (user) => {
        console.log(user.display_name + " is now offline!");
    }
}

module.exports = listener;
