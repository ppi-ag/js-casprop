const _cssjs = require("../node_modules/jotform-css.js/css.js");
const {SelectorParser} = require("./selector-parser.js");
const {RuleParser} = require("./rule-parser.js");
const Events = require("./events.js");

class ExplorerCSS {

    constructor(){
        //initialize parser object
        this._parser = new _cssjs.cssjs();

        //Array of css units {selector = "", rules = [{directive = "", value  = ""} ...]}
        this.rawCSS = [];

        //parsed css blocks ready to be applied to objects
        this.stylings = [];
    }
   

    //file input for the parser as string
    parse(cssString) {
        this.rawCSS = this._parser.parseCSS(cssString);

        var sp = new SelectorParser();
        var rp = new RuleParser();

        this.rawCSS.forEach((element, i) => {
            var style = new Styling();
            var normalizedSelector = element.selector.split(' ').join('').toLowerCase();

            style.selector = sp.parseSelector(normalizedSelector, i);

            element.rules.forEach((element, i) => {
                var rule = rp.parseRule(element.directive, element.value.split(' ').join('').toLowerCase());

                if(rule._valid){
                    style.rules.push(rule);
                }
            });

            this.stylings.push(style);
        });
    }

    //modifies the given style based on the given object
    style(obj, sty) {
        this.stylings.forEach(style => style.apply(obj, sty));
    } 
}

class Styling {
    constructor() {
        this.selector;
        this.rules = [];
    }

    apply(obj, sty){
        if(this.selector.test(obj, sty)){
            this.rules.forEach(rule => rule.apply(obj, sty));
        }
    }
}

module.exports = {"ExplorerCSS": ExplorerCSS,
                  "Event":Events}

//var expcss = new ExplorerCSS();

//expcss.parse('e[attr, attr ~= test].someSelector :onHover:onSelect #myName.otherSelector > e5[testA, testA > b].pack:onHover#id < e* { margin:40px 10px; padding:5px; test:lin(5=10, 8=20).using(pages); color:lin(5=(5,100,20), 10=(20,50,10)).using(pages);}');
//expcss.parse('e[pages]:test { margin:40px 10px; padding:5px; test:lin(5=10, 8=20).using(pages); color:lin(5=(5,100,20), 10=(20,50,10)).using(pages);}');

//var testObj = {
//    'type':'e',
//    'pages': 7
//}
//expcss.style(testObj);
//console.log(JSON.stringify(testObj, undefined, 2));