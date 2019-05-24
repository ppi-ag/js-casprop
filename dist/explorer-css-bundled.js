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

//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvam90Zm9ybS1jc3MuanMvY3NzLmpzIiwic3JjL2V2ZW50cy5qcyIsInNyYy9leHBsb3Jlci1jc3MuanMiLCJzcmMvcGFyc2VyLmpzIiwic3JjL3J1bGUtcGFyc2VyLmpzIiwic3JjL3NlbGVjdG9yLXBhcnNlci5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25xQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1U0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uKCl7ZnVuY3Rpb24gcihlLG4sdCl7ZnVuY3Rpb24gbyhpLGYpe2lmKCFuW2ldKXtpZighZVtpXSl7dmFyIGM9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZTtpZighZiYmYylyZXR1cm4gYyhpLCEwKTtpZih1KXJldHVybiB1KGksITApO3ZhciBhPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIraStcIidcIik7dGhyb3cgYS5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGF9dmFyIHA9bltpXT17ZXhwb3J0czp7fX07ZVtpXVswXS5jYWxsKHAuZXhwb3J0cyxmdW5jdGlvbihyKXt2YXIgbj1lW2ldWzFdW3JdO3JldHVybiBvKG58fHIpfSxwLHAuZXhwb3J0cyxyLGUsbix0KX1yZXR1cm4gbltpXS5leHBvcnRzfWZvcih2YXIgdT1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlLGk9MDtpPHQubGVuZ3RoO2krKylvKHRbaV0pO3JldHVybiBvfXJldHVybiByfSkoKSIsIi8qIGpzaGludCB1bnVzZWQ6ZmFsc2UgKi9cbi8qIGdsb2JhbCB3aW5kb3csIGNvbnNvbGUgKi9cbihmdW5jdGlvbihnbG9iYWwpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuICB2YXIgZmkgPSBmdW5jdGlvbigpIHtcblxuICAgIHRoaXMuY3NzSW1wb3J0U3RhdGVtZW50cyA9IFtdO1xuICAgIHRoaXMuY3NzS2V5ZnJhbWVTdGF0ZW1lbnRzID0gW107XG5cbiAgICB0aGlzLmNzc1JlZ2V4ID0gbmV3IFJlZ0V4cCgnKFtcXFxcc1xcXFxTXSo/KXsoW1xcXFxzXFxcXFNdKj8pfScsICdnaScpO1xuICAgIHRoaXMuY3NzTWVkaWFRdWVyeVJlZ2V4ID0gJygoQG1lZGlhIFtcXFxcc1xcXFxTXSo/KXsoW1xcXFxzXFxcXFNdKj99XFxcXHMqPyl9KSc7XG4gICAgdGhpcy5jc3NLZXlmcmFtZVJlZ2V4ID0gJygoQC4qP2tleWZyYW1lcyBbXFxcXHNcXFxcU10qPyl7KFtcXFxcc1xcXFxTXSo/fVxcXFxzKj8pfSknO1xuICAgIHRoaXMuY29tYmluZWRDU1NSZWdleCA9ICcoKFxcXFxzKj8oPzpcXFxcL1xcXFwqW1xcXFxzXFxcXFNdKj9cXFxcKlxcXFwvKT9cXFxccyo/QG1lZGlhW1xcXFxzXFxcXFNdKj8peyhbXFxcXHNcXFxcU10qPyl9XFxcXHMqP30pfCgoW1xcXFxzXFxcXFNdKj8peyhbXFxcXHNcXFxcU10qPyl9KSc7IC8vdG8gbWF0Y2ggY3NzICYgbWVkaWEgcXVlcmllcyB0b2dldGhlclxuICAgIHRoaXMuY3NzQ29tbWVudHNSZWdleCA9ICcoXFxcXC9cXFxcKltcXFxcc1xcXFxTXSo/XFxcXCpcXFxcLyknO1xuICAgIHRoaXMuY3NzSW1wb3J0U3RhdGVtZW50UmVnZXggPSBuZXcgUmVnRXhwKCdAaW1wb3J0IC4qPzsnLCAnZ2knKTtcbiAgfTtcblxuICAvKlxuICAgIFN0cmlwIG91dHMgY3NzIGNvbW1lbnRzIGFuZCByZXR1cm5zIGNsZWFuZWQgY3NzIHN0cmluZ1xuXG4gICAgQHBhcmFtIGNzcywgdGhlIG9yaWdpbmFsIGNzcyBzdHJpbmcgdG8gYmUgc3RpcHBlZCBvdXQgb2YgY29tbWVudHNcblxuICAgIEByZXR1cm4gY2xlYW5lZENTUyBjb250YWlucyBubyBjc3MgY29tbWVudHNcbiAgKi9cbiAgZmkucHJvdG90eXBlLnN0cmlwQ29tbWVudHMgPSBmdW5jdGlvbihjc3NTdHJpbmcpIHtcbiAgICB2YXIgcmVnZXggPSBuZXcgUmVnRXhwKHRoaXMuY3NzQ29tbWVudHNSZWdleCwgJ2dpJyk7XG5cbiAgICByZXR1cm4gY3NzU3RyaW5nLnJlcGxhY2UocmVnZXgsICcnKTtcbiAgfTtcblxuICAvKlxuICAgIFBhcnNlcyBnaXZlbiBjc3Mgc3RyaW5nLCBhbmQgcmV0dXJucyBjc3Mgb2JqZWN0XG4gICAga2V5cyBhcyBzZWxlY3RvcnMgYW5kIHZhbHVlcyBhcmUgY3NzIHJ1bGVzXG4gICAgZWxpbWluYXRlcyBhbGwgY3NzIGNvbW1lbnRzIGJlZm9yZSBwYXJzaW5nXG5cbiAgICBAcGFyYW0gc291cmNlIGNzcyBzdHJpbmcgdG8gYmUgcGFyc2VkXG5cbiAgICBAcmV0dXJuIG9iamVjdCBjc3NcbiAgKi9cbiAgZmkucHJvdG90eXBlLnBhcnNlQ1NTID0gZnVuY3Rpb24oc291cmNlKSB7XG5cbiAgICBpZiAoc291cmNlID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG5cbiAgICB2YXIgY3NzID0gW107XG4gICAgLy9zdHJpcCBvdXQgY29tbWVudHNcbiAgICAvL3NvdXJjZSA9IHRoaXMuc3RyaXBDb21tZW50cyhzb3VyY2UpO1xuXG4gICAgLy9nZXQgaW1wb3J0IHN0YXRlbWVudHNcblxuICAgIHdoaWxlICh0cnVlKSB7XG4gICAgICB2YXIgaW1wb3J0cyA9IHRoaXMuY3NzSW1wb3J0U3RhdGVtZW50UmVnZXguZXhlYyhzb3VyY2UpO1xuICAgICAgaWYgKGltcG9ydHMgIT09IG51bGwpIHtcbiAgICAgICAgdGhpcy5jc3NJbXBvcnRTdGF0ZW1lbnRzLnB1c2goaW1wb3J0c1swXSk7XG4gICAgICAgIGNzcy5wdXNoKHtcbiAgICAgICAgICBzZWxlY3RvcjogJ0BpbXBvcnRzJyxcbiAgICAgICAgICB0eXBlOiAnaW1wb3J0cycsXG4gICAgICAgICAgc3R5bGVzOiBpbXBvcnRzWzBdXG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuICAgIHNvdXJjZSA9IHNvdXJjZS5yZXBsYWNlKHRoaXMuY3NzSW1wb3J0U3RhdGVtZW50UmVnZXgsICcnKTtcbiAgICAvL2dldCBrZXlmcmFtZSBzdGF0ZW1lbnRzXG4gICAgdmFyIGtleWZyYW1lc1JlZ2V4ID0gbmV3IFJlZ0V4cCh0aGlzLmNzc0tleWZyYW1lUmVnZXgsICdnaScpO1xuICAgIHZhciBhcnI7XG4gICAgd2hpbGUgKHRydWUpIHtcbiAgICAgIGFyciA9IGtleWZyYW1lc1JlZ2V4LmV4ZWMoc291cmNlKTtcbiAgICAgIGlmIChhcnIgPT09IG51bGwpIHtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgICBjc3MucHVzaCh7XG4gICAgICAgIHNlbGVjdG9yOiAnQGtleWZyYW1lcycsXG4gICAgICAgIHR5cGU6ICdrZXlmcmFtZXMnLFxuICAgICAgICBzdHlsZXM6IGFyclswXVxuICAgICAgfSk7XG4gICAgfVxuICAgIHNvdXJjZSA9IHNvdXJjZS5yZXBsYWNlKGtleWZyYW1lc1JlZ2V4LCAnJyk7XG5cbiAgICAvL3VuaWZpZWQgcmVnZXhcbiAgICB2YXIgdW5pZmllZCA9IG5ldyBSZWdFeHAodGhpcy5jb21iaW5lZENTU1JlZ2V4LCAnZ2knKTtcblxuICAgIHdoaWxlICh0cnVlKSB7XG4gICAgICBhcnIgPSB1bmlmaWVkLmV4ZWMoc291cmNlKTtcbiAgICAgIGlmIChhcnIgPT09IG51bGwpIHtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgICB2YXIgc2VsZWN0b3IgPSAnJztcbiAgICAgIGlmIChhcnJbMl0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICBzZWxlY3RvciA9IGFycls1XS5zcGxpdCgnXFxyXFxuJykuam9pbignXFxuJykudHJpbSgpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc2VsZWN0b3IgPSBhcnJbMl0uc3BsaXQoJ1xcclxcbicpLmpvaW4oJ1xcbicpLnRyaW0oKTtcbiAgICAgIH1cblxuICAgICAgLypcbiAgICAgICAgZmV0Y2ggY29tbWVudHMgYW5kIGFzc29jaWF0ZSBpdCB3aXRoIGN1cnJlbnQgc2VsZWN0b3JcbiAgICAgICovXG4gICAgICB2YXIgY29tbWVudHNSZWdleCA9IG5ldyBSZWdFeHAodGhpcy5jc3NDb21tZW50c1JlZ2V4LCAnZ2knKTtcbiAgICAgIHZhciBjb21tZW50cyA9IGNvbW1lbnRzUmVnZXguZXhlYyhzZWxlY3Rvcik7XG4gICAgICBpZiAoY29tbWVudHMgIT09IG51bGwpIHtcbiAgICAgICAgc2VsZWN0b3IgPSBzZWxlY3Rvci5yZXBsYWNlKGNvbW1lbnRzUmVnZXgsICcnKS50cmltKCk7XG4gICAgICB9XG5cbiAgICAgIC8vIE5ldmVyIGhhdmUgbW9yZSB0aGFuIGEgc2luZ2xlIGxpbmUgYnJlYWsgaW4gYSByb3dcbiAgICAgIHNlbGVjdG9yID0gc2VsZWN0b3IucmVwbGFjZSgvXFxuKy8sIFwiXFxuXCIpO1xuXG4gICAgICAvL2RldGVybWluZSB0aGUgdHlwZVxuICAgICAgaWYgKHNlbGVjdG9yLmluZGV4T2YoJ0BtZWRpYScpICE9PSAtMSkge1xuICAgICAgICAvL3dlIGhhdmUgYSBtZWRpYSBxdWVyeVxuICAgICAgICB2YXIgY3NzT2JqZWN0ID0ge1xuICAgICAgICAgIHNlbGVjdG9yOiBzZWxlY3RvcixcbiAgICAgICAgICB0eXBlOiAnbWVkaWEnLFxuICAgICAgICAgIHN1YlN0eWxlczogdGhpcy5wYXJzZUNTUyhhcnJbM10gKyAnXFxufScpIC8vcmVjdXJzaXZlbHkgcGFyc2UgbWVkaWEgcXVlcnkgaW5uZXIgY3NzXG4gICAgICAgIH07XG4gICAgICAgIGlmIChjb21tZW50cyAhPT0gbnVsbCkge1xuICAgICAgICAgIGNzc09iamVjdC5jb21tZW50cyA9IGNvbW1lbnRzWzBdO1xuICAgICAgICB9XG4gICAgICAgIGNzcy5wdXNoKGNzc09iamVjdCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvL3dlIGhhdmUgc3RhbmRhcmQgY3NzXG4gICAgICAgIHZhciBydWxlcyA9IHRoaXMucGFyc2VSdWxlcyhhcnJbNl0pO1xuICAgICAgICB2YXIgc3R5bGUgPSB7XG4gICAgICAgICAgc2VsZWN0b3I6IHNlbGVjdG9yLFxuICAgICAgICAgIHJ1bGVzOiBydWxlc1xuICAgICAgICB9O1xuICAgICAgICBpZiAoc2VsZWN0b3IgPT09ICdAZm9udC1mYWNlJykge1xuICAgICAgICAgIHN0eWxlLnR5cGUgPSAnZm9udC1mYWNlJztcbiAgICAgICAgfVxuICAgICAgICBpZiAoY29tbWVudHMgIT09IG51bGwpIHtcbiAgICAgICAgICBzdHlsZS5jb21tZW50cyA9IGNvbW1lbnRzWzBdO1xuICAgICAgICB9XG4gICAgICAgIGNzcy5wdXNoKHN0eWxlKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gY3NzO1xuICB9O1xuXG4gIC8qXG4gICAgcGFyc2VzIGdpdmVuIHN0cmluZyBjb250YWluaW5nIGNzcyBkaXJlY3RpdmVzXG4gICAgYW5kIHJldHVybnMgYW4gYXJyYXkgb2Ygb2JqZWN0cyBjb250YWluaW5nIHJ1bGVOYW1lOnJ1bGVWYWx1ZSBwYWlyc1xuXG4gICAgQHBhcmFtIHJ1bGVzLCBjc3MgZGlyZWN0aXZlIHN0cmluZyBleGFtcGxlXG4gICAgICAgIFxcblxcbmNvbG9yOndoaXRlO1xcbiAgICBmb250LXNpemU6MThweDtcXG5cbiAgKi9cbiAgZmkucHJvdG90eXBlLnBhcnNlUnVsZXMgPSBmdW5jdGlvbihydWxlcykge1xuICAgIC8vY29udmVydCBhbGwgd2luZG93cyBzdHlsZSBsaW5lIGVuZGluZ3MgdG8gdW5peCBzdHlsZSBsaW5lIGVuZGluZ3NcbiAgICBydWxlcyA9IHJ1bGVzLnNwbGl0KCdcXHJcXG4nKS5qb2luKCdcXG4nKTtcbiAgICB2YXIgcmV0ID0gW107XG5cbiAgICBydWxlcyA9IHJ1bGVzLnNwbGl0KCc7Jyk7XG5cbiAgICAvL3Byb2NjZXNzIHJ1bGVzIGxpbmUgYnkgbGluZVxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcnVsZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciBsaW5lID0gcnVsZXNbaV07XG5cbiAgICAgIC8vZGV0ZXJtaW5lIGlmIGxpbmUgaXMgYSB2YWxpZCBjc3MgZGlyZWN0aXZlLCBpZSBjb2xvcjp3aGl0ZTtcbiAgICAgIGxpbmUgPSBsaW5lLnRyaW0oKTtcbiAgICAgIGlmIChsaW5lLmluZGV4T2YoJzonKSAhPT0gLTEpIHtcbiAgICAgICAgLy9saW5lIGNvbnRhaW5zIDpcbiAgICAgICAgbGluZSA9IGxpbmUuc3BsaXQoJzonKTtcbiAgICAgICAgdmFyIGNzc0RpcmVjdGl2ZSA9IGxpbmVbMF0udHJpbSgpO1xuICAgICAgICB2YXIgY3NzVmFsdWUgPSBsaW5lLnNsaWNlKDEpLmpvaW4oJzonKS50cmltKCk7XG5cbiAgICAgICAgLy9tb3JlIGNoZWNrc1xuICAgICAgICBpZiAoY3NzRGlyZWN0aXZlLmxlbmd0aCA8IDEgfHwgY3NzVmFsdWUubGVuZ3RoIDwgMSkge1xuICAgICAgICAgIGNvbnRpbnVlOyAvL3RoZXJlIGlzIG5vIGNzcyBkaXJlY3RpdmUgb3IgdmFsdWUgdGhhdCBpcyBvZiBsZW5ndGggMSBvciAwXG4gICAgICAgICAgLy8gUExBSU4gV1JPTkcgV0hBVCBBQk9VVCBtYXJnaW46MDsgP1xuICAgICAgICB9XG5cbiAgICAgICAgLy9wdXNoIHJ1bGVcbiAgICAgICAgcmV0LnB1c2goe1xuICAgICAgICAgIGRpcmVjdGl2ZTogY3NzRGlyZWN0aXZlLFxuICAgICAgICAgIHZhbHVlOiBjc3NWYWx1ZVxuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vaWYgdGhlcmUgaXMgbm8gJzonLCBidXQgd2hhdCBpZiBpdCB3YXMgbWlzIHNwbGl0dGVkIHZhbHVlIHdoaWNoIHN0YXJ0cyB3aXRoIGJhc2U2NFxuICAgICAgICBpZiAobGluZS50cmltKCkuc3Vic3RyKDAsIDcpID09PSAnYmFzZTY0LCcpIHsgLy9oYWNrIDopXG4gICAgICAgICAgcmV0W3JldC5sZW5ndGggLSAxXS52YWx1ZSArPSBsaW5lLnRyaW0oKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvL2FkZCBydWxlLCBldmVuIGlmIGl0IGlzIGRlZmVjdGl2ZVxuICAgICAgICAgIGlmIChsaW5lLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIHJldC5wdXNoKHtcbiAgICAgICAgICAgICAgZGlyZWN0aXZlOiAnJyxcbiAgICAgICAgICAgICAgdmFsdWU6IGxpbmUsXG4gICAgICAgICAgICAgIGRlZmVjdGl2ZTogdHJ1ZVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHJldDsgLy93ZSBhcmUgZG9uZSFcbiAgfTtcbiAgLypcbiAgICBqdXN0IHJldHVybnMgdGhlIHJ1bGUgaGF2aW5nIGdpdmVuIGRpcmVjdGl2ZVxuICAgIGlmIG5vdCBmb3VuZCByZXR1cm5zIGZhbHNlO1xuICAqL1xuICBmaS5wcm90b3R5cGUuZmluZENvcnJlc3BvbmRpbmdSdWxlID0gZnVuY3Rpb24ocnVsZXMsIGRpcmVjdGl2ZSwgdmFsdWUpIHtcbiAgICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgdmFsdWUgPSBmYWxzZTtcbiAgICB9XG4gICAgdmFyIHJldCA9IGZhbHNlO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcnVsZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmIChydWxlc1tpXS5kaXJlY3RpdmUgPT09IGRpcmVjdGl2ZSkge1xuICAgICAgICByZXQgPSBydWxlc1tpXTtcbiAgICAgICAgaWYgKHZhbHVlID09PSBydWxlc1tpXS52YWx1ZSkge1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZXQ7XG4gIH07XG5cbiAgLypcbiAgICAgIEZpbmRzIHN0eWxlcyB0aGF0IGhhdmUgZ2l2ZW4gc2VsZWN0b3IsIGNvbXByZXNzIHRoZW0sXG4gICAgICBhbmQgcmV0dXJucyB0aGVtXG4gICovXG4gIGZpLnByb3RvdHlwZS5maW5kQnlTZWxlY3RvciA9IGZ1bmN0aW9uKGNzc09iamVjdEFycmF5LCBzZWxlY3RvciwgY29udGFpbnMpIHtcbiAgICBpZiAoY29udGFpbnMgPT09IHVuZGVmaW5lZCkge1xuICAgICAgY29udGFpbnMgPSBmYWxzZTtcbiAgICB9XG5cbiAgICB2YXIgZm91bmQgPSBbXTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNzc09iamVjdEFycmF5Lmxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAoY29udGFpbnMgPT09IGZhbHNlKSB7XG4gICAgICAgIGlmIChjc3NPYmplY3RBcnJheVtpXS5zZWxlY3RvciA9PT0gc2VsZWN0b3IpIHtcbiAgICAgICAgICBmb3VuZC5wdXNoKGNzc09iamVjdEFycmF5W2ldKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKGNzc09iamVjdEFycmF5W2ldLnNlbGVjdG9yLmluZGV4T2Yoc2VsZWN0b3IpICE9PSAtMSkge1xuICAgICAgICAgIGZvdW5kLnB1c2goY3NzT2JqZWN0QXJyYXlbaV0pO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICB9XG4gICAgaWYgKHNlbGVjdG9yID09PSAnQGltcG9ydHMnIHx8IGZvdW5kLmxlbmd0aCA8IDIpIHtcbiAgICAgIHJldHVybiBmb3VuZDtcbiAgICB9IGVsc2Uge1xuICAgICAgdmFyIGJhc2UgPSBmb3VuZFswXTtcbiAgICAgIGZvciAoaSA9IDE7IGkgPCBmb3VuZC5sZW5ndGg7IGkrKykge1xuICAgICAgICB0aGlzLmludGVsbGlnZW50Q1NTUHVzaChbYmFzZV0sIGZvdW5kW2ldKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBbYmFzZV07IC8vd2UgYXJlIGRvbmUhISBhbGwgcHJvcGVydGllcyBtZXJnZWQgaW50byBiYXNlIVxuICAgIH1cbiAgfTtcblxuICAvKlxuICAgIGRlbGV0ZXMgY3NzT2JqZWN0cyBoYXZpbmcgZ2l2ZW4gc2VsZWN0b3IsIGFuZCByZXR1cm5zIG5ldyBhcnJheVxuICAqL1xuICBmaS5wcm90b3R5cGUuZGVsZXRlQnlTZWxlY3RvciA9IGZ1bmN0aW9uKGNzc09iamVjdEFycmF5LCBzZWxlY3Rvcikge1xuICAgIHZhciByZXQgPSBbXTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNzc09iamVjdEFycmF5Lmxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAoY3NzT2JqZWN0QXJyYXlbaV0uc2VsZWN0b3IgIT09IHNlbGVjdG9yKSB7XG4gICAgICAgIHJldC5wdXNoKGNzc09iamVjdEFycmF5W2ldKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJldDtcbiAgfTtcblxuICAvKlxuICAgICAgQ29tcHJlc3NlcyBnaXZlbiBjc3NPYmplY3RBcnJheSBhbmQgdHJpZXMgdG8gbWluaW1pemVcbiAgICAgIHNlbGVjdG9yIHJlZHVuZGVuY2UuXG4gICovXG4gIGZpLnByb3RvdHlwZS5jb21wcmVzc0NTUyA9IGZ1bmN0aW9uKGNzc09iamVjdEFycmF5KSB7XG4gICAgdmFyIGNvbXByZXNzZWQgPSBbXTtcbiAgICB2YXIgZG9uZSA9IHt9O1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY3NzT2JqZWN0QXJyYXkubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciBvYmogPSBjc3NPYmplY3RBcnJheVtpXTtcbiAgICAgIGlmIChkb25lW29iai5zZWxlY3Rvcl0gPT09IHRydWUpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIHZhciBmb3VuZCA9IHRoaXMuZmluZEJ5U2VsZWN0b3IoY3NzT2JqZWN0QXJyYXksIG9iai5zZWxlY3Rvcik7IC8vZm91bmQgY29tcHJlc3NlZFxuICAgICAgaWYgKGZvdW5kLmxlbmd0aCAhPT0gMCkge1xuICAgICAgICBjb21wcmVzc2VkID0gY29tcHJlc3NlZC5jb25jYXQoZm91bmQpO1xuICAgICAgICBkb25lW29iai5zZWxlY3Rvcl0gPSB0cnVlO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gY29tcHJlc3NlZDtcbiAgfTtcblxuICAvKlxuICAgIFJlY2VpdmVkIDIgY3NzIG9iamVjdHMgd2l0aCBmb2xsb3dpbmcgc3RydWN0dXJlXG4gICAgICB7XG4gICAgICAgIHJ1bGVzIDogW3tkaXJlY3RpdmU6XCJcIiwgdmFsdWU6XCJcIn0sIHtkaXJlY3RpdmU6XCJcIiwgdmFsdWU6XCJcIn0sIC4uLl1cbiAgICAgICAgc2VsZWN0b3IgOiBcIlNPTUVTRUxFQ1RPUlwiXG4gICAgICB9XG5cbiAgICByZXR1cm5zIHRoZSBjaGFuZ2VkKG5ldyxyZW1vdmVkLHVwZGF0ZWQpIHZhbHVlcyBvbiBjc3MxIHBhcmFtZXRlciwgb24gc2FtZSBzdHJ1Y3R1cmVcblxuICAgIGlmIHR3byBjc3Mgb2JqZWN0cyBhcmUgdGhlIHNhbWUsIHRoZW4gcmV0dXJucyBmYWxzZVxuXG4gICAgICBpZiBhIGNzcyBkaXJlY3RpdmUgZXhpc3RzIGluIGNzczEgYW5kICAgICBjc3MyLCBhbmQgaXRzIHZhbHVlIGlzIGRpZmZlcmVudCwgaXQgaXMgaW5jbHVkZWQgaW4gZGlmZlxuICAgICAgaWYgYSBjc3MgZGlyZWN0aXZlIGV4aXN0cyBpbiBjc3MxIGFuZCBub3QgY3NzMiwgaXQgaXMgdGhlbiBpbmNsdWRlZCBpbiBkaWZmXG4gICAgICBpZiBhIGNzcyBkaXJlY3RpdmUgZXhpc3RzIGluIGNzczIgYnV0IG5vdCBjc3MxLCB0aGVuIGl0IGlzIGRlbGV0ZWQgaW4gY3NzMSwgaXQgd291bGQgYmUgaW5jbHVkZWQgaW4gZGlmZiBidXQgd2lsbCBiZSBtYXJrZWQgYXMgdHlwZT0nREVMRVRFRCdcblxuICAgICAgQG9iamVjdCBjc3MxIGNzcyBvYmplY3RcbiAgICAgIEBvYmplY3QgY3NzMiBjc3Mgb2JqZWN0XG5cbiAgICAgIEByZXR1cm4gZGlmZiBjc3Mgb2JqZWN0IGNvbnRhaW5zIGNoYW5nZWQgdmFsdWVzIGluIGNzczEgaW4gcmVnYXJkcyB0byBjc3MyIHNlZSB0ZXN0IGlucHV0IG91dHB1dCBpbiAvdGVzdC9kYXRhL2Nzcy5qc1xuICAqL1xuICBmaS5wcm90b3R5cGUuY3NzRGlmZiA9IGZ1bmN0aW9uKGNzczEsIGNzczIpIHtcbiAgICBpZiAoY3NzMS5zZWxlY3RvciAhPT0gY3NzMi5zZWxlY3Rvcikge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIC8vaWYgb25lIG9mIHRoZW0gaXMgbWVkaWEgcXVlcnkgcmV0dXJuIGZhbHNlLCBiZWNhdXNlIGRpZmYgZnVuY3Rpb24gY2FuIG5vdCBvcGVyYXRlIG9uIG1lZGlhIHF1ZXJpZXNcbiAgICBpZiAoKGNzczEudHlwZSA9PT0gJ21lZGlhJyB8fCBjc3MyLnR5cGUgPT09ICdtZWRpYScpKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgdmFyIGRpZmYgPSB7XG4gICAgICBzZWxlY3RvcjogY3NzMS5zZWxlY3RvcixcbiAgICAgIHJ1bGVzOiBbXVxuICAgIH07XG4gICAgdmFyIHJ1bGUxLCBydWxlMjtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNzczEucnVsZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHJ1bGUxID0gY3NzMS5ydWxlc1tpXTtcbiAgICAgIC8vZmluZCBydWxlMiB3aGljaCBoYXMgdGhlIHNhbWUgZGlyZWN0aXZlIGFzIHJ1bGUxXG4gICAgICBydWxlMiA9IHRoaXMuZmluZENvcnJlc3BvbmRpbmdSdWxlKGNzczIucnVsZXMsIHJ1bGUxLmRpcmVjdGl2ZSwgcnVsZTEudmFsdWUpO1xuICAgICAgaWYgKHJ1bGUyID09PSBmYWxzZSkge1xuICAgICAgICAvL3J1bGUxIGlzIGEgbmV3IHJ1bGUgaW4gY3NzMVxuICAgICAgICBkaWZmLnJ1bGVzLnB1c2gocnVsZTEpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy9ydWxlMiB3YXMgZm91bmQgb25seSBwdXNoIGlmIGl0cyB2YWx1ZSBpcyBkaWZmZXJlbnQgdG9vXG4gICAgICAgIGlmIChydWxlMS52YWx1ZSAhPT0gcnVsZTIudmFsdWUpIHtcbiAgICAgICAgICBkaWZmLnJ1bGVzLnB1c2gocnVsZTEpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy9ub3cgZm9yIHJ1bGVzIGV4aXN0cyBpbiBjc3MyIGJ1dCBub3QgaW4gY3NzMSwgd2hpY2ggbWVhbnMgZGVsZXRlZCBydWxlc1xuICAgIGZvciAodmFyIGlpID0gMDsgaWkgPCBjc3MyLnJ1bGVzLmxlbmd0aDsgaWkrKykge1xuICAgICAgcnVsZTIgPSBjc3MyLnJ1bGVzW2lpXTtcbiAgICAgIC8vZmluZCBydWxlMiB3aGljaCBoYXMgdGhlIHNhbWUgZGlyZWN0aXZlIGFzIHJ1bGUxXG4gICAgICBydWxlMSA9IHRoaXMuZmluZENvcnJlc3BvbmRpbmdSdWxlKGNzczEucnVsZXMsIHJ1bGUyLmRpcmVjdGl2ZSk7XG4gICAgICBpZiAocnVsZTEgPT09IGZhbHNlKSB7XG4gICAgICAgIC8vcnVsZTEgaXMgYSBuZXcgcnVsZVxuICAgICAgICBydWxlMi50eXBlID0gJ0RFTEVURUQnOyAvL21hcmsgaXQgYXMgYSBkZWxldGVkIHJ1bGUsIHNvIHRoYXQgb3RoZXIgbWVyZ2Ugb3BlcmF0aW9ucyBjb3VsZCBiZSB0cnVlXG4gICAgICAgIGRpZmYucnVsZXMucHVzaChydWxlMik7XG4gICAgICB9XG4gICAgfVxuXG5cbiAgICBpZiAoZGlmZi5ydWxlcy5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgcmV0dXJuIGRpZmY7XG4gIH07XG5cbiAgLypcbiAgICAgIE1lcmdlcyAyIGRpZmZlcmVudCBjc3Mgb2JqZWN0cyB0b2dldGhlclxuICAgICAgdXNpbmcgaW50ZWxsaWdlbnRDU1NQdXNoLFxuXG4gICAgICBAcGFyYW0gY3NzT2JqZWN0QXJyYXksIHRhcmdldCBjc3Mgb2JqZWN0IGFycmF5XG4gICAgICBAcGFyYW0gbmV3QXJyYXksIHNvdXJjZSBhcnJheSB0aGF0IHdpbGwgYmUgcHVzaGVkIGludG8gY3NzT2JqZWN0QXJyYXkgcGFyYW1ldGVyXG4gICAgICBAcGFyYW0gcmV2ZXJzZSwgW29wdGlvbmFsXSwgaWYgZ2l2ZW4gdHJ1ZSwgZmlyc3QgcGFyYW1ldGVyIHdpbGwgYmUgdHJhdmVyc2VkIG9uIHJldmVyc2VkIG9yZGVyXG4gICAgICAgICAgICAgIGVmZmVjdGl2ZWx5IGdpdmluZyBwcmlvcml0eSB0byB0aGUgc3R5bGVzIGluIG5ld0FycmF5XG4gICovXG4gIGZpLnByb3RvdHlwZS5pbnRlbGxpZ2VudE1lcmdlID0gZnVuY3Rpb24oY3NzT2JqZWN0QXJyYXksIG5ld0FycmF5LCByZXZlcnNlKSB7XG4gICAgaWYgKHJldmVyc2UgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV2ZXJzZSA9IGZhbHNlO1xuICAgIH1cblxuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBuZXdBcnJheS5sZW5ndGg7IGkrKykge1xuICAgICAgdGhpcy5pbnRlbGxpZ2VudENTU1B1c2goY3NzT2JqZWN0QXJyYXksIG5ld0FycmF5W2ldLCByZXZlcnNlKTtcbiAgICB9XG4gICAgZm9yIChpID0gMDsgaSA8IGNzc09iamVjdEFycmF5Lmxlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIgY29iaiA9IGNzc09iamVjdEFycmF5W2ldO1xuICAgICAgaWYgKGNvYmoudHlwZSA9PT0gJ21lZGlhJyB8fCAoY29iai50eXBlID09PSAna2V5ZnJhbWVzJykpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBjb2JqLnJ1bGVzID0gdGhpcy5jb21wYWN0UnVsZXMoY29iai5ydWxlcyk7XG4gICAgfVxuICB9O1xuXG4gIC8qXG4gICAgaW5zZXJ0cyBuZXcgY3NzIG9iamVjdHMgaW50byBhIGJpZ2dlciBjc3Mgb2JqZWN0XG4gICAgd2l0aCBzYW1lIHNlbGVjdG9ycyBncm91cGVkIHRvZ2V0aGVyXG5cbiAgICBAcGFyYW0gY3NzT2JqZWN0QXJyYXksIGFycmF5IG9mIGJpZ2dlciBjc3Mgb2JqZWN0IHRvIGJlIHB1c2hlZCBpbnRvXG4gICAgQHBhcmFtIG1pbmltYWxPYmplY3QsIHNpbmdsZSBjc3Mgb2JqZWN0XG4gICAgQHBhcmFtIHJldmVyc2UgW29wdGlvbmFsXSBkZWZhdWx0IGlzIGZhbHNlLCBpZiBnaXZlbiwgY3NzT2JqZWN0QXJyYXkgd2lsbCBiZSByZXZlcnNseSB0cmF2ZXJzZWRcbiAgICAgICAgICAgIHJlc3VsdGluZyBtb3JlIHByaW9yaXR5IGluIG1pbmltYWxPYmplY3QncyBzdHlsZXNcbiAgKi9cbiAgZmkucHJvdG90eXBlLmludGVsbGlnZW50Q1NTUHVzaCA9IGZ1bmN0aW9uKGNzc09iamVjdEFycmF5LCBtaW5pbWFsT2JqZWN0LCByZXZlcnNlKSB7XG4gICAgdmFyIHB1c2hTZWxlY3RvciA9IG1pbmltYWxPYmplY3Quc2VsZWN0b3I7XG4gICAgLy9maW5kIGNvcnJlY3Qgc2VsZWN0b3IgaWYgbm90IGZvdW5kIGp1c3QgcHVzaCBtaW5pbWFsT2JqZWN0IGludG8gY3NzT2JqZWN0XG4gICAgdmFyIGNzc09iamVjdCA9IGZhbHNlO1xuXG4gICAgaWYgKHJldmVyc2UgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV2ZXJzZSA9IGZhbHNlO1xuICAgIH1cblxuICAgIGlmIChyZXZlcnNlID09PSBmYWxzZSkge1xuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjc3NPYmplY3RBcnJheS5sZW5ndGg7IGkrKykge1xuICAgICAgICBpZiAoY3NzT2JqZWN0QXJyYXlbaV0uc2VsZWN0b3IgPT09IHB1c2hTZWxlY3Rvcikge1xuICAgICAgICAgIGNzc09iamVjdCA9IGNzc09iamVjdEFycmF5W2ldO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGZvciAodmFyIGogPSBjc3NPYmplY3RBcnJheS5sZW5ndGggLSAxOyBqID4gLTE7IGotLSkge1xuICAgICAgICBpZiAoY3NzT2JqZWN0QXJyYXlbal0uc2VsZWN0b3IgPT09IHB1c2hTZWxlY3Rvcikge1xuICAgICAgICAgIGNzc09iamVjdCA9IGNzc09iamVjdEFycmF5W2pdO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKGNzc09iamVjdCA9PT0gZmFsc2UpIHtcbiAgICAgIGNzc09iamVjdEFycmF5LnB1c2gobWluaW1hbE9iamVjdCk7IC8vanVzdCBwdXNoLCBiZWNhdXNlIGNzc1NlbGVjdG9yIGlzIG5ld1xuICAgIH0gZWxzZSB7XG4gICAgICBpZiAobWluaW1hbE9iamVjdC50eXBlICE9PSAnbWVkaWEnKSB7XG4gICAgICAgIGZvciAodmFyIGlpID0gMDsgaWkgPCBtaW5pbWFsT2JqZWN0LnJ1bGVzLmxlbmd0aDsgaWkrKykge1xuICAgICAgICAgIHZhciBydWxlID0gbWluaW1hbE9iamVjdC5ydWxlc1tpaV07XG4gICAgICAgICAgLy9maW5kIHJ1bGUgaW5zaWRlIGNzc09iamVjdFxuICAgICAgICAgIHZhciBvbGRSdWxlID0gdGhpcy5maW5kQ29ycmVzcG9uZGluZ1J1bGUoY3NzT2JqZWN0LnJ1bGVzLCBydWxlLmRpcmVjdGl2ZSk7XG4gICAgICAgICAgaWYgKG9sZFJ1bGUgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICBjc3NPYmplY3QucnVsZXMucHVzaChydWxlKTtcbiAgICAgICAgICB9IGVsc2UgaWYgKHJ1bGUudHlwZSA9PT0gJ0RFTEVURUQnKSB7XG4gICAgICAgICAgICBvbGRSdWxlLnR5cGUgPSAnREVMRVRFRCc7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vcnVsZSBmb3VuZCBqdXN0IHVwZGF0ZSB2YWx1ZVxuXG4gICAgICAgICAgICBvbGRSdWxlLnZhbHVlID0gcnVsZS52YWx1ZTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNzc09iamVjdC5zdWJTdHlsZXMgPSBjc3NPYmplY3Quc3ViU3R5bGVzLmNvbmNhdChtaW5pbWFsT2JqZWN0LnN1YlN0eWxlcyk7IC8vVE9ETywgbWFrZSB0aGlzIGludGVsbGlnZW50IHRvb1xuICAgICAgfVxuXG4gICAgfVxuICB9O1xuXG4gIC8qXG4gICAgZmlsdGVyIG91dHMgcnVsZSBvYmplY3RzIHdob3NlIHR5cGUgcGFyYW0gZXF1YWwgdG8gREVMRVRFRFxuXG4gICAgQHBhcmFtIHJ1bGVzLCBhcnJheSBvZiBydWxlc1xuXG4gICAgQHJldHVybnMgcnVsZXMgYXJyYXksIGNvbXBhY3RlZCBieSBkZWxldGluZyBhbGwgdW5uZWNlc3NhcnkgcnVsZXNcbiAgKi9cbiAgZmkucHJvdG90eXBlLmNvbXBhY3RSdWxlcyA9IGZ1bmN0aW9uKHJ1bGVzKSB7XG4gICAgdmFyIG5ld1J1bGVzID0gW107XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBydWxlcy5sZW5ndGg7IGkrKykge1xuICAgICAgaWYgKHJ1bGVzW2ldLnR5cGUgIT09ICdERUxFVEVEJykge1xuICAgICAgICBuZXdSdWxlcy5wdXNoKHJ1bGVzW2ldKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG5ld1J1bGVzO1xuICB9O1xuICAvKlxuICAgIGNvbXB1dGVzIHN0cmluZyBmb3IgYWNlIGVkaXRvciB1c2luZyB0aGlzLmNzcyBvciBnaXZlbiBjc3NCYXNlIG9wdGlvbmFsIHBhcmFtZXRlclxuXG4gICAgQHBhcmFtIFtvcHRpb25hbF0gY3NzQmFzZSwgaWYgZ2l2ZW4gY29tcHV0ZXMgY3NzU3RyaW5nIGZyb20gY3NzT2JqZWN0IGFycmF5XG4gICovXG4gIGZpLnByb3RvdHlwZS5nZXRDU1NGb3JFZGl0b3IgPSBmdW5jdGlvbihjc3NCYXNlLCBkZXB0aCkge1xuICAgIGlmIChkZXB0aCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICBkZXB0aCA9IDA7XG4gICAgfVxuICAgIHZhciByZXQgPSAnJztcbiAgICBpZiAoY3NzQmFzZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICBjc3NCYXNlID0gdGhpcy5jc3M7XG4gICAgfVxuICAgIC8vYXBwZW5kIGltcG9ydHNcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNzc0Jhc2UubGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmIChjc3NCYXNlW2ldLnR5cGUgPT09ICdpbXBvcnRzJykge1xuICAgICAgICByZXQgKz0gY3NzQmFzZVtpXS5zdHlsZXMgKyAnXFxuXFxuJztcbiAgICAgIH1cbiAgICB9XG4gICAgZm9yIChpID0gMDsgaSA8IGNzc0Jhc2UubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciB0bXAgPSBjc3NCYXNlW2ldO1xuICAgICAgaWYgKHRtcC5zZWxlY3RvciA9PT0gdW5kZWZpbmVkKSB7IC8vdGVtcG9yYXJpbHkgb21pdCBtZWRpYSBxdWVyaWVzXG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgdmFyIGNvbW1lbnRzID0gXCJcIjtcbiAgICAgIGlmICh0bXAuY29tbWVudHMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBjb21tZW50cyA9IHRtcC5jb21tZW50cyArICdcXG4nO1xuICAgICAgfVxuXG4gICAgICBpZiAodG1wLnR5cGUgPT09ICdtZWRpYScpIHsgLy9hbHNvIHB1dCBtZWRpYSBxdWVyaWVzIHRvIG91dHB1dFxuICAgICAgICByZXQgKz0gY29tbWVudHMgKyB0bXAuc2VsZWN0b3IgKyAne1xcbic7XG4gICAgICAgIHJldCArPSB0aGlzLmdldENTU0ZvckVkaXRvcih0bXAuc3ViU3R5bGVzLCBkZXB0aCArIDEpO1xuICAgICAgICByZXQgKz0gJ31cXG5cXG4nO1xuICAgICAgfSBlbHNlIGlmICh0bXAudHlwZSAhPT0gJ2tleWZyYW1lcycgJiYgdG1wLnR5cGUgIT09ICdpbXBvcnRzJykge1xuICAgICAgICByZXQgKz0gdGhpcy5nZXRTcGFjZXMoZGVwdGgpICsgY29tbWVudHMgKyB0bXAuc2VsZWN0b3IgKyAnIHtcXG4nO1xuICAgICAgICByZXQgKz0gdGhpcy5nZXRDU1NPZlJ1bGVzKHRtcC5ydWxlcywgZGVwdGggKyAxKTtcbiAgICAgICAgcmV0ICs9IHRoaXMuZ2V0U3BhY2VzKGRlcHRoKSArICd9XFxuXFxuJztcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvL2FwcGVuZCBrZXlGcmFtZXNcbiAgICBmb3IgKGkgPSAwOyBpIDwgY3NzQmFzZS5sZW5ndGg7IGkrKykge1xuICAgICAgaWYgKGNzc0Jhc2VbaV0udHlwZSA9PT0gJ2tleWZyYW1lcycpIHtcbiAgICAgICAgcmV0ICs9IGNzc0Jhc2VbaV0uc3R5bGVzICsgJ1xcblxcbic7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHJldDtcbiAgfTtcblxuICBmaS5wcm90b3R5cGUuZ2V0SW1wb3J0cyA9IGZ1bmN0aW9uKGNzc09iamVjdEFycmF5KSB7XG4gICAgdmFyIGltcHMgPSBbXTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNzc09iamVjdEFycmF5Lmxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAoY3NzT2JqZWN0QXJyYXlbaV0udHlwZSA9PT0gJ2ltcG9ydHMnKSB7XG4gICAgICAgIGltcHMucHVzaChjc3NPYmplY3RBcnJheVtpXS5zdHlsZXMpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gaW1wcztcbiAgfTtcbiAgLypcbiAgICBnaXZlbiBydWxlcyBhcnJheSwgcmV0dXJucyB2aXN1YWxseSBmb3JtYXR0ZWQgY3NzIHN0cmluZ1xuICAgIHRvIGJlIHVzZWQgaW5zaWRlIGVkaXRvclxuICAqL1xuICBmaS5wcm90b3R5cGUuZ2V0Q1NTT2ZSdWxlcyA9IGZ1bmN0aW9uKHJ1bGVzLCBkZXB0aCkge1xuICAgIHZhciByZXQgPSAnJztcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHJ1bGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAocnVsZXNbaV0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGlmIChydWxlc1tpXS5kZWZlY3RpdmUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXQgKz0gdGhpcy5nZXRTcGFjZXMoZGVwdGgpICsgcnVsZXNbaV0uZGlyZWN0aXZlICsgJzogJyArIHJ1bGVzW2ldLnZhbHVlICsgJztcXG4nO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0ICs9IHRoaXMuZ2V0U3BhY2VzKGRlcHRoKSArIHJ1bGVzW2ldLnZhbHVlICsgJztcXG4nO1xuICAgICAgfVxuXG4gICAgfVxuICAgIHJldHVybiByZXQgfHwgJ1xcbic7XG4gIH07XG5cbiAgLypcbiAgICAgIEEgdmVyeSBzaW1wbGUgaGVscGVyIGZ1bmN0aW9uIHJldHVybnMgbnVtYmVyIG9mIHNwYWNlcyBhcHBlbmRlZCBpbiBhIHNpbmdsZSBzdHJpbmcsXG4gICAgICB0aGUgbnVtYmVyIGRlcGVuZHMgaW5wdXQgcGFyYW1ldGVyLCBuYW1lbHkgaW5wdXQqMlxuICAqL1xuICBmaS5wcm90b3R5cGUuZ2V0U3BhY2VzID0gZnVuY3Rpb24obnVtKSB7XG4gICAgdmFyIHJldCA9ICcnO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbnVtICogNDsgaSsrKSB7XG4gICAgICByZXQgKz0gJyAnO1xuICAgIH1cbiAgICByZXR1cm4gcmV0O1xuICB9O1xuXG4gIC8qXG4gICAgR2l2ZW4gY3NzIHN0cmluZyBvciBvYmplY3RBcnJheSwgcGFyc2VzIGl0IGFuZCB0aGVuIGZvciBldmVyeSBzZWxlY3RvcixcbiAgICBwcmVwZW5kcyB0aGlzLmNzc1ByZXZpZXdOYW1lc3BhY2UgdG8gcHJldmVudCBjc3MgY29sbGlzaW9uIGlzc3Vlc1xuXG4gICAgQHJldHVybnMgY3NzIHN0cmluZyBpbiB3aGljaCB0aGlzLmNzc1ByZXZpZXdOYW1lc3BhY2UgcHJlcGVuZGVkXG4gICovXG4gIGZpLnByb3RvdHlwZS5hcHBseU5hbWVzcGFjaW5nID0gZnVuY3Rpb24oY3NzLCBmb3JjZWROYW1lc3BhY2UpIHtcbiAgICB2YXIgY3NzT2JqZWN0QXJyYXkgPSBjc3M7XG4gICAgdmFyIG5hbWVzcGFjZUNsYXNzID0gJy4nICsgdGhpcy5jc3NQcmV2aWV3TmFtZXNwYWNlO1xuICAgIGlmKGZvcmNlZE5hbWVzcGFjZSAhPT0gdW5kZWZpbmVkKXtcbiAgICAgIG5hbWVzcGFjZUNsYXNzID0gZm9yY2VkTmFtZXNwYWNlO1xuICAgIH1cblxuICAgIGlmICh0eXBlb2YgY3NzID09PSAnc3RyaW5nJykge1xuICAgICAgY3NzT2JqZWN0QXJyYXkgPSB0aGlzLnBhcnNlQ1NTKGNzcyk7XG4gICAgfVxuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjc3NPYmplY3RBcnJheS5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIG9iaiA9IGNzc09iamVjdEFycmF5W2ldO1xuXG4gICAgICAvL2J5cGFzcyBuYW1lc3BhY2luZyBmb3IgQGZvbnQtZmFjZSBAa2V5ZnJhbWVzIEBpbXBvcnRcbiAgICAgIGlmKG9iai5zZWxlY3Rvci5pbmRleE9mKCdAZm9udC1mYWNlJykgPiAtMSB8fCBvYmouc2VsZWN0b3IuaW5kZXhPZigna2V5ZnJhbWVzJykgPiAtMSB8fCBvYmouc2VsZWN0b3IuaW5kZXhPZignQGltcG9ydCcpID4gLTEgfHwgb2JqLnNlbGVjdG9yLmluZGV4T2YoJy5mb3JtLWFsbCcpID4gLTEgfHwgb2JqLnNlbGVjdG9yLmluZGV4T2YoJyNzdGFnZScpID4gLTEpe1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgaWYgKG9iai50eXBlICE9PSAnbWVkaWEnKSB7XG4gICAgICAgIHZhciBzZWxlY3RvciA9IG9iai5zZWxlY3Rvci5zcGxpdCgnLCcpO1xuICAgICAgICB2YXIgbmV3U2VsZWN0b3IgPSBbXTtcbiAgICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCBzZWxlY3Rvci5sZW5ndGg7IGorKykge1xuICAgICAgICAgIGlmIChzZWxlY3RvcltqXS5pbmRleE9mKCcuc3VwZXJub3ZhJykgPT09IC0xKSB7IC8vZG8gbm90IGFwcGx5IG5hbWVzcGFjaW5nIHRvIHNlbGVjdG9ycyBpbmNsdWRpbmcgc3VwZXJub3ZhXG4gICAgICAgICAgICBuZXdTZWxlY3Rvci5wdXNoKG5hbWVzcGFjZUNsYXNzICsgJyAnICsgc2VsZWN0b3Jbal0pO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBuZXdTZWxlY3Rvci5wdXNoKHNlbGVjdG9yW2pdKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgb2JqLnNlbGVjdG9yID0gbmV3U2VsZWN0b3Iuam9pbignLCcpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgb2JqLnN1YlN0eWxlcyA9IHRoaXMuYXBwbHlOYW1lc3BhY2luZyhvYmouc3ViU3R5bGVzLCBmb3JjZWROYW1lc3BhY2UpOyAvL2hhbmRsZSBtZWRpYSBxdWVyaWVzIGFzIHdlbGxcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gY3NzT2JqZWN0QXJyYXk7XG4gIH07XG5cbiAgLypcbiAgICBnaXZlbiBjc3Mgc3RyaW5nIG9yIG9iamVjdCBhcnJheSwgY2xlYXJzIHBvc3NpYmxlIG5hbWVzcGFjaW5nIGZyb21cbiAgICBhbGwgb2YgdGhlIHNlbGVjdG9ycyBpbnNpZGUgdGhlIGNzc1xuICAqL1xuICBmaS5wcm90b3R5cGUuY2xlYXJOYW1lc3BhY2luZyA9IGZ1bmN0aW9uKGNzcywgcmV0dXJuT2JqKSB7XG4gICAgaWYgKHJldHVybk9iaiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm5PYmogPSBmYWxzZTtcbiAgICB9XG4gICAgdmFyIGNzc09iamVjdEFycmF5ID0gY3NzO1xuICAgIHZhciBuYW1lc3BhY2VDbGFzcyA9ICcuJyArIHRoaXMuY3NzUHJldmlld05hbWVzcGFjZTtcbiAgICBpZiAodHlwZW9mIGNzcyA9PT0gJ3N0cmluZycpIHtcbiAgICAgIGNzc09iamVjdEFycmF5ID0gdGhpcy5wYXJzZUNTUyhjc3MpO1xuICAgIH1cblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY3NzT2JqZWN0QXJyYXkubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciBvYmogPSBjc3NPYmplY3RBcnJheVtpXTtcblxuICAgICAgaWYgKG9iai50eXBlICE9PSAnbWVkaWEnKSB7XG4gICAgICAgIHZhciBzZWxlY3RvciA9IG9iai5zZWxlY3Rvci5zcGxpdCgnLCcpO1xuICAgICAgICB2YXIgbmV3U2VsZWN0b3IgPSBbXTtcbiAgICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCBzZWxlY3Rvci5sZW5ndGg7IGorKykge1xuICAgICAgICAgIG5ld1NlbGVjdG9yLnB1c2goc2VsZWN0b3Jbal0uc3BsaXQobmFtZXNwYWNlQ2xhc3MgKyAnICcpLmpvaW4oJycpKTtcbiAgICAgICAgfVxuICAgICAgICBvYmouc2VsZWN0b3IgPSBuZXdTZWxlY3Rvci5qb2luKCcsJyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBvYmouc3ViU3R5bGVzID0gdGhpcy5jbGVhck5hbWVzcGFjaW5nKG9iai5zdWJTdHlsZXMsIHRydWUpOyAvL2hhbmRsZSBtZWRpYSBxdWVyaWVzIGFzIHdlbGxcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKHJldHVybk9iaiA9PT0gZmFsc2UpIHtcbiAgICAgIHJldHVybiB0aGlzLmdldENTU0ZvckVkaXRvcihjc3NPYmplY3RBcnJheSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBjc3NPYmplY3RBcnJheTtcbiAgICB9XG5cbiAgfTtcblxuICAvKlxuICAgIGNyZWF0ZXMgYSBuZXcgc3R5bGUgdGFnIChhbHNvIGRlc3Ryb3lzIHRoZSBwcmV2aW91cyBvbmUpXG4gICAgYW5kIGluamVjdHMgZ2l2ZW4gY3NzIHN0cmluZyBpbnRvIHRoYXQgY3NzIHRhZ1xuICAqL1xuICBmaS5wcm90b3R5cGUuY3JlYXRlU3R5bGVFbGVtZW50ID0gZnVuY3Rpb24oaWQsIGNzcywgZm9ybWF0KSB7XG4gICAgaWYgKGZvcm1hdCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICBmb3JtYXQgPSBmYWxzZTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy50ZXN0TW9kZSA9PT0gZmFsc2UgJiYgZm9ybWF0ICE9PSAnbm9uYW1lc3BhY2UnKSB7XG4gICAgICAvL2FwcGx5IG5hbWVzcGFjaW5nIGNsYXNzZXNcbiAgICAgIGNzcyA9IHRoaXMuYXBwbHlOYW1lc3BhY2luZyhjc3MpO1xuICAgIH1cblxuICAgIGlmICh0eXBlb2YgY3NzICE9PSAnc3RyaW5nJykge1xuICAgICAgY3NzID0gdGhpcy5nZXRDU1NGb3JFZGl0b3IoY3NzKTtcbiAgICB9XG4gICAgLy9hcHBseSBmb3JtYXR0aW5nIGZvciBjc3NcbiAgICBpZiAoZm9ybWF0ID09PSB0cnVlKSB7XG4gICAgICBjc3MgPSB0aGlzLmdldENTU0ZvckVkaXRvcih0aGlzLnBhcnNlQ1NTKGNzcykpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLnRlc3RNb2RlICE9PSBmYWxzZSkge1xuICAgICAgcmV0dXJuIHRoaXMudGVzdE1vZGUoJ2NyZWF0ZSBzdHlsZSAjJyArIGlkLCBjc3MpOyAvL2lmIHRlc3QgbW9kZSwganVzdCBwYXNzIHJlc3VsdCB0byBjYWxsYmFja1xuICAgIH1cblxuICAgIHZhciBfX2VsID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoaWQpO1xuICAgIGlmIChfX2VsKSB7XG4gICAgICBfX2VsLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQoX19lbCk7XG4gICAgfVxuXG4gICAgdmFyIGhlYWQgPSBkb2N1bWVudC5oZWFkIHx8IGRvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCdoZWFkJylbMF0sXG4gICAgICBzdHlsZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3N0eWxlJyk7XG5cbiAgICBzdHlsZS5pZCA9IGlkO1xuICAgIHN0eWxlLnR5cGUgPSAndGV4dC9jc3MnO1xuXG4gICAgaGVhZC5hcHBlbmRDaGlsZChzdHlsZSk7XG5cbiAgICBpZiAoc3R5bGUuc3R5bGVTaGVldCAmJiAhc3R5bGUuc2hlZXQpIHtcbiAgICAgIHN0eWxlLnN0eWxlU2hlZXQuY3NzVGV4dCA9IGNzcztcbiAgICB9IGVsc2Uge1xuICAgICAgc3R5bGUuYXBwZW5kQ2hpbGQoZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoY3NzKSk7XG4gICAgfVxuICB9O1xuXG4gIGdsb2JhbC5jc3NqcyA9IGZpO1xuXG59KSh0aGlzKTtcbiIsIlxyXG5jb25zdCBleHBsb3JlckV2ZW50ID0gT2JqZWN0LmZyZWV6ZSh7XHJcbiAgICBvbm1vdXNlb3ZlcjogMSA8PCAzMSxcclxuICAgIG9uY2xpY2s6IDEgPDwgMzAsXHJcbiAgICBvbnNlbGVjdDogMSA8PCAyOSxcclxuICAgIG9uZm9sZDogMSA8PCAyOFxyXG59KTtcclxuXHJcbi8vIEhhbmRsZXMgZXZlbnRzIGZvciB0aGUgZXhwY3NzIHBhcnNlclxyXG5jbGFzcyBFdmVudFN0YXRlIHtcclxuICAgIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgICAgIHRoaXMuc3RhdGUgPSAwO1xyXG4gICAgfVxyXG5cclxuICAgIHNldChlKSB7XHJcbiAgICAgICAgdGhpcy5zdGF0ZSB8PSBlO1xyXG4gICAgfVxyXG5cclxuICAgIHJlbW92ZShlKSB7XHJcbiAgICAgICAgdGhpcy5zdGF0ZSAmPSB+ZTtcclxuICAgIH1cclxuXHJcbiAgICB0b2dnbGUoZSkge1xyXG4gICAgICAgIHRoaXMuc3RhdGUgXj0gZTtcclxuICAgIH1cclxuXHJcbiAgICBjaGVjayhlKSB7XHJcbiAgICAgICAgaWYgKCh0aGlzLnN0YXRlICYgZSkgIT0gMCkge1xyXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGVxdWFscyhvdGhlcil7XHJcbiAgICAgICAgaWYob3RoZXIgPT0gdGhpcy5zdGF0ZSl7XHJcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0ge1xyXG4gICAgRXZlbnRTdGF0ZTogRXZlbnRTdGF0ZSxcclxuICAgIGV4cGxvcmVyRXZlbnQ6IGV4cGxvcmVyRXZlbnRcclxufTsiLCJjb25zdCBfY3NzanMgPSByZXF1aXJlKFwiLi4vbm9kZV9tb2R1bGVzL2pvdGZvcm0tY3NzLmpzL2Nzcy5qc1wiKTtcclxuY29uc3Qge1NlbGVjdG9yUGFyc2VyfSA9IHJlcXVpcmUoXCIuL3NlbGVjdG9yLXBhcnNlci5qc1wiKTtcclxuY29uc3Qge1J1bGVQYXJzZXJ9ID0gcmVxdWlyZShcIi4vcnVsZS1wYXJzZXIuanNcIik7XHJcbmNvbnN0IEV2ZW50cyA9IHJlcXVpcmUoXCIuL2V2ZW50cy5qc1wiKTtcclxuXHJcbmNsYXNzIEV4cGxvcmVyQ1NTIHtcclxuXHJcbiAgICBjb25zdHJ1Y3Rvcigpe1xyXG4gICAgICAgIC8vaW5pdGlhbGl6ZSBwYXJzZXIgb2JqZWN0XHJcbiAgICAgICAgdGhpcy5fcGFyc2VyID0gbmV3IF9jc3Nqcy5jc3NqcygpO1xyXG5cclxuICAgICAgICAvL0FycmF5IG9mIGNzcyB1bml0cyB7c2VsZWN0b3IgPSBcIlwiLCBydWxlcyA9IFt7ZGlyZWN0aXZlID0gXCJcIiwgdmFsdWUgID0gXCJcIn0gLi4uXX1cclxuICAgICAgICB0aGlzLnJhd0NTUyA9IFtdO1xyXG5cclxuICAgICAgICAvL3BhcnNlZCBjc3MgYmxvY2tzIHJlYWR5IHRvIGJlIGFwcGxpZWQgdG8gb2JqZWN0c1xyXG4gICAgICAgIHRoaXMuc3R5bGluZ3MgPSBbXTtcclxuICAgIH1cclxuICAgXHJcblxyXG4gICAgLy9maWxlIGlucHV0IGZvciB0aGUgcGFyc2VyIGFzIHN0cmluZ1xyXG4gICAgcGFyc2UoY3NzU3RyaW5nKSB7XHJcbiAgICAgICAgdGhpcy5yYXdDU1MgPSB0aGlzLl9wYXJzZXIucGFyc2VDU1MoY3NzU3RyaW5nKTtcclxuXHJcbiAgICAgICAgdmFyIHNwID0gbmV3IFNlbGVjdG9yUGFyc2VyKCk7XHJcbiAgICAgICAgdmFyIHJwID0gbmV3IFJ1bGVQYXJzZXIoKTtcclxuXHJcbiAgICAgICAgdGhpcy5yYXdDU1MuZm9yRWFjaCgoZWxlbWVudCwgaSkgPT4ge1xyXG4gICAgICAgICAgICB2YXIgc3R5bGUgPSBuZXcgU3R5bGluZygpO1xyXG4gICAgICAgICAgICB2YXIgbm9ybWFsaXplZFNlbGVjdG9yID0gZWxlbWVudC5zZWxlY3Rvci5zcGxpdCgnICcpLmpvaW4oJycpLnRvTG93ZXJDYXNlKCk7XHJcblxyXG4gICAgICAgICAgICBzdHlsZS5zZWxlY3RvciA9IHNwLnBhcnNlU2VsZWN0b3Iobm9ybWFsaXplZFNlbGVjdG9yLCBpKTtcclxuXHJcbiAgICAgICAgICAgIGVsZW1lbnQucnVsZXMuZm9yRWFjaCgoZWxlbWVudCwgaSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgdmFyIHJ1bGUgPSBycC5wYXJzZVJ1bGUoZWxlbWVudC5kaXJlY3RpdmUsIGVsZW1lbnQudmFsdWUuc3BsaXQoJyAnKS5qb2luKCcnKS50b0xvd2VyQ2FzZSgpKTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZihydWxlLl92YWxpZCl7XHJcbiAgICAgICAgICAgICAgICAgICAgc3R5bGUucnVsZXMucHVzaChydWxlKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICB0aGlzLnN0eWxpbmdzLnB1c2goc3R5bGUpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIC8vbW9kaWZpZXMgdGhlIGdpdmVuIHN0eWxlIGJhc2VkIG9uIHRoZSBnaXZlbiBvYmplY3RcclxuICAgIHN0eWxlKG9iaiwgc3R5KSB7XHJcbiAgICAgICAgdGhpcy5zdHlsaW5ncy5mb3JFYWNoKHN0eWxlID0+IHN0eWxlLmFwcGx5KG9iaiwgc3R5KSk7XHJcbiAgICB9IFxyXG59XHJcblxyXG5jbGFzcyBTdHlsaW5nIHtcclxuICAgIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgICAgIHRoaXMuc2VsZWN0b3I7XHJcbiAgICAgICAgdGhpcy5ydWxlcyA9IFtdO1xyXG4gICAgfVxyXG5cclxuICAgIGFwcGx5KG9iaiwgc3R5KXtcclxuICAgICAgICBpZih0aGlzLnNlbGVjdG9yLnRlc3Qob2JqLCBzdHkpKXtcclxuICAgICAgICAgICAgdGhpcy5ydWxlcy5mb3JFYWNoKHJ1bGUgPT4gcnVsZS5hcHBseShvYmosIHN0eSkpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSB7XCJFeHBsb3JlckNTU1wiOiBFeHBsb3JlckNTUyxcclxuICAgICAgICAgICAgICAgICAgXCJFdmVudFwiOkV2ZW50c31cclxuXHJcbi8vdmFyIGV4cGNzcyA9IG5ldyBFeHBsb3JlckNTUygpO1xyXG5cclxuLy9leHBjc3MucGFyc2UoJ2VbYXR0ciwgYXR0ciB+PSB0ZXN0XS5zb21lU2VsZWN0b3IgOm9uSG92ZXI6b25TZWxlY3QgI215TmFtZS5vdGhlclNlbGVjdG9yID4gZTVbdGVzdEEsIHRlc3RBID4gYl0ucGFjazpvbkhvdmVyI2lkIDwgZSogeyBtYXJnaW46NDBweCAxMHB4OyBwYWRkaW5nOjVweDsgdGVzdDpsaW4oNT0xMCwgOD0yMCkudXNpbmcocGFnZXMpOyBjb2xvcjpsaW4oNT0oNSwxMDAsMjApLCAxMD0oMjAsNTAsMTApKS51c2luZyhwYWdlcyk7fScpO1xyXG4vL2V4cGNzcy5wYXJzZSgnZVtwYWdlc106dGVzdCB7IG1hcmdpbjo0MHB4IDEwcHg7IHBhZGRpbmc6NXB4OyB0ZXN0Omxpbig1PTEwLCA4PTIwKS51c2luZyhwYWdlcyk7IGNvbG9yOmxpbig1PSg1LDEwMCwyMCksIDEwPSgyMCw1MCwxMCkpLnVzaW5nKHBhZ2VzKTt9Jyk7XHJcblxyXG4vL3ZhciB0ZXN0T2JqID0ge1xyXG4vLyAgICAndHlwZSc6J2UnLFxyXG4vLyAgICAncGFnZXMnOiA3XHJcbi8vfVxyXG4vL2V4cGNzcy5zdHlsZSh0ZXN0T2JqKTtcclxuLy9jb25zb2xlLmxvZyhKU09OLnN0cmluZ2lmeSh0ZXN0T2JqLCB1bmRlZmluZWQsIDIpKTsiLCJjbGFzcyBQYXJzZXIge1xyXG4gICAgY29uc3RydWN0b3IoKSB7XHJcbiAgICAgICAgdGhpcy5fY3VySWR4ID0gMDtcclxuICAgICAgICB0aGlzLl9ibG9jayA9IC0xO1xyXG4gICAgICAgIHRoaXMuX2xpdGVyYWwgPSBcIlwiO1xyXG4gICAgfVxyXG5cclxuICAgIF9jdXJDaGFyKCkge1xyXG4gICAgICAgIHJldHVybiB0aGlzLl9saXRlcmFsLmNoYXJBdCh0aGlzLl9jdXJJZHgpO1xyXG4gICAgfVxyXG5cclxuICAgIF9uZXh0Q2hhcigpIHtcclxuICAgICAgICB2YXIgcmVhY2hlZEVuZCA9IHRoaXMuX2N1cklkeCA9PSAodGhpcy5fbGl0ZXJhbC5sZW5ndGgpO1xyXG5cclxuICAgICAgICBpZiAocmVhY2hlZEVuZCkge1xyXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLl9jdXJJZHgrKztcclxuXHJcbiAgICAgICAgdGhpcy5fY29uc3VtZVNwYWNlcygpO1xyXG5cclxuICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgIH1cclxuXHJcbiAgICBfY29uc3VtZVNwYWNlcygpIHtcclxuICAgICAgICB3aGlsZSAodGhpcy5fY3VyQ2hhcigpID09IFwiIFwiKSB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLl9jdXJJZHggPj0gdGhpcy5fbGl0ZXJhbC5sZW5ndGggLSAxKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdGhpcy5fY3VySWR4Kys7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIF9nZXRTdHJpbmdVbnRpbCh0ZXJtaW5hbHMpIHtcclxuICAgICAgICB2YXIgcmVzdWx0ID0gXCJcIjtcclxuXHJcbiAgICAgICAgd2hpbGUgKCF0ZXJtaW5hbHMuaW5jbHVkZXModGhpcy5fY3VyQ2hhcigpKSkge1xyXG4gICAgICAgICAgICByZXN1bHQgKz0gdGhpcy5fY3VyQ2hhcigpO1xyXG5cclxuICAgICAgICAgICAgaWYgKCF0aGlzLl9uZXh0Q2hhcigpKSB7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcclxuICAgIH1cclxuXHJcbiAgICBfZXJyb3IobWVzc2FnZSkge1xyXG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ1xceDFiWzMxbSVzXFx4MWJbMG0nLCBcIkVycm9yIHdoaWxlIHBhcnNpbmc6IFwiICsgbWVzc2FnZSk7XHJcbiAgICB9XHJcblxyXG4gICAgX3dhcm5pbmcobWVzc2FnZSkge1xyXG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ1xceDFiWzM3bSVzXFx4MWJbMG0nLCBcIldhcm5pbmcgOiBcIiArIG1lc3NhZ2UpO1xyXG4gICAgfVxyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IHtcclxuICAgIFBhcnNlclxyXG59IiwiY29uc3QgeyBQYXJzZXIgfSA9IHJlcXVpcmUoXCIuL3BhcnNlci5qc1wiKTtcclxuXHJcbmNsYXNzIFJ1bGVQYXJzZXIgZXh0ZW5kcyBQYXJzZXIge1xyXG4gICAgY29uc3RydWN0b3IoKSB7XHJcbiAgICAgICAgc3VwZXIoKTtcclxuICAgICAgICB0aGlzLl9hdHRyaWJ1dGUgPSBcIlwiO1xyXG4gICAgICAgIHRoaXMuX3J1bGVUZXJtaW5hbHMgPSBbXCJcXG5cIiwgXCI7XCJdO1xyXG4gICAgICAgIHRoaXMuX3JnYmFUZXJtaW5hbHMgPSBbJywnLCAnKSddO1xyXG4gICAgICAgIHRoaXMuX2NvbG9ySW5pdGlhbHMgPSBbJyMnLCAnMCcsICcoJ107XHJcbiAgICAgICAgdGhpcy5faW50ZXJwb2xhdGlvbkVudW1zID0ge1xyXG4gICAgICAgICAgICAnbGluJzogaW50ZXJwb2xhdGlvblR5cGUubGluZWFyLFxyXG4gICAgICAgICAgICAnbGluZWFyJzogaW50ZXJwb2xhdGlvblR5cGUubGluZWFyXHJcbiAgICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICBwYXJzZVJ1bGUoYXR0cmlidXRlLCBydWxlKSB7XHJcbiAgICAgICAgdGhpcy5fY3VySWR4ID0gMDtcclxuICAgICAgICB0aGlzLl9hdHRyaWJ1dGUgPSBhdHRyaWJ1dGU7XHJcbiAgICAgICAgdGhpcy5fbGl0ZXJhbCA9IHJ1bGU7XHJcbiAgICAgICAgdmFyIHJlc3VsdCA9IHVuZGVmaW5lZDtcclxuXHJcbiAgICAgICAgLy8gdHJ5IHBhcnNpbmcgaW50ZXJwb2xhdGlvbiwgY29sb3Igb3IgZW51bSBcclxuICAgICAgICByZXN1bHQgPSB0aGlzLl9wYXJzZUNvbG9yKCk7XHJcblxyXG4gICAgICAgIGlmIChyZXN1bHQgIT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBuZXcgU2ltcGxlUnVsZSh0aGlzLl9hdHRyaWJ1dGUsIHZhbHVlVHlwZS5jb2xvciwgcmVzdWx0KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIFJlc2V0IHBhcnNlciBhbmQgdHJ5IHBhcnNpbmcgaW50ZXJwb2xhdGlvbiBydWxlXHJcbiAgICAgICAgdGhpcy5fY3VySWR4ID0gMDtcclxuXHJcbiAgICAgICAgdmFyIHR5cGUgPSB0aGlzLl9nZXRTdHJpbmdVbnRpbCgnKCcpO1xyXG5cclxuICAgICAgICB0eXBlID0gdGhpcy5faW50ZXJwb2xhdGlvbkVudW1zW3R5cGVdO1xyXG5cclxuICAgICAgICBpZiAodHlwZSA9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgcmV0dXJuIG5ldyBTaW1wbGVSdWxlKHRoaXMuX2F0dHJpYnV0ZSwgdmFsdWVUeXBlLnN0cmluZywgdGhpcy5fbGl0ZXJhbCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRoaXMuX25leHRDaGFyKCk7XHJcblxyXG4gICAgICAgIHJlc3VsdCA9IHRoaXMuX3BhcnNlSW50ZXJwb2xhdGlvbih0eXBlKTtcclxuXHJcbiAgICAgICAgaWYgKHJlc3VsdCA9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgLy9taWdodCBiZSBvZiB0eXBlIG51bWJlciFcclxuICAgICAgICAgICAgcmV0dXJuIG5ldyBTaW1wbGVSdWxlKHRoaXMuX2F0dHJpYnV0ZSwgdmFsdWVUeXBlLnN0cmluZywgdGhpcy5fbGl0ZXJhbCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gcmVzdWx0O1xyXG4gICAgfVxyXG5cclxuICAgIF9wYXJzZUludGVycG9sYXRpb24odHlwZSkge1xyXG4gICAgICAgIHZhciB2YWxpZCA9IHRydWU7XHJcbiAgICAgICAgdmFyIHByb3BlcnR5O1xyXG4gICAgICAgIHZhciB2VHlwZTtcclxuICAgICAgICB2YXIgeCA9IFtdO1xyXG4gICAgICAgIHZhciB5ID0gW107XHJcblxyXG4gICAgICAgIHdoaWxlICh0aGlzLl9jdXJDaGFyKCkgIT0gJyknKSB7XHJcbiAgICAgICAgICAgIHgucHVzaChwYXJzZUludCh0aGlzLl9nZXRTdHJpbmdVbnRpbCgnPScpKSk7XHJcbiAgICAgICAgICAgIHRoaXMuX25leHRDaGFyKCk7XHJcblxyXG4gICAgICAgICAgICB2YXIgdHlwZUNoZWNrID0gdlR5cGU7XHJcblxyXG4gICAgICAgICAgICBpZiAodGhpcy5fY29sb3JJbml0aWFscy5pbmNsdWRlcyh0aGlzLl9jdXJDaGFyKCkpKSB7XHJcbiAgICAgICAgICAgICAgICB5LnB1c2godGhpcy5fcGFyc2VDb2xvcigpKTtcclxuICAgICAgICAgICAgICAgIHZUeXBlID0gdmFsdWVUeXBlLmNvbG9yO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgeS5wdXNoKHBhcnNlSW50KHRoaXMuX2dldFN0cmluZ1VudGlsKFsnLCcsICcpJ10pKSk7XHJcbiAgICAgICAgICAgICAgICB2VHlwZSA9IHZhbHVlVHlwZS5udW1iZXI7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmICh0eXBlQ2hlY2sgIT0gdW5kZWZpbmVkICYmIHR5cGVDaGVjayAhPSB2VHlwZSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5fZXJyb3IoXCJUeXBlIG9mIHZhbHVlcyBkb2Vzbid0IG1hdGNoLlwiKTtcclxuICAgICAgICAgICAgICAgIHZhbGlkID0gZmFsc2U7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmICh0aGlzLl9jdXJDaGFyKCkgPT0gJywnKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLl9uZXh0Q2hhcigpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAodGhpcy5fY3VySWR4ID49IHRoaXMuX2xpdGVyYWwubGVuZ3RoIC0gMSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5fZXJyb3IoXCJVbmV4cGVjdGVkIGVuZCBvZiBydWxlLlwiKTtcclxuICAgICAgICAgICAgICAgIHZhbGlkID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5fbmV4dENoYXIoKTtcclxuXHJcbiAgICAgICAgdmFyIGtleVdvcmQgPSB0aGlzLl9nZXRTdHJpbmdVbnRpbCgnKCcpO1xyXG5cclxuICAgICAgICBpZiAoa2V5V29yZC5sb2NhbGVDb21wYXJlKFwiLnVzaW5nXCIpID09IDApIHtcclxuICAgICAgICAgICAgdGhpcy5fbmV4dENoYXIoKTtcclxuICAgICAgICAgICAgcHJvcGVydHkgPSB0aGlzLl9nZXRTdHJpbmdVbnRpbCgnKScpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHRoaXMuX2Vycm9yKFwiQ291bGRuJ3QgZmluZCAndXNpbmcnIGRpcmVjdGl2ZS5cIik7XHJcbiAgICAgICAgICAgIHZhbGlkID0gZmFsc2U7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAodGhpcy5fY3VyQ2hhcigpICE9ICcpJykge1xyXG4gICAgICAgICAgICB0aGlzLl9lcnJvcihcIlVuZXhwZWN0ZWQgZW5kIG9mIHJ1bGUsIGV4cGVjdGVkICcpJy5cIik7XHJcbiAgICAgICAgICAgIHZhbGlkID0gZmFsc2U7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoeC5sZW5ndGggIT0geS5sZW5ndGgpIHtcclxuICAgICAgICAgICAgdGhpcy5fZXJyb3IoXCJOdW1iZXIgb2YgY29udHJvbCBwb2ludHMgYW5kIHZhbHVlcyBpcyBkaWZmZXJlbnQuXCIpO1xyXG4gICAgICAgICAgICB2YWxpZCA9IGZhbHNlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHZUeXBlID09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICB0aGlzLl9lcnJvcihcIlVua25vd24gTnVtYmVyIG9yIENvbG9yIFR5cGUgZm91bmQuXCIpO1xyXG4gICAgICAgICAgICB2YWxpZCA9IGZhbHNlO1xyXG4gICAgICAgIH1cclxuICAgICAgICBcclxuICAgICAgICByZXR1cm4gbmV3IEludGVycG9sYXRlZFJ1bGUodGhpcy5fYXR0cmlidXRlLCBwcm9wZXJ0eSwgdHlwZSwgdlR5cGUsIHgsIHksIHZhbGlkKTtcclxuICAgIH1cclxuXHJcbiAgICBfcGFyc2VDb2xvcigpIHtcclxuICAgICAgICBpZiAodGhpcy5fY3VyQ2hhcigpID09ICcjJykge1xyXG4gICAgICAgICAgICB0aGlzLl9uZXh0Q2hhcigpO1xyXG4gICAgICAgICAgICByZXR1cm4gcGFyc2VJbnQodGhpcy5fZ2V0U3RyaW5nVW50aWwodGhpcy5fcnVsZVRlcm1pbmFscyksIDE2KTtcclxuICAgICAgICB9IGVsc2UgaWYgKHRoaXMuX2N1ckNoYXIoKSA9PSAnMCcpIHtcclxuICAgICAgICAgICAgdGhpcy5fbmV4dENoYXIoKTtcclxuICAgICAgICAgICAgaWYgKHRoaXMuX2N1ckNoYXIoKSA9PSAneCcpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuX25leHRDaGFyKCk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gcGFyc2VJbnQodGhpcy5fZ2V0U3RyaW5nVW50aWwodGhpcy5fcnVsZVRlcm1pbmFscyksIDE2KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy5fY3VyQ2hhcigpID09ICcoJykge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fZ2V0UkdCQSgpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcclxuICAgIH1cclxuXHJcbiAgICBfZ2V0UkdCQSgpIHtcclxuICAgICAgICB2YXIgciA9IHBhcnNlSW50KHRoaXMuX2dldFN0cmluZ1VudGlsKHRoaXMuX3JnYmFUZXJtaW5hbHMpKTtcclxuXHJcbiAgICAgICAgaWYgKHRoaXMuX2N1ckNoYXIoKSAhPSAnLCcpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuaGV4VmFsdWUociwgMCwgMCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRoaXMuX25leHRDaGFyKCk7XHJcblxyXG4gICAgICAgIHZhciBnID0gcGFyc2VJbnQodGhpcy5fZ2V0U3RyaW5nVW50aWwodGhpcy5fcmdiYVRlcm1pbmFscykpO1xyXG5cclxuICAgICAgICBpZiAodGhpcy5fY3VyQ2hhcigpICE9ICcsJykge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5oZXhWYWx1ZShyLCBnLCAwKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgdGhpcy5fbmV4dENoYXIoKTtcclxuXHJcbiAgICAgICAgdmFyIGIgPSBwYXJzZUludCh0aGlzLl9nZXRTdHJpbmdVbnRpbCh0aGlzLl9yZ2JhVGVybWluYWxzKSk7XHJcblxyXG4gICAgICAgIGlmICh0aGlzLl9jdXJDaGFyKCkgIT0gJywnKSB7XHJcbiAgICAgICAgICAgIHRoaXMuX25leHRDaGFyKCk7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmhleFZhbHVlKHIsIGcsIGIpO1xyXG4gICAgICAgIH1cclxuICAgICAgICB0aGlzLl9uZXh0Q2hhcigpO1xyXG5cclxuICAgICAgICB2YXIgYSA9IHBhcnNlSW50KHRoaXMuX2dldFN0cmluZ1VudGlsKHRoaXMuX3JnYmFUZXJtaW5hbHMpKTtcclxuXHJcbiAgICAgICAgaWYgKHRoaXMuX2N1ckNoYXIoKSAhPSAnKScpIHtcclxuICAgICAgICAgICAgdGhpcy5fZXJyb3IoXCJFeHBlY3RlZCBjbG9zaW5nICcpJy5cIilcclxuICAgICAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcclxuICAgICAgICB9XHJcbiAgICAgICAgdGhpcy5fbmV4dENoYXIoKTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHRoaXMuaGV4VmFsdWUociwgZywgYiwgYSk7XHJcbiAgICB9XHJcblxyXG4gICAgaGV4VmFsdWUociwgZywgYiwgYSA9IDI1NSkge1xyXG4gICAgICAgIHJldHVybiAociA8PCAyNCkgfCAoZyA8PCAxNikgfCAoYiA+PiA4KSB8IGE7XHJcbiAgICB9XHJcblxyXG4gICAgaGV4U3RyaW5nKHIsIGcsIGIsIGEgPSAyNTUpIHtcclxuICAgICAgICByID0gci50b1N0cmluZygxNik7XHJcbiAgICAgICAgZyA9IGcudG9TdHJpbmcoMTYpO1xyXG4gICAgICAgIGIgPSBiLnRvU3RyaW5nKDE2KTtcclxuICAgICAgICBhID0gYS50b1N0cmluZygxNik7XHJcblxyXG4gICAgICAgIGlmIChyLmxlbmd0aCA9PSAxKVxyXG4gICAgICAgICAgICByID0gXCIwXCIgKyByO1xyXG4gICAgICAgIGlmIChnLmxlbmd0aCA9PSAxKVxyXG4gICAgICAgICAgICBnID0gXCIwXCIgKyBnO1xyXG4gICAgICAgIGlmIChiLmxlbmd0aCA9PSAxKVxyXG4gICAgICAgICAgICBiID0gXCIwXCIgKyBiO1xyXG4gICAgICAgIGlmIChhLmxlbmd0aCA9PSAxKVxyXG4gICAgICAgICAgICBhID0gXCIwXCIgKyBhO1xyXG5cclxuICAgICAgICByZXR1cm4gXCIjXCIgKyByICsgZyArIGIgKyBhO1xyXG4gICAgfVxyXG59XHJcblxyXG52YXIgdmFsdWVUeXBlID0gT2JqZWN0LmZyZWV6ZSh7IFwic3RyaW5nXCI6IDEsIFwibnVtYmVyXCI6IDIsIFwiY29sb3JcIjogMywgXCJlbnVtXCI6IDQgfSk7XHJcblxyXG5jbGFzcyBTaW1wbGVSdWxlIHtcclxuICAgIGNvbnN0cnVjdG9yKGF0dHJpYnV0ZSwgYXR0cmlidXRlVHlwZSwgdmFsdWUpIHtcclxuICAgICAgICB0aGlzLl9hdHRyaWJ1dGUgPSBhdHRyaWJ1dGU7XHJcbiAgICAgICAgdGhpcy5fdmFsdWVUeXBlID0gYXR0cmlidXRlVHlwZTtcclxuICAgICAgICB0aGlzLl92YWx1ZSA9IHZhbHVlO1xyXG4gICAgICAgIHRoaXMuX3ZhbGlkID0gdHJ1ZTtcclxuICAgIH1cclxuXHJcbiAgICBhcHBseShvYmosIHN0eSkge1xyXG4gICAgICAgIHN0eVt0aGlzLl9hdHRyaWJ1dGVdID0gdGhpcy5fdmFsdWU7XHJcbiAgICB9XHJcbn1cclxuXHJcbnZhciBpbnRlcnBvbGF0aW9uVHlwZSA9IE9iamVjdC5mcmVlemUoeyBcImxpbmVhclwiOiAxIH0pO1xyXG5cclxuY2xhc3MgSW50ZXJwb2xhdGVkUnVsZSB7XHJcbiAgICBjb25zdHJ1Y3RvcihhdHRyaWJ1dGUsIHByb3BlcnR5LCBpbnRlcnBvbFR5cGUsIHZhbHVlVHlwZSwgY29udHJvbFBvaW50cywgYXR0cmlidXRlVmFsdWVzLCB2YWxpZCkge1xyXG4gICAgICAgIHRoaXMuX3R5cGUgPSBpbnRlcnBvbFR5cGU7XHJcbiAgICAgICAgdGhpcy5fcHJvcGVydHkgPSBwcm9wZXJ0eTtcclxuICAgICAgICB0aGlzLl9hdHRyaWJ1dGUgPSBhdHRyaWJ1dGU7XHJcbiAgICAgICAgdGhpcy5fdmFsdWVUeXBlID0gdmFsdWVUeXBlO1xyXG4gICAgICAgIHRoaXMuX2NvbnRyb2xQb2ludHMgPSBjb250cm9sUG9pbnRzO1xyXG4gICAgICAgIHRoaXMuX2F0dHJpYnV0ZVZhbHVlcyA9IGF0dHJpYnV0ZVZhbHVlcztcclxuICAgICAgICB0aGlzLl92YWxpZCA9IHRydWU7IC8vVE9ETzogRklYIGFmdGVyIGRlYnVnZ2luZ1xyXG4gICAgfVxyXG5cclxuICAgIGFwcGx5KG9iaiwgc3R5KSB7XHJcbiAgICAgICAgaWYgKHRoaXMuX3R5cGUgPT0gaW50ZXJwb2xhdGlvblR5cGUubGluZWFyKSB7XHJcbiAgICAgICAgICAgIHN0eVt0aGlzLl9hdHRyaWJ1dGVdID0gdGhpcy5fbGluKG9ialt0aGlzLl9wcm9wZXJ0eV0pO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBfbGluKGFjdHVhbFZhbHVlKSB7XHJcbiAgICAgICAgLy8gZmluZCByYW5nZSB0aGUgdmFsdWUgaXMgaW5zaWRlIG9mIGFuZCBpbnRlcnBvbGF0ZSBpbnNpZGUgaXRcclxuICAgICAgICAvLyBhc3N1bWVzIGFzY2VuZGluZyBvcmRlciBcclxuICAgICAgICB2YXIgaW5kZXggPSB0aGlzLl9maW5kSW5kZXgoYWN0dWFsVmFsdWUpO1xyXG5cclxuICAgICAgICAvL1NtYWxsZXIgdGhhbiBhbGwgY29udHJvbCBwb2ludHNcclxuICAgICAgICBpZihpbmRleCA9PSAtMSl7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9hdHRyaWJ1dGVWYWx1ZXNbMF07XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvL0JpZ2dlciB0aGFuIGFsbCBjb250cm9sIHBvaW50c1xyXG4gICAgICAgIGlmKGluZGV4ID09IHRoaXMuX2NvbnRyb2xQb2ludHMubGVuZ3RoLTEpe1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fYXR0cmlidXRlVmFsdWVzW3RoaXMuX2F0dHJpYnV0ZVZhbHVlcy5sZW5ndGgtMV07XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAodGhpcy5fdmFsdWVUeXBlID09IHZhbHVlVHlwZS5jb2xvcikge1xyXG4gICAgICAgICAgICAvLyBpbnRlcnBvbGF0ZSByZ2JhIHZhbHVlc1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fbGluZWFyQ29sb3JJbnRlcnBvbGF0aW9uKGluZGV4LCBhY3R1YWxWYWx1ZSk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgLy8gbm9ybWFsIGludGVycG9sYXRpb24gb2YgbnVtYmVyXHJcblxyXG4gICAgICAgICAgICAvL2luc2lkZSByYW5nZSBpbmRleCAmIGluZGV4ICsgMVxyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fbGluZWFySW50ZXJwb2xhdGlvbihhY3R1YWxWYWx1ZSwgdGhpcy5fY29udHJvbFBvaW50c1tpbmRleF0sIHRoaXMuX2F0dHJpYnV0ZVZhbHVlc1tpbmRleF0sIHRoaXMuX2NvbnRyb2xQb2ludHNbaW5kZXgrMV0sIHRoaXMuX2F0dHJpYnV0ZVZhbHVlc1tpbmRleCsxXSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIF9maW5kSW5kZXgoeCkge1xyXG4gICAgICAgIHZhciBpZHggPSAtMTtcclxuXHJcbiAgICAgICAgd2hpbGUgKGlkeCA8IHRoaXMuX2NvbnRyb2xQb2ludHMubGVuZ3RoICYmIHRoaXMuX2NvbnRyb2xQb2ludHNbaWR4KzFdIDwgeCkge1xyXG4gICAgICAgICAgICBpZHgrKztcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBpZHg7XHJcbiAgICB9XHJcblxyXG4gICAgX2xpbmVhckNvbG9ySW50ZXJwb2xhdGlvbihhY3R1YWxWYWx1ZSwgaWR4KSB7XHJcbiAgICAgICAgdmFyIHkwID0gdGhpcy5fYXR0cmlidXRlVmFsdWVzW2lkeF07XHJcbiAgICAgICAgdmFyIHkxID0gdGhpcy5fYXR0cmlidXRlVmFsdWVzW2lkeCsxXTtcclxuXHJcbiAgICAgICAgdmFyIHJlc3VsdCA9IDA7XHJcbiAgICAgICAgdmFyIG1hc2sgPSAweDAwMDAwMEZGOyAvLyBhbHBoYSBtYXNrXHJcblxyXG4gICAgICAgIC8vZm9yIGVhY2ggY2hhbm5lbCBpbnRlcnBvbGF0ZSB0aGUgdmFsdWUgc2VwZXJhdGVseVxyXG4gICAgICAgIGZvcih2YXIgaSA9IDA7IGkgPCA0OyBpKyspe1xyXG4gICAgICAgICAgICB2YXIgeTBDaGFubmVsID0gKHkwICYgbWFzaykgPj4+IGkqODtcclxuICAgICAgICAgICAgdmFyIHkxQ2hhbm5lbCA9ICh5MSAmIG1hc2spID4+PiBpKjg7XHJcblxyXG4gICAgICAgICAgICByZXN1bHQgfD0gdGhpcy5fbGluZWFySW50ZXJwb2xhdGlvbihhY3R1YWxWYWx1ZSwgdGhpcy5fY29udHJvbFBvaW50c1tpZHhdLCB5MENoYW5uZWwsIHRoaXMuX2NvbnRyb2xQb2ludHNbaWR4KzFdLCB5MUNoYW5uZWwpIDw8IGkqOFxyXG5cclxuICAgICAgICAgICAgbWFzayA9IG1hc2sgPDwgODtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiByZXN1bHQ7XHJcbiAgICB9XHJcblxyXG4gICAgX2xpbmVhckludGVycG9sYXRpb24oeCwgeDAsIHkwLCB4MSwgeTEpe1xyXG4gICAgICAgIHZhciBhID0gKHkxIC0geTApIC8gKHgxIC0geDApXHJcbiAgICAgICAgdmFyIGIgPSAtYSAqIHgwICsgeTBcclxuICAgICAgICByZXR1cm4gYSAqIHggKyBiXHJcbiAgICB9XHJcblxyXG4gICAgX2lzSW5SYW5nZSh2YWx1ZSwgbG93ZXIsIHVwcGVyKSB7XHJcbiAgICAgICAgaWYgKHZhbHVlIDwgbG93ZXIpIHtcclxuICAgICAgICAgICAgcmV0dXJuIC0xO1xyXG4gICAgICAgIH0gZWxzZSBpZiAodmFsdWUgPiB1cHBlcikge1xyXG4gICAgICAgICAgICByZXR1cm4gMTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiAwO1xyXG4gICAgfVxyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IHtcclxuICAgIFJ1bGVQYXJzZXJcclxufSIsImNvbnN0IHtQYXJzZXJ9ID0gcmVxdWlyZShcIi4vcGFyc2VyLmpzXCIpO1xyXG5jb25zdCB7ZXhwbG9yZXJFdmVudCwgRXZlbnRTdGF0ZX0gPSByZXF1aXJlKFwiLi9ldmVudHMuanNcIik7XHJcblxyXG5jbGFzcyBTZWxlY3RvclBhcnNlciBleHRlbmRzIFBhcnNlciB7XHJcbiAgICBjb25zdHJ1Y3RvcigpIHtcclxuICAgICAgICBzdXBlcigpO1xyXG4gICAgfVxyXG5cclxuICAgIHBhcnNlU2VsZWN0b3Ioc3RyaW5nLCBpZHgpIHtcclxuICAgICAgICB0aGlzLl9jdXJJZHggPSAwO1xyXG4gICAgICAgIHRoaXMuX2xpdGVyYWwgPSBzdHJpbmc7XHJcbiAgICAgICAgdGhpcy5fYmxvY2sgPSBpZHg7XHJcblxyXG4gICAgICAgIHZhciBsaXN0ID0gW107XHJcblxyXG4gICAgICAgIGRvIHtcclxuICAgICAgICAgICAgdmFyIGV4cCA9IHRoaXMuX3BhcnNlRXhwcmVzc2lvbigpO1xyXG5cclxuICAgICAgICAgICAgaWYgKGV4cC52YWxpZCkge1xyXG4gICAgICAgICAgICAgICAgbGlzdC5wdXNoKGV4cCk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICB9IHdoaWxlICh0aGlzLl9jdXJDaGFyKCkgPT0gJywnICYmIHRoaXMuX25leHRDaGFyKCkpXHJcbiAgICAgICAgdmFyIHNlbCA9IG5ldyBTZWxlY3RvcihsaXN0KTtcclxuXHJcbiAgICAgICAgaWYgKGxpc3QubGVuZ3RoID09IDApIHtcclxuICAgICAgICAgICAgc2VsLnZhbGlkID0gZmFsc2U7XHJcbiAgICAgICAgICAgIHRoaXMuX2Vycm9yKFwiQmxvY2sgXCIgKyAodGhpcy5fYmxvY2sgKyAxKSArIFwiIGhhcyBiZWVuIHNraXBwZWQsIGJlY2F1c2UgdGhlcmUgd2FzIG5vIHZhbGlkIHNlbGVjdG9yLlwiKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBuZXcgU2VsZWN0b3IobGlzdCk7XHJcbiAgICB9XHJcblxyXG4gICAgX3BhcnNlRXhwcmVzc2lvbigpIHtcclxuXHJcbiAgICAgICAgdmFyIGxlZnRNb3N0ID0gdGhpcy5fcGFyc2VMZWZ0TW9zdCgpO1xyXG5cclxuICAgICAgICBpZiAoIWxlZnRNb3N0LnZhbGlkKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBsZWZ0TW9zdDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICh0aGlzLl9jdXJDaGFyKCkgPT0gXCI+XCIgfHwgdGhpcy5fY3VyQ2hhcigpID09IFwiPFwiKSB7XHJcbiAgICAgICAgICAgIHZhciBjaGFpbiA9IHRoaXMuX2N1ckNoYXIoKTtcclxuICAgICAgICAgICAgdGhpcy5fbmV4dENoYXIoKTtcclxuICAgICAgICAgICAgdmFyIHJpZ2h0U2lkZSA9IHRoaXMuX3BhcnNlUmlnaHRTaWRlKGxlZnRNb3N0KTtcclxuICAgICAgICAgICAgcmlnaHRTaWRlLmNoYWluT3AgPSBjaGFpbjtcclxuICAgICAgICAgICAgbGVmdE1vc3QucmlnaHRTaWRlID0gcmlnaHRTaWRlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIGxlZnRNb3N0O1xyXG4gICAgfVxyXG5cclxuICAgIF9wYXJzZUxlZnRNb3N0KCkge1xyXG4gICAgICAgIHZhciBsZWZ0TW9zdCA9IG5ldyBTZWxlY3RvckV4cHJlc3Npb24oKTtcclxuXHJcbiAgICAgICAgdGhpcy5fcGFyc2VUeXBlKGxlZnRNb3N0KTtcclxuXHJcbiAgICAgICAgaWYgKHRoaXMuX2N1ckNoYXIoKSA9PSBcIltcIikge1xyXG4gICAgICAgICAgICB0aGlzLl9uZXh0Q2hhcigpO1xyXG4gICAgICAgICAgICB0aGlzLl9wYXJzZUF0dHJpYnV0ZUJsb2NrKGxlZnRNb3N0KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICghbGVmdE1vc3QudmFsaWQpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGxlZnRNb3N0O1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5fcGFyc2VFeHRlbnNpb25zKGxlZnRNb3N0KTtcclxuXHJcbiAgICAgICAgcmV0dXJuIGxlZnRNb3N0O1xyXG4gICAgfVxyXG5cclxuICAgIF9wYXJzZVJpZ2h0U2lkZShub2RlKSB7XHJcbiAgICAgICAgdmFyIHJpZ2h0c2lkZSA9IG5ldyBSaWdodFNpZGUoKTtcclxuXHJcbiAgICAgICAgdGhpcy5fcGFyc2VUeXBlKHJpZ2h0c2lkZSk7XHJcblxyXG4gICAgICAgIGlmICghbm9kZS52YWxpZCkge1xyXG4gICAgICAgICAgICByaWdodHNpZGUudmFsaWQgPSBmYWxzZTtcclxuICAgICAgICAgICAgcmV0dXJuIHJpZ2h0c2lkZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHZhciBwYXJhbUZvbGxvdyA9IFsnWycsICcjJywgJzonLCAnLCcsICcuJ107XHJcblxyXG4gICAgICAgIC8vY2hlY2sgaWYgcGFyYW1ldGVyIGV4aXN0c1xyXG4gICAgICAgIGlmICghcGFyYW1Gb2xsb3cuaW5jbHVkZXModGhpcy5fY3VyQ2hhcigpKSAmJiB0aGlzLl9jdXJJZHggPCB0aGlzLl9saXRlcmFsLmxlbmd0aCkge1xyXG4gICAgICAgICAgICByaWdodHNpZGUucGFyYW1ldGVyID0gdGhpcy5fZ2V0U3RyaW5nVW50aWwocGFyYW1Gb2xsb3cpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHJpZ2h0c2lkZS5wYXJhbWV0ZXIgPSAxO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHRoaXMuX2N1ckNoYXIoKSA9PSAnWycpIHtcclxuICAgICAgICAgICAgdGhpcy5fbmV4dENoYXIoKTtcclxuICAgICAgICAgICAgdGhpcy5fcGFyc2VBdHRyaWJ1dGVCbG9jayhyaWdodHNpZGUpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKCFub2RlLnZhbGlkKSB7XHJcbiAgICAgICAgICAgIHJldHVybiByaWdodHNpZGU7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLl9wYXJzZUV4dGVuc2lvbnMocmlnaHRzaWRlKTtcclxuXHJcbiAgICAgICAgaWYgKHRoaXMuX2N1ckNoYXIoKSA9PSAnPicgfHwgdGhpcy5fY3VyQ2hhcigpID09ICc8Jykge1xyXG4gICAgICAgICAgICB2YXIgY2hhaW4gPSB0aGlzLl9jdXJDaGFyKCk7XHJcbiAgICAgICAgICAgIHRoaXMuX25leHRDaGFyKCk7XHJcbiAgICAgICAgICAgIHJpZ2h0c2lkZS5yaWdodFNpZGUgPSB0aGlzLl9wYXJzZVJpZ2h0U2lkZShyaWdodHNpZGUpO1xyXG4gICAgICAgICAgICByaWdodHNpZGUucmlnaHRTaWRlLmNoYWluT3AgPSBjaGFpbjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiByaWdodHNpZGU7XHJcbiAgICB9XHJcblxyXG4gICAgX3BhcnNlQXR0cmlidXRlQmxvY2sobm9kZSkge1xyXG4gICAgICAgIHZhciBmb2xsb3dJZCA9IFsnPScsICd+JywgJyEnLCAnPCcsICc+JywgJ10nLCAnLCddO1xyXG5cclxuICAgICAgICB2YXIgbGlzdCA9IFtdO1xyXG5cclxuICAgICAgICBkbyB7XHJcbiAgICAgICAgICAgIHZhciBpZCA9IHRoaXMuX2dldFN0cmluZ1VudGlsKGZvbGxvd0lkKTtcclxuXHJcbiAgICAgICAgICAgIGlmICh0aGlzLl9jdXJDaGFyKCkgPT0gJywnKSB7XHJcbiAgICAgICAgICAgICAgICBsaXN0LnB1c2gobmV3IEF0dHJpYnV0ZUNoZWNrKGlkLCB1bmRlZmluZWQsIHVuZGVmaW5lZCkpXHJcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodGhpcy5fY3VyQ2hhcigpID09ICddJykge1xyXG4gICAgICAgICAgICAgICAgbGlzdC5wdXNoKG5ldyBBdHRyaWJ1dGVDaGVjayhpZCwgdW5kZWZpbmVkLCB1bmRlZmluZWQpKVxyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodGhpcy5fY3VyQ2hhcigpID09ICc9JyB8fCB0aGlzLl9jdXJDaGFyKCkgPT0gJzwnIHx8IHRoaXMuX2N1ckNoYXIoKSA9PSAnPicpIHtcclxuICAgICAgICAgICAgICAgIHZhciBvcCA9IHRoaXMuX2N1ckNoYXIoKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuX25leHRDaGFyKCk7XHJcblxyXG4gICAgICAgICAgICAgICAgbGlzdC5wdXNoKG5ldyBBdHRyaWJ1dGVDaGVjayhpZCwgb3AsIHRoaXMuX2dldFN0cmluZ1VudGlsKFsnLCcsICddJ10pKSk7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuX2N1ckNoYXIoKSA9PSAnXScpIHtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSBlbHNlIGlmICh0aGlzLl9jdXJDaGFyKCkgPT0gJ34nIHx8IHRoaXMuX2N1ckNoYXIoKSA9PSAnIScpIHtcclxuICAgICAgICAgICAgICAgIHZhciBvcCA9IHRoaXMuX2N1ckNoYXIoKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuX25leHRDaGFyKCk7XHJcbiAgICAgICAgICAgICAgICBvcCArPSB0aGlzLl9jdXJDaGFyKCk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLl9uZXh0Q2hhcigpO1xyXG5cclxuICAgICAgICAgICAgICAgIGxpc3QucHVzaChuZXcgQXR0cmlidXRlQ2hlY2soaWQsIG9wLCB0aGlzLl9nZXRTdHJpbmdVbnRpbChbJywnLCAnXSddKSkpO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLl9jdXJDaGFyKCkgPT0gJ10nKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICB9IHdoaWxlICh0aGlzLl9uZXh0Q2hhcigpICYmIHRoaXMuX2N1ckNoYXIoKSAhPSAnXScpXHJcblxyXG4gICAgICAgIG5vZGUuYXR0ckNoZWNrbGlzdCA9IGxpc3Q7XHJcblxyXG4gICAgICAgIGlmICh0aGlzLl9jdXJDaGFyKCkgIT0gJ10nKSB7XHJcbiAgICAgICAgICAgIG5vZGUudmFsaWQgPSBmYWxzZTtcclxuICAgICAgICAgICAgdGhpcy5fZXJyb3IoXCJCbG9jayBcIiArICh0aGlzLl9ibG9jayArIDEpICsgXCIgaGFzIGJlZW4gc2tpcHBlZCwgYmVjYXVzZSBvZiBtaXNzaW5nIGJyYWNrZXQuIEV4cGVjdGVkICddJy5cIik7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLl9uZXh0Q2hhcigpO1xyXG4gICAgfVxyXG5cclxuICAgIF9wYXJzZUV4dGVuc2lvbnMobm9kZSkge1xyXG5cclxuICAgICAgICB2YXIgZm9sbG93ID0gWycjJywgJy4nLCAnLCcsICc6JywgJz4nLCAnPCddO1xyXG4gICAgICAgIHZhciBoYXNJZCA9IGZhbHNlO1xyXG5cclxuICAgICAgICB3aGlsZSAoWycjJywgJy4nLCAnOiddLmluY2x1ZGVzKHRoaXMuX2N1ckNoYXIoKSkpIHtcclxuXHJcbiAgICAgICAgICAgIGlmICh0aGlzLl9jdXJDaGFyKCkgPT0gJyMnKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLl9uZXh0Q2hhcigpO1xyXG4gICAgICAgICAgICAgICAgaWYgKCFoYXNJZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIG5vZGUuYXR0ckNoZWNrbGlzdC5wdXNoKG5ldyBBdHRyaWJ1dGVDaGVjaygnaWQnLCAnPScsIHRoaXMuX2dldFN0cmluZ1VudGlsKGZvbGxvdykpKTtcclxuICAgICAgICAgICAgICAgICAgICBoYXNJZCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX2dldFN0cmluZ1VudGlsKGZvbGxvdyk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fd2FybmluZyhcIk11bHRpcGxlIElkcyBhcmUgbm90IHN1cHBvcnRlZCwgb25seSB0aGUgZmlyc3Qgb25lIHdpbGwgYmUgdXNlZC5cIik7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSBpZiAodGhpcy5fY3VyQ2hhcigpID09ICcuJykge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5fbmV4dENoYXIoKTtcclxuICAgICAgICAgICAgICAgIG5vZGUuYXR0ckNoZWNrbGlzdC5wdXNoKG5ldyBBdHRyaWJ1dGVDaGVjaygndGFncycsICd+PScsIHRoaXMuX2dldFN0cmluZ1VudGlsKGZvbGxvdykpKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuX25leHRDaGFyKCk7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYobm9kZS5ldmVudFN0YXRlID09IHVuZGVmaW5lZCl7XHJcbiAgICAgICAgICAgICAgICAgICAgbm9kZVtcImV2ZW50U3RhdGVcIl0gPSBuZXcgRXZlbnRTdGF0ZSgpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIHZhciBldmVudCA9IHRoaXMuX2dldFN0cmluZ1VudGlsKGZvbGxvdyk7XHJcbiAgICAgICAgICAgICAgICBpZighZXhwbG9yZXJFdmVudC5oYXNPd25Qcm9wZXJ0eShldmVudCkpe1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX3dhcm5pbmcoXCJJZ25vcmluZyB1bmtub3duIEV2ZW50ICdcIitldmVudCtcIicuXCIpO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBub2RlLmV2ZW50U3RhdGUuc2V0KGV4cGxvcmVyRXZlbnRbZXZlbnRdKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKCFbJz4nLCAnPCcsICcsJ10uaW5jbHVkZXModGhpcy5fY3VyQ2hhcigpKSAmJiB0aGlzLl9jdXJJZHggPT0gdGhpcy5fbGl0ZXJhbC5sZW5ndGggLSAxKSB7XHJcbiAgICAgICAgICAgIG5vZGUudmFsaWQgPSBmYWxzZTtcclxuICAgICAgICAgICAgdGhpcy5fZXJyb3IoXCJCbG9jayBcIiArICh0aGlzLl9ibG9jayArIDEpICsgXCIgaGFzIGJlZW4gc2tpcHBlZC4gRXhwZWN0ZWQgJz4nLCAnPCcgb3IgJywnLlwiKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgX3BhcnNlVHlwZShub2RlKSB7XHJcbiAgICAgICAgaWYgKHRoaXMuX2N1ckNoYXIoKSA9PSBcImxcIikge1xyXG4gICAgICAgICAgICBub2RlLnR5cGUgPSBcImxcIjtcclxuICAgICAgICB9IGVsc2UgaWYgKHRoaXMuX2N1ckNoYXIoKSA9PSBcImVcIikge1xyXG4gICAgICAgICAgICBub2RlLnR5cGUgPSBcImVcIjtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBub2RlLnZhbGlkID0gZmFsc2U7XHJcbiAgICAgICAgICAgIHRoaXMuX2Vycm9yKFwiQmxvY2sgXCIgKyAodGhpcy5fYmxvY2sgKyAxKSArIFwiIGhhcyBiZWVuIHNraXBwZWQsIGJlY2F1c2Ugb2YgbWlzc2luZyB0eXBlLiBFeHBlY3RlZCAnZScgb3IgJ2wnLlwiKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuX25leHRDaGFyKCk7XHJcbiAgICB9XHJcbn1cclxuXHJcbmNsYXNzIE5vZGUge1xyXG4gICAgY29uc3RydWN0b3IoKSB7XHJcbiAgICAgICAgdGhpcy52YWxpZCA9IHRydWU7XHJcbiAgICB9XHJcbn1cclxuXHJcbmNsYXNzIFNlbGVjdG9yIGV4dGVuZHMgTm9kZSB7XHJcbiAgICBjb25zdHJ1Y3RvcihleHByZXNzaW9ucykge1xyXG4gICAgICAgIHN1cGVyKCk7XHJcbiAgICAgICAgdGhpcy5leHByZXNzaW9ucyA9IGV4cHJlc3Npb25zO1xyXG4gICAgfVxyXG5cclxuICAgIHZhbGlkYXRlT2JqZWN0KG9iail7XHJcbiAgICAgICByZXR1cm4gb2JqLmhhc093blByb3BlcnR5KCdjbGFzcycpO1xyXG4gICAgfVxyXG5cclxuICAgIHRlc3Qob2JqLCBzdHkpe1xyXG5cclxuICAgICAgICBpZighdGhpcy52YWxpZGF0ZU9iamVjdChvYmopKXtcclxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYodGhpcy5leHByZXNzaW9ucy5ldmVyeShleHAgPT4ge3JldHVybiBleHAuZXZlbnRTdGF0ZSAhPSB1bmRlZmluZWQgJiYgc3R5LmV2ZW50U3RhdGUuc3RhdGUgIT0gZXhwLmV2ZW50U3RhdGUuc3RhdGV9KSl7XHJcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiB0aGlzLmV4cHJlc3Npb25zLnNvbWUoZXhwID0+IHtcclxuICAgICAgICAgICAgLy9kaWZmZXJlbnRpYXRlIGJldHdlZW4gbGlua3MgYW5kIGVudGl0aWVzXHJcbiAgICAgICAgICAgIGlmKGV4cC50eXBlICE9IG9iai5jbGFzcyl7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2VcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgcmV0dXJuIGV4cC5hdHRyQ2hlY2tsaXN0LmV2ZXJ5KGF0dHJDaGVjayA9PiB7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYoYXR0ckNoZWNrLmNvbXBhcmF0b3IgPT0gdW5kZWZpbmVkIHx8IGF0dHJDaGVjay52YWx1ZSA9PSB1bmRlZmluZWQpe1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBvYmouaGFzT3duUHJvcGVydHkoYXR0ckNoZWNrLmlkKTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYoIW9iai5oYXNPd25Qcm9wZXJ0eShhdHRyQ2hlY2suaWQpKXtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgc3dpdGNoKGF0dHJDaGVjay5jb21wYXJhdG9yKXtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSAnPScgOiBcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAob2JqW2F0dHJDaGVjay5pZF0gPT0gYXR0ckNoZWNrLnZhbHVlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSAnIT0nOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIChvYmpbYXR0ckNoZWNrLmlkXSAhPSBhdHRyQ2hlY2sudmFsdWUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjYXNlICd+PSc6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gKG9ialthdHRyQ2hlY2suaWRdLnNwbGl0KFwiIFwiKS5pbmNsdWRlcyhhdHRyQ2hlY2sudmFsdWUpKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSAnPicgOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIChvYmpbYXR0ckNoZWNrLmlkXSA+IGF0dHJDaGVjay52YWx1ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgJzwnIDpcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAob2JqW2F0dHJDaGVjay5pZF0gPCBhdHRyQ2hlY2sudmFsdWUpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIC8vVE9ETzogR3JhcGggVHJhdmVyc2FsIGNoZWNrcywgY29tcGxleCBleHByZXNzaW9ucyBldGMuXHJcbiAgICB9XHJcblxyXG5cclxufVxyXG5cclxuY2xhc3MgU2VsZWN0b3JFeHByZXNzaW9uIGV4dGVuZHMgTm9kZSB7XHJcbiAgICBjb25zdHJ1Y3RvcigpIHtcclxuICAgICAgICBzdXBlcigpO1xyXG4gICAgICAgIHRoaXMudHlwZTtcclxuICAgICAgICB0aGlzLmV2ZW50U3RhdGU7XHJcbiAgICAgICAgdGhpcy5hdHRyQ2hlY2tsaXN0ID0gW107XHJcbiAgICAgICAgdGhpcy5yaWdodFNpZGU7XHJcbiAgICB9XHJcbn1cclxuXHJcbmNsYXNzIFJpZ2h0U2lkZSBleHRlbmRzIFNlbGVjdG9yRXhwcmVzc2lvbiB7XHJcbiAgICBjb25zdHJ1Y3RvcigpIHtcclxuICAgICAgICBzdXBlcigpO1xyXG4gICAgICAgIHRoaXMucGFyYW1ldGVyO1xyXG4gICAgICAgIHRoaXMuY2hhaW5PcDtcclxuICAgIH1cclxufVxyXG5cclxuY2xhc3MgQXR0cmlidXRlQ2hlY2sgZXh0ZW5kcyBOb2RlIHtcclxuICAgIGNvbnN0cnVjdG9yKGlkLCBjb21wYXJhdG9yLCB2YWx1ZSkge1xyXG4gICAgICAgIHN1cGVyKCk7XHJcbiAgICAgICAgdGhpcy5pZCA9IGlkO1xyXG4gICAgICAgIHRoaXMuY29tcGFyYXRvciA9IGNvbXBhcmF0b3I7XHJcbiAgICAgICAgdGhpcy52YWx1ZSA9IHZhbHVlO1xyXG4gICAgfVxyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IHtcclxuICAgIFNlbGVjdG9yUGFyc2VyXHJcbn07Il19
