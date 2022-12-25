const InputListener = class {

    constructor() {
        this.enabled = true
        this.activeKeys = {}
        this.events = []
        // add event listeners
        this._addActiveKeyListeners()
        this._addEventListeners()
    }

    addEvent(conditions, callback) {
        this.events.push({ conditions : conditions, callback })
    }

    _addActiveKeyListeners() {
        // active key listeners
        window.addEventListener('keydown', e => {
            if(e.key === 'Shift' || e.key === 'Alt' || e.key === 'Control') {
                this.activeKeys[e.key] = true
            } else { this.activeKeys[e.key.toUpperCase()] = true }
        })
        // keyup listener
        window.addEventListener('keyup', e => {
            if(e.key === 'Shift' || e.key === 'Alt' || e.key === 'Control') {
                delete this.activeKeys[e.key]
            } else { delete this.activeKeys[e.key.toUpperCase()] }
        })
    }

    _addEventListeners() {
        // mouse events
        window.addEventListener('mousedown', event => this._checkListener(event))
        window.addEventListener('mouseup', event => this._checkListener(event))
        window.addEventListener('click', event => this._checkListener(event))
        window.addEventListener('mousemove', event => this._checkListener(event))
        // key events
        window.addEventListener('keydown', event => this._checkListener(event))
        window.addEventListener('keyup', event => this._checkListener(event))
        window.addEventListener('keypress', event => this._checkListener(event))
    }

    _checkListener(event) {
        this.events.forEach(obj => {
            // match listener with event
            const flag = Object.keys(obj.conditions).every(key => {
                return event[key] === obj.conditions[key]
            })
            // callback
            if(flag) { obj.callback({ event : event, data : obj }) }
        })
    }

}