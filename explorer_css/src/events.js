
const explorerEvent = Object.freeze({
    onmouseover: 1 << 31,
    onclick: 1 << 30,
    onselect: 1 << 29,
    onfold: 1 << 28,
    onin: 1 << 27, // only supposed to be used with onselect and maybe onfold
    onout: 1 << 26 // -- see above
});

// Handles events for the expcss parser
class EventState {
    constructor() {
        this.state = 0;
    }

    set(e) {
        this.state |= e;
    }

    remove(e) {
        this.state &= ~e;
    }

    toggle(e) {
        this.state ^= e;
    }

    check(e) {
        if ((this.state & e) != 0) {
            return true;
        } else {
            return false;
        }
    }

    equals(other){
        if(other == this.state){
            return true;
        } else {
            return false;
        }
    }
}

module.exports = {
    EventState: EventState,
    explorerEvent: explorerEvent
};