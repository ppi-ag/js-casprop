(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.ExpCSS = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
/* jshint unused:false */
/* global window, console */
(function(global) {
  'use strict';
  var fi = function() {

    this.cssImportStatements = [];
    this.cssKeyframeStatements = [];

    this.cssRegex = new RegExp('([\\s\\S]*?){([\\s\\S]*?)}', 'gi');
    this.cssMediaQueryRegex = '((@media [\\s\\S]*?){([\\s\\S]*?}\\s*?)})';
    this.cssKeyframeRegex = '((@.*?keyframes [\\s\\S]*?){([\\s\\S]*?}\\s*?)})';
    this.combinedCSSRegex = '((\\s*?(?:\\/\\*[\\s\\S]*?\\*\\/)?\\s*?@media[\\s\\S]*?){([\\s\\S]*?)}\\s*?})|(([\\s\\S]*?){([\\s\\S]*?)})'; //to match css & media queries together
    this.cssCommentsRegex = '(\\/\\*[\\s\\S]*?\\*\\/)';
    this.cssImportStatementRegex = new RegExp('@import .*?;', 'gi');
  };

  /*
    Strip outs css comments and returns cleaned css string

    @param css, the original css string to be stipped out of comments

    @return cleanedCSS contains no css comments
  */
  fi.prototype.stripComments = function(cssString) {
    var regex = new RegExp(this.cssCommentsRegex, 'gi');

    return cssString.replace(regex, '');
  };

  /*
    Parses given css string, and returns css object
    keys as selectors and values are css rules
    eliminates all css comments before parsing

    @param source css string to be parsed

    @return object css
  */
  fi.prototype.parseCSS = function(source) {

    if (source === undefined) {
      return [];
    }

    var css = [];
    //strip out comments
    //source = this.stripComments(source);

    //get import statements

    while (true) {
      var imports = this.cssImportStatementRegex.exec(source);
      if (imports !== null) {
        this.cssImportStatements.push(imports[0]);
        css.push({
          selector: '@imports',
          type: 'imports',
          styles: imports[0]
        });
      } else {
        break;
      }
    }
    source = source.replace(this.cssImportStatementRegex, '');
    //get keyframe statements
    var keyframesRegex = new RegExp(this.cssKeyframeRegex, 'gi');
    var arr;
    while (true) {
      arr = keyframesRegex.exec(source);
      if (arr === null) {
        break;
      }
      css.push({
        selector: '@keyframes',
        type: 'keyframes',
        styles: arr[0]
      });
    }
    source = source.replace(keyframesRegex, '');

    //unified regex
    var unified = new RegExp(this.combinedCSSRegex, 'gi');

    while (true) {
      arr = unified.exec(source);
      if (arr === null) {
        break;
      }
      var selector = '';
      if (arr[2] === undefined) {
        selector = arr[5].split('\r\n').join('\n').trim();
      } else {
        selector = arr[2].split('\r\n').join('\n').trim();
      }

      /*
        fetch comments and associate it with current selector
      */
      var commentsRegex = new RegExp(this.cssCommentsRegex, 'gi');
      var comments = commentsRegex.exec(selector);
      if (comments !== null) {
        selector = selector.replace(commentsRegex, '').trim();
      }

      // Never have more than a single line break in a row
      selector = selector.replace(/\n+/, "\n");

      //determine the type
      if (selector.indexOf('@media') !== -1) {
        //we have a media query
        var cssObject = {
          selector: selector,
          type: 'media',
          subStyles: this.parseCSS(arr[3] + '\n}') //recursively parse media query inner css
        };
        if (comments !== null) {
          cssObject.comments = comments[0];
        }
        css.push(cssObject);
      } else {
        //we have standard css
        var rules = this.parseRules(arr[6]);
        var style = {
          selector: selector,
          rules: rules
        };
        if (selector === '@font-face') {
          style.type = 'font-face';
        }
        if (comments !== null) {
          style.comments = comments[0];
        }
        css.push(style);
      }
    }

    return css;
  };

  /*
    parses given string containing css directives
    and returns an array of objects containing ruleName:ruleValue pairs

    @param rules, css directive string example
        \n\ncolor:white;\n    font-size:18px;\n
  */
  fi.prototype.parseRules = function(rules) {
    //convert all windows style line endings to unix style line endings
    rules = rules.split('\r\n').join('\n');
    var ret = [];

    rules = rules.split(';');

    //proccess rules line by line
    for (var i = 0; i < rules.length; i++) {
      var line = rules[i];

      //determine if line is a valid css directive, ie color:white;
      line = line.trim();
      if (line.indexOf(':') !== -1) {
        //line contains :
        line = line.split(':');
        var cssDirective = line[0].trim();
        var cssValue = line.slice(1).join(':').trim();

        //more checks
        if (cssDirective.length < 1 || cssValue.length < 1) {
          continue; //there is no css directive or value that is of length 1 or 0
          // PLAIN WRONG WHAT ABOUT margin:0; ?
        }

        //push rule
        ret.push({
          directive: cssDirective,
          value: cssValue
        });
      } else {
        //if there is no ':', but what if it was mis splitted value which starts with base64
        if (line.trim().substr(0, 7) === 'base64,') { //hack :)
          ret[ret.length - 1].value += line.trim();
        } else {
          //add rule, even if it is defective
          if (line.length > 0) {
            ret.push({
              directive: '',
              value: line,
              defective: true
            });
          }
        }
      }
    }

    return ret; //we are done!
  };
  /*
    just returns the rule having given directive
    if not found returns false;
  */
  fi.prototype.findCorrespondingRule = function(rules, directive, value) {
    if (value === undefined) {
      value = false;
    }
    var ret = false;
    for (var i = 0; i < rules.length; i++) {
      if (rules[i].directive === directive) {
        ret = rules[i];
        if (value === rules[i].value) {
          break;
        }
      }
    }
    return ret;
  };

  /*
      Finds styles that have given selector, compress them,
      and returns them
  */
  fi.prototype.findBySelector = function(cssObjectArray, selector, contains) {
    if (contains === undefined) {
      contains = false;
    }

    var found = [];
    for (var i = 0; i < cssObjectArray.length; i++) {
      if (contains === false) {
        if (cssObjectArray[i].selector === selector) {
          found.push(cssObjectArray[i]);
        }
      } else {
        if (cssObjectArray[i].selector.indexOf(selector) !== -1) {
          found.push(cssObjectArray[i]);
        }
      }

    }
    if (selector === '@imports' || found.length < 2) {
      return found;
    } else {
      var base = found[0];
      for (i = 1; i < found.length; i++) {
        this.intelligentCSSPush([base], found[i]);
      }
      return [base]; //we are done!! all properties merged into base!
    }
  };

  /*
    deletes cssObjects having given selector, and returns new array
  */
  fi.prototype.deleteBySelector = function(cssObjectArray, selector) {
    var ret = [];
    for (var i = 0; i < cssObjectArray.length; i++) {
      if (cssObjectArray[i].selector !== selector) {
        ret.push(cssObjectArray[i]);
      }
    }
    return ret;
  };

  /*
      Compresses given cssObjectArray and tries to minimize
      selector redundence.
  */
  fi.prototype.compressCSS = function(cssObjectArray) {
    var compressed = [];
    var done = {};
    for (var i = 0; i < cssObjectArray.length; i++) {
      var obj = cssObjectArray[i];
      if (done[obj.selector] === true) {
        continue;
      }

      var found = this.findBySelector(cssObjectArray, obj.selector); //found compressed
      if (found.length !== 0) {
        compressed = compressed.concat(found);
        done[obj.selector] = true;
      }
    }
    return compressed;
  };

  /*
    Received 2 css objects with following structure
      {
        rules : [{directive:"", value:""}, {directive:"", value:""}, ...]
        selector : "SOMESELECTOR"
      }

    returns the changed(new,removed,updated) values on css1 parameter, on same structure

    if two css objects are the same, then returns false

      if a css directive exists in css1 and     css2, and its value is different, it is included in diff
      if a css directive exists in css1 and not css2, it is then included in diff
      if a css directive exists in css2 but not css1, then it is deleted in css1, it would be included in diff but will be marked as type='DELETED'

      @object css1 css object
      @object css2 css object

      @return diff css object contains changed values in css1 in regards to css2 see test input output in /test/data/css.js
  */
  fi.prototype.cssDiff = function(css1, css2) {
    if (css1.selector !== css2.selector) {
      return false;
    }

    //if one of them is media query return false, because diff function can not operate on media queries
    if ((css1.type === 'media' || css2.type === 'media')) {
      return false;
    }

    var diff = {
      selector: css1.selector,
      rules: []
    };
    var rule1, rule2;
    for (var i = 0; i < css1.rules.length; i++) {
      rule1 = css1.rules[i];
      //find rule2 which has the same directive as rule1
      rule2 = this.findCorrespondingRule(css2.rules, rule1.directive, rule1.value);
      if (rule2 === false) {
        //rule1 is a new rule in css1
        diff.rules.push(rule1);
      } else {
        //rule2 was found only push if its value is different too
        if (rule1.value !== rule2.value) {
          diff.rules.push(rule1);
        }
      }
    }

    //now for rules exists in css2 but not in css1, which means deleted rules
    for (var ii = 0; ii < css2.rules.length; ii++) {
      rule2 = css2.rules[ii];
      //find rule2 which has the same directive as rule1
      rule1 = this.findCorrespondingRule(css1.rules, rule2.directive);
      if (rule1 === false) {
        //rule1 is a new rule
        rule2.type = 'DELETED'; //mark it as a deleted rule, so that other merge operations could be true
        diff.rules.push(rule2);
      }
    }


    if (diff.rules.length === 0) {
      return false;
    }
    return diff;
  };

  /*
      Merges 2 different css objects together
      using intelligentCSSPush,

      @param cssObjectArray, target css object array
      @param newArray, source array that will be pushed into cssObjectArray parameter
      @param reverse, [optional], if given true, first parameter will be traversed on reversed order
              effectively giving priority to the styles in newArray
  */
  fi.prototype.intelligentMerge = function(cssObjectArray, newArray, reverse) {
    if (reverse === undefined) {
      reverse = false;
    }


    for (var i = 0; i < newArray.length; i++) {
      this.intelligentCSSPush(cssObjectArray, newArray[i], reverse);
    }
    for (i = 0; i < cssObjectArray.length; i++) {
      var cobj = cssObjectArray[i];
      if (cobj.type === 'media' || (cobj.type === 'keyframes')) {
        continue;
      }
      cobj.rules = this.compactRules(cobj.rules);
    }
  };

  /*
    inserts new css objects into a bigger css object
    with same selectors grouped together

    @param cssObjectArray, array of bigger css object to be pushed into
    @param minimalObject, single css object
    @param reverse [optional] default is false, if given, cssObjectArray will be reversly traversed
            resulting more priority in minimalObject's styles
  */
  fi.prototype.intelligentCSSPush = function(cssObjectArray, minimalObject, reverse) {
    var pushSelector = minimalObject.selector;
    //find correct selector if not found just push minimalObject into cssObject
    var cssObject = false;

    if (reverse === undefined) {
      reverse = false;
    }

    if (reverse === false) {
      for (var i = 0; i < cssObjectArray.length; i++) {
        if (cssObjectArray[i].selector === pushSelector) {
          cssObject = cssObjectArray[i];
          break;
        }
      }
    } else {
      for (var j = cssObjectArray.length - 1; j > -1; j--) {
        if (cssObjectArray[j].selector === pushSelector) {
          cssObject = cssObjectArray[j];
          break;
        }
      }
    }

    if (cssObject === false) {
      cssObjectArray.push(minimalObject); //just push, because cssSelector is new
    } else {
      if (minimalObject.type !== 'media') {
        for (var ii = 0; ii < minimalObject.rules.length; ii++) {
          var rule = minimalObject.rules[ii];
          //find rule inside cssObject
          var oldRule = this.findCorrespondingRule(cssObject.rules, rule.directive);
          if (oldRule === false) {
            cssObject.rules.push(rule);
          } else if (rule.type === 'DELETED') {
            oldRule.type = 'DELETED';
          } else {
            //rule found just update value

            oldRule.value = rule.value;
          }
        }
      } else {
        cssObject.subStyles = cssObject.subStyles.concat(minimalObject.subStyles); //TODO, make this intelligent too
      }

    }
  };

  /*
    filter outs rule objects whose type param equal to DELETED

    @param rules, array of rules

    @returns rules array, compacted by deleting all unnecessary rules
  */
  fi.prototype.compactRules = function(rules) {
    var newRules = [];
    for (var i = 0; i < rules.length; i++) {
      if (rules[i].type !== 'DELETED') {
        newRules.push(rules[i]);
      }
    }
    return newRules;
  };
  /*
    computes string for ace editor using this.css or given cssBase optional parameter

    @param [optional] cssBase, if given computes cssString from cssObject array
  */
  fi.prototype.getCSSForEditor = function(cssBase, depth) {
    if (depth === undefined) {
      depth = 0;
    }
    var ret = '';
    if (cssBase === undefined) {
      cssBase = this.css;
    }
    //append imports
    for (var i = 0; i < cssBase.length; i++) {
      if (cssBase[i].type === 'imports') {
        ret += cssBase[i].styles + '\n\n';
      }
    }
    for (i = 0; i < cssBase.length; i++) {
      var tmp = cssBase[i];
      if (tmp.selector === undefined) { //temporarily omit media queries
        continue;
      }
      var comments = "";
      if (tmp.comments !== undefined) {
        comments = tmp.comments + '\n';
      }

      if (tmp.type === 'media') { //also put media queries to output
        ret += comments + tmp.selector + '{\n';
        ret += this.getCSSForEditor(tmp.subStyles, depth + 1);
        ret += '}\n\n';
      } else if (tmp.type !== 'keyframes' && tmp.type !== 'imports') {
        ret += this.getSpaces(depth) + comments + tmp.selector + ' {\n';
        ret += this.getCSSOfRules(tmp.rules, depth + 1);
        ret += this.getSpaces(depth) + '}\n\n';
      }
    }

    //append keyFrames
    for (i = 0; i < cssBase.length; i++) {
      if (cssBase[i].type === 'keyframes') {
        ret += cssBase[i].styles + '\n\n';
      }
    }

    return ret;
  };

  fi.prototype.getImports = function(cssObjectArray) {
    var imps = [];
    for (var i = 0; i < cssObjectArray.length; i++) {
      if (cssObjectArray[i].type === 'imports') {
        imps.push(cssObjectArray[i].styles);
      }
    }
    return imps;
  };
  /*
    given rules array, returns visually formatted css string
    to be used inside editor
  */
  fi.prototype.getCSSOfRules = function(rules, depth) {
    var ret = '';
    for (var i = 0; i < rules.length; i++) {
      if (rules[i] === undefined) {
        continue;
      }
      if (rules[i].defective === undefined) {
        ret += this.getSpaces(depth) + rules[i].directive + ': ' + rules[i].value + ';\n';
      } else {
        ret += this.getSpaces(depth) + rules[i].value + ';\n';
      }

    }
    return ret || '\n';
  };

  /*
      A very simple helper function returns number of spaces appended in a single string,
      the number depends input parameter, namely input*2
  */
  fi.prototype.getSpaces = function(num) {
    var ret = '';
    for (var i = 0; i < num * 4; i++) {
      ret += ' ';
    }
    return ret;
  };

  /*
    Given css string or objectArray, parses it and then for every selector,
    prepends this.cssPreviewNamespace to prevent css collision issues

    @returns css string in which this.cssPreviewNamespace prepended
  */
  fi.prototype.applyNamespacing = function(css, forcedNamespace) {
    var cssObjectArray = css;
    var namespaceClass = '.' + this.cssPreviewNamespace;
    if(forcedNamespace !== undefined){
      namespaceClass = forcedNamespace;
    }

    if (typeof css === 'string') {
      cssObjectArray = this.parseCSS(css);
    }

    for (var i = 0; i < cssObjectArray.length; i++) {
      var obj = cssObjectArray[i];

      //bypass namespacing for @font-face @keyframes @import
      if(obj.selector.indexOf('@font-face') > -1 || obj.selector.indexOf('keyframes') > -1 || obj.selector.indexOf('@import') > -1 || obj.selector.indexOf('.form-all') > -1 || obj.selector.indexOf('#stage') > -1){
        continue;
      }

      if (obj.type !== 'media') {
        var selector = obj.selector.split(',');
        var newSelector = [];
        for (var j = 0; j < selector.length; j++) {
          if (selector[j].indexOf('.supernova') === -1) { //do not apply namespacing to selectors including supernova
            newSelector.push(namespaceClass + ' ' + selector[j]);
          } else {
            newSelector.push(selector[j]);
          }
        }
        obj.selector = newSelector.join(',');
      } else {
        obj.subStyles = this.applyNamespacing(obj.subStyles, forcedNamespace); //handle media queries as well
      }
    }

    return cssObjectArray;
  };

  /*
    given css string or object array, clears possible namespacing from
    all of the selectors inside the css
  */
  fi.prototype.clearNamespacing = function(css, returnObj) {
    if (returnObj === undefined) {
      returnObj = false;
    }
    var cssObjectArray = css;
    var namespaceClass = '.' + this.cssPreviewNamespace;
    if (typeof css === 'string') {
      cssObjectArray = this.parseCSS(css);
    }

    for (var i = 0; i < cssObjectArray.length; i++) {
      var obj = cssObjectArray[i];

      if (obj.type !== 'media') {
        var selector = obj.selector.split(',');
        var newSelector = [];
        for (var j = 0; j < selector.length; j++) {
          newSelector.push(selector[j].split(namespaceClass + ' ').join(''));
        }
        obj.selector = newSelector.join(',');
      } else {
        obj.subStyles = this.clearNamespacing(obj.subStyles, true); //handle media queries as well
      }
    }
    if (returnObj === false) {
      return this.getCSSForEditor(cssObjectArray);
    } else {
      return cssObjectArray;
    }

  };

  /*
    creates a new style tag (also destroys the previous one)
    and injects given css string into that css tag
  */
  fi.prototype.createStyleElement = function(id, css, format) {
    if (format === undefined) {
      format = false;
    }

    if (this.testMode === false && format !== 'nonamespace') {
      //apply namespacing classes
      css = this.applyNamespacing(css);
    }

    if (typeof css !== 'string') {
      css = this.getCSSForEditor(css);
    }
    //apply formatting for css
    if (format === true) {
      css = this.getCSSForEditor(this.parseCSS(css));
    }

    if (this.testMode !== false) {
      return this.testMode('create style #' + id, css); //if test mode, just pass result to callback
    }

    var __el = document.getElementById(id);
    if (__el) {
      __el.parentNode.removeChild(__el);
    }

    var head = document.head || document.getElementsByTagName('head')[0],
      style = document.createElement('style');

    style.id = id;
    style.type = 'text/css';

    head.appendChild(style);

    if (style.styleSheet && !style.sheet) {
      style.styleSheet.cssText = css;
    } else {
      style.appendChild(document.createTextNode(css));
    }
  };

  global.cssjs = fi;

})(this);

},{}],2:[function(require,module,exports){

const explorerEvent = Object.freeze({
    onmouseover: 1 << 31,
    onclick: 1 << 30,
    onselect: 1 << 29,
    onfold: 1 << 28
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
},{}],3:[function(require,module,exports){
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
},{"../node_modules/jotform-css.js/css.js":1,"./events.js":2,"./rule-parser.js":5,"./selector-parser.js":6}],4:[function(require,module,exports){
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
},{}],5:[function(require,module,exports){
const { Parser } = require("./parser.js");

class RuleParser extends Parser {
    constructor() {
        super();
        this._attribute = "";
        this._ruleTerminals = ["\n", ";"];
        this._rgbaTerminals = [',', ')'];
        this._colorInitials = ['#', '0', '('];
        this._interpolationEnums = {
            'lin': interpolationType.linear,
            'linear': interpolationType.linear
        };
    }

    parseRule(attribute, rule) {
        this._curIdx = 0;
        this._attribute = attribute;
        this._literal = rule;
        var result = undefined;

        // try parsing interpolation, color or enum 
        result = this._parseColor();

        if (result != undefined) {
            return new SimpleRule(this._attribute, valueType.color, result);
        }

        // Reset parser and try parsing interpolation rule
        this._curIdx = 0;

        var type = this._getStringUntil('(');

        type = this._interpolationEnums[type];

        if (type == undefined) {
            return new SimpleRule(this._attribute, valueType.string, this._literal);
        }
        this._nextChar();

        result = this._parseInterpolation(type);

        if (result == undefined) {
            //might be of type number!
            return new SimpleRule(this._attribute, valueType.string, this._literal);
        }

        return result;
    }

    _parseInterpolation(type) {
        var valid = true;
        var property;
        var vType;
        var x = [];
        var y = [];

        while (this._curChar() != ')') {
            x.push(parseInt(this._getStringUntil('=')));
            this._nextChar();

            var typeCheck = vType;

            if (this._colorInitials.includes(this._curChar())) {
                y.push(this._parseColor());
                vType = valueType.color;
            } else {
                y.push(parseInt(this._getStringUntil([',', ')'])));
                vType = valueType.number;
            }

            if (typeCheck != undefined && typeCheck != vType) {
                this._error("Type of values doesn't match.");
                valid = false;
            }

            if (this._curChar() == ',') {
                this._nextChar();
            }

            if (this._curIdx >= this._literal.length - 1) {
                this._error("Unexpected end of rule.");
                valid = false;
                break;
            }
        }

        this._nextChar();

        var keyWord = this._getStringUntil('(');

        if (keyWord.localeCompare(".using") == 0) {
            this._nextChar();
            property = this._getStringUntil(')');
        } else {
            this._error("Couldn't find 'using' directive.");
            valid = false;
        }

        if (this._curChar() != ')') {
            this._error("Unexpected end of rule, expected ')'.");
            valid = false;
        }

        if (x.length != y.length) {
            this._error("Number of control points and values is different.");
            valid = false;
        }

        if (vType == undefined) {
            this._error("Unknown Number or Color Type found.");
            valid = false;
        }
        
        return new InterpolatedRule(this._attribute, property, type, vType, x, y, valid);
    }

    _parseColor() {
        if (this._curChar() == '#') {
            this._nextChar();
            return parseInt(this._getStringUntil(this._ruleTerminals), 16);
        } else if (this._curChar() == '0') {
            this._nextChar();
            if (this._curChar() == 'x') {
                this._nextChar();
                return parseInt(this._getStringUntil(this._ruleTerminals), 16);
            }
        } else if (this._curChar() == '(') {
            return this._getRGBA();
        }

        return undefined;
    }

    _getRGBA() {
        var r = parseInt(this._getStringUntil(this._rgbaTerminals));

        if (this._curChar() != ',') {
            return this.hexValue(r, 0, 0);
        }
        this._nextChar();

        var g = parseInt(this._getStringUntil(this._rgbaTerminals));

        if (this._curChar() != ',') {
            return this.hexValue(r, g, 0);
        }
        this._nextChar();

        var b = parseInt(this._getStringUntil(this._rgbaTerminals));

        if (this._curChar() != ',') {
            this._nextChar();
            return this.hexValue(r, g, b);
        }
        this._nextChar();

        var a = parseInt(this._getStringUntil(this._rgbaTerminals));

        if (this._curChar() != ')') {
            this._error("Expected closing ')'.")
            return undefined;
        }
        this._nextChar();

        return this.hexValue(r, g, b, a);
    }

    hexValue(r, g, b, a = 255) {
        return (r << 24) | (g << 16) | (b >> 8) | a;
    }

    hexString(r, g, b, a = 255) {
        r = r.toString(16);
        g = g.toString(16);
        b = b.toString(16);
        a = a.toString(16);

        if (r.length == 1)
            r = "0" + r;
        if (g.length == 1)
            g = "0" + g;
        if (b.length == 1)
            b = "0" + b;
        if (a.length == 1)
            a = "0" + a;

        return "#" + r + g + b + a;
    }
}

var valueType = Object.freeze({ "string": 1, "number": 2, "color": 3, "enum": 4 });

class SimpleRule {
    constructor(attribute, attributeType, value) {
        this._attribute = attribute;
        this._valueType = attributeType;
        this._value = value;
        this._valid = true;
    }

    apply(obj, sty) {
        sty[this._attribute] = this._value;
    }
}

var interpolationType = Object.freeze({ "linear": 1 });

class InterpolatedRule {
    constructor(attribute, property, interpolType, valueType, controlPoints, attributeValues, valid) {
        this._type = interpolType;
        this._property = property;
        this._attribute = attribute;
        this._valueType = valueType;
        this._controlPoints = controlPoints;
        this._attributeValues = attributeValues;
        this._valid = true; //TODO: FIX after debugging
    }

    apply(obj, sty) {
        if (this._type == interpolationType.linear) {
            sty[this._attribute] = this._lin(obj[this._property]);
        }
    }

    _lin(actualValue) {
        // find range the value is inside of and interpolate inside it
        // assumes ascending order 
        var index = this._findIndex(actualValue);

        //Smaller than all control points
        if(index == -1){
            return this._attributeValues[0];
        }

        //Bigger than all control points
        if(index == this._controlPoints.length-1){
            return this._attributeValues[this._attributeValues.length-1];
        }

        if (this._valueType == valueType.color) {
            // interpolate rgba values
            return this._linearColorInterpolation(index, actualValue);
        } else {
            // normal interpolation of number

            //inside range index & index + 1
            return this._linearInterpolation(actualValue, this._controlPoints[index], this._attributeValues[index], this._controlPoints[index+1], this._attributeValues[index+1]);
        }
    }

    _findIndex(x) {
        var idx = -1;

        while (idx < this._controlPoints.length && this._controlPoints[idx+1] < x) {
            idx++;
        }

        return idx;
    }

    _linearColorInterpolation(actualValue, idx) {
        var y0 = this._attributeValues[idx];
        var y1 = this._attributeValues[idx+1];

        var result = 0;
        var mask = 0x000000FF; // alpha mask

        //for each channel interpolate the value seperately
        for(var i = 0; i < 4; i++){
            var y0Channel = (y0 & mask) >>> i*8;
            var y1Channel = (y1 & mask) >>> i*8;

            result |= this._linearInterpolation(actualValue, this._controlPoints[idx], y0Channel, this._controlPoints[idx+1], y1Channel) << i*8

            mask = mask << 8;
        }

        return result;
    }

    _linearInterpolation(x, x0, y0, x1, y1){
        var a = (y1 - y0) / (x1 - x0)
        var b = -a * x0 + y0
        return a * x + b
    }

    _isInRange(value, lower, upper) {
        if (value < lower) {
            return -1;
        } else if (value > upper) {
            return 1;
        }

        return 0;
    }
}

module.exports = {
    RuleParser
}
},{"./parser.js":4}],6:[function(require,module,exports){
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
},{"./events.js":2,"./parser.js":4}]},{},[3])(3)
});
