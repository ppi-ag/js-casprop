class Parser {
    constructor() {
        this._curIdx = 0;
        this._block = -1;
        this._literal = "";
    }

    _curChar() {
        return this._literal.charAt(this._curIdx);
    }

    _nextChar() {
        var reachedEnd = this._curIdx == (this._literal.length);

        if (reachedEnd) {
            return false;
        }

        this._curIdx++;

        this._consumeSpaces();

        return true;
    }

    _consumeSpaces() {
        while (this._curChar() == " ") {
            if (this._curIdx >= this._literal.length - 1) {
                return;
            }
            this._curIdx++;
        }
    }

    _getStringUntil(terminals) {
        var result = "";

        while (!terminals.includes(this._curChar())) {
            result += this._curChar();

            if (!this._nextChar()) {
                break;
            }
        }

        return result;
    }

    _error(message) {
        console.error('\x1b[31m%s\x1b[0m', "Error while parsing: " + message);
    }

    _warning(message) {
        console.error('\x1b[37m%s\x1b[0m', "Warning : " + message);
    }
}

module.exports = {
    Parser
}