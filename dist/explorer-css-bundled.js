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
    // className describes the object attribute of the style base, which either contains 'l' for link or 'e' for entity. Defaults to 'class'.
    constructor(config){
        //initialize parser object
        this._parser = new _cssjs.cssjs();

        this._parameters = {
            classProperty: 'class',
            tagListSeparator:' ' 
        };

        //Array of css units {selector = "", rules = [{directive = "", value  = ""} ...]}
        this.rawCSS = [];

        //parsed css blocks ready to be applied to objects
        this.stylings = [];

        Object.assign(this._parameters, config);

        this.selectorConfig = this._parameters;
    }
   

    //file input for the parser as string
    parse(cssString) {
        this.rawCSS = this._parser.parseCSS(cssString);

        let rp = new RuleParser();
        let sp = new SelectorParser(this.selectorConfig);

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
    constructor(configuration) {
        super();
        this._config = configuration;
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
        var sel = new Selector(list, this._config);

        if (list.length == 0) {
            sel.valid = false;
            this._error("Block " + (this._block + 1) + " has been skipped, because there was no valid selector.");
        }

        return sel;
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
// TODO: allow better customization of class location
class Selector extends Node {
    constructor(expressions, config) {
        super();
        this._expressions = expressions;
        this._config = config;
    }

    validateObject(obj){
       return obj.hasOwnProperty(this._config.classProperty);
    }

    test(obj, sty){

        if(!this.validateObject(obj)){
            return false;
        }

        if(this._expressions.every(exp => {return exp.eventState != undefined && sty.eventState.state != exp.eventState.state})){
            return false;
        }

        return this._expressions.some(exp => {
            //differentiate between links and entities
            if(exp.type != obj[this._config.classProperty]){
                return false
            }

            return exp.attrChecklist.every(attrCheck => {

                if(attrCheck.comparator === undefined || attrCheck.value === undefined){
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
                            return (obj[attrCheck.id].split(this._config.tagListSeparator).includes(attrCheck.value));
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

//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvam90Zm9ybS1jc3MuanMvY3NzLmpzIiwic3JjL2V2ZW50cy5qcyIsInNyYy9leHBsb3Jlci1jc3MuanMiLCJzcmMvcGFyc2VyLmpzIiwic3JjL3J1bGUtcGFyc2VyLmpzIiwic3JjL3NlbGVjdG9yLXBhcnNlci5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25xQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1U0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbigpe2Z1bmN0aW9uIHIoZSxuLHQpe2Z1bmN0aW9uIG8oaSxmKXtpZighbltpXSl7aWYoIWVbaV0pe3ZhciBjPVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmU7aWYoIWYmJmMpcmV0dXJuIGMoaSwhMCk7aWYodSlyZXR1cm4gdShpLCEwKTt2YXIgYT1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK2krXCInXCIpO3Rocm93IGEuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixhfXZhciBwPW5baV09e2V4cG9ydHM6e319O2VbaV1bMF0uY2FsbChwLmV4cG9ydHMsZnVuY3Rpb24ocil7dmFyIG49ZVtpXVsxXVtyXTtyZXR1cm4gbyhufHxyKX0scCxwLmV4cG9ydHMscixlLG4sdCl9cmV0dXJuIG5baV0uZXhwb3J0c31mb3IodmFyIHU9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZSxpPTA7aTx0Lmxlbmd0aDtpKyspbyh0W2ldKTtyZXR1cm4gb31yZXR1cm4gcn0pKCkiLCIvKiBqc2hpbnQgdW51c2VkOmZhbHNlICovXG4vKiBnbG9iYWwgd2luZG93LCBjb25zb2xlICovXG4oZnVuY3Rpb24oZ2xvYmFsKSB7XG4gICd1c2Ugc3RyaWN0JztcbiAgdmFyIGZpID0gZnVuY3Rpb24oKSB7XG5cbiAgICB0aGlzLmNzc0ltcG9ydFN0YXRlbWVudHMgPSBbXTtcbiAgICB0aGlzLmNzc0tleWZyYW1lU3RhdGVtZW50cyA9IFtdO1xuXG4gICAgdGhpcy5jc3NSZWdleCA9IG5ldyBSZWdFeHAoJyhbXFxcXHNcXFxcU10qPyl7KFtcXFxcc1xcXFxTXSo/KX0nLCAnZ2knKTtcbiAgICB0aGlzLmNzc01lZGlhUXVlcnlSZWdleCA9ICcoKEBtZWRpYSBbXFxcXHNcXFxcU10qPyl7KFtcXFxcc1xcXFxTXSo/fVxcXFxzKj8pfSknO1xuICAgIHRoaXMuY3NzS2V5ZnJhbWVSZWdleCA9ICcoKEAuKj9rZXlmcmFtZXMgW1xcXFxzXFxcXFNdKj8peyhbXFxcXHNcXFxcU10qP31cXFxccyo/KX0pJztcbiAgICB0aGlzLmNvbWJpbmVkQ1NTUmVnZXggPSAnKChcXFxccyo/KD86XFxcXC9cXFxcKltcXFxcc1xcXFxTXSo/XFxcXCpcXFxcLyk/XFxcXHMqP0BtZWRpYVtcXFxcc1xcXFxTXSo/KXsoW1xcXFxzXFxcXFNdKj8pfVxcXFxzKj99KXwoKFtcXFxcc1xcXFxTXSo/KXsoW1xcXFxzXFxcXFNdKj8pfSknOyAvL3RvIG1hdGNoIGNzcyAmIG1lZGlhIHF1ZXJpZXMgdG9nZXRoZXJcbiAgICB0aGlzLmNzc0NvbW1lbnRzUmVnZXggPSAnKFxcXFwvXFxcXCpbXFxcXHNcXFxcU10qP1xcXFwqXFxcXC8pJztcbiAgICB0aGlzLmNzc0ltcG9ydFN0YXRlbWVudFJlZ2V4ID0gbmV3IFJlZ0V4cCgnQGltcG9ydCAuKj87JywgJ2dpJyk7XG4gIH07XG5cbiAgLypcbiAgICBTdHJpcCBvdXRzIGNzcyBjb21tZW50cyBhbmQgcmV0dXJucyBjbGVhbmVkIGNzcyBzdHJpbmdcblxuICAgIEBwYXJhbSBjc3MsIHRoZSBvcmlnaW5hbCBjc3Mgc3RyaW5nIHRvIGJlIHN0aXBwZWQgb3V0IG9mIGNvbW1lbnRzXG5cbiAgICBAcmV0dXJuIGNsZWFuZWRDU1MgY29udGFpbnMgbm8gY3NzIGNvbW1lbnRzXG4gICovXG4gIGZpLnByb3RvdHlwZS5zdHJpcENvbW1lbnRzID0gZnVuY3Rpb24oY3NzU3RyaW5nKSB7XG4gICAgdmFyIHJlZ2V4ID0gbmV3IFJlZ0V4cCh0aGlzLmNzc0NvbW1lbnRzUmVnZXgsICdnaScpO1xuXG4gICAgcmV0dXJuIGNzc1N0cmluZy5yZXBsYWNlKHJlZ2V4LCAnJyk7XG4gIH07XG5cbiAgLypcbiAgICBQYXJzZXMgZ2l2ZW4gY3NzIHN0cmluZywgYW5kIHJldHVybnMgY3NzIG9iamVjdFxuICAgIGtleXMgYXMgc2VsZWN0b3JzIGFuZCB2YWx1ZXMgYXJlIGNzcyBydWxlc1xuICAgIGVsaW1pbmF0ZXMgYWxsIGNzcyBjb21tZW50cyBiZWZvcmUgcGFyc2luZ1xuXG4gICAgQHBhcmFtIHNvdXJjZSBjc3Mgc3RyaW5nIHRvIGJlIHBhcnNlZFxuXG4gICAgQHJldHVybiBvYmplY3QgY3NzXG4gICovXG4gIGZpLnByb3RvdHlwZS5wYXJzZUNTUyA9IGZ1bmN0aW9uKHNvdXJjZSkge1xuXG4gICAgaWYgKHNvdXJjZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gW107XG4gICAgfVxuXG4gICAgdmFyIGNzcyA9IFtdO1xuICAgIC8vc3RyaXAgb3V0IGNvbW1lbnRzXG4gICAgLy9zb3VyY2UgPSB0aGlzLnN0cmlwQ29tbWVudHMoc291cmNlKTtcblxuICAgIC8vZ2V0IGltcG9ydCBzdGF0ZW1lbnRzXG5cbiAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgdmFyIGltcG9ydHMgPSB0aGlzLmNzc0ltcG9ydFN0YXRlbWVudFJlZ2V4LmV4ZWMoc291cmNlKTtcbiAgICAgIGlmIChpbXBvcnRzICE9PSBudWxsKSB7XG4gICAgICAgIHRoaXMuY3NzSW1wb3J0U3RhdGVtZW50cy5wdXNoKGltcG9ydHNbMF0pO1xuICAgICAgICBjc3MucHVzaCh7XG4gICAgICAgICAgc2VsZWN0b3I6ICdAaW1wb3J0cycsXG4gICAgICAgICAgdHlwZTogJ2ltcG9ydHMnLFxuICAgICAgICAgIHN0eWxlczogaW1wb3J0c1swXVxuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cbiAgICBzb3VyY2UgPSBzb3VyY2UucmVwbGFjZSh0aGlzLmNzc0ltcG9ydFN0YXRlbWVudFJlZ2V4LCAnJyk7XG4gICAgLy9nZXQga2V5ZnJhbWUgc3RhdGVtZW50c1xuICAgIHZhciBrZXlmcmFtZXNSZWdleCA9IG5ldyBSZWdFeHAodGhpcy5jc3NLZXlmcmFtZVJlZ2V4LCAnZ2knKTtcbiAgICB2YXIgYXJyO1xuICAgIHdoaWxlICh0cnVlKSB7XG4gICAgICBhcnIgPSBrZXlmcmFtZXNSZWdleC5leGVjKHNvdXJjZSk7XG4gICAgICBpZiAoYXJyID09PSBudWxsKSB7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgICAgY3NzLnB1c2goe1xuICAgICAgICBzZWxlY3RvcjogJ0BrZXlmcmFtZXMnLFxuICAgICAgICB0eXBlOiAna2V5ZnJhbWVzJyxcbiAgICAgICAgc3R5bGVzOiBhcnJbMF1cbiAgICAgIH0pO1xuICAgIH1cbiAgICBzb3VyY2UgPSBzb3VyY2UucmVwbGFjZShrZXlmcmFtZXNSZWdleCwgJycpO1xuXG4gICAgLy91bmlmaWVkIHJlZ2V4XG4gICAgdmFyIHVuaWZpZWQgPSBuZXcgUmVnRXhwKHRoaXMuY29tYmluZWRDU1NSZWdleCwgJ2dpJyk7XG5cbiAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgYXJyID0gdW5pZmllZC5leGVjKHNvdXJjZSk7XG4gICAgICBpZiAoYXJyID09PSBudWxsKSB7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgICAgdmFyIHNlbGVjdG9yID0gJyc7XG4gICAgICBpZiAoYXJyWzJdID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgc2VsZWN0b3IgPSBhcnJbNV0uc3BsaXQoJ1xcclxcbicpLmpvaW4oJ1xcbicpLnRyaW0oKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHNlbGVjdG9yID0gYXJyWzJdLnNwbGl0KCdcXHJcXG4nKS5qb2luKCdcXG4nKS50cmltKCk7XG4gICAgICB9XG5cbiAgICAgIC8qXG4gICAgICAgIGZldGNoIGNvbW1lbnRzIGFuZCBhc3NvY2lhdGUgaXQgd2l0aCBjdXJyZW50IHNlbGVjdG9yXG4gICAgICAqL1xuICAgICAgdmFyIGNvbW1lbnRzUmVnZXggPSBuZXcgUmVnRXhwKHRoaXMuY3NzQ29tbWVudHNSZWdleCwgJ2dpJyk7XG4gICAgICB2YXIgY29tbWVudHMgPSBjb21tZW50c1JlZ2V4LmV4ZWMoc2VsZWN0b3IpO1xuICAgICAgaWYgKGNvbW1lbnRzICE9PSBudWxsKSB7XG4gICAgICAgIHNlbGVjdG9yID0gc2VsZWN0b3IucmVwbGFjZShjb21tZW50c1JlZ2V4LCAnJykudHJpbSgpO1xuICAgICAgfVxuXG4gICAgICAvLyBOZXZlciBoYXZlIG1vcmUgdGhhbiBhIHNpbmdsZSBsaW5lIGJyZWFrIGluIGEgcm93XG4gICAgICBzZWxlY3RvciA9IHNlbGVjdG9yLnJlcGxhY2UoL1xcbisvLCBcIlxcblwiKTtcblxuICAgICAgLy9kZXRlcm1pbmUgdGhlIHR5cGVcbiAgICAgIGlmIChzZWxlY3Rvci5pbmRleE9mKCdAbWVkaWEnKSAhPT0gLTEpIHtcbiAgICAgICAgLy93ZSBoYXZlIGEgbWVkaWEgcXVlcnlcbiAgICAgICAgdmFyIGNzc09iamVjdCA9IHtcbiAgICAgICAgICBzZWxlY3Rvcjogc2VsZWN0b3IsXG4gICAgICAgICAgdHlwZTogJ21lZGlhJyxcbiAgICAgICAgICBzdWJTdHlsZXM6IHRoaXMucGFyc2VDU1MoYXJyWzNdICsgJ1xcbn0nKSAvL3JlY3Vyc2l2ZWx5IHBhcnNlIG1lZGlhIHF1ZXJ5IGlubmVyIGNzc1xuICAgICAgICB9O1xuICAgICAgICBpZiAoY29tbWVudHMgIT09IG51bGwpIHtcbiAgICAgICAgICBjc3NPYmplY3QuY29tbWVudHMgPSBjb21tZW50c1swXTtcbiAgICAgICAgfVxuICAgICAgICBjc3MucHVzaChjc3NPYmplY3QpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy93ZSBoYXZlIHN0YW5kYXJkIGNzc1xuICAgICAgICB2YXIgcnVsZXMgPSB0aGlzLnBhcnNlUnVsZXMoYXJyWzZdKTtcbiAgICAgICAgdmFyIHN0eWxlID0ge1xuICAgICAgICAgIHNlbGVjdG9yOiBzZWxlY3RvcixcbiAgICAgICAgICBydWxlczogcnVsZXNcbiAgICAgICAgfTtcbiAgICAgICAgaWYgKHNlbGVjdG9yID09PSAnQGZvbnQtZmFjZScpIHtcbiAgICAgICAgICBzdHlsZS50eXBlID0gJ2ZvbnQtZmFjZSc7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGNvbW1lbnRzICE9PSBudWxsKSB7XG4gICAgICAgICAgc3R5bGUuY29tbWVudHMgPSBjb21tZW50c1swXTtcbiAgICAgICAgfVxuICAgICAgICBjc3MucHVzaChzdHlsZSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGNzcztcbiAgfTtcblxuICAvKlxuICAgIHBhcnNlcyBnaXZlbiBzdHJpbmcgY29udGFpbmluZyBjc3MgZGlyZWN0aXZlc1xuICAgIGFuZCByZXR1cm5zIGFuIGFycmF5IG9mIG9iamVjdHMgY29udGFpbmluZyBydWxlTmFtZTpydWxlVmFsdWUgcGFpcnNcblxuICAgIEBwYXJhbSBydWxlcywgY3NzIGRpcmVjdGl2ZSBzdHJpbmcgZXhhbXBsZVxuICAgICAgICBcXG5cXG5jb2xvcjp3aGl0ZTtcXG4gICAgZm9udC1zaXplOjE4cHg7XFxuXG4gICovXG4gIGZpLnByb3RvdHlwZS5wYXJzZVJ1bGVzID0gZnVuY3Rpb24ocnVsZXMpIHtcbiAgICAvL2NvbnZlcnQgYWxsIHdpbmRvd3Mgc3R5bGUgbGluZSBlbmRpbmdzIHRvIHVuaXggc3R5bGUgbGluZSBlbmRpbmdzXG4gICAgcnVsZXMgPSBydWxlcy5zcGxpdCgnXFxyXFxuJykuam9pbignXFxuJyk7XG4gICAgdmFyIHJldCA9IFtdO1xuXG4gICAgcnVsZXMgPSBydWxlcy5zcGxpdCgnOycpO1xuXG4gICAgLy9wcm9jY2VzcyBydWxlcyBsaW5lIGJ5IGxpbmVcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHJ1bGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIgbGluZSA9IHJ1bGVzW2ldO1xuXG4gICAgICAvL2RldGVybWluZSBpZiBsaW5lIGlzIGEgdmFsaWQgY3NzIGRpcmVjdGl2ZSwgaWUgY29sb3I6d2hpdGU7XG4gICAgICBsaW5lID0gbGluZS50cmltKCk7XG4gICAgICBpZiAobGluZS5pbmRleE9mKCc6JykgIT09IC0xKSB7XG4gICAgICAgIC8vbGluZSBjb250YWlucyA6XG4gICAgICAgIGxpbmUgPSBsaW5lLnNwbGl0KCc6Jyk7XG4gICAgICAgIHZhciBjc3NEaXJlY3RpdmUgPSBsaW5lWzBdLnRyaW0oKTtcbiAgICAgICAgdmFyIGNzc1ZhbHVlID0gbGluZS5zbGljZSgxKS5qb2luKCc6JykudHJpbSgpO1xuXG4gICAgICAgIC8vbW9yZSBjaGVja3NcbiAgICAgICAgaWYgKGNzc0RpcmVjdGl2ZS5sZW5ndGggPCAxIHx8IGNzc1ZhbHVlLmxlbmd0aCA8IDEpIHtcbiAgICAgICAgICBjb250aW51ZTsgLy90aGVyZSBpcyBubyBjc3MgZGlyZWN0aXZlIG9yIHZhbHVlIHRoYXQgaXMgb2YgbGVuZ3RoIDEgb3IgMFxuICAgICAgICAgIC8vIFBMQUlOIFdST05HIFdIQVQgQUJPVVQgbWFyZ2luOjA7ID9cbiAgICAgICAgfVxuXG4gICAgICAgIC8vcHVzaCBydWxlXG4gICAgICAgIHJldC5wdXNoKHtcbiAgICAgICAgICBkaXJlY3RpdmU6IGNzc0RpcmVjdGl2ZSxcbiAgICAgICAgICB2YWx1ZTogY3NzVmFsdWVcbiAgICAgICAgfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvL2lmIHRoZXJlIGlzIG5vICc6JywgYnV0IHdoYXQgaWYgaXQgd2FzIG1pcyBzcGxpdHRlZCB2YWx1ZSB3aGljaCBzdGFydHMgd2l0aCBiYXNlNjRcbiAgICAgICAgaWYgKGxpbmUudHJpbSgpLnN1YnN0cigwLCA3KSA9PT0gJ2Jhc2U2NCwnKSB7IC8vaGFjayA6KVxuICAgICAgICAgIHJldFtyZXQubGVuZ3RoIC0gMV0udmFsdWUgKz0gbGluZS50cmltKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy9hZGQgcnVsZSwgZXZlbiBpZiBpdCBpcyBkZWZlY3RpdmVcbiAgICAgICAgICBpZiAobGluZS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICByZXQucHVzaCh7XG4gICAgICAgICAgICAgIGRpcmVjdGl2ZTogJycsXG4gICAgICAgICAgICAgIHZhbHVlOiBsaW5lLFxuICAgICAgICAgICAgICBkZWZlY3RpdmU6IHRydWVcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiByZXQ7IC8vd2UgYXJlIGRvbmUhXG4gIH07XG4gIC8qXG4gICAganVzdCByZXR1cm5zIHRoZSBydWxlIGhhdmluZyBnaXZlbiBkaXJlY3RpdmVcbiAgICBpZiBub3QgZm91bmQgcmV0dXJucyBmYWxzZTtcbiAgKi9cbiAgZmkucHJvdG90eXBlLmZpbmRDb3JyZXNwb25kaW5nUnVsZSA9IGZ1bmN0aW9uKHJ1bGVzLCBkaXJlY3RpdmUsIHZhbHVlKSB7XG4gICAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHZhbHVlID0gZmFsc2U7XG4gICAgfVxuICAgIHZhciByZXQgPSBmYWxzZTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHJ1bGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAocnVsZXNbaV0uZGlyZWN0aXZlID09PSBkaXJlY3RpdmUpIHtcbiAgICAgICAgcmV0ID0gcnVsZXNbaV07XG4gICAgICAgIGlmICh2YWx1ZSA9PT0gcnVsZXNbaV0udmFsdWUpIHtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmV0O1xuICB9O1xuXG4gIC8qXG4gICAgICBGaW5kcyBzdHlsZXMgdGhhdCBoYXZlIGdpdmVuIHNlbGVjdG9yLCBjb21wcmVzcyB0aGVtLFxuICAgICAgYW5kIHJldHVybnMgdGhlbVxuICAqL1xuICBmaS5wcm90b3R5cGUuZmluZEJ5U2VsZWN0b3IgPSBmdW5jdGlvbihjc3NPYmplY3RBcnJheSwgc2VsZWN0b3IsIGNvbnRhaW5zKSB7XG4gICAgaWYgKGNvbnRhaW5zID09PSB1bmRlZmluZWQpIHtcbiAgICAgIGNvbnRhaW5zID0gZmFsc2U7XG4gICAgfVxuXG4gICAgdmFyIGZvdW5kID0gW107XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjc3NPYmplY3RBcnJheS5sZW5ndGg7IGkrKykge1xuICAgICAgaWYgKGNvbnRhaW5zID09PSBmYWxzZSkge1xuICAgICAgICBpZiAoY3NzT2JqZWN0QXJyYXlbaV0uc2VsZWN0b3IgPT09IHNlbGVjdG9yKSB7XG4gICAgICAgICAgZm91bmQucHVzaChjc3NPYmplY3RBcnJheVtpXSk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlmIChjc3NPYmplY3RBcnJheVtpXS5zZWxlY3Rvci5pbmRleE9mKHNlbGVjdG9yKSAhPT0gLTEpIHtcbiAgICAgICAgICBmb3VuZC5wdXNoKGNzc09iamVjdEFycmF5W2ldKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgfVxuICAgIGlmIChzZWxlY3RvciA9PT0gJ0BpbXBvcnRzJyB8fCBmb3VuZC5sZW5ndGggPCAyKSB7XG4gICAgICByZXR1cm4gZm91bmQ7XG4gICAgfSBlbHNlIHtcbiAgICAgIHZhciBiYXNlID0gZm91bmRbMF07XG4gICAgICBmb3IgKGkgPSAxOyBpIDwgZm91bmQubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdGhpcy5pbnRlbGxpZ2VudENTU1B1c2goW2Jhc2VdLCBmb3VuZFtpXSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gW2Jhc2VdOyAvL3dlIGFyZSBkb25lISEgYWxsIHByb3BlcnRpZXMgbWVyZ2VkIGludG8gYmFzZSFcbiAgICB9XG4gIH07XG5cbiAgLypcbiAgICBkZWxldGVzIGNzc09iamVjdHMgaGF2aW5nIGdpdmVuIHNlbGVjdG9yLCBhbmQgcmV0dXJucyBuZXcgYXJyYXlcbiAgKi9cbiAgZmkucHJvdG90eXBlLmRlbGV0ZUJ5U2VsZWN0b3IgPSBmdW5jdGlvbihjc3NPYmplY3RBcnJheSwgc2VsZWN0b3IpIHtcbiAgICB2YXIgcmV0ID0gW107XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjc3NPYmplY3RBcnJheS5sZW5ndGg7IGkrKykge1xuICAgICAgaWYgKGNzc09iamVjdEFycmF5W2ldLnNlbGVjdG9yICE9PSBzZWxlY3Rvcikge1xuICAgICAgICByZXQucHVzaChjc3NPYmplY3RBcnJheVtpXSk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZXQ7XG4gIH07XG5cbiAgLypcbiAgICAgIENvbXByZXNzZXMgZ2l2ZW4gY3NzT2JqZWN0QXJyYXkgYW5kIHRyaWVzIHRvIG1pbmltaXplXG4gICAgICBzZWxlY3RvciByZWR1bmRlbmNlLlxuICAqL1xuICBmaS5wcm90b3R5cGUuY29tcHJlc3NDU1MgPSBmdW5jdGlvbihjc3NPYmplY3RBcnJheSkge1xuICAgIHZhciBjb21wcmVzc2VkID0gW107XG4gICAgdmFyIGRvbmUgPSB7fTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNzc09iamVjdEFycmF5Lmxlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIgb2JqID0gY3NzT2JqZWN0QXJyYXlbaV07XG4gICAgICBpZiAoZG9uZVtvYmouc2VsZWN0b3JdID09PSB0cnVlKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICB2YXIgZm91bmQgPSB0aGlzLmZpbmRCeVNlbGVjdG9yKGNzc09iamVjdEFycmF5LCBvYmouc2VsZWN0b3IpOyAvL2ZvdW5kIGNvbXByZXNzZWRcbiAgICAgIGlmIChmb3VuZC5sZW5ndGggIT09IDApIHtcbiAgICAgICAgY29tcHJlc3NlZCA9IGNvbXByZXNzZWQuY29uY2F0KGZvdW5kKTtcbiAgICAgICAgZG9uZVtvYmouc2VsZWN0b3JdID0gdHJ1ZTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGNvbXByZXNzZWQ7XG4gIH07XG5cbiAgLypcbiAgICBSZWNlaXZlZCAyIGNzcyBvYmplY3RzIHdpdGggZm9sbG93aW5nIHN0cnVjdHVyZVxuICAgICAge1xuICAgICAgICBydWxlcyA6IFt7ZGlyZWN0aXZlOlwiXCIsIHZhbHVlOlwiXCJ9LCB7ZGlyZWN0aXZlOlwiXCIsIHZhbHVlOlwiXCJ9LCAuLi5dXG4gICAgICAgIHNlbGVjdG9yIDogXCJTT01FU0VMRUNUT1JcIlxuICAgICAgfVxuXG4gICAgcmV0dXJucyB0aGUgY2hhbmdlZChuZXcscmVtb3ZlZCx1cGRhdGVkKSB2YWx1ZXMgb24gY3NzMSBwYXJhbWV0ZXIsIG9uIHNhbWUgc3RydWN0dXJlXG5cbiAgICBpZiB0d28gY3NzIG9iamVjdHMgYXJlIHRoZSBzYW1lLCB0aGVuIHJldHVybnMgZmFsc2VcblxuICAgICAgaWYgYSBjc3MgZGlyZWN0aXZlIGV4aXN0cyBpbiBjc3MxIGFuZCAgICAgY3NzMiwgYW5kIGl0cyB2YWx1ZSBpcyBkaWZmZXJlbnQsIGl0IGlzIGluY2x1ZGVkIGluIGRpZmZcbiAgICAgIGlmIGEgY3NzIGRpcmVjdGl2ZSBleGlzdHMgaW4gY3NzMSBhbmQgbm90IGNzczIsIGl0IGlzIHRoZW4gaW5jbHVkZWQgaW4gZGlmZlxuICAgICAgaWYgYSBjc3MgZGlyZWN0aXZlIGV4aXN0cyBpbiBjc3MyIGJ1dCBub3QgY3NzMSwgdGhlbiBpdCBpcyBkZWxldGVkIGluIGNzczEsIGl0IHdvdWxkIGJlIGluY2x1ZGVkIGluIGRpZmYgYnV0IHdpbGwgYmUgbWFya2VkIGFzIHR5cGU9J0RFTEVURUQnXG5cbiAgICAgIEBvYmplY3QgY3NzMSBjc3Mgb2JqZWN0XG4gICAgICBAb2JqZWN0IGNzczIgY3NzIG9iamVjdFxuXG4gICAgICBAcmV0dXJuIGRpZmYgY3NzIG9iamVjdCBjb250YWlucyBjaGFuZ2VkIHZhbHVlcyBpbiBjc3MxIGluIHJlZ2FyZHMgdG8gY3NzMiBzZWUgdGVzdCBpbnB1dCBvdXRwdXQgaW4gL3Rlc3QvZGF0YS9jc3MuanNcbiAgKi9cbiAgZmkucHJvdG90eXBlLmNzc0RpZmYgPSBmdW5jdGlvbihjc3MxLCBjc3MyKSB7XG4gICAgaWYgKGNzczEuc2VsZWN0b3IgIT09IGNzczIuc2VsZWN0b3IpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICAvL2lmIG9uZSBvZiB0aGVtIGlzIG1lZGlhIHF1ZXJ5IHJldHVybiBmYWxzZSwgYmVjYXVzZSBkaWZmIGZ1bmN0aW9uIGNhbiBub3Qgb3BlcmF0ZSBvbiBtZWRpYSBxdWVyaWVzXG4gICAgaWYgKChjc3MxLnR5cGUgPT09ICdtZWRpYScgfHwgY3NzMi50eXBlID09PSAnbWVkaWEnKSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIHZhciBkaWZmID0ge1xuICAgICAgc2VsZWN0b3I6IGNzczEuc2VsZWN0b3IsXG4gICAgICBydWxlczogW11cbiAgICB9O1xuICAgIHZhciBydWxlMSwgcnVsZTI7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjc3MxLnJ1bGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBydWxlMSA9IGNzczEucnVsZXNbaV07XG4gICAgICAvL2ZpbmQgcnVsZTIgd2hpY2ggaGFzIHRoZSBzYW1lIGRpcmVjdGl2ZSBhcyBydWxlMVxuICAgICAgcnVsZTIgPSB0aGlzLmZpbmRDb3JyZXNwb25kaW5nUnVsZShjc3MyLnJ1bGVzLCBydWxlMS5kaXJlY3RpdmUsIHJ1bGUxLnZhbHVlKTtcbiAgICAgIGlmIChydWxlMiA9PT0gZmFsc2UpIHtcbiAgICAgICAgLy9ydWxlMSBpcyBhIG5ldyBydWxlIGluIGNzczFcbiAgICAgICAgZGlmZi5ydWxlcy5wdXNoKHJ1bGUxKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vcnVsZTIgd2FzIGZvdW5kIG9ubHkgcHVzaCBpZiBpdHMgdmFsdWUgaXMgZGlmZmVyZW50IHRvb1xuICAgICAgICBpZiAocnVsZTEudmFsdWUgIT09IHJ1bGUyLnZhbHVlKSB7XG4gICAgICAgICAgZGlmZi5ydWxlcy5wdXNoKHJ1bGUxKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIC8vbm93IGZvciBydWxlcyBleGlzdHMgaW4gY3NzMiBidXQgbm90IGluIGNzczEsIHdoaWNoIG1lYW5zIGRlbGV0ZWQgcnVsZXNcbiAgICBmb3IgKHZhciBpaSA9IDA7IGlpIDwgY3NzMi5ydWxlcy5sZW5ndGg7IGlpKyspIHtcbiAgICAgIHJ1bGUyID0gY3NzMi5ydWxlc1tpaV07XG4gICAgICAvL2ZpbmQgcnVsZTIgd2hpY2ggaGFzIHRoZSBzYW1lIGRpcmVjdGl2ZSBhcyBydWxlMVxuICAgICAgcnVsZTEgPSB0aGlzLmZpbmRDb3JyZXNwb25kaW5nUnVsZShjc3MxLnJ1bGVzLCBydWxlMi5kaXJlY3RpdmUpO1xuICAgICAgaWYgKHJ1bGUxID09PSBmYWxzZSkge1xuICAgICAgICAvL3J1bGUxIGlzIGEgbmV3IHJ1bGVcbiAgICAgICAgcnVsZTIudHlwZSA9ICdERUxFVEVEJzsgLy9tYXJrIGl0IGFzIGEgZGVsZXRlZCBydWxlLCBzbyB0aGF0IG90aGVyIG1lcmdlIG9wZXJhdGlvbnMgY291bGQgYmUgdHJ1ZVxuICAgICAgICBkaWZmLnJ1bGVzLnB1c2gocnVsZTIpO1xuICAgICAgfVxuICAgIH1cblxuXG4gICAgaWYgKGRpZmYucnVsZXMubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHJldHVybiBkaWZmO1xuICB9O1xuXG4gIC8qXG4gICAgICBNZXJnZXMgMiBkaWZmZXJlbnQgY3NzIG9iamVjdHMgdG9nZXRoZXJcbiAgICAgIHVzaW5nIGludGVsbGlnZW50Q1NTUHVzaCxcblxuICAgICAgQHBhcmFtIGNzc09iamVjdEFycmF5LCB0YXJnZXQgY3NzIG9iamVjdCBhcnJheVxuICAgICAgQHBhcmFtIG5ld0FycmF5LCBzb3VyY2UgYXJyYXkgdGhhdCB3aWxsIGJlIHB1c2hlZCBpbnRvIGNzc09iamVjdEFycmF5IHBhcmFtZXRlclxuICAgICAgQHBhcmFtIHJldmVyc2UsIFtvcHRpb25hbF0sIGlmIGdpdmVuIHRydWUsIGZpcnN0IHBhcmFtZXRlciB3aWxsIGJlIHRyYXZlcnNlZCBvbiByZXZlcnNlZCBvcmRlclxuICAgICAgICAgICAgICBlZmZlY3RpdmVseSBnaXZpbmcgcHJpb3JpdHkgdG8gdGhlIHN0eWxlcyBpbiBuZXdBcnJheVxuICAqL1xuICBmaS5wcm90b3R5cGUuaW50ZWxsaWdlbnRNZXJnZSA9IGZ1bmN0aW9uKGNzc09iamVjdEFycmF5LCBuZXdBcnJheSwgcmV2ZXJzZSkge1xuICAgIGlmIChyZXZlcnNlID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldmVyc2UgPSBmYWxzZTtcbiAgICB9XG5cblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbmV3QXJyYXkubGVuZ3RoOyBpKyspIHtcbiAgICAgIHRoaXMuaW50ZWxsaWdlbnRDU1NQdXNoKGNzc09iamVjdEFycmF5LCBuZXdBcnJheVtpXSwgcmV2ZXJzZSk7XG4gICAgfVxuICAgIGZvciAoaSA9IDA7IGkgPCBjc3NPYmplY3RBcnJheS5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIGNvYmogPSBjc3NPYmplY3RBcnJheVtpXTtcbiAgICAgIGlmIChjb2JqLnR5cGUgPT09ICdtZWRpYScgfHwgKGNvYmoudHlwZSA9PT0gJ2tleWZyYW1lcycpKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgY29iai5ydWxlcyA9IHRoaXMuY29tcGFjdFJ1bGVzKGNvYmoucnVsZXMpO1xuICAgIH1cbiAgfTtcblxuICAvKlxuICAgIGluc2VydHMgbmV3IGNzcyBvYmplY3RzIGludG8gYSBiaWdnZXIgY3NzIG9iamVjdFxuICAgIHdpdGggc2FtZSBzZWxlY3RvcnMgZ3JvdXBlZCB0b2dldGhlclxuXG4gICAgQHBhcmFtIGNzc09iamVjdEFycmF5LCBhcnJheSBvZiBiaWdnZXIgY3NzIG9iamVjdCB0byBiZSBwdXNoZWQgaW50b1xuICAgIEBwYXJhbSBtaW5pbWFsT2JqZWN0LCBzaW5nbGUgY3NzIG9iamVjdFxuICAgIEBwYXJhbSByZXZlcnNlIFtvcHRpb25hbF0gZGVmYXVsdCBpcyBmYWxzZSwgaWYgZ2l2ZW4sIGNzc09iamVjdEFycmF5IHdpbGwgYmUgcmV2ZXJzbHkgdHJhdmVyc2VkXG4gICAgICAgICAgICByZXN1bHRpbmcgbW9yZSBwcmlvcml0eSBpbiBtaW5pbWFsT2JqZWN0J3Mgc3R5bGVzXG4gICovXG4gIGZpLnByb3RvdHlwZS5pbnRlbGxpZ2VudENTU1B1c2ggPSBmdW5jdGlvbihjc3NPYmplY3RBcnJheSwgbWluaW1hbE9iamVjdCwgcmV2ZXJzZSkge1xuICAgIHZhciBwdXNoU2VsZWN0b3IgPSBtaW5pbWFsT2JqZWN0LnNlbGVjdG9yO1xuICAgIC8vZmluZCBjb3JyZWN0IHNlbGVjdG9yIGlmIG5vdCBmb3VuZCBqdXN0IHB1c2ggbWluaW1hbE9iamVjdCBpbnRvIGNzc09iamVjdFxuICAgIHZhciBjc3NPYmplY3QgPSBmYWxzZTtcblxuICAgIGlmIChyZXZlcnNlID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldmVyc2UgPSBmYWxzZTtcbiAgICB9XG5cbiAgICBpZiAocmV2ZXJzZSA9PT0gZmFsc2UpIHtcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY3NzT2JqZWN0QXJyYXkubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaWYgKGNzc09iamVjdEFycmF5W2ldLnNlbGVjdG9yID09PSBwdXNoU2VsZWN0b3IpIHtcbiAgICAgICAgICBjc3NPYmplY3QgPSBjc3NPYmplY3RBcnJheVtpXTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBmb3IgKHZhciBqID0gY3NzT2JqZWN0QXJyYXkubGVuZ3RoIC0gMTsgaiA+IC0xOyBqLS0pIHtcbiAgICAgICAgaWYgKGNzc09iamVjdEFycmF5W2pdLnNlbGVjdG9yID09PSBwdXNoU2VsZWN0b3IpIHtcbiAgICAgICAgICBjc3NPYmplY3QgPSBjc3NPYmplY3RBcnJheVtqXTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChjc3NPYmplY3QgPT09IGZhbHNlKSB7XG4gICAgICBjc3NPYmplY3RBcnJheS5wdXNoKG1pbmltYWxPYmplY3QpOyAvL2p1c3QgcHVzaCwgYmVjYXVzZSBjc3NTZWxlY3RvciBpcyBuZXdcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKG1pbmltYWxPYmplY3QudHlwZSAhPT0gJ21lZGlhJykge1xuICAgICAgICBmb3IgKHZhciBpaSA9IDA7IGlpIDwgbWluaW1hbE9iamVjdC5ydWxlcy5sZW5ndGg7IGlpKyspIHtcbiAgICAgICAgICB2YXIgcnVsZSA9IG1pbmltYWxPYmplY3QucnVsZXNbaWldO1xuICAgICAgICAgIC8vZmluZCBydWxlIGluc2lkZSBjc3NPYmplY3RcbiAgICAgICAgICB2YXIgb2xkUnVsZSA9IHRoaXMuZmluZENvcnJlc3BvbmRpbmdSdWxlKGNzc09iamVjdC5ydWxlcywgcnVsZS5kaXJlY3RpdmUpO1xuICAgICAgICAgIGlmIChvbGRSdWxlID09PSBmYWxzZSkge1xuICAgICAgICAgICAgY3NzT2JqZWN0LnJ1bGVzLnB1c2gocnVsZSk7XG4gICAgICAgICAgfSBlbHNlIGlmIChydWxlLnR5cGUgPT09ICdERUxFVEVEJykge1xuICAgICAgICAgICAgb2xkUnVsZS50eXBlID0gJ0RFTEVURUQnO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvL3J1bGUgZm91bmQganVzdCB1cGRhdGUgdmFsdWVcblxuICAgICAgICAgICAgb2xkUnVsZS52YWx1ZSA9IHJ1bGUudmFsdWU7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjc3NPYmplY3Quc3ViU3R5bGVzID0gY3NzT2JqZWN0LnN1YlN0eWxlcy5jb25jYXQobWluaW1hbE9iamVjdC5zdWJTdHlsZXMpOyAvL1RPRE8sIG1ha2UgdGhpcyBpbnRlbGxpZ2VudCB0b29cbiAgICAgIH1cblxuICAgIH1cbiAgfTtcblxuICAvKlxuICAgIGZpbHRlciBvdXRzIHJ1bGUgb2JqZWN0cyB3aG9zZSB0eXBlIHBhcmFtIGVxdWFsIHRvIERFTEVURURcblxuICAgIEBwYXJhbSBydWxlcywgYXJyYXkgb2YgcnVsZXNcblxuICAgIEByZXR1cm5zIHJ1bGVzIGFycmF5LCBjb21wYWN0ZWQgYnkgZGVsZXRpbmcgYWxsIHVubmVjZXNzYXJ5IHJ1bGVzXG4gICovXG4gIGZpLnByb3RvdHlwZS5jb21wYWN0UnVsZXMgPSBmdW5jdGlvbihydWxlcykge1xuICAgIHZhciBuZXdSdWxlcyA9IFtdO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcnVsZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmIChydWxlc1tpXS50eXBlICE9PSAnREVMRVRFRCcpIHtcbiAgICAgICAgbmV3UnVsZXMucHVzaChydWxlc1tpXSk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBuZXdSdWxlcztcbiAgfTtcbiAgLypcbiAgICBjb21wdXRlcyBzdHJpbmcgZm9yIGFjZSBlZGl0b3IgdXNpbmcgdGhpcy5jc3Mgb3IgZ2l2ZW4gY3NzQmFzZSBvcHRpb25hbCBwYXJhbWV0ZXJcblxuICAgIEBwYXJhbSBbb3B0aW9uYWxdIGNzc0Jhc2UsIGlmIGdpdmVuIGNvbXB1dGVzIGNzc1N0cmluZyBmcm9tIGNzc09iamVjdCBhcnJheVxuICAqL1xuICBmaS5wcm90b3R5cGUuZ2V0Q1NTRm9yRWRpdG9yID0gZnVuY3Rpb24oY3NzQmFzZSwgZGVwdGgpIHtcbiAgICBpZiAoZGVwdGggPT09IHVuZGVmaW5lZCkge1xuICAgICAgZGVwdGggPSAwO1xuICAgIH1cbiAgICB2YXIgcmV0ID0gJyc7XG4gICAgaWYgKGNzc0Jhc2UgPT09IHVuZGVmaW5lZCkge1xuICAgICAgY3NzQmFzZSA9IHRoaXMuY3NzO1xuICAgIH1cbiAgICAvL2FwcGVuZCBpbXBvcnRzXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjc3NCYXNlLmxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAoY3NzQmFzZVtpXS50eXBlID09PSAnaW1wb3J0cycpIHtcbiAgICAgICAgcmV0ICs9IGNzc0Jhc2VbaV0uc3R5bGVzICsgJ1xcblxcbic7XG4gICAgICB9XG4gICAgfVxuICAgIGZvciAoaSA9IDA7IGkgPCBjc3NCYXNlLmxlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIgdG1wID0gY3NzQmFzZVtpXTtcbiAgICAgIGlmICh0bXAuc2VsZWN0b3IgPT09IHVuZGVmaW5lZCkgeyAvL3RlbXBvcmFyaWx5IG9taXQgbWVkaWEgcXVlcmllc1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIHZhciBjb21tZW50cyA9IFwiXCI7XG4gICAgICBpZiAodG1wLmNvbW1lbnRzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgY29tbWVudHMgPSB0bXAuY29tbWVudHMgKyAnXFxuJztcbiAgICAgIH1cblxuICAgICAgaWYgKHRtcC50eXBlID09PSAnbWVkaWEnKSB7IC8vYWxzbyBwdXQgbWVkaWEgcXVlcmllcyB0byBvdXRwdXRcbiAgICAgICAgcmV0ICs9IGNvbW1lbnRzICsgdG1wLnNlbGVjdG9yICsgJ3tcXG4nO1xuICAgICAgICByZXQgKz0gdGhpcy5nZXRDU1NGb3JFZGl0b3IodG1wLnN1YlN0eWxlcywgZGVwdGggKyAxKTtcbiAgICAgICAgcmV0ICs9ICd9XFxuXFxuJztcbiAgICAgIH0gZWxzZSBpZiAodG1wLnR5cGUgIT09ICdrZXlmcmFtZXMnICYmIHRtcC50eXBlICE9PSAnaW1wb3J0cycpIHtcbiAgICAgICAgcmV0ICs9IHRoaXMuZ2V0U3BhY2VzKGRlcHRoKSArIGNvbW1lbnRzICsgdG1wLnNlbGVjdG9yICsgJyB7XFxuJztcbiAgICAgICAgcmV0ICs9IHRoaXMuZ2V0Q1NTT2ZSdWxlcyh0bXAucnVsZXMsIGRlcHRoICsgMSk7XG4gICAgICAgIHJldCArPSB0aGlzLmdldFNwYWNlcyhkZXB0aCkgKyAnfVxcblxcbic7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy9hcHBlbmQga2V5RnJhbWVzXG4gICAgZm9yIChpID0gMDsgaSA8IGNzc0Jhc2UubGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmIChjc3NCYXNlW2ldLnR5cGUgPT09ICdrZXlmcmFtZXMnKSB7XG4gICAgICAgIHJldCArPSBjc3NCYXNlW2ldLnN0eWxlcyArICdcXG5cXG4nO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiByZXQ7XG4gIH07XG5cbiAgZmkucHJvdG90eXBlLmdldEltcG9ydHMgPSBmdW5jdGlvbihjc3NPYmplY3RBcnJheSkge1xuICAgIHZhciBpbXBzID0gW107XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjc3NPYmplY3RBcnJheS5sZW5ndGg7IGkrKykge1xuICAgICAgaWYgKGNzc09iamVjdEFycmF5W2ldLnR5cGUgPT09ICdpbXBvcnRzJykge1xuICAgICAgICBpbXBzLnB1c2goY3NzT2JqZWN0QXJyYXlbaV0uc3R5bGVzKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGltcHM7XG4gIH07XG4gIC8qXG4gICAgZ2l2ZW4gcnVsZXMgYXJyYXksIHJldHVybnMgdmlzdWFsbHkgZm9ybWF0dGVkIGNzcyBzdHJpbmdcbiAgICB0byBiZSB1c2VkIGluc2lkZSBlZGl0b3JcbiAgKi9cbiAgZmkucHJvdG90eXBlLmdldENTU09mUnVsZXMgPSBmdW5jdGlvbihydWxlcywgZGVwdGgpIHtcbiAgICB2YXIgcmV0ID0gJyc7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBydWxlcy5sZW5ndGg7IGkrKykge1xuICAgICAgaWYgKHJ1bGVzW2ldID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBpZiAocnVsZXNbaV0uZGVmZWN0aXZlID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmV0ICs9IHRoaXMuZ2V0U3BhY2VzKGRlcHRoKSArIHJ1bGVzW2ldLmRpcmVjdGl2ZSArICc6ICcgKyBydWxlc1tpXS52YWx1ZSArICc7XFxuJztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldCArPSB0aGlzLmdldFNwYWNlcyhkZXB0aCkgKyBydWxlc1tpXS52YWx1ZSArICc7XFxuJztcbiAgICAgIH1cblxuICAgIH1cbiAgICByZXR1cm4gcmV0IHx8ICdcXG4nO1xuICB9O1xuXG4gIC8qXG4gICAgICBBIHZlcnkgc2ltcGxlIGhlbHBlciBmdW5jdGlvbiByZXR1cm5zIG51bWJlciBvZiBzcGFjZXMgYXBwZW5kZWQgaW4gYSBzaW5nbGUgc3RyaW5nLFxuICAgICAgdGhlIG51bWJlciBkZXBlbmRzIGlucHV0IHBhcmFtZXRlciwgbmFtZWx5IGlucHV0KjJcbiAgKi9cbiAgZmkucHJvdG90eXBlLmdldFNwYWNlcyA9IGZ1bmN0aW9uKG51bSkge1xuICAgIHZhciByZXQgPSAnJztcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IG51bSAqIDQ7IGkrKykge1xuICAgICAgcmV0ICs9ICcgJztcbiAgICB9XG4gICAgcmV0dXJuIHJldDtcbiAgfTtcblxuICAvKlxuICAgIEdpdmVuIGNzcyBzdHJpbmcgb3Igb2JqZWN0QXJyYXksIHBhcnNlcyBpdCBhbmQgdGhlbiBmb3IgZXZlcnkgc2VsZWN0b3IsXG4gICAgcHJlcGVuZHMgdGhpcy5jc3NQcmV2aWV3TmFtZXNwYWNlIHRvIHByZXZlbnQgY3NzIGNvbGxpc2lvbiBpc3N1ZXNcblxuICAgIEByZXR1cm5zIGNzcyBzdHJpbmcgaW4gd2hpY2ggdGhpcy5jc3NQcmV2aWV3TmFtZXNwYWNlIHByZXBlbmRlZFxuICAqL1xuICBmaS5wcm90b3R5cGUuYXBwbHlOYW1lc3BhY2luZyA9IGZ1bmN0aW9uKGNzcywgZm9yY2VkTmFtZXNwYWNlKSB7XG4gICAgdmFyIGNzc09iamVjdEFycmF5ID0gY3NzO1xuICAgIHZhciBuYW1lc3BhY2VDbGFzcyA9ICcuJyArIHRoaXMuY3NzUHJldmlld05hbWVzcGFjZTtcbiAgICBpZihmb3JjZWROYW1lc3BhY2UgIT09IHVuZGVmaW5lZCl7XG4gICAgICBuYW1lc3BhY2VDbGFzcyA9IGZvcmNlZE5hbWVzcGFjZTtcbiAgICB9XG5cbiAgICBpZiAodHlwZW9mIGNzcyA9PT0gJ3N0cmluZycpIHtcbiAgICAgIGNzc09iamVjdEFycmF5ID0gdGhpcy5wYXJzZUNTUyhjc3MpO1xuICAgIH1cblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY3NzT2JqZWN0QXJyYXkubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciBvYmogPSBjc3NPYmplY3RBcnJheVtpXTtcblxuICAgICAgLy9ieXBhc3MgbmFtZXNwYWNpbmcgZm9yIEBmb250LWZhY2UgQGtleWZyYW1lcyBAaW1wb3J0XG4gICAgICBpZihvYmouc2VsZWN0b3IuaW5kZXhPZignQGZvbnQtZmFjZScpID4gLTEgfHwgb2JqLnNlbGVjdG9yLmluZGV4T2YoJ2tleWZyYW1lcycpID4gLTEgfHwgb2JqLnNlbGVjdG9yLmluZGV4T2YoJ0BpbXBvcnQnKSA+IC0xIHx8IG9iai5zZWxlY3Rvci5pbmRleE9mKCcuZm9ybS1hbGwnKSA+IC0xIHx8IG9iai5zZWxlY3Rvci5pbmRleE9mKCcjc3RhZ2UnKSA+IC0xKXtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIGlmIChvYmoudHlwZSAhPT0gJ21lZGlhJykge1xuICAgICAgICB2YXIgc2VsZWN0b3IgPSBvYmouc2VsZWN0b3Iuc3BsaXQoJywnKTtcbiAgICAgICAgdmFyIG5ld1NlbGVjdG9yID0gW107XG4gICAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgc2VsZWN0b3IubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICBpZiAoc2VsZWN0b3Jbal0uaW5kZXhPZignLnN1cGVybm92YScpID09PSAtMSkgeyAvL2RvIG5vdCBhcHBseSBuYW1lc3BhY2luZyB0byBzZWxlY3RvcnMgaW5jbHVkaW5nIHN1cGVybm92YVxuICAgICAgICAgICAgbmV3U2VsZWN0b3IucHVzaChuYW1lc3BhY2VDbGFzcyArICcgJyArIHNlbGVjdG9yW2pdKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbmV3U2VsZWN0b3IucHVzaChzZWxlY3RvcltqXSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIG9iai5zZWxlY3RvciA9IG5ld1NlbGVjdG9yLmpvaW4oJywnKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG9iai5zdWJTdHlsZXMgPSB0aGlzLmFwcGx5TmFtZXNwYWNpbmcob2JqLnN1YlN0eWxlcywgZm9yY2VkTmFtZXNwYWNlKTsgLy9oYW5kbGUgbWVkaWEgcXVlcmllcyBhcyB3ZWxsXG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGNzc09iamVjdEFycmF5O1xuICB9O1xuXG4gIC8qXG4gICAgZ2l2ZW4gY3NzIHN0cmluZyBvciBvYmplY3QgYXJyYXksIGNsZWFycyBwb3NzaWJsZSBuYW1lc3BhY2luZyBmcm9tXG4gICAgYWxsIG9mIHRoZSBzZWxlY3RvcnMgaW5zaWRlIHRoZSBjc3NcbiAgKi9cbiAgZmkucHJvdG90eXBlLmNsZWFyTmFtZXNwYWNpbmcgPSBmdW5jdGlvbihjc3MsIHJldHVybk9iaikge1xuICAgIGlmIChyZXR1cm5PYmogPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuT2JqID0gZmFsc2U7XG4gICAgfVxuICAgIHZhciBjc3NPYmplY3RBcnJheSA9IGNzcztcbiAgICB2YXIgbmFtZXNwYWNlQ2xhc3MgPSAnLicgKyB0aGlzLmNzc1ByZXZpZXdOYW1lc3BhY2U7XG4gICAgaWYgKHR5cGVvZiBjc3MgPT09ICdzdHJpbmcnKSB7XG4gICAgICBjc3NPYmplY3RBcnJheSA9IHRoaXMucGFyc2VDU1MoY3NzKTtcbiAgICB9XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNzc09iamVjdEFycmF5Lmxlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIgb2JqID0gY3NzT2JqZWN0QXJyYXlbaV07XG5cbiAgICAgIGlmIChvYmoudHlwZSAhPT0gJ21lZGlhJykge1xuICAgICAgICB2YXIgc2VsZWN0b3IgPSBvYmouc2VsZWN0b3Iuc3BsaXQoJywnKTtcbiAgICAgICAgdmFyIG5ld1NlbGVjdG9yID0gW107XG4gICAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgc2VsZWN0b3IubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICBuZXdTZWxlY3Rvci5wdXNoKHNlbGVjdG9yW2pdLnNwbGl0KG5hbWVzcGFjZUNsYXNzICsgJyAnKS5qb2luKCcnKSk7XG4gICAgICAgIH1cbiAgICAgICAgb2JqLnNlbGVjdG9yID0gbmV3U2VsZWN0b3Iuam9pbignLCcpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgb2JqLnN1YlN0eWxlcyA9IHRoaXMuY2xlYXJOYW1lc3BhY2luZyhvYmouc3ViU3R5bGVzLCB0cnVlKTsgLy9oYW5kbGUgbWVkaWEgcXVlcmllcyBhcyB3ZWxsXG4gICAgICB9XG4gICAgfVxuICAgIGlmIChyZXR1cm5PYmogPT09IGZhbHNlKSB7XG4gICAgICByZXR1cm4gdGhpcy5nZXRDU1NGb3JFZGl0b3IoY3NzT2JqZWN0QXJyYXkpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gY3NzT2JqZWN0QXJyYXk7XG4gICAgfVxuXG4gIH07XG5cbiAgLypcbiAgICBjcmVhdGVzIGEgbmV3IHN0eWxlIHRhZyAoYWxzbyBkZXN0cm95cyB0aGUgcHJldmlvdXMgb25lKVxuICAgIGFuZCBpbmplY3RzIGdpdmVuIGNzcyBzdHJpbmcgaW50byB0aGF0IGNzcyB0YWdcbiAgKi9cbiAgZmkucHJvdG90eXBlLmNyZWF0ZVN0eWxlRWxlbWVudCA9IGZ1bmN0aW9uKGlkLCBjc3MsIGZvcm1hdCkge1xuICAgIGlmIChmb3JtYXQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgZm9ybWF0ID0gZmFsc2U7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMudGVzdE1vZGUgPT09IGZhbHNlICYmIGZvcm1hdCAhPT0gJ25vbmFtZXNwYWNlJykge1xuICAgICAgLy9hcHBseSBuYW1lc3BhY2luZyBjbGFzc2VzXG4gICAgICBjc3MgPSB0aGlzLmFwcGx5TmFtZXNwYWNpbmcoY3NzKTtcbiAgICB9XG5cbiAgICBpZiAodHlwZW9mIGNzcyAhPT0gJ3N0cmluZycpIHtcbiAgICAgIGNzcyA9IHRoaXMuZ2V0Q1NTRm9yRWRpdG9yKGNzcyk7XG4gICAgfVxuICAgIC8vYXBwbHkgZm9ybWF0dGluZyBmb3IgY3NzXG4gICAgaWYgKGZvcm1hdCA9PT0gdHJ1ZSkge1xuICAgICAgY3NzID0gdGhpcy5nZXRDU1NGb3JFZGl0b3IodGhpcy5wYXJzZUNTUyhjc3MpKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy50ZXN0TW9kZSAhPT0gZmFsc2UpIHtcbiAgICAgIHJldHVybiB0aGlzLnRlc3RNb2RlKCdjcmVhdGUgc3R5bGUgIycgKyBpZCwgY3NzKTsgLy9pZiB0ZXN0IG1vZGUsIGp1c3QgcGFzcyByZXN1bHQgdG8gY2FsbGJhY2tcbiAgICB9XG5cbiAgICB2YXIgX19lbCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGlkKTtcbiAgICBpZiAoX19lbCkge1xuICAgICAgX19lbC5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKF9fZWwpO1xuICAgIH1cblxuICAgIHZhciBoZWFkID0gZG9jdW1lbnQuaGVhZCB8fCBkb2N1bWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZSgnaGVhZCcpWzBdLFxuICAgICAgc3R5bGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzdHlsZScpO1xuXG4gICAgc3R5bGUuaWQgPSBpZDtcbiAgICBzdHlsZS50eXBlID0gJ3RleHQvY3NzJztcblxuICAgIGhlYWQuYXBwZW5kQ2hpbGQoc3R5bGUpO1xuXG4gICAgaWYgKHN0eWxlLnN0eWxlU2hlZXQgJiYgIXN0eWxlLnNoZWV0KSB7XG4gICAgICBzdHlsZS5zdHlsZVNoZWV0LmNzc1RleHQgPSBjc3M7XG4gICAgfSBlbHNlIHtcbiAgICAgIHN0eWxlLmFwcGVuZENoaWxkKGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKGNzcykpO1xuICAgIH1cbiAgfTtcblxuICBnbG9iYWwuY3NzanMgPSBmaTtcblxufSkodGhpcyk7XG4iLCJcclxuY29uc3QgZXhwbG9yZXJFdmVudCA9IE9iamVjdC5mcmVlemUoe1xyXG4gICAgb25tb3VzZW92ZXI6IDEgPDwgMzEsXHJcbiAgICBvbmNsaWNrOiAxIDw8IDMwLFxyXG4gICAgb25zZWxlY3Q6IDEgPDwgMjksXHJcbiAgICBvbmZvbGQ6IDEgPDwgMjhcclxufSk7XHJcblxyXG4vLyBIYW5kbGVzIGV2ZW50cyBmb3IgdGhlIGV4cGNzcyBwYXJzZXJcclxuY2xhc3MgRXZlbnRTdGF0ZSB7XHJcbiAgICBjb25zdHJ1Y3RvcigpIHtcclxuICAgICAgICB0aGlzLnN0YXRlID0gMDtcclxuICAgIH1cclxuXHJcbiAgICBzZXQoZSkge1xyXG4gICAgICAgIHRoaXMuc3RhdGUgfD0gZTtcclxuICAgIH1cclxuXHJcbiAgICByZW1vdmUoZSkge1xyXG4gICAgICAgIHRoaXMuc3RhdGUgJj0gfmU7XHJcbiAgICB9XHJcblxyXG4gICAgdG9nZ2xlKGUpIHtcclxuICAgICAgICB0aGlzLnN0YXRlIF49IGU7XHJcbiAgICB9XHJcblxyXG4gICAgY2hlY2soZSkge1xyXG4gICAgICAgIGlmICgodGhpcy5zdGF0ZSAmIGUpICE9IDApIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBlcXVhbHMob3RoZXIpe1xyXG4gICAgICAgIGlmKG90aGVyID09IHRoaXMuc3RhdGUpe1xyXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IHtcclxuICAgIEV2ZW50U3RhdGU6IEV2ZW50U3RhdGUsXHJcbiAgICBleHBsb3JlckV2ZW50OiBleHBsb3JlckV2ZW50XHJcbn07IiwiY29uc3QgX2Nzc2pzID0gcmVxdWlyZShcIi4uL25vZGVfbW9kdWxlcy9qb3Rmb3JtLWNzcy5qcy9jc3MuanNcIik7XHJcbmNvbnN0IHtTZWxlY3RvclBhcnNlcn0gPSByZXF1aXJlKFwiLi9zZWxlY3Rvci1wYXJzZXIuanNcIik7XHJcbmNvbnN0IHtSdWxlUGFyc2VyfSA9IHJlcXVpcmUoXCIuL3J1bGUtcGFyc2VyLmpzXCIpO1xyXG5jb25zdCBFdmVudHMgPSByZXF1aXJlKFwiLi9ldmVudHMuanNcIik7XHJcblxyXG5jbGFzcyBFeHBsb3JlckNTUyB7XHJcbiAgICAvLyBjbGFzc05hbWUgZGVzY3JpYmVzIHRoZSBvYmplY3QgYXR0cmlidXRlIG9mIHRoZSBzdHlsZSBiYXNlLCB3aGljaCBlaXRoZXIgY29udGFpbnMgJ2wnIGZvciBsaW5rIG9yICdlJyBmb3IgZW50aXR5LiBEZWZhdWx0cyB0byAnY2xhc3MnLlxyXG4gICAgY29uc3RydWN0b3IoY29uZmlnKXtcclxuICAgICAgICAvL2luaXRpYWxpemUgcGFyc2VyIG9iamVjdFxyXG4gICAgICAgIHRoaXMuX3BhcnNlciA9IG5ldyBfY3NzanMuY3NzanMoKTtcclxuXHJcbiAgICAgICAgdGhpcy5fcGFyYW1ldGVycyA9IHtcclxuICAgICAgICAgICAgY2xhc3NQcm9wZXJ0eTogJ2NsYXNzJyxcclxuICAgICAgICAgICAgdGFnTGlzdFNlcGFyYXRvcjonICcgXHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgLy9BcnJheSBvZiBjc3MgdW5pdHMge3NlbGVjdG9yID0gXCJcIiwgcnVsZXMgPSBbe2RpcmVjdGl2ZSA9IFwiXCIsIHZhbHVlICA9IFwiXCJ9IC4uLl19XHJcbiAgICAgICAgdGhpcy5yYXdDU1MgPSBbXTtcclxuXHJcbiAgICAgICAgLy9wYXJzZWQgY3NzIGJsb2NrcyByZWFkeSB0byBiZSBhcHBsaWVkIHRvIG9iamVjdHNcclxuICAgICAgICB0aGlzLnN0eWxpbmdzID0gW107XHJcblxyXG4gICAgICAgIE9iamVjdC5hc3NpZ24odGhpcy5fcGFyYW1ldGVycywgY29uZmlnKTtcclxuXHJcbiAgICAgICAgdGhpcy5zZWxlY3RvckNvbmZpZyA9IHRoaXMuX3BhcmFtZXRlcnM7XHJcbiAgICB9XHJcbiAgIFxyXG5cclxuICAgIC8vZmlsZSBpbnB1dCBmb3IgdGhlIHBhcnNlciBhcyBzdHJpbmdcclxuICAgIHBhcnNlKGNzc1N0cmluZykge1xyXG4gICAgICAgIHRoaXMucmF3Q1NTID0gdGhpcy5fcGFyc2VyLnBhcnNlQ1NTKGNzc1N0cmluZyk7XHJcblxyXG4gICAgICAgIGxldCBycCA9IG5ldyBSdWxlUGFyc2VyKCk7XHJcbiAgICAgICAgbGV0IHNwID0gbmV3IFNlbGVjdG9yUGFyc2VyKHRoaXMuc2VsZWN0b3JDb25maWcpO1xyXG5cclxuICAgICAgICB0aGlzLnJhd0NTUy5mb3JFYWNoKChlbGVtZW50LCBpKSA9PiB7XHJcbiAgICAgICAgICAgIHZhciBzdHlsZSA9IG5ldyBTdHlsaW5nKCk7XHJcbiAgICAgICAgICAgIHZhciBub3JtYWxpemVkU2VsZWN0b3IgPSBlbGVtZW50LnNlbGVjdG9yLnNwbGl0KCcgJykuam9pbignJykudG9Mb3dlckNhc2UoKTtcclxuXHJcbiAgICAgICAgICAgIHN0eWxlLnNlbGVjdG9yID0gc3AucGFyc2VTZWxlY3Rvcihub3JtYWxpemVkU2VsZWN0b3IsIGkpO1xyXG5cclxuICAgICAgICAgICAgZWxlbWVudC5ydWxlcy5mb3JFYWNoKChlbGVtZW50LCBpKSA9PiB7XHJcbiAgICAgICAgICAgICAgICB2YXIgcnVsZSA9IHJwLnBhcnNlUnVsZShlbGVtZW50LmRpcmVjdGl2ZSwgZWxlbWVudC52YWx1ZS5zcGxpdCgnICcpLmpvaW4oJycpLnRvTG93ZXJDYXNlKCkpO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmKHJ1bGUuX3ZhbGlkKXtcclxuICAgICAgICAgICAgICAgICAgICBzdHlsZS5ydWxlcy5wdXNoKHJ1bGUpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuc3R5bGluZ3MucHVzaChzdHlsZSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgLy9tb2RpZmllcyB0aGUgZ2l2ZW4gc3R5bGUgYmFzZWQgb24gdGhlIGdpdmVuIG9iamVjdFxyXG4gICAgc3R5bGUob2JqLCBzdHkpIHtcclxuICAgICAgICB0aGlzLnN0eWxpbmdzLmZvckVhY2goc3R5bGUgPT4gc3R5bGUuYXBwbHkob2JqLCBzdHkpKTtcclxuICAgIH0gXHJcbn1cclxuXHJcbmNsYXNzIFN0eWxpbmcge1xyXG4gICAgY29uc3RydWN0b3IoKSB7XHJcbiAgICAgICAgdGhpcy5zZWxlY3RvcjtcclxuICAgICAgICB0aGlzLnJ1bGVzID0gW107XHJcbiAgICB9XHJcblxyXG4gICAgYXBwbHkob2JqLCBzdHkpe1xyXG4gICAgICAgIGlmKHRoaXMuc2VsZWN0b3IudGVzdChvYmosIHN0eSkpe1xyXG4gICAgICAgICAgICB0aGlzLnJ1bGVzLmZvckVhY2gocnVsZSA9PiBydWxlLmFwcGx5KG9iaiwgc3R5KSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IHtcIkV4cGxvcmVyQ1NTXCI6IEV4cGxvcmVyQ1NTLFxyXG4gICAgICAgICAgICAgICAgICBcIkV2ZW50XCI6RXZlbnRzfSIsImNsYXNzIFBhcnNlciB7XHJcbiAgICBjb25zdHJ1Y3RvcigpIHtcclxuICAgICAgICB0aGlzLl9jdXJJZHggPSAwO1xyXG4gICAgICAgIHRoaXMuX2Jsb2NrID0gLTE7XHJcbiAgICAgICAgdGhpcy5fbGl0ZXJhbCA9IFwiXCI7XHJcbiAgICB9XHJcblxyXG4gICAgX2N1ckNoYXIoKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuX2xpdGVyYWwuY2hhckF0KHRoaXMuX2N1cklkeCk7XHJcbiAgICB9XHJcblxyXG4gICAgX25leHRDaGFyKCkge1xyXG4gICAgICAgIHZhciByZWFjaGVkRW5kID0gdGhpcy5fY3VySWR4ID09ICh0aGlzLl9saXRlcmFsLmxlbmd0aCk7XHJcblxyXG4gICAgICAgIGlmIChyZWFjaGVkRW5kKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuX2N1cklkeCsrO1xyXG5cclxuICAgICAgICB0aGlzLl9jb25zdW1lU3BhY2VzKCk7XHJcblxyXG4gICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgfVxyXG5cclxuICAgIF9jb25zdW1lU3BhY2VzKCkge1xyXG4gICAgICAgIHdoaWxlICh0aGlzLl9jdXJDaGFyKCkgPT0gXCIgXCIpIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMuX2N1cklkeCA+PSB0aGlzLl9saXRlcmFsLmxlbmd0aCAtIDEpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB0aGlzLl9jdXJJZHgrKztcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgX2dldFN0cmluZ1VudGlsKHRlcm1pbmFscykge1xyXG4gICAgICAgIHZhciByZXN1bHQgPSBcIlwiO1xyXG5cclxuICAgICAgICB3aGlsZSAoIXRlcm1pbmFscy5pbmNsdWRlcyh0aGlzLl9jdXJDaGFyKCkpKSB7XHJcbiAgICAgICAgICAgIHJlc3VsdCArPSB0aGlzLl9jdXJDaGFyKCk7XHJcblxyXG4gICAgICAgICAgICBpZiAoIXRoaXMuX25leHRDaGFyKCkpIHtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gcmVzdWx0O1xyXG4gICAgfVxyXG5cclxuICAgIF9lcnJvcihtZXNzYWdlKSB7XHJcbiAgICAgICAgY29uc29sZS5lcnJvcignXFx4MWJbMzFtJXNcXHgxYlswbScsIFwiRXJyb3Igd2hpbGUgcGFyc2luZzogXCIgKyBtZXNzYWdlKTtcclxuICAgIH1cclxuXHJcbiAgICBfd2FybmluZyhtZXNzYWdlKSB7XHJcbiAgICAgICAgY29uc29sZS5lcnJvcignXFx4MWJbMzdtJXNcXHgxYlswbScsIFwiV2FybmluZyA6IFwiICsgbWVzc2FnZSk7XHJcbiAgICB9XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0ge1xyXG4gICAgUGFyc2VyXHJcbn0iLCJjb25zdCB7IFBhcnNlciB9ID0gcmVxdWlyZShcIi4vcGFyc2VyLmpzXCIpO1xyXG5cclxuY2xhc3MgUnVsZVBhcnNlciBleHRlbmRzIFBhcnNlciB7XHJcbiAgICBjb25zdHJ1Y3RvcigpIHtcclxuICAgICAgICBzdXBlcigpO1xyXG4gICAgICAgIHRoaXMuX2F0dHJpYnV0ZSA9IFwiXCI7XHJcbiAgICAgICAgdGhpcy5fcnVsZVRlcm1pbmFscyA9IFtcIlxcblwiLCBcIjtcIl07XHJcbiAgICAgICAgdGhpcy5fcmdiYVRlcm1pbmFscyA9IFsnLCcsICcpJ107XHJcbiAgICAgICAgdGhpcy5fY29sb3JJbml0aWFscyA9IFsnIycsICcwJywgJygnXTtcclxuICAgICAgICB0aGlzLl9pbnRlcnBvbGF0aW9uRW51bXMgPSB7XHJcbiAgICAgICAgICAgICdsaW4nOiBpbnRlcnBvbGF0aW9uVHlwZS5saW5lYXIsXHJcbiAgICAgICAgICAgICdsaW5lYXInOiBpbnRlcnBvbGF0aW9uVHlwZS5saW5lYXJcclxuICAgICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIHBhcnNlUnVsZShhdHRyaWJ1dGUsIHJ1bGUpIHtcclxuICAgICAgICB0aGlzLl9jdXJJZHggPSAwO1xyXG4gICAgICAgIHRoaXMuX2F0dHJpYnV0ZSA9IGF0dHJpYnV0ZTtcclxuICAgICAgICB0aGlzLl9saXRlcmFsID0gcnVsZTtcclxuICAgICAgICB2YXIgcmVzdWx0ID0gdW5kZWZpbmVkO1xyXG5cclxuICAgICAgICAvLyB0cnkgcGFyc2luZyBpbnRlcnBvbGF0aW9uLCBjb2xvciBvciBlbnVtIFxyXG4gICAgICAgIHJlc3VsdCA9IHRoaXMuX3BhcnNlQ29sb3IoKTtcclxuXHJcbiAgICAgICAgaWYgKHJlc3VsdCAhPSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgcmV0dXJuIG5ldyBTaW1wbGVSdWxlKHRoaXMuX2F0dHJpYnV0ZSwgdmFsdWVUeXBlLmNvbG9yLCByZXN1bHQpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gUmVzZXQgcGFyc2VyIGFuZCB0cnkgcGFyc2luZyBpbnRlcnBvbGF0aW9uIHJ1bGVcclxuICAgICAgICB0aGlzLl9jdXJJZHggPSAwO1xyXG5cclxuICAgICAgICB2YXIgdHlwZSA9IHRoaXMuX2dldFN0cmluZ1VudGlsKCcoJyk7XHJcblxyXG4gICAgICAgIHR5cGUgPSB0aGlzLl9pbnRlcnBvbGF0aW9uRW51bXNbdHlwZV07XHJcblxyXG4gICAgICAgIGlmICh0eXBlID09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICByZXR1cm4gbmV3IFNpbXBsZVJ1bGUodGhpcy5fYXR0cmlidXRlLCB2YWx1ZVR5cGUuc3RyaW5nLCB0aGlzLl9saXRlcmFsKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgdGhpcy5fbmV4dENoYXIoKTtcclxuXHJcbiAgICAgICAgcmVzdWx0ID0gdGhpcy5fcGFyc2VJbnRlcnBvbGF0aW9uKHR5cGUpO1xyXG5cclxuICAgICAgICBpZiAocmVzdWx0ID09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAvL21pZ2h0IGJlIG9mIHR5cGUgbnVtYmVyIVxyXG4gICAgICAgICAgICByZXR1cm4gbmV3IFNpbXBsZVJ1bGUodGhpcy5fYXR0cmlidXRlLCB2YWx1ZVR5cGUuc3RyaW5nLCB0aGlzLl9saXRlcmFsKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiByZXN1bHQ7XHJcbiAgICB9XHJcblxyXG4gICAgX3BhcnNlSW50ZXJwb2xhdGlvbih0eXBlKSB7XHJcbiAgICAgICAgdmFyIHZhbGlkID0gdHJ1ZTtcclxuICAgICAgICB2YXIgcHJvcGVydHk7XHJcbiAgICAgICAgdmFyIHZUeXBlO1xyXG4gICAgICAgIHZhciB4ID0gW107XHJcbiAgICAgICAgdmFyIHkgPSBbXTtcclxuXHJcbiAgICAgICAgd2hpbGUgKHRoaXMuX2N1ckNoYXIoKSAhPSAnKScpIHtcclxuICAgICAgICAgICAgeC5wdXNoKHBhcnNlSW50KHRoaXMuX2dldFN0cmluZ1VudGlsKCc9JykpKTtcclxuICAgICAgICAgICAgdGhpcy5fbmV4dENoYXIoKTtcclxuXHJcbiAgICAgICAgICAgIHZhciB0eXBlQ2hlY2sgPSB2VHlwZTtcclxuXHJcbiAgICAgICAgICAgIGlmICh0aGlzLl9jb2xvckluaXRpYWxzLmluY2x1ZGVzKHRoaXMuX2N1ckNoYXIoKSkpIHtcclxuICAgICAgICAgICAgICAgIHkucHVzaCh0aGlzLl9wYXJzZUNvbG9yKCkpO1xyXG4gICAgICAgICAgICAgICAgdlR5cGUgPSB2YWx1ZVR5cGUuY29sb3I7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICB5LnB1c2gocGFyc2VJbnQodGhpcy5fZ2V0U3RyaW5nVW50aWwoWycsJywgJyknXSkpKTtcclxuICAgICAgICAgICAgICAgIHZUeXBlID0gdmFsdWVUeXBlLm51bWJlcjtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKHR5cGVDaGVjayAhPSB1bmRlZmluZWQgJiYgdHlwZUNoZWNrICE9IHZUeXBlKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLl9lcnJvcihcIlR5cGUgb2YgdmFsdWVzIGRvZXNuJ3QgbWF0Y2guXCIpO1xyXG4gICAgICAgICAgICAgICAgdmFsaWQgPSBmYWxzZTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKHRoaXMuX2N1ckNoYXIoKSA9PSAnLCcpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuX25leHRDaGFyKCk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmICh0aGlzLl9jdXJJZHggPj0gdGhpcy5fbGl0ZXJhbC5sZW5ndGggLSAxKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLl9lcnJvcihcIlVuZXhwZWN0ZWQgZW5kIG9mIHJ1bGUuXCIpO1xyXG4gICAgICAgICAgICAgICAgdmFsaWQgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLl9uZXh0Q2hhcigpO1xyXG5cclxuICAgICAgICB2YXIga2V5V29yZCA9IHRoaXMuX2dldFN0cmluZ1VudGlsKCcoJyk7XHJcblxyXG4gICAgICAgIGlmIChrZXlXb3JkLmxvY2FsZUNvbXBhcmUoXCIudXNpbmdcIikgPT0gMCkge1xyXG4gICAgICAgICAgICB0aGlzLl9uZXh0Q2hhcigpO1xyXG4gICAgICAgICAgICBwcm9wZXJ0eSA9IHRoaXMuX2dldFN0cmluZ1VudGlsKCcpJyk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdGhpcy5fZXJyb3IoXCJDb3VsZG4ndCBmaW5kICd1c2luZycgZGlyZWN0aXZlLlwiKTtcclxuICAgICAgICAgICAgdmFsaWQgPSBmYWxzZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICh0aGlzLl9jdXJDaGFyKCkgIT0gJyknKSB7XHJcbiAgICAgICAgICAgIHRoaXMuX2Vycm9yKFwiVW5leHBlY3RlZCBlbmQgb2YgcnVsZSwgZXhwZWN0ZWQgJyknLlwiKTtcclxuICAgICAgICAgICAgdmFsaWQgPSBmYWxzZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICh4Lmxlbmd0aCAhPSB5Lmxlbmd0aCkge1xyXG4gICAgICAgICAgICB0aGlzLl9lcnJvcihcIk51bWJlciBvZiBjb250cm9sIHBvaW50cyBhbmQgdmFsdWVzIGlzIGRpZmZlcmVudC5cIik7XHJcbiAgICAgICAgICAgIHZhbGlkID0gZmFsc2U7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAodlR5cGUgPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgIHRoaXMuX2Vycm9yKFwiVW5rbm93biBOdW1iZXIgb3IgQ29sb3IgVHlwZSBmb3VuZC5cIik7XHJcbiAgICAgICAgICAgIHZhbGlkID0gZmFsc2U7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIFxyXG4gICAgICAgIHJldHVybiBuZXcgSW50ZXJwb2xhdGVkUnVsZSh0aGlzLl9hdHRyaWJ1dGUsIHByb3BlcnR5LCB0eXBlLCB2VHlwZSwgeCwgeSwgdmFsaWQpO1xyXG4gICAgfVxyXG5cclxuICAgIF9wYXJzZUNvbG9yKCkge1xyXG4gICAgICAgIGlmICh0aGlzLl9jdXJDaGFyKCkgPT0gJyMnKSB7XHJcbiAgICAgICAgICAgIHRoaXMuX25leHRDaGFyKCk7XHJcbiAgICAgICAgICAgIHJldHVybiBwYXJzZUludCh0aGlzLl9nZXRTdHJpbmdVbnRpbCh0aGlzLl9ydWxlVGVybWluYWxzKSwgMTYpO1xyXG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy5fY3VyQ2hhcigpID09ICcwJykge1xyXG4gICAgICAgICAgICB0aGlzLl9uZXh0Q2hhcigpO1xyXG4gICAgICAgICAgICBpZiAodGhpcy5fY3VyQ2hhcigpID09ICd4Jykge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5fbmV4dENoYXIoKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiBwYXJzZUludCh0aGlzLl9nZXRTdHJpbmdVbnRpbCh0aGlzLl9ydWxlVGVybWluYWxzKSwgMTYpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLl9jdXJDaGFyKCkgPT0gJygnKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9nZXRSR0JBKCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xyXG4gICAgfVxyXG5cclxuICAgIF9nZXRSR0JBKCkge1xyXG4gICAgICAgIHZhciByID0gcGFyc2VJbnQodGhpcy5fZ2V0U3RyaW5nVW50aWwodGhpcy5fcmdiYVRlcm1pbmFscykpO1xyXG5cclxuICAgICAgICBpZiAodGhpcy5fY3VyQ2hhcigpICE9ICcsJykge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5oZXhWYWx1ZShyLCAwLCAwKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgdGhpcy5fbmV4dENoYXIoKTtcclxuXHJcbiAgICAgICAgdmFyIGcgPSBwYXJzZUludCh0aGlzLl9nZXRTdHJpbmdVbnRpbCh0aGlzLl9yZ2JhVGVybWluYWxzKSk7XHJcblxyXG4gICAgICAgIGlmICh0aGlzLl9jdXJDaGFyKCkgIT0gJywnKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmhleFZhbHVlKHIsIGcsIDApO1xyXG4gICAgICAgIH1cclxuICAgICAgICB0aGlzLl9uZXh0Q2hhcigpO1xyXG5cclxuICAgICAgICB2YXIgYiA9IHBhcnNlSW50KHRoaXMuX2dldFN0cmluZ1VudGlsKHRoaXMuX3JnYmFUZXJtaW5hbHMpKTtcclxuXHJcbiAgICAgICAgaWYgKHRoaXMuX2N1ckNoYXIoKSAhPSAnLCcpIHtcclxuICAgICAgICAgICAgdGhpcy5fbmV4dENoYXIoKTtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuaGV4VmFsdWUociwgZywgYik7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRoaXMuX25leHRDaGFyKCk7XHJcblxyXG4gICAgICAgIHZhciBhID0gcGFyc2VJbnQodGhpcy5fZ2V0U3RyaW5nVW50aWwodGhpcy5fcmdiYVRlcm1pbmFscykpO1xyXG5cclxuICAgICAgICBpZiAodGhpcy5fY3VyQ2hhcigpICE9ICcpJykge1xyXG4gICAgICAgICAgICB0aGlzLl9lcnJvcihcIkV4cGVjdGVkIGNsb3NpbmcgJyknLlwiKVxyXG4gICAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xyXG4gICAgICAgIH1cclxuICAgICAgICB0aGlzLl9uZXh0Q2hhcigpO1xyXG5cclxuICAgICAgICByZXR1cm4gdGhpcy5oZXhWYWx1ZShyLCBnLCBiLCBhKTtcclxuICAgIH1cclxuXHJcbiAgICBoZXhWYWx1ZShyLCBnLCBiLCBhID0gMjU1KSB7XHJcbiAgICAgICAgcmV0dXJuIChyIDw8IDI0KSB8IChnIDw8IDE2KSB8IChiID4+IDgpIHwgYTtcclxuICAgIH1cclxuXHJcbiAgICBoZXhTdHJpbmcociwgZywgYiwgYSA9IDI1NSkge1xyXG4gICAgICAgIHIgPSByLnRvU3RyaW5nKDE2KTtcclxuICAgICAgICBnID0gZy50b1N0cmluZygxNik7XHJcbiAgICAgICAgYiA9IGIudG9TdHJpbmcoMTYpO1xyXG4gICAgICAgIGEgPSBhLnRvU3RyaW5nKDE2KTtcclxuXHJcbiAgICAgICAgaWYgKHIubGVuZ3RoID09IDEpXHJcbiAgICAgICAgICAgIHIgPSBcIjBcIiArIHI7XHJcbiAgICAgICAgaWYgKGcubGVuZ3RoID09IDEpXHJcbiAgICAgICAgICAgIGcgPSBcIjBcIiArIGc7XHJcbiAgICAgICAgaWYgKGIubGVuZ3RoID09IDEpXHJcbiAgICAgICAgICAgIGIgPSBcIjBcIiArIGI7XHJcbiAgICAgICAgaWYgKGEubGVuZ3RoID09IDEpXHJcbiAgICAgICAgICAgIGEgPSBcIjBcIiArIGE7XHJcblxyXG4gICAgICAgIHJldHVybiBcIiNcIiArIHIgKyBnICsgYiArIGE7XHJcbiAgICB9XHJcbn1cclxuXHJcbnZhciB2YWx1ZVR5cGUgPSBPYmplY3QuZnJlZXplKHsgXCJzdHJpbmdcIjogMSwgXCJudW1iZXJcIjogMiwgXCJjb2xvclwiOiAzLCBcImVudW1cIjogNCB9KTtcclxuXHJcbmNsYXNzIFNpbXBsZVJ1bGUge1xyXG4gICAgY29uc3RydWN0b3IoYXR0cmlidXRlLCBhdHRyaWJ1dGVUeXBlLCB2YWx1ZSkge1xyXG4gICAgICAgIHRoaXMuX2F0dHJpYnV0ZSA9IGF0dHJpYnV0ZTtcclxuICAgICAgICB0aGlzLl92YWx1ZVR5cGUgPSBhdHRyaWJ1dGVUeXBlO1xyXG4gICAgICAgIHRoaXMuX3ZhbHVlID0gdmFsdWU7XHJcbiAgICAgICAgdGhpcy5fdmFsaWQgPSB0cnVlO1xyXG4gICAgfVxyXG5cclxuICAgIGFwcGx5KG9iaiwgc3R5KSB7XHJcbiAgICAgICAgc3R5W3RoaXMuX2F0dHJpYnV0ZV0gPSB0aGlzLl92YWx1ZTtcclxuICAgIH1cclxufVxyXG5cclxudmFyIGludGVycG9sYXRpb25UeXBlID0gT2JqZWN0LmZyZWV6ZSh7IFwibGluZWFyXCI6IDEgfSk7XHJcblxyXG5jbGFzcyBJbnRlcnBvbGF0ZWRSdWxlIHtcclxuICAgIGNvbnN0cnVjdG9yKGF0dHJpYnV0ZSwgcHJvcGVydHksIGludGVycG9sVHlwZSwgdmFsdWVUeXBlLCBjb250cm9sUG9pbnRzLCBhdHRyaWJ1dGVWYWx1ZXMsIHZhbGlkKSB7XHJcbiAgICAgICAgdGhpcy5fdHlwZSA9IGludGVycG9sVHlwZTtcclxuICAgICAgICB0aGlzLl9wcm9wZXJ0eSA9IHByb3BlcnR5O1xyXG4gICAgICAgIHRoaXMuX2F0dHJpYnV0ZSA9IGF0dHJpYnV0ZTtcclxuICAgICAgICB0aGlzLl92YWx1ZVR5cGUgPSB2YWx1ZVR5cGU7XHJcbiAgICAgICAgdGhpcy5fY29udHJvbFBvaW50cyA9IGNvbnRyb2xQb2ludHM7XHJcbiAgICAgICAgdGhpcy5fYXR0cmlidXRlVmFsdWVzID0gYXR0cmlidXRlVmFsdWVzO1xyXG4gICAgICAgIHRoaXMuX3ZhbGlkID0gdHJ1ZTsgLy9UT0RPOiBGSVggYWZ0ZXIgZGVidWdnaW5nXHJcbiAgICB9XHJcblxyXG4gICAgYXBwbHkob2JqLCBzdHkpIHtcclxuICAgICAgICBpZiAodGhpcy5fdHlwZSA9PSBpbnRlcnBvbGF0aW9uVHlwZS5saW5lYXIpIHtcclxuICAgICAgICAgICAgc3R5W3RoaXMuX2F0dHJpYnV0ZV0gPSB0aGlzLl9saW4ob2JqW3RoaXMuX3Byb3BlcnR5XSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIF9saW4oYWN0dWFsVmFsdWUpIHtcclxuICAgICAgICAvLyBmaW5kIHJhbmdlIHRoZSB2YWx1ZSBpcyBpbnNpZGUgb2YgYW5kIGludGVycG9sYXRlIGluc2lkZSBpdFxyXG4gICAgICAgIC8vIGFzc3VtZXMgYXNjZW5kaW5nIG9yZGVyIFxyXG4gICAgICAgIHZhciBpbmRleCA9IHRoaXMuX2ZpbmRJbmRleChhY3R1YWxWYWx1ZSk7XHJcblxyXG4gICAgICAgIC8vU21hbGxlciB0aGFuIGFsbCBjb250cm9sIHBvaW50c1xyXG4gICAgICAgIGlmKGluZGV4ID09IC0xKXtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2F0dHJpYnV0ZVZhbHVlc1swXTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vQmlnZ2VyIHRoYW4gYWxsIGNvbnRyb2wgcG9pbnRzXHJcbiAgICAgICAgaWYoaW5kZXggPT0gdGhpcy5fY29udHJvbFBvaW50cy5sZW5ndGgtMSl7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9hdHRyaWJ1dGVWYWx1ZXNbdGhpcy5fYXR0cmlidXRlVmFsdWVzLmxlbmd0aC0xXTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICh0aGlzLl92YWx1ZVR5cGUgPT0gdmFsdWVUeXBlLmNvbG9yKSB7XHJcbiAgICAgICAgICAgIC8vIGludGVycG9sYXRlIHJnYmEgdmFsdWVzXHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9saW5lYXJDb2xvckludGVycG9sYXRpb24oaW5kZXgsIGFjdHVhbFZhbHVlKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAvLyBub3JtYWwgaW50ZXJwb2xhdGlvbiBvZiBudW1iZXJcclxuXHJcbiAgICAgICAgICAgIC8vaW5zaWRlIHJhbmdlIGluZGV4ICYgaW5kZXggKyAxXHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9saW5lYXJJbnRlcnBvbGF0aW9uKGFjdHVhbFZhbHVlLCB0aGlzLl9jb250cm9sUG9pbnRzW2luZGV4XSwgdGhpcy5fYXR0cmlidXRlVmFsdWVzW2luZGV4XSwgdGhpcy5fY29udHJvbFBvaW50c1tpbmRleCsxXSwgdGhpcy5fYXR0cmlidXRlVmFsdWVzW2luZGV4KzFdKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgX2ZpbmRJbmRleCh4KSB7XHJcbiAgICAgICAgdmFyIGlkeCA9IC0xO1xyXG5cclxuICAgICAgICB3aGlsZSAoaWR4IDwgdGhpcy5fY29udHJvbFBvaW50cy5sZW5ndGggJiYgdGhpcy5fY29udHJvbFBvaW50c1tpZHgrMV0gPCB4KSB7XHJcbiAgICAgICAgICAgIGlkeCsrO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIGlkeDtcclxuICAgIH1cclxuXHJcbiAgICBfbGluZWFyQ29sb3JJbnRlcnBvbGF0aW9uKGFjdHVhbFZhbHVlLCBpZHgpIHtcclxuICAgICAgICB2YXIgeTAgPSB0aGlzLl9hdHRyaWJ1dGVWYWx1ZXNbaWR4XTtcclxuICAgICAgICB2YXIgeTEgPSB0aGlzLl9hdHRyaWJ1dGVWYWx1ZXNbaWR4KzFdO1xyXG5cclxuICAgICAgICB2YXIgcmVzdWx0ID0gMDtcclxuICAgICAgICB2YXIgbWFzayA9IDB4MDAwMDAwRkY7IC8vIGFscGhhIG1hc2tcclxuXHJcbiAgICAgICAgLy9mb3IgZWFjaCBjaGFubmVsIGludGVycG9sYXRlIHRoZSB2YWx1ZSBzZXBlcmF0ZWx5XHJcbiAgICAgICAgZm9yKHZhciBpID0gMDsgaSA8IDQ7IGkrKyl7XHJcbiAgICAgICAgICAgIHZhciB5MENoYW5uZWwgPSAoeTAgJiBtYXNrKSA+Pj4gaSo4O1xyXG4gICAgICAgICAgICB2YXIgeTFDaGFubmVsID0gKHkxICYgbWFzaykgPj4+IGkqODtcclxuXHJcbiAgICAgICAgICAgIHJlc3VsdCB8PSB0aGlzLl9saW5lYXJJbnRlcnBvbGF0aW9uKGFjdHVhbFZhbHVlLCB0aGlzLl9jb250cm9sUG9pbnRzW2lkeF0sIHkwQ2hhbm5lbCwgdGhpcy5fY29udHJvbFBvaW50c1tpZHgrMV0sIHkxQ2hhbm5lbCkgPDwgaSo4XHJcblxyXG4gICAgICAgICAgICBtYXNrID0gbWFzayA8PCA4O1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcclxuICAgIH1cclxuXHJcbiAgICBfbGluZWFySW50ZXJwb2xhdGlvbih4LCB4MCwgeTAsIHgxLCB5MSl7XHJcbiAgICAgICAgdmFyIGEgPSAoeTEgLSB5MCkgLyAoeDEgLSB4MClcclxuICAgICAgICB2YXIgYiA9IC1hICogeDAgKyB5MFxyXG4gICAgICAgIHJldHVybiBhICogeCArIGJcclxuICAgIH1cclxuXHJcbiAgICBfaXNJblJhbmdlKHZhbHVlLCBsb3dlciwgdXBwZXIpIHtcclxuICAgICAgICBpZiAodmFsdWUgPCBsb3dlcikge1xyXG4gICAgICAgICAgICByZXR1cm4gLTE7XHJcbiAgICAgICAgfSBlbHNlIGlmICh2YWx1ZSA+IHVwcGVyKSB7XHJcbiAgICAgICAgICAgIHJldHVybiAxO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIDA7XHJcbiAgICB9XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0ge1xyXG4gICAgUnVsZVBhcnNlclxyXG59IiwiY29uc3Qge1BhcnNlcn0gPSByZXF1aXJlKFwiLi9wYXJzZXIuanNcIik7XHJcbmNvbnN0IHtleHBsb3JlckV2ZW50LCBFdmVudFN0YXRlfSA9IHJlcXVpcmUoXCIuL2V2ZW50cy5qc1wiKTtcclxuXHJcbmNsYXNzIFNlbGVjdG9yUGFyc2VyIGV4dGVuZHMgUGFyc2VyIHtcclxuICAgIGNvbnN0cnVjdG9yKGNvbmZpZ3VyYXRpb24pIHtcclxuICAgICAgICBzdXBlcigpO1xyXG4gICAgICAgIHRoaXMuX2NvbmZpZyA9IGNvbmZpZ3VyYXRpb247XHJcbiAgICB9XHJcblxyXG4gICAgcGFyc2VTZWxlY3RvcihzdHJpbmcsIGlkeCkge1xyXG4gICAgICAgIHRoaXMuX2N1cklkeCA9IDA7XHJcbiAgICAgICAgdGhpcy5fbGl0ZXJhbCA9IHN0cmluZztcclxuICAgICAgICB0aGlzLl9ibG9jayA9IGlkeDtcclxuXHJcbiAgICAgICAgdmFyIGxpc3QgPSBbXTtcclxuXHJcbiAgICAgICAgZG8ge1xyXG4gICAgICAgICAgICB2YXIgZXhwID0gdGhpcy5fcGFyc2VFeHByZXNzaW9uKCk7XHJcblxyXG4gICAgICAgICAgICBpZiAoZXhwLnZhbGlkKSB7XHJcbiAgICAgICAgICAgICAgICBsaXN0LnB1c2goZXhwKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgIH0gd2hpbGUgKHRoaXMuX2N1ckNoYXIoKSA9PSAnLCcgJiYgdGhpcy5fbmV4dENoYXIoKSlcclxuICAgICAgICB2YXIgc2VsID0gbmV3IFNlbGVjdG9yKGxpc3QsIHRoaXMuX2NvbmZpZyk7XHJcblxyXG4gICAgICAgIGlmIChsaXN0Lmxlbmd0aCA9PSAwKSB7XHJcbiAgICAgICAgICAgIHNlbC52YWxpZCA9IGZhbHNlO1xyXG4gICAgICAgICAgICB0aGlzLl9lcnJvcihcIkJsb2NrIFwiICsgKHRoaXMuX2Jsb2NrICsgMSkgKyBcIiBoYXMgYmVlbiBza2lwcGVkLCBiZWNhdXNlIHRoZXJlIHdhcyBubyB2YWxpZCBzZWxlY3Rvci5cIik7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gc2VsO1xyXG4gICAgfVxyXG5cclxuICAgIF9wYXJzZUV4cHJlc3Npb24oKSB7XHJcblxyXG4gICAgICAgIHZhciBsZWZ0TW9zdCA9IHRoaXMuX3BhcnNlTGVmdE1vc3QoKTtcclxuXHJcbiAgICAgICAgaWYgKCFsZWZ0TW9zdC52YWxpZCkge1xyXG4gICAgICAgICAgICByZXR1cm4gbGVmdE1vc3Q7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAodGhpcy5fY3VyQ2hhcigpID09IFwiPlwiIHx8IHRoaXMuX2N1ckNoYXIoKSA9PSBcIjxcIikge1xyXG4gICAgICAgICAgICB2YXIgY2hhaW4gPSB0aGlzLl9jdXJDaGFyKCk7XHJcbiAgICAgICAgICAgIHRoaXMuX25leHRDaGFyKCk7XHJcbiAgICAgICAgICAgIHZhciByaWdodFNpZGUgPSB0aGlzLl9wYXJzZVJpZ2h0U2lkZShsZWZ0TW9zdCk7XHJcbiAgICAgICAgICAgIHJpZ2h0U2lkZS5jaGFpbk9wID0gY2hhaW47XHJcbiAgICAgICAgICAgIGxlZnRNb3N0LnJpZ2h0U2lkZSA9IHJpZ2h0U2lkZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBsZWZ0TW9zdDtcclxuICAgIH1cclxuXHJcbiAgICBfcGFyc2VMZWZ0TW9zdCgpIHtcclxuICAgICAgICB2YXIgbGVmdE1vc3QgPSBuZXcgU2VsZWN0b3JFeHByZXNzaW9uKCk7XHJcblxyXG4gICAgICAgIHRoaXMuX3BhcnNlVHlwZShsZWZ0TW9zdCk7XHJcblxyXG4gICAgICAgIGlmICh0aGlzLl9jdXJDaGFyKCkgPT0gXCJbXCIpIHtcclxuICAgICAgICAgICAgdGhpcy5fbmV4dENoYXIoKTtcclxuICAgICAgICAgICAgdGhpcy5fcGFyc2VBdHRyaWJ1dGVCbG9jayhsZWZ0TW9zdCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoIWxlZnRNb3N0LnZhbGlkKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBsZWZ0TW9zdDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuX3BhcnNlRXh0ZW5zaW9ucyhsZWZ0TW9zdCk7XHJcblxyXG4gICAgICAgIHJldHVybiBsZWZ0TW9zdDtcclxuICAgIH1cclxuXHJcbiAgICBfcGFyc2VSaWdodFNpZGUobm9kZSkge1xyXG4gICAgICAgIHZhciByaWdodHNpZGUgPSBuZXcgUmlnaHRTaWRlKCk7XHJcblxyXG4gICAgICAgIHRoaXMuX3BhcnNlVHlwZShyaWdodHNpZGUpO1xyXG5cclxuICAgICAgICBpZiAoIW5vZGUudmFsaWQpIHtcclxuICAgICAgICAgICAgcmlnaHRzaWRlLnZhbGlkID0gZmFsc2U7XHJcbiAgICAgICAgICAgIHJldHVybiByaWdodHNpZGU7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB2YXIgcGFyYW1Gb2xsb3cgPSBbJ1snLCAnIycsICc6JywgJywnLCAnLiddO1xyXG5cclxuICAgICAgICAvL2NoZWNrIGlmIHBhcmFtZXRlciBleGlzdHNcclxuICAgICAgICBpZiAoIXBhcmFtRm9sbG93LmluY2x1ZGVzKHRoaXMuX2N1ckNoYXIoKSkgJiYgdGhpcy5fY3VySWR4IDwgdGhpcy5fbGl0ZXJhbC5sZW5ndGgpIHtcclxuICAgICAgICAgICAgcmlnaHRzaWRlLnBhcmFtZXRlciA9IHRoaXMuX2dldFN0cmluZ1VudGlsKHBhcmFtRm9sbG93KTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICByaWdodHNpZGUucGFyYW1ldGVyID0gMTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICh0aGlzLl9jdXJDaGFyKCkgPT0gJ1snKSB7XHJcbiAgICAgICAgICAgIHRoaXMuX25leHRDaGFyKCk7XHJcbiAgICAgICAgICAgIHRoaXMuX3BhcnNlQXR0cmlidXRlQmxvY2socmlnaHRzaWRlKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICghbm9kZS52YWxpZCkge1xyXG4gICAgICAgICAgICByZXR1cm4gcmlnaHRzaWRlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5fcGFyc2VFeHRlbnNpb25zKHJpZ2h0c2lkZSk7XHJcblxyXG4gICAgICAgIGlmICh0aGlzLl9jdXJDaGFyKCkgPT0gJz4nIHx8IHRoaXMuX2N1ckNoYXIoKSA9PSAnPCcpIHtcclxuICAgICAgICAgICAgdmFyIGNoYWluID0gdGhpcy5fY3VyQ2hhcigpO1xyXG4gICAgICAgICAgICB0aGlzLl9uZXh0Q2hhcigpO1xyXG4gICAgICAgICAgICByaWdodHNpZGUucmlnaHRTaWRlID0gdGhpcy5fcGFyc2VSaWdodFNpZGUocmlnaHRzaWRlKTtcclxuICAgICAgICAgICAgcmlnaHRzaWRlLnJpZ2h0U2lkZS5jaGFpbk9wID0gY2hhaW47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gcmlnaHRzaWRlO1xyXG4gICAgfVxyXG5cclxuICAgIF9wYXJzZUF0dHJpYnV0ZUJsb2NrKG5vZGUpIHtcclxuICAgICAgICB2YXIgZm9sbG93SWQgPSBbJz0nLCAnficsICchJywgJzwnLCAnPicsICddJywgJywnXTtcclxuXHJcbiAgICAgICAgdmFyIGxpc3QgPSBbXTtcclxuXHJcbiAgICAgICAgZG8ge1xyXG4gICAgICAgICAgICB2YXIgaWQgPSB0aGlzLl9nZXRTdHJpbmdVbnRpbChmb2xsb3dJZCk7XHJcblxyXG4gICAgICAgICAgICBpZiAodGhpcy5fY3VyQ2hhcigpID09ICcsJykge1xyXG4gICAgICAgICAgICAgICAgbGlzdC5wdXNoKG5ldyBBdHRyaWJ1dGVDaGVjayhpZCwgdW5kZWZpbmVkLCB1bmRlZmluZWQpKVxyXG4gICAgICAgICAgICB9IGVsc2UgaWYgKHRoaXMuX2N1ckNoYXIoKSA9PSAnXScpIHtcclxuICAgICAgICAgICAgICAgIGxpc3QucHVzaChuZXcgQXR0cmlidXRlQ2hlY2soaWQsIHVuZGVmaW5lZCwgdW5kZWZpbmVkKSlcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICB9IGVsc2UgaWYgKHRoaXMuX2N1ckNoYXIoKSA9PSAnPScgfHwgdGhpcy5fY3VyQ2hhcigpID09ICc8JyB8fCB0aGlzLl9jdXJDaGFyKCkgPT0gJz4nKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgb3AgPSB0aGlzLl9jdXJDaGFyKCk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLl9uZXh0Q2hhcigpO1xyXG5cclxuICAgICAgICAgICAgICAgIGxpc3QucHVzaChuZXcgQXR0cmlidXRlQ2hlY2soaWQsIG9wLCB0aGlzLl9nZXRTdHJpbmdVbnRpbChbJywnLCAnXSddKSkpO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLl9jdXJDaGFyKCkgPT0gJ10nKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodGhpcy5fY3VyQ2hhcigpID09ICd+JyB8fCB0aGlzLl9jdXJDaGFyKCkgPT0gJyEnKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgb3AgPSB0aGlzLl9jdXJDaGFyKCk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLl9uZXh0Q2hhcigpO1xyXG4gICAgICAgICAgICAgICAgb3AgKz0gdGhpcy5fY3VyQ2hhcigpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5fbmV4dENoYXIoKTtcclxuXHJcbiAgICAgICAgICAgICAgICBsaXN0LnB1c2gobmV3IEF0dHJpYnV0ZUNoZWNrKGlkLCBvcCwgdGhpcy5fZ2V0U3RyaW5nVW50aWwoWycsJywgJ10nXSkpKTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5fY3VyQ2hhcigpID09ICddJykge1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgfSB3aGlsZSAodGhpcy5fbmV4dENoYXIoKSAmJiB0aGlzLl9jdXJDaGFyKCkgIT0gJ10nKVxyXG5cclxuICAgICAgICBub2RlLmF0dHJDaGVja2xpc3QgPSBsaXN0O1xyXG5cclxuICAgICAgICBpZiAodGhpcy5fY3VyQ2hhcigpICE9ICddJykge1xyXG4gICAgICAgICAgICBub2RlLnZhbGlkID0gZmFsc2U7XHJcbiAgICAgICAgICAgIHRoaXMuX2Vycm9yKFwiQmxvY2sgXCIgKyAodGhpcy5fYmxvY2sgKyAxKSArIFwiIGhhcyBiZWVuIHNraXBwZWQsIGJlY2F1c2Ugb2YgbWlzc2luZyBicmFja2V0LiBFeHBlY3RlZCAnXScuXCIpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5fbmV4dENoYXIoKTtcclxuICAgIH1cclxuXHJcbiAgICBfcGFyc2VFeHRlbnNpb25zKG5vZGUpIHtcclxuXHJcbiAgICAgICAgdmFyIGZvbGxvdyA9IFsnIycsICcuJywgJywnLCAnOicsICc+JywgJzwnXTtcclxuICAgICAgICB2YXIgaGFzSWQgPSBmYWxzZTtcclxuXHJcbiAgICAgICAgd2hpbGUgKFsnIycsICcuJywgJzonXS5pbmNsdWRlcyh0aGlzLl9jdXJDaGFyKCkpKSB7XHJcblxyXG4gICAgICAgICAgICBpZiAodGhpcy5fY3VyQ2hhcigpID09ICcjJykge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5fbmV4dENoYXIoKTtcclxuICAgICAgICAgICAgICAgIGlmICghaGFzSWQpIHtcclxuICAgICAgICAgICAgICAgICAgICBub2RlLmF0dHJDaGVja2xpc3QucHVzaChuZXcgQXR0cmlidXRlQ2hlY2soJ2lkJywgJz0nLCB0aGlzLl9nZXRTdHJpbmdVbnRpbChmb2xsb3cpKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgaGFzSWQgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLl9nZXRTdHJpbmdVbnRpbChmb2xsb3cpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX3dhcm5pbmcoXCJNdWx0aXBsZSBJZHMgYXJlIG5vdCBzdXBwb3J0ZWQsIG9ubHkgdGhlIGZpcnN0IG9uZSB3aWxsIGJlIHVzZWQuXCIpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2UgaWYgKHRoaXMuX2N1ckNoYXIoKSA9PSAnLicpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuX25leHRDaGFyKCk7XHJcbiAgICAgICAgICAgICAgICBub2RlLmF0dHJDaGVja2xpc3QucHVzaChuZXcgQXR0cmlidXRlQ2hlY2soJ3RhZ3MnLCAnfj0nLCB0aGlzLl9nZXRTdHJpbmdVbnRpbChmb2xsb3cpKSk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLl9uZXh0Q2hhcigpO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmKG5vZGUuZXZlbnRTdGF0ZSA9PSB1bmRlZmluZWQpe1xyXG4gICAgICAgICAgICAgICAgICAgIG5vZGVbXCJldmVudFN0YXRlXCJdID0gbmV3IEV2ZW50U3RhdGUoKTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICB2YXIgZXZlbnQgPSB0aGlzLl9nZXRTdHJpbmdVbnRpbChmb2xsb3cpO1xyXG4gICAgICAgICAgICAgICAgaWYoIWV4cGxvcmVyRXZlbnQuaGFzT3duUHJvcGVydHkoZXZlbnQpKXtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLl93YXJuaW5nKFwiSWdub3JpbmcgdW5rbm93biBFdmVudCAnXCIrZXZlbnQrXCInLlwiKTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbm9kZS5ldmVudFN0YXRlLnNldChleHBsb3JlckV2ZW50W2V2ZW50XSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICghWyc+JywgJzwnLCAnLCddLmluY2x1ZGVzKHRoaXMuX2N1ckNoYXIoKSkgJiYgdGhpcy5fY3VySWR4ID09IHRoaXMuX2xpdGVyYWwubGVuZ3RoIC0gMSkge1xyXG4gICAgICAgICAgICBub2RlLnZhbGlkID0gZmFsc2U7XHJcbiAgICAgICAgICAgIHRoaXMuX2Vycm9yKFwiQmxvY2sgXCIgKyAodGhpcy5fYmxvY2sgKyAxKSArIFwiIGhhcyBiZWVuIHNraXBwZWQuIEV4cGVjdGVkICc+JywgJzwnIG9yICcsJy5cIik7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIF9wYXJzZVR5cGUobm9kZSkge1xyXG4gICAgICAgIGlmICh0aGlzLl9jdXJDaGFyKCkgPT0gXCJsXCIpIHtcclxuICAgICAgICAgICAgbm9kZS50eXBlID0gXCJsXCI7XHJcbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLl9jdXJDaGFyKCkgPT0gXCJlXCIpIHtcclxuICAgICAgICAgICAgbm9kZS50eXBlID0gXCJlXCI7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgbm9kZS52YWxpZCA9IGZhbHNlO1xyXG4gICAgICAgICAgICB0aGlzLl9lcnJvcihcIkJsb2NrIFwiICsgKHRoaXMuX2Jsb2NrICsgMSkgKyBcIiBoYXMgYmVlbiBza2lwcGVkLCBiZWNhdXNlIG9mIG1pc3NpbmcgdHlwZS4gRXhwZWN0ZWQgJ2UnIG9yICdsJy5cIik7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLl9uZXh0Q2hhcigpO1xyXG4gICAgfVxyXG59XHJcblxyXG5jbGFzcyBOb2RlIHtcclxuICAgIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgICAgIHRoaXMudmFsaWQgPSB0cnVlO1xyXG4gICAgfVxyXG59XHJcbi8vIFRPRE86IGFsbG93IGJldHRlciBjdXN0b21pemF0aW9uIG9mIGNsYXNzIGxvY2F0aW9uXHJcbmNsYXNzIFNlbGVjdG9yIGV4dGVuZHMgTm9kZSB7XHJcbiAgICBjb25zdHJ1Y3RvcihleHByZXNzaW9ucywgY29uZmlnKSB7XHJcbiAgICAgICAgc3VwZXIoKTtcclxuICAgICAgICB0aGlzLl9leHByZXNzaW9ucyA9IGV4cHJlc3Npb25zO1xyXG4gICAgICAgIHRoaXMuX2NvbmZpZyA9IGNvbmZpZztcclxuICAgIH1cclxuXHJcbiAgICB2YWxpZGF0ZU9iamVjdChvYmope1xyXG4gICAgICAgcmV0dXJuIG9iai5oYXNPd25Qcm9wZXJ0eSh0aGlzLl9jb25maWcuY2xhc3NQcm9wZXJ0eSk7XHJcbiAgICB9XHJcblxyXG4gICAgdGVzdChvYmosIHN0eSl7XHJcblxyXG4gICAgICAgIGlmKCF0aGlzLnZhbGlkYXRlT2JqZWN0KG9iaikpe1xyXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZih0aGlzLl9leHByZXNzaW9ucy5ldmVyeShleHAgPT4ge3JldHVybiBleHAuZXZlbnRTdGF0ZSAhPSB1bmRlZmluZWQgJiYgc3R5LmV2ZW50U3RhdGUuc3RhdGUgIT0gZXhwLmV2ZW50U3RhdGUuc3RhdGV9KSl7XHJcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiB0aGlzLl9leHByZXNzaW9ucy5zb21lKGV4cCA9PiB7XHJcbiAgICAgICAgICAgIC8vZGlmZmVyZW50aWF0ZSBiZXR3ZWVuIGxpbmtzIGFuZCBlbnRpdGllc1xyXG4gICAgICAgICAgICBpZihleHAudHlwZSAhPSBvYmpbdGhpcy5fY29uZmlnLmNsYXNzUHJvcGVydHldKXtcclxuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gZXhwLmF0dHJDaGVja2xpc3QuZXZlcnkoYXR0ckNoZWNrID0+IHtcclxuXHJcbiAgICAgICAgICAgICAgICBpZihhdHRyQ2hlY2suY29tcGFyYXRvciA9PT0gdW5kZWZpbmVkIHx8IGF0dHJDaGVjay52YWx1ZSA9PT0gdW5kZWZpbmVkKXtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gb2JqLmhhc093blByb3BlcnR5KGF0dHJDaGVjay5pZCk7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmKCFvYmouaGFzT3duUHJvcGVydHkoYXR0ckNoZWNrLmlkKSl7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHN3aXRjaChhdHRyQ2hlY2suY29tcGFyYXRvcil7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgJz0nIDogXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gKG9ialthdHRyQ2hlY2suaWRdID09IGF0dHJDaGVjay52YWx1ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgJyE9JzpcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAob2JqW2F0dHJDaGVjay5pZF0gIT0gYXR0ckNoZWNrLnZhbHVlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSAnfj0nOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIChvYmpbYXR0ckNoZWNrLmlkXS5zcGxpdCh0aGlzLl9jb25maWcudGFnTGlzdFNlcGFyYXRvcikuaW5jbHVkZXMoYXR0ckNoZWNrLnZhbHVlKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgJz4nIDpcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAob2JqW2F0dHJDaGVjay5pZF0gPiBhdHRyQ2hlY2sudmFsdWUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjYXNlICc8JyA6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gKG9ialthdHRyQ2hlY2suaWRdIDwgYXR0ckNoZWNrLnZhbHVlKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAvL1RPRE86IEdyYXBoIFRyYXZlcnNhbCBjaGVja3MsIGNvbXBsZXggZXhwcmVzc2lvbnMgZXRjLlxyXG4gICAgfVxyXG5cclxuXHJcbn1cclxuXHJcbmNsYXNzIFNlbGVjdG9yRXhwcmVzc2lvbiBleHRlbmRzIE5vZGUge1xyXG4gICAgY29uc3RydWN0b3IoKSB7XHJcbiAgICAgICAgc3VwZXIoKTtcclxuICAgICAgICB0aGlzLnR5cGU7XHJcbiAgICAgICAgdGhpcy5ldmVudFN0YXRlO1xyXG4gICAgICAgIHRoaXMuYXR0ckNoZWNrbGlzdCA9IFtdO1xyXG4gICAgICAgIHRoaXMucmlnaHRTaWRlO1xyXG4gICAgfVxyXG59XHJcblxyXG5jbGFzcyBSaWdodFNpZGUgZXh0ZW5kcyBTZWxlY3RvckV4cHJlc3Npb24ge1xyXG4gICAgY29uc3RydWN0b3IoKSB7XHJcbiAgICAgICAgc3VwZXIoKTtcclxuICAgICAgICB0aGlzLnBhcmFtZXRlcjtcclxuICAgICAgICB0aGlzLmNoYWluT3A7XHJcbiAgICB9XHJcbn1cclxuXHJcbmNsYXNzIEF0dHJpYnV0ZUNoZWNrIGV4dGVuZHMgTm9kZSB7XHJcbiAgICBjb25zdHJ1Y3RvcihpZCwgY29tcGFyYXRvciwgdmFsdWUpIHtcclxuICAgICAgICBzdXBlcigpO1xyXG4gICAgICAgIHRoaXMuaWQgPSBpZDtcclxuICAgICAgICB0aGlzLmNvbXBhcmF0b3IgPSBjb21wYXJhdG9yO1xyXG4gICAgICAgIHRoaXMudmFsdWUgPSB2YWx1ZTtcclxuICAgIH1cclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSB7XHJcbiAgICBTZWxlY3RvclBhcnNlclxyXG59OyJdfQ==
