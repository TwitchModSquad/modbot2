const fs = require("fs");
const grabFiles = path => fs.readdirSync(path).filter(file => file.endsWith('.js'));
const listeners = grabFiles('./listeners/');

class EventManager {

    /**
     * Stores event functions
     * @type {{name: [...function]}}
     */
    events = {};

    fire(event, ...args) {
        event = event.toLowerCase();
        if (!this.events.hasOwnProperty(event)) return;
        this.events[event].forEach(handler => {
            try {
                handler(...args);
            } catch(err) {
                console.error("Error occurred inside of event handler!");
                console.error(err);
            }
        });
    }

    /**
     * Adds an event handler
     * @param {string} event 
     * @param {function} func 
     */
    on(event, func) {
        event = event.toLowerCase();
        if (!this.events.hasOwnProperty(event))
            this.events[event] = [];

        this.events[event].push(func);
    }

    populate() {
        for (const file of listeners) {
            const listener = require(`../listeners/${file}`);

            this.on(listener.event, listener.func);
        }
    }

}

module.exports = EventManager;
