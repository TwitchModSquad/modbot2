const { HelixStream } = require("@twurple/api")

const listener = {
    event: "live",
    /**
     * @param {*} user 
     * @param {HelixStream} stream 
     * @param {*} activity
     */
    func: (user, stream, activity) => {
        
    }
}

module.exports = listener;
