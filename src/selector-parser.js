const {Parser} = require("./parser.js");
const {explorerEvent, EventState} = require("./events.js");

class SelectorParser extends Parser {
    constructor() {
        super();
    }

    parseSelector(string, idx) {
        this._curIdx = 0;
        this._literal = string;
        this._block = idx;

        var list = [];

        do {
            var exp = this._parseExpression();

            if (exp.valid) {
                list.push(exp);
            } else {
                break;
            }

        } while (this._curChar() == ',' && this._nextChar())
        var sel = new Selector(list);

        if (list.length == 0) {
            sel.valid = false;
            this._error("Block " + (this._block + 1) + " has been skipped, because there was no valid selector.");
        }

        return new Selector(list);
    }

    _parseExpression() {

        var leftMost = this._parseLeftMost();

        if (!leftMost.valid) {
            return leftMost;
        }

        if (this._curChar() == ">" || this._curChar() == "<") {
            var chain = this._curChar();
            this._nextChar();
            var rightSide = this._parseRightSide(leftMost);
            rightSide.chainOp = chain;
            leftMost.rightSide = rightSide;
        }

        return leftMost;
    }

    _parseLeftMost() {
        var leftMost = new SelectorExpression();

        this._parseType(leftMost);

        if (this._curChar() == "[") {
            this._nextChar();
            this._parseAttributeBlock(leftMost);
        }

        if (!leftMost.valid) {
            return leftMost;
        }

        this._parseExtensions(leftMost);

        return leftMost;
    }

    _parseRightSide(node) {
        var rightside = new RightSide();

        this._parseType(rightside);

        if (!node.valid) {
            rightside.valid = false;
            return rightside;
        }

        var paramFollow = ['[', '#', ':', ',', '.'];

        //check if parameter exists
        if (!paramFollow.includes(this._curChar()) && this._curIdx < this._literal.length) {
            rightside.parameter = this._getStringUntil(paramFollow);
        } else {
            rightside.parameter = 1;
        }

        if (this._curChar() == '[') {
            this._nextChar();
            this._parseAttributeBlock(rightside);
        }

        if (!node.valid) {
            return rightside;
        }

        this._parseExtensions(rightside);

        if (this._curChar() == '>' || this._curChar() == '<') {
            var chain = this._curChar();
            this._nextChar();
            rightside.rightSide = this._parseRightSide(rightside);
            rightside.rightSide.chainOp = chain;
        }

        return rightside;
    }

    _parseAttributeBlock(node) {
        var followId = ['=', '~', '!', '<', '>', ']', ','];

        var list = [];

        do {
            var id = this._getStringUntil(followId);

            if (this._curChar() == ',') {
                list.push(new AttributeCheck(id, undefined, undefined))
            } else if (this._curChar() == ']') {
                list.push(new AttributeCheck(id, undefined, undefined))
                break;
            } else if (this._curChar() == '=' || this._curChar() == '<' || this._curChar() == '>') {
                var op = this._curChar();
                this._nextChar();

                list.push(new AttributeCheck(id, op, this._getStringUntil([',', ']'])));

                if (this._curChar() == ']') {
                    break;
                }
            } else if (this._curChar() == '~' || this._curChar() == '!') {
                var op = this._curChar();
                this._nextChar();
                op += this._curChar();
                this._nextChar();

                list.push(new AttributeCheck(id, op, this._getStringUntil([',', ']'])));

                if (this._curChar() == ']') {
                    break;
                }
            } else {
                break;
            }

        } while (this._nextChar() && this._curChar() != ']')

        node.attrChecklist = list;

        if (this._curChar() != ']') {
            node.valid = false;
            this._error("Block " + (this._block + 1) + " has been skipped, because of missing bracket. Expected ']'.");
        }

        this._nextChar();
    }

    _parseExtensions(node) {

        var follow = ['#', '.', ',', ':', '>', '<'];
        var hasId = false;

        while (['#', '.', ':'].includes(this._curChar())) {

            if (this._curChar() == '#') {
                this._nextChar();
                if (!hasId) {
                    node.attrChecklist.push(new AttributeCheck('id', '=', this._getStringUntil(follow)));
                    hasId = true;
                } else {
                    this._getStringUntil(follow);
                    this._warning("Multiple Ids are not supported, only the first one will be used.");
                }
            }
            else if (this._curChar() == '.') {
                this._nextChar();
                node.attrChecklist.push(new AttributeCheck('tags', '~=', this._getStringUntil(follow)));
            } else {
                this._nextChar();

                if(node.eventState == undefined){
                    node["eventState"] = new EventState();
                }

                var event = this._getStringUntil(follow);
                if(!explorerEvent.hasOwnProperty(event)){
                    this._warning("Ignoring unknown Event '"+event+"'.");
                } else {
                    node.eventState.set(explorerEvent[event]);
                }
            }
        }

        if (!['>', '<', ','].includes(this._curChar()) && this._curIdx == this._literal.length - 1) {
            node.valid = false;
            this._error("Block " + (this._block + 1) + " has been skipped. Expected '>', '<' or ','.");
        }
    }

    _parseType(node) {
        if (this._curChar() == "l") {
            node.type = "l";
        } else if (this._curChar() == "e") {
            node.type = "e";
        } else {
            node.valid = false;
            this._error("Block " + (this._block + 1) + " has been skipped, because of missing type. Expected 'e' or 'l'.");
        }

        this._nextChar();
    }
}

class Node {
    constructor() {
        this.valid = true;
    }
}

class Selector extends Node {
    constructor(expressions) {
        super();
        this.expressions = expressions;
    }

    validateObject(obj){
       return obj.hasOwnProperty('class');
    }

    test(obj, sty){

        if(!this.validateObject(obj)){
            return false;
        }

        if(this.expressions.every(exp => {return exp.eventState != undefined && sty.eventState.state != exp.eventState.state})){
            return false;
        }

        return this.expressions.some(exp => {
            //differentiate between links and entities
            if(exp.type != obj.class){
                return false
            }

            return exp.attrChecklist.every(attrCheck => {

                if(attrCheck.comparator == undefined || attrCheck.value == undefined){
                    return obj.hasOwnProperty(attrCheck.id);
                } else {
                    if(!obj.hasOwnProperty(attrCheck.id)){
                        return false;
                    }

                    switch(attrCheck.comparator){
                        case '=' : 
                            return (obj[attrCheck.id] == attrCheck.value);
                        case '!=':
                            return (obj[attrCheck.id] != attrCheck.value);
                        case '~=':
                            return (obj[attrCheck.id].split(" ").includes(attrCheck.value));
                        case '>' :
                            return (obj[attrCheck.id] > attrCheck.value);
                        case '<' :
                            return (obj[attrCheck.id] < attrCheck.value);
                    }
                }
            });
        });

        //TODO: Graph Traversal checks, complex expressions etc.
    }


}

class SelectorExpression extends Node {
    constructor() {
        super();
        this.type;
        this.eventState;
        this.attrChecklist = [];
        this.rightSide;
    }
}

class RightSide extends SelectorExpression {
    constructor() {
        super();
        this.parameter;
        this.chainOp;
    }
}

class AttributeCheck extends Node {
    constructor(id, comparator, value) {
        super();
        this.id = id;
        this.comparator = comparator;
        this.value = value;
    }
}

module.exports = {
    SelectorParser
};