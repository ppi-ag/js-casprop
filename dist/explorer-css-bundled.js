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
    constructor(classProperty='class', tagListSeparator=' '){
        //initialize parser object
        this._parser = new _cssjs.cssjs();

        //Array of css units {selector = "", rules = [{directive = "", value  = ""} ...]}
        this.rawCSS = [];

        //parsed css blocks ready to be applied to objects
        this.stylings = [];

        this.selectorConfig = {
            classProperty: classProperty,
            tagListSeparator: tagListSeparator,
        }
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

//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvam90Zm9ybS1jc3MuanMvY3NzLmpzIiwic3JjL2V2ZW50cy5qcyIsInNyYy9leHBsb3Jlci1jc3MuanMiLCJzcmMvcGFyc2VyLmpzIiwic3JjL3J1bGUtcGFyc2VyLmpzIiwic3JjL3NlbGVjdG9yLXBhcnNlci5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25xQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNVNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24oKXtmdW5jdGlvbiByKGUsbix0KXtmdW5jdGlvbiBvKGksZil7aWYoIW5baV0pe2lmKCFlW2ldKXt2YXIgYz1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlO2lmKCFmJiZjKXJldHVybiBjKGksITApO2lmKHUpcmV0dXJuIHUoaSwhMCk7dmFyIGE9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitpK1wiJ1wiKTt0aHJvdyBhLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsYX12YXIgcD1uW2ldPXtleHBvcnRzOnt9fTtlW2ldWzBdLmNhbGwocC5leHBvcnRzLGZ1bmN0aW9uKHIpe3ZhciBuPWVbaV1bMV1bcl07cmV0dXJuIG8obnx8cil9LHAscC5leHBvcnRzLHIsZSxuLHQpfXJldHVybiBuW2ldLmV4cG9ydHN9Zm9yKHZhciB1PVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmUsaT0wO2k8dC5sZW5ndGg7aSsrKW8odFtpXSk7cmV0dXJuIG99cmV0dXJuIHJ9KSgpIiwiLyoganNoaW50IHVudXNlZDpmYWxzZSAqL1xuLyogZ2xvYmFsIHdpbmRvdywgY29uc29sZSAqL1xuKGZ1bmN0aW9uKGdsb2JhbCkge1xuICAndXNlIHN0cmljdCc7XG4gIHZhciBmaSA9IGZ1bmN0aW9uKCkge1xuXG4gICAgdGhpcy5jc3NJbXBvcnRTdGF0ZW1lbnRzID0gW107XG4gICAgdGhpcy5jc3NLZXlmcmFtZVN0YXRlbWVudHMgPSBbXTtcblxuICAgIHRoaXMuY3NzUmVnZXggPSBuZXcgUmVnRXhwKCcoW1xcXFxzXFxcXFNdKj8peyhbXFxcXHNcXFxcU10qPyl9JywgJ2dpJyk7XG4gICAgdGhpcy5jc3NNZWRpYVF1ZXJ5UmVnZXggPSAnKChAbWVkaWEgW1xcXFxzXFxcXFNdKj8peyhbXFxcXHNcXFxcU10qP31cXFxccyo/KX0pJztcbiAgICB0aGlzLmNzc0tleWZyYW1lUmVnZXggPSAnKChALio/a2V5ZnJhbWVzIFtcXFxcc1xcXFxTXSo/KXsoW1xcXFxzXFxcXFNdKj99XFxcXHMqPyl9KSc7XG4gICAgdGhpcy5jb21iaW5lZENTU1JlZ2V4ID0gJygoXFxcXHMqPyg/OlxcXFwvXFxcXCpbXFxcXHNcXFxcU10qP1xcXFwqXFxcXC8pP1xcXFxzKj9AbWVkaWFbXFxcXHNcXFxcU10qPyl7KFtcXFxcc1xcXFxTXSo/KX1cXFxccyo/fSl8KChbXFxcXHNcXFxcU10qPyl7KFtcXFxcc1xcXFxTXSo/KX0pJzsgLy90byBtYXRjaCBjc3MgJiBtZWRpYSBxdWVyaWVzIHRvZ2V0aGVyXG4gICAgdGhpcy5jc3NDb21tZW50c1JlZ2V4ID0gJyhcXFxcL1xcXFwqW1xcXFxzXFxcXFNdKj9cXFxcKlxcXFwvKSc7XG4gICAgdGhpcy5jc3NJbXBvcnRTdGF0ZW1lbnRSZWdleCA9IG5ldyBSZWdFeHAoJ0BpbXBvcnQgLio/OycsICdnaScpO1xuICB9O1xuXG4gIC8qXG4gICAgU3RyaXAgb3V0cyBjc3MgY29tbWVudHMgYW5kIHJldHVybnMgY2xlYW5lZCBjc3Mgc3RyaW5nXG5cbiAgICBAcGFyYW0gY3NzLCB0aGUgb3JpZ2luYWwgY3NzIHN0cmluZyB0byBiZSBzdGlwcGVkIG91dCBvZiBjb21tZW50c1xuXG4gICAgQHJldHVybiBjbGVhbmVkQ1NTIGNvbnRhaW5zIG5vIGNzcyBjb21tZW50c1xuICAqL1xuICBmaS5wcm90b3R5cGUuc3RyaXBDb21tZW50cyA9IGZ1bmN0aW9uKGNzc1N0cmluZykge1xuICAgIHZhciByZWdleCA9IG5ldyBSZWdFeHAodGhpcy5jc3NDb21tZW50c1JlZ2V4LCAnZ2knKTtcblxuICAgIHJldHVybiBjc3NTdHJpbmcucmVwbGFjZShyZWdleCwgJycpO1xuICB9O1xuXG4gIC8qXG4gICAgUGFyc2VzIGdpdmVuIGNzcyBzdHJpbmcsIGFuZCByZXR1cm5zIGNzcyBvYmplY3RcbiAgICBrZXlzIGFzIHNlbGVjdG9ycyBhbmQgdmFsdWVzIGFyZSBjc3MgcnVsZXNcbiAgICBlbGltaW5hdGVzIGFsbCBjc3MgY29tbWVudHMgYmVmb3JlIHBhcnNpbmdcblxuICAgIEBwYXJhbSBzb3VyY2UgY3NzIHN0cmluZyB0byBiZSBwYXJzZWRcblxuICAgIEByZXR1cm4gb2JqZWN0IGNzc1xuICAqL1xuICBmaS5wcm90b3R5cGUucGFyc2VDU1MgPSBmdW5jdGlvbihzb3VyY2UpIHtcblxuICAgIGlmIChzb3VyY2UgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIFtdO1xuICAgIH1cblxuICAgIHZhciBjc3MgPSBbXTtcbiAgICAvL3N0cmlwIG91dCBjb21tZW50c1xuICAgIC8vc291cmNlID0gdGhpcy5zdHJpcENvbW1lbnRzKHNvdXJjZSk7XG5cbiAgICAvL2dldCBpbXBvcnQgc3RhdGVtZW50c1xuXG4gICAgd2hpbGUgKHRydWUpIHtcbiAgICAgIHZhciBpbXBvcnRzID0gdGhpcy5jc3NJbXBvcnRTdGF0ZW1lbnRSZWdleC5leGVjKHNvdXJjZSk7XG4gICAgICBpZiAoaW1wb3J0cyAhPT0gbnVsbCkge1xuICAgICAgICB0aGlzLmNzc0ltcG9ydFN0YXRlbWVudHMucHVzaChpbXBvcnRzWzBdKTtcbiAgICAgICAgY3NzLnB1c2goe1xuICAgICAgICAgIHNlbGVjdG9yOiAnQGltcG9ydHMnLFxuICAgICAgICAgIHR5cGU6ICdpbXBvcnRzJyxcbiAgICAgICAgICBzdHlsZXM6IGltcG9ydHNbMF1cbiAgICAgICAgfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG4gICAgc291cmNlID0gc291cmNlLnJlcGxhY2UodGhpcy5jc3NJbXBvcnRTdGF0ZW1lbnRSZWdleCwgJycpO1xuICAgIC8vZ2V0IGtleWZyYW1lIHN0YXRlbWVudHNcbiAgICB2YXIga2V5ZnJhbWVzUmVnZXggPSBuZXcgUmVnRXhwKHRoaXMuY3NzS2V5ZnJhbWVSZWdleCwgJ2dpJyk7XG4gICAgdmFyIGFycjtcbiAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgYXJyID0ga2V5ZnJhbWVzUmVnZXguZXhlYyhzb3VyY2UpO1xuICAgICAgaWYgKGFyciA9PT0gbnVsbCkge1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICAgIGNzcy5wdXNoKHtcbiAgICAgICAgc2VsZWN0b3I6ICdAa2V5ZnJhbWVzJyxcbiAgICAgICAgdHlwZTogJ2tleWZyYW1lcycsXG4gICAgICAgIHN0eWxlczogYXJyWzBdXG4gICAgICB9KTtcbiAgICB9XG4gICAgc291cmNlID0gc291cmNlLnJlcGxhY2Uoa2V5ZnJhbWVzUmVnZXgsICcnKTtcblxuICAgIC8vdW5pZmllZCByZWdleFxuICAgIHZhciB1bmlmaWVkID0gbmV3IFJlZ0V4cCh0aGlzLmNvbWJpbmVkQ1NTUmVnZXgsICdnaScpO1xuXG4gICAgd2hpbGUgKHRydWUpIHtcbiAgICAgIGFyciA9IHVuaWZpZWQuZXhlYyhzb3VyY2UpO1xuICAgICAgaWYgKGFyciA9PT0gbnVsbCkge1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICAgIHZhciBzZWxlY3RvciA9ICcnO1xuICAgICAgaWYgKGFyclsyXSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHNlbGVjdG9yID0gYXJyWzVdLnNwbGl0KCdcXHJcXG4nKS5qb2luKCdcXG4nKS50cmltKCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzZWxlY3RvciA9IGFyclsyXS5zcGxpdCgnXFxyXFxuJykuam9pbignXFxuJykudHJpbSgpO1xuICAgICAgfVxuXG4gICAgICAvKlxuICAgICAgICBmZXRjaCBjb21tZW50cyBhbmQgYXNzb2NpYXRlIGl0IHdpdGggY3VycmVudCBzZWxlY3RvclxuICAgICAgKi9cbiAgICAgIHZhciBjb21tZW50c1JlZ2V4ID0gbmV3IFJlZ0V4cCh0aGlzLmNzc0NvbW1lbnRzUmVnZXgsICdnaScpO1xuICAgICAgdmFyIGNvbW1lbnRzID0gY29tbWVudHNSZWdleC5leGVjKHNlbGVjdG9yKTtcbiAgICAgIGlmIChjb21tZW50cyAhPT0gbnVsbCkge1xuICAgICAgICBzZWxlY3RvciA9IHNlbGVjdG9yLnJlcGxhY2UoY29tbWVudHNSZWdleCwgJycpLnRyaW0oKTtcbiAgICAgIH1cblxuICAgICAgLy8gTmV2ZXIgaGF2ZSBtb3JlIHRoYW4gYSBzaW5nbGUgbGluZSBicmVhayBpbiBhIHJvd1xuICAgICAgc2VsZWN0b3IgPSBzZWxlY3Rvci5yZXBsYWNlKC9cXG4rLywgXCJcXG5cIik7XG5cbiAgICAgIC8vZGV0ZXJtaW5lIHRoZSB0eXBlXG4gICAgICBpZiAoc2VsZWN0b3IuaW5kZXhPZignQG1lZGlhJykgIT09IC0xKSB7XG4gICAgICAgIC8vd2UgaGF2ZSBhIG1lZGlhIHF1ZXJ5XG4gICAgICAgIHZhciBjc3NPYmplY3QgPSB7XG4gICAgICAgICAgc2VsZWN0b3I6IHNlbGVjdG9yLFxuICAgICAgICAgIHR5cGU6ICdtZWRpYScsXG4gICAgICAgICAgc3ViU3R5bGVzOiB0aGlzLnBhcnNlQ1NTKGFyclszXSArICdcXG59JykgLy9yZWN1cnNpdmVseSBwYXJzZSBtZWRpYSBxdWVyeSBpbm5lciBjc3NcbiAgICAgICAgfTtcbiAgICAgICAgaWYgKGNvbW1lbnRzICE9PSBudWxsKSB7XG4gICAgICAgICAgY3NzT2JqZWN0LmNvbW1lbnRzID0gY29tbWVudHNbMF07XG4gICAgICAgIH1cbiAgICAgICAgY3NzLnB1c2goY3NzT2JqZWN0KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vd2UgaGF2ZSBzdGFuZGFyZCBjc3NcbiAgICAgICAgdmFyIHJ1bGVzID0gdGhpcy5wYXJzZVJ1bGVzKGFycls2XSk7XG4gICAgICAgIHZhciBzdHlsZSA9IHtcbiAgICAgICAgICBzZWxlY3Rvcjogc2VsZWN0b3IsXG4gICAgICAgICAgcnVsZXM6IHJ1bGVzXG4gICAgICAgIH07XG4gICAgICAgIGlmIChzZWxlY3RvciA9PT0gJ0Bmb250LWZhY2UnKSB7XG4gICAgICAgICAgc3R5bGUudHlwZSA9ICdmb250LWZhY2UnO1xuICAgICAgICB9XG4gICAgICAgIGlmIChjb21tZW50cyAhPT0gbnVsbCkge1xuICAgICAgICAgIHN0eWxlLmNvbW1lbnRzID0gY29tbWVudHNbMF07XG4gICAgICAgIH1cbiAgICAgICAgY3NzLnB1c2goc3R5bGUpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBjc3M7XG4gIH07XG5cbiAgLypcbiAgICBwYXJzZXMgZ2l2ZW4gc3RyaW5nIGNvbnRhaW5pbmcgY3NzIGRpcmVjdGl2ZXNcbiAgICBhbmQgcmV0dXJucyBhbiBhcnJheSBvZiBvYmplY3RzIGNvbnRhaW5pbmcgcnVsZU5hbWU6cnVsZVZhbHVlIHBhaXJzXG5cbiAgICBAcGFyYW0gcnVsZXMsIGNzcyBkaXJlY3RpdmUgc3RyaW5nIGV4YW1wbGVcbiAgICAgICAgXFxuXFxuY29sb3I6d2hpdGU7XFxuICAgIGZvbnQtc2l6ZToxOHB4O1xcblxuICAqL1xuICBmaS5wcm90b3R5cGUucGFyc2VSdWxlcyA9IGZ1bmN0aW9uKHJ1bGVzKSB7XG4gICAgLy9jb252ZXJ0IGFsbCB3aW5kb3dzIHN0eWxlIGxpbmUgZW5kaW5ncyB0byB1bml4IHN0eWxlIGxpbmUgZW5kaW5nc1xuICAgIHJ1bGVzID0gcnVsZXMuc3BsaXQoJ1xcclxcbicpLmpvaW4oJ1xcbicpO1xuICAgIHZhciByZXQgPSBbXTtcblxuICAgIHJ1bGVzID0gcnVsZXMuc3BsaXQoJzsnKTtcblxuICAgIC8vcHJvY2Nlc3MgcnVsZXMgbGluZSBieSBsaW5lXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBydWxlcy5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIGxpbmUgPSBydWxlc1tpXTtcblxuICAgICAgLy9kZXRlcm1pbmUgaWYgbGluZSBpcyBhIHZhbGlkIGNzcyBkaXJlY3RpdmUsIGllIGNvbG9yOndoaXRlO1xuICAgICAgbGluZSA9IGxpbmUudHJpbSgpO1xuICAgICAgaWYgKGxpbmUuaW5kZXhPZignOicpICE9PSAtMSkge1xuICAgICAgICAvL2xpbmUgY29udGFpbnMgOlxuICAgICAgICBsaW5lID0gbGluZS5zcGxpdCgnOicpO1xuICAgICAgICB2YXIgY3NzRGlyZWN0aXZlID0gbGluZVswXS50cmltKCk7XG4gICAgICAgIHZhciBjc3NWYWx1ZSA9IGxpbmUuc2xpY2UoMSkuam9pbignOicpLnRyaW0oKTtcblxuICAgICAgICAvL21vcmUgY2hlY2tzXG4gICAgICAgIGlmIChjc3NEaXJlY3RpdmUubGVuZ3RoIDwgMSB8fCBjc3NWYWx1ZS5sZW5ndGggPCAxKSB7XG4gICAgICAgICAgY29udGludWU7IC8vdGhlcmUgaXMgbm8gY3NzIGRpcmVjdGl2ZSBvciB2YWx1ZSB0aGF0IGlzIG9mIGxlbmd0aCAxIG9yIDBcbiAgICAgICAgICAvLyBQTEFJTiBXUk9ORyBXSEFUIEFCT1VUIG1hcmdpbjowOyA/XG4gICAgICAgIH1cblxuICAgICAgICAvL3B1c2ggcnVsZVxuICAgICAgICByZXQucHVzaCh7XG4gICAgICAgICAgZGlyZWN0aXZlOiBjc3NEaXJlY3RpdmUsXG4gICAgICAgICAgdmFsdWU6IGNzc1ZhbHVlXG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy9pZiB0aGVyZSBpcyBubyAnOicsIGJ1dCB3aGF0IGlmIGl0IHdhcyBtaXMgc3BsaXR0ZWQgdmFsdWUgd2hpY2ggc3RhcnRzIHdpdGggYmFzZTY0XG4gICAgICAgIGlmIChsaW5lLnRyaW0oKS5zdWJzdHIoMCwgNykgPT09ICdiYXNlNjQsJykgeyAvL2hhY2sgOilcbiAgICAgICAgICByZXRbcmV0Lmxlbmd0aCAtIDFdLnZhbHVlICs9IGxpbmUudHJpbSgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vYWRkIHJ1bGUsIGV2ZW4gaWYgaXQgaXMgZGVmZWN0aXZlXG4gICAgICAgICAgaWYgKGxpbmUubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgcmV0LnB1c2goe1xuICAgICAgICAgICAgICBkaXJlY3RpdmU6ICcnLFxuICAgICAgICAgICAgICB2YWx1ZTogbGluZSxcbiAgICAgICAgICAgICAgZGVmZWN0aXZlOiB0cnVlXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gcmV0OyAvL3dlIGFyZSBkb25lIVxuICB9O1xuICAvKlxuICAgIGp1c3QgcmV0dXJucyB0aGUgcnVsZSBoYXZpbmcgZ2l2ZW4gZGlyZWN0aXZlXG4gICAgaWYgbm90IGZvdW5kIHJldHVybnMgZmFsc2U7XG4gICovXG4gIGZpLnByb3RvdHlwZS5maW5kQ29ycmVzcG9uZGluZ1J1bGUgPSBmdW5jdGlvbihydWxlcywgZGlyZWN0aXZlLCB2YWx1ZSkge1xuICAgIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICB2YWx1ZSA9IGZhbHNlO1xuICAgIH1cbiAgICB2YXIgcmV0ID0gZmFsc2U7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBydWxlcy5sZW5ndGg7IGkrKykge1xuICAgICAgaWYgKHJ1bGVzW2ldLmRpcmVjdGl2ZSA9PT0gZGlyZWN0aXZlKSB7XG4gICAgICAgIHJldCA9IHJ1bGVzW2ldO1xuICAgICAgICBpZiAodmFsdWUgPT09IHJ1bGVzW2ldLnZhbHVlKSB7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJldDtcbiAgfTtcblxuICAvKlxuICAgICAgRmluZHMgc3R5bGVzIHRoYXQgaGF2ZSBnaXZlbiBzZWxlY3RvciwgY29tcHJlc3MgdGhlbSxcbiAgICAgIGFuZCByZXR1cm5zIHRoZW1cbiAgKi9cbiAgZmkucHJvdG90eXBlLmZpbmRCeVNlbGVjdG9yID0gZnVuY3Rpb24oY3NzT2JqZWN0QXJyYXksIHNlbGVjdG9yLCBjb250YWlucykge1xuICAgIGlmIChjb250YWlucyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICBjb250YWlucyA9IGZhbHNlO1xuICAgIH1cblxuICAgIHZhciBmb3VuZCA9IFtdO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY3NzT2JqZWN0QXJyYXkubGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmIChjb250YWlucyA9PT0gZmFsc2UpIHtcbiAgICAgICAgaWYgKGNzc09iamVjdEFycmF5W2ldLnNlbGVjdG9yID09PSBzZWxlY3Rvcikge1xuICAgICAgICAgIGZvdW5kLnB1c2goY3NzT2JqZWN0QXJyYXlbaV0pO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAoY3NzT2JqZWN0QXJyYXlbaV0uc2VsZWN0b3IuaW5kZXhPZihzZWxlY3RvcikgIT09IC0xKSB7XG4gICAgICAgICAgZm91bmQucHVzaChjc3NPYmplY3RBcnJheVtpXSk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgIH1cbiAgICBpZiAoc2VsZWN0b3IgPT09ICdAaW1wb3J0cycgfHwgZm91bmQubGVuZ3RoIDwgMikge1xuICAgICAgcmV0dXJuIGZvdW5kO1xuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgYmFzZSA9IGZvdW5kWzBdO1xuICAgICAgZm9yIChpID0gMTsgaSA8IGZvdW5kLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHRoaXMuaW50ZWxsaWdlbnRDU1NQdXNoKFtiYXNlXSwgZm91bmRbaV0pO1xuICAgICAgfVxuICAgICAgcmV0dXJuIFtiYXNlXTsgLy93ZSBhcmUgZG9uZSEhIGFsbCBwcm9wZXJ0aWVzIG1lcmdlZCBpbnRvIGJhc2UhXG4gICAgfVxuICB9O1xuXG4gIC8qXG4gICAgZGVsZXRlcyBjc3NPYmplY3RzIGhhdmluZyBnaXZlbiBzZWxlY3RvciwgYW5kIHJldHVybnMgbmV3IGFycmF5XG4gICovXG4gIGZpLnByb3RvdHlwZS5kZWxldGVCeVNlbGVjdG9yID0gZnVuY3Rpb24oY3NzT2JqZWN0QXJyYXksIHNlbGVjdG9yKSB7XG4gICAgdmFyIHJldCA9IFtdO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY3NzT2JqZWN0QXJyYXkubGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmIChjc3NPYmplY3RBcnJheVtpXS5zZWxlY3RvciAhPT0gc2VsZWN0b3IpIHtcbiAgICAgICAgcmV0LnB1c2goY3NzT2JqZWN0QXJyYXlbaV0pO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmV0O1xuICB9O1xuXG4gIC8qXG4gICAgICBDb21wcmVzc2VzIGdpdmVuIGNzc09iamVjdEFycmF5IGFuZCB0cmllcyB0byBtaW5pbWl6ZVxuICAgICAgc2VsZWN0b3IgcmVkdW5kZW5jZS5cbiAgKi9cbiAgZmkucHJvdG90eXBlLmNvbXByZXNzQ1NTID0gZnVuY3Rpb24oY3NzT2JqZWN0QXJyYXkpIHtcbiAgICB2YXIgY29tcHJlc3NlZCA9IFtdO1xuICAgIHZhciBkb25lID0ge307XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjc3NPYmplY3RBcnJheS5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIG9iaiA9IGNzc09iamVjdEFycmF5W2ldO1xuICAgICAgaWYgKGRvbmVbb2JqLnNlbGVjdG9yXSA9PT0gdHJ1ZSkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgdmFyIGZvdW5kID0gdGhpcy5maW5kQnlTZWxlY3Rvcihjc3NPYmplY3RBcnJheSwgb2JqLnNlbGVjdG9yKTsgLy9mb3VuZCBjb21wcmVzc2VkXG4gICAgICBpZiAoZm91bmQubGVuZ3RoICE9PSAwKSB7XG4gICAgICAgIGNvbXByZXNzZWQgPSBjb21wcmVzc2VkLmNvbmNhdChmb3VuZCk7XG4gICAgICAgIGRvbmVbb2JqLnNlbGVjdG9yXSA9IHRydWU7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBjb21wcmVzc2VkO1xuICB9O1xuXG4gIC8qXG4gICAgUmVjZWl2ZWQgMiBjc3Mgb2JqZWN0cyB3aXRoIGZvbGxvd2luZyBzdHJ1Y3R1cmVcbiAgICAgIHtcbiAgICAgICAgcnVsZXMgOiBbe2RpcmVjdGl2ZTpcIlwiLCB2YWx1ZTpcIlwifSwge2RpcmVjdGl2ZTpcIlwiLCB2YWx1ZTpcIlwifSwgLi4uXVxuICAgICAgICBzZWxlY3RvciA6IFwiU09NRVNFTEVDVE9SXCJcbiAgICAgIH1cblxuICAgIHJldHVybnMgdGhlIGNoYW5nZWQobmV3LHJlbW92ZWQsdXBkYXRlZCkgdmFsdWVzIG9uIGNzczEgcGFyYW1ldGVyLCBvbiBzYW1lIHN0cnVjdHVyZVxuXG4gICAgaWYgdHdvIGNzcyBvYmplY3RzIGFyZSB0aGUgc2FtZSwgdGhlbiByZXR1cm5zIGZhbHNlXG5cbiAgICAgIGlmIGEgY3NzIGRpcmVjdGl2ZSBleGlzdHMgaW4gY3NzMSBhbmQgICAgIGNzczIsIGFuZCBpdHMgdmFsdWUgaXMgZGlmZmVyZW50LCBpdCBpcyBpbmNsdWRlZCBpbiBkaWZmXG4gICAgICBpZiBhIGNzcyBkaXJlY3RpdmUgZXhpc3RzIGluIGNzczEgYW5kIG5vdCBjc3MyLCBpdCBpcyB0aGVuIGluY2x1ZGVkIGluIGRpZmZcbiAgICAgIGlmIGEgY3NzIGRpcmVjdGl2ZSBleGlzdHMgaW4gY3NzMiBidXQgbm90IGNzczEsIHRoZW4gaXQgaXMgZGVsZXRlZCBpbiBjc3MxLCBpdCB3b3VsZCBiZSBpbmNsdWRlZCBpbiBkaWZmIGJ1dCB3aWxsIGJlIG1hcmtlZCBhcyB0eXBlPSdERUxFVEVEJ1xuXG4gICAgICBAb2JqZWN0IGNzczEgY3NzIG9iamVjdFxuICAgICAgQG9iamVjdCBjc3MyIGNzcyBvYmplY3RcblxuICAgICAgQHJldHVybiBkaWZmIGNzcyBvYmplY3QgY29udGFpbnMgY2hhbmdlZCB2YWx1ZXMgaW4gY3NzMSBpbiByZWdhcmRzIHRvIGNzczIgc2VlIHRlc3QgaW5wdXQgb3V0cHV0IGluIC90ZXN0L2RhdGEvY3NzLmpzXG4gICovXG4gIGZpLnByb3RvdHlwZS5jc3NEaWZmID0gZnVuY3Rpb24oY3NzMSwgY3NzMikge1xuICAgIGlmIChjc3MxLnNlbGVjdG9yICE9PSBjc3MyLnNlbGVjdG9yKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgLy9pZiBvbmUgb2YgdGhlbSBpcyBtZWRpYSBxdWVyeSByZXR1cm4gZmFsc2UsIGJlY2F1c2UgZGlmZiBmdW5jdGlvbiBjYW4gbm90IG9wZXJhdGUgb24gbWVkaWEgcXVlcmllc1xuICAgIGlmICgoY3NzMS50eXBlID09PSAnbWVkaWEnIHx8IGNzczIudHlwZSA9PT0gJ21lZGlhJykpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICB2YXIgZGlmZiA9IHtcbiAgICAgIHNlbGVjdG9yOiBjc3MxLnNlbGVjdG9yLFxuICAgICAgcnVsZXM6IFtdXG4gICAgfTtcbiAgICB2YXIgcnVsZTEsIHJ1bGUyO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY3NzMS5ydWxlcy5sZW5ndGg7IGkrKykge1xuICAgICAgcnVsZTEgPSBjc3MxLnJ1bGVzW2ldO1xuICAgICAgLy9maW5kIHJ1bGUyIHdoaWNoIGhhcyB0aGUgc2FtZSBkaXJlY3RpdmUgYXMgcnVsZTFcbiAgICAgIHJ1bGUyID0gdGhpcy5maW5kQ29ycmVzcG9uZGluZ1J1bGUoY3NzMi5ydWxlcywgcnVsZTEuZGlyZWN0aXZlLCBydWxlMS52YWx1ZSk7XG4gICAgICBpZiAocnVsZTIgPT09IGZhbHNlKSB7XG4gICAgICAgIC8vcnVsZTEgaXMgYSBuZXcgcnVsZSBpbiBjc3MxXG4gICAgICAgIGRpZmYucnVsZXMucHVzaChydWxlMSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvL3J1bGUyIHdhcyBmb3VuZCBvbmx5IHB1c2ggaWYgaXRzIHZhbHVlIGlzIGRpZmZlcmVudCB0b29cbiAgICAgICAgaWYgKHJ1bGUxLnZhbHVlICE9PSBydWxlMi52YWx1ZSkge1xuICAgICAgICAgIGRpZmYucnVsZXMucHVzaChydWxlMSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICAvL25vdyBmb3IgcnVsZXMgZXhpc3RzIGluIGNzczIgYnV0IG5vdCBpbiBjc3MxLCB3aGljaCBtZWFucyBkZWxldGVkIHJ1bGVzXG4gICAgZm9yICh2YXIgaWkgPSAwOyBpaSA8IGNzczIucnVsZXMubGVuZ3RoOyBpaSsrKSB7XG4gICAgICBydWxlMiA9IGNzczIucnVsZXNbaWldO1xuICAgICAgLy9maW5kIHJ1bGUyIHdoaWNoIGhhcyB0aGUgc2FtZSBkaXJlY3RpdmUgYXMgcnVsZTFcbiAgICAgIHJ1bGUxID0gdGhpcy5maW5kQ29ycmVzcG9uZGluZ1J1bGUoY3NzMS5ydWxlcywgcnVsZTIuZGlyZWN0aXZlKTtcbiAgICAgIGlmIChydWxlMSA9PT0gZmFsc2UpIHtcbiAgICAgICAgLy9ydWxlMSBpcyBhIG5ldyBydWxlXG4gICAgICAgIHJ1bGUyLnR5cGUgPSAnREVMRVRFRCc7IC8vbWFyayBpdCBhcyBhIGRlbGV0ZWQgcnVsZSwgc28gdGhhdCBvdGhlciBtZXJnZSBvcGVyYXRpb25zIGNvdWxkIGJlIHRydWVcbiAgICAgICAgZGlmZi5ydWxlcy5wdXNoKHJ1bGUyKTtcbiAgICAgIH1cbiAgICB9XG5cblxuICAgIGlmIChkaWZmLnJ1bGVzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gZGlmZjtcbiAgfTtcblxuICAvKlxuICAgICAgTWVyZ2VzIDIgZGlmZmVyZW50IGNzcyBvYmplY3RzIHRvZ2V0aGVyXG4gICAgICB1c2luZyBpbnRlbGxpZ2VudENTU1B1c2gsXG5cbiAgICAgIEBwYXJhbSBjc3NPYmplY3RBcnJheSwgdGFyZ2V0IGNzcyBvYmplY3QgYXJyYXlcbiAgICAgIEBwYXJhbSBuZXdBcnJheSwgc291cmNlIGFycmF5IHRoYXQgd2lsbCBiZSBwdXNoZWQgaW50byBjc3NPYmplY3RBcnJheSBwYXJhbWV0ZXJcbiAgICAgIEBwYXJhbSByZXZlcnNlLCBbb3B0aW9uYWxdLCBpZiBnaXZlbiB0cnVlLCBmaXJzdCBwYXJhbWV0ZXIgd2lsbCBiZSB0cmF2ZXJzZWQgb24gcmV2ZXJzZWQgb3JkZXJcbiAgICAgICAgICAgICAgZWZmZWN0aXZlbHkgZ2l2aW5nIHByaW9yaXR5IHRvIHRoZSBzdHlsZXMgaW4gbmV3QXJyYXlcbiAgKi9cbiAgZmkucHJvdG90eXBlLmludGVsbGlnZW50TWVyZ2UgPSBmdW5jdGlvbihjc3NPYmplY3RBcnJheSwgbmV3QXJyYXksIHJldmVyc2UpIHtcbiAgICBpZiAocmV2ZXJzZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXZlcnNlID0gZmFsc2U7XG4gICAgfVxuXG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IG5ld0FycmF5Lmxlbmd0aDsgaSsrKSB7XG4gICAgICB0aGlzLmludGVsbGlnZW50Q1NTUHVzaChjc3NPYmplY3RBcnJheSwgbmV3QXJyYXlbaV0sIHJldmVyc2UpO1xuICAgIH1cbiAgICBmb3IgKGkgPSAwOyBpIDwgY3NzT2JqZWN0QXJyYXkubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciBjb2JqID0gY3NzT2JqZWN0QXJyYXlbaV07XG4gICAgICBpZiAoY29iai50eXBlID09PSAnbWVkaWEnIHx8IChjb2JqLnR5cGUgPT09ICdrZXlmcmFtZXMnKSkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGNvYmoucnVsZXMgPSB0aGlzLmNvbXBhY3RSdWxlcyhjb2JqLnJ1bGVzKTtcbiAgICB9XG4gIH07XG5cbiAgLypcbiAgICBpbnNlcnRzIG5ldyBjc3Mgb2JqZWN0cyBpbnRvIGEgYmlnZ2VyIGNzcyBvYmplY3RcbiAgICB3aXRoIHNhbWUgc2VsZWN0b3JzIGdyb3VwZWQgdG9nZXRoZXJcblxuICAgIEBwYXJhbSBjc3NPYmplY3RBcnJheSwgYXJyYXkgb2YgYmlnZ2VyIGNzcyBvYmplY3QgdG8gYmUgcHVzaGVkIGludG9cbiAgICBAcGFyYW0gbWluaW1hbE9iamVjdCwgc2luZ2xlIGNzcyBvYmplY3RcbiAgICBAcGFyYW0gcmV2ZXJzZSBbb3B0aW9uYWxdIGRlZmF1bHQgaXMgZmFsc2UsIGlmIGdpdmVuLCBjc3NPYmplY3RBcnJheSB3aWxsIGJlIHJldmVyc2x5IHRyYXZlcnNlZFxuICAgICAgICAgICAgcmVzdWx0aW5nIG1vcmUgcHJpb3JpdHkgaW4gbWluaW1hbE9iamVjdCdzIHN0eWxlc1xuICAqL1xuICBmaS5wcm90b3R5cGUuaW50ZWxsaWdlbnRDU1NQdXNoID0gZnVuY3Rpb24oY3NzT2JqZWN0QXJyYXksIG1pbmltYWxPYmplY3QsIHJldmVyc2UpIHtcbiAgICB2YXIgcHVzaFNlbGVjdG9yID0gbWluaW1hbE9iamVjdC5zZWxlY3RvcjtcbiAgICAvL2ZpbmQgY29ycmVjdCBzZWxlY3RvciBpZiBub3QgZm91bmQganVzdCBwdXNoIG1pbmltYWxPYmplY3QgaW50byBjc3NPYmplY3RcbiAgICB2YXIgY3NzT2JqZWN0ID0gZmFsc2U7XG5cbiAgICBpZiAocmV2ZXJzZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXZlcnNlID0gZmFsc2U7XG4gICAgfVxuXG4gICAgaWYgKHJldmVyc2UgPT09IGZhbHNlKSB7XG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNzc09iamVjdEFycmF5Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGlmIChjc3NPYmplY3RBcnJheVtpXS5zZWxlY3RvciA9PT0gcHVzaFNlbGVjdG9yKSB7XG4gICAgICAgICAgY3NzT2JqZWN0ID0gY3NzT2JqZWN0QXJyYXlbaV07XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgZm9yICh2YXIgaiA9IGNzc09iamVjdEFycmF5Lmxlbmd0aCAtIDE7IGogPiAtMTsgai0tKSB7XG4gICAgICAgIGlmIChjc3NPYmplY3RBcnJheVtqXS5zZWxlY3RvciA9PT0gcHVzaFNlbGVjdG9yKSB7XG4gICAgICAgICAgY3NzT2JqZWN0ID0gY3NzT2JqZWN0QXJyYXlbal07XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoY3NzT2JqZWN0ID09PSBmYWxzZSkge1xuICAgICAgY3NzT2JqZWN0QXJyYXkucHVzaChtaW5pbWFsT2JqZWN0KTsgLy9qdXN0IHB1c2gsIGJlY2F1c2UgY3NzU2VsZWN0b3IgaXMgbmV3XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmIChtaW5pbWFsT2JqZWN0LnR5cGUgIT09ICdtZWRpYScpIHtcbiAgICAgICAgZm9yICh2YXIgaWkgPSAwOyBpaSA8IG1pbmltYWxPYmplY3QucnVsZXMubGVuZ3RoOyBpaSsrKSB7XG4gICAgICAgICAgdmFyIHJ1bGUgPSBtaW5pbWFsT2JqZWN0LnJ1bGVzW2lpXTtcbiAgICAgICAgICAvL2ZpbmQgcnVsZSBpbnNpZGUgY3NzT2JqZWN0XG4gICAgICAgICAgdmFyIG9sZFJ1bGUgPSB0aGlzLmZpbmRDb3JyZXNwb25kaW5nUnVsZShjc3NPYmplY3QucnVsZXMsIHJ1bGUuZGlyZWN0aXZlKTtcbiAgICAgICAgICBpZiAob2xkUnVsZSA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgIGNzc09iamVjdC5ydWxlcy5wdXNoKHJ1bGUpO1xuICAgICAgICAgIH0gZWxzZSBpZiAocnVsZS50eXBlID09PSAnREVMRVRFRCcpIHtcbiAgICAgICAgICAgIG9sZFJ1bGUudHlwZSA9ICdERUxFVEVEJztcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy9ydWxlIGZvdW5kIGp1c3QgdXBkYXRlIHZhbHVlXG5cbiAgICAgICAgICAgIG9sZFJ1bGUudmFsdWUgPSBydWxlLnZhbHVlO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY3NzT2JqZWN0LnN1YlN0eWxlcyA9IGNzc09iamVjdC5zdWJTdHlsZXMuY29uY2F0KG1pbmltYWxPYmplY3Quc3ViU3R5bGVzKTsgLy9UT0RPLCBtYWtlIHRoaXMgaW50ZWxsaWdlbnQgdG9vXG4gICAgICB9XG5cbiAgICB9XG4gIH07XG5cbiAgLypcbiAgICBmaWx0ZXIgb3V0cyBydWxlIG9iamVjdHMgd2hvc2UgdHlwZSBwYXJhbSBlcXVhbCB0byBERUxFVEVEXG5cbiAgICBAcGFyYW0gcnVsZXMsIGFycmF5IG9mIHJ1bGVzXG5cbiAgICBAcmV0dXJucyBydWxlcyBhcnJheSwgY29tcGFjdGVkIGJ5IGRlbGV0aW5nIGFsbCB1bm5lY2Vzc2FyeSBydWxlc1xuICAqL1xuICBmaS5wcm90b3R5cGUuY29tcGFjdFJ1bGVzID0gZnVuY3Rpb24ocnVsZXMpIHtcbiAgICB2YXIgbmV3UnVsZXMgPSBbXTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHJ1bGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAocnVsZXNbaV0udHlwZSAhPT0gJ0RFTEVURUQnKSB7XG4gICAgICAgIG5ld1J1bGVzLnB1c2gocnVsZXNbaV0pO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbmV3UnVsZXM7XG4gIH07XG4gIC8qXG4gICAgY29tcHV0ZXMgc3RyaW5nIGZvciBhY2UgZWRpdG9yIHVzaW5nIHRoaXMuY3NzIG9yIGdpdmVuIGNzc0Jhc2Ugb3B0aW9uYWwgcGFyYW1ldGVyXG5cbiAgICBAcGFyYW0gW29wdGlvbmFsXSBjc3NCYXNlLCBpZiBnaXZlbiBjb21wdXRlcyBjc3NTdHJpbmcgZnJvbSBjc3NPYmplY3QgYXJyYXlcbiAgKi9cbiAgZmkucHJvdG90eXBlLmdldENTU0ZvckVkaXRvciA9IGZ1bmN0aW9uKGNzc0Jhc2UsIGRlcHRoKSB7XG4gICAgaWYgKGRlcHRoID09PSB1bmRlZmluZWQpIHtcbiAgICAgIGRlcHRoID0gMDtcbiAgICB9XG4gICAgdmFyIHJldCA9ICcnO1xuICAgIGlmIChjc3NCYXNlID09PSB1bmRlZmluZWQpIHtcbiAgICAgIGNzc0Jhc2UgPSB0aGlzLmNzcztcbiAgICB9XG4gICAgLy9hcHBlbmQgaW1wb3J0c1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY3NzQmFzZS5sZW5ndGg7IGkrKykge1xuICAgICAgaWYgKGNzc0Jhc2VbaV0udHlwZSA9PT0gJ2ltcG9ydHMnKSB7XG4gICAgICAgIHJldCArPSBjc3NCYXNlW2ldLnN0eWxlcyArICdcXG5cXG4nO1xuICAgICAgfVxuICAgIH1cbiAgICBmb3IgKGkgPSAwOyBpIDwgY3NzQmFzZS5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIHRtcCA9IGNzc0Jhc2VbaV07XG4gICAgICBpZiAodG1wLnNlbGVjdG9yID09PSB1bmRlZmluZWQpIHsgLy90ZW1wb3JhcmlseSBvbWl0IG1lZGlhIHF1ZXJpZXNcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICB2YXIgY29tbWVudHMgPSBcIlwiO1xuICAgICAgaWYgKHRtcC5jb21tZW50cyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGNvbW1lbnRzID0gdG1wLmNvbW1lbnRzICsgJ1xcbic7XG4gICAgICB9XG5cbiAgICAgIGlmICh0bXAudHlwZSA9PT0gJ21lZGlhJykgeyAvL2Fsc28gcHV0IG1lZGlhIHF1ZXJpZXMgdG8gb3V0cHV0XG4gICAgICAgIHJldCArPSBjb21tZW50cyArIHRtcC5zZWxlY3RvciArICd7XFxuJztcbiAgICAgICAgcmV0ICs9IHRoaXMuZ2V0Q1NTRm9yRWRpdG9yKHRtcC5zdWJTdHlsZXMsIGRlcHRoICsgMSk7XG4gICAgICAgIHJldCArPSAnfVxcblxcbic7XG4gICAgICB9IGVsc2UgaWYgKHRtcC50eXBlICE9PSAna2V5ZnJhbWVzJyAmJiB0bXAudHlwZSAhPT0gJ2ltcG9ydHMnKSB7XG4gICAgICAgIHJldCArPSB0aGlzLmdldFNwYWNlcyhkZXB0aCkgKyBjb21tZW50cyArIHRtcC5zZWxlY3RvciArICcge1xcbic7XG4gICAgICAgIHJldCArPSB0aGlzLmdldENTU09mUnVsZXModG1wLnJ1bGVzLCBkZXB0aCArIDEpO1xuICAgICAgICByZXQgKz0gdGhpcy5nZXRTcGFjZXMoZGVwdGgpICsgJ31cXG5cXG4nO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vYXBwZW5kIGtleUZyYW1lc1xuICAgIGZvciAoaSA9IDA7IGkgPCBjc3NCYXNlLmxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAoY3NzQmFzZVtpXS50eXBlID09PSAna2V5ZnJhbWVzJykge1xuICAgICAgICByZXQgKz0gY3NzQmFzZVtpXS5zdHlsZXMgKyAnXFxuXFxuJztcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gcmV0O1xuICB9O1xuXG4gIGZpLnByb3RvdHlwZS5nZXRJbXBvcnRzID0gZnVuY3Rpb24oY3NzT2JqZWN0QXJyYXkpIHtcbiAgICB2YXIgaW1wcyA9IFtdO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY3NzT2JqZWN0QXJyYXkubGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmIChjc3NPYmplY3RBcnJheVtpXS50eXBlID09PSAnaW1wb3J0cycpIHtcbiAgICAgICAgaW1wcy5wdXNoKGNzc09iamVjdEFycmF5W2ldLnN0eWxlcyk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBpbXBzO1xuICB9O1xuICAvKlxuICAgIGdpdmVuIHJ1bGVzIGFycmF5LCByZXR1cm5zIHZpc3VhbGx5IGZvcm1hdHRlZCBjc3Mgc3RyaW5nXG4gICAgdG8gYmUgdXNlZCBpbnNpZGUgZWRpdG9yXG4gICovXG4gIGZpLnByb3RvdHlwZS5nZXRDU1NPZlJ1bGVzID0gZnVuY3Rpb24ocnVsZXMsIGRlcHRoKSB7XG4gICAgdmFyIHJldCA9ICcnO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcnVsZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmIChydWxlc1tpXSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgaWYgKHJ1bGVzW2ldLmRlZmVjdGl2ZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJldCArPSB0aGlzLmdldFNwYWNlcyhkZXB0aCkgKyBydWxlc1tpXS5kaXJlY3RpdmUgKyAnOiAnICsgcnVsZXNbaV0udmFsdWUgKyAnO1xcbic7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXQgKz0gdGhpcy5nZXRTcGFjZXMoZGVwdGgpICsgcnVsZXNbaV0udmFsdWUgKyAnO1xcbic7XG4gICAgICB9XG5cbiAgICB9XG4gICAgcmV0dXJuIHJldCB8fCAnXFxuJztcbiAgfTtcblxuICAvKlxuICAgICAgQSB2ZXJ5IHNpbXBsZSBoZWxwZXIgZnVuY3Rpb24gcmV0dXJucyBudW1iZXIgb2Ygc3BhY2VzIGFwcGVuZGVkIGluIGEgc2luZ2xlIHN0cmluZyxcbiAgICAgIHRoZSBudW1iZXIgZGVwZW5kcyBpbnB1dCBwYXJhbWV0ZXIsIG5hbWVseSBpbnB1dCoyXG4gICovXG4gIGZpLnByb3RvdHlwZS5nZXRTcGFjZXMgPSBmdW5jdGlvbihudW0pIHtcbiAgICB2YXIgcmV0ID0gJyc7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBudW0gKiA0OyBpKyspIHtcbiAgICAgIHJldCArPSAnICc7XG4gICAgfVxuICAgIHJldHVybiByZXQ7XG4gIH07XG5cbiAgLypcbiAgICBHaXZlbiBjc3Mgc3RyaW5nIG9yIG9iamVjdEFycmF5LCBwYXJzZXMgaXQgYW5kIHRoZW4gZm9yIGV2ZXJ5IHNlbGVjdG9yLFxuICAgIHByZXBlbmRzIHRoaXMuY3NzUHJldmlld05hbWVzcGFjZSB0byBwcmV2ZW50IGNzcyBjb2xsaXNpb24gaXNzdWVzXG5cbiAgICBAcmV0dXJucyBjc3Mgc3RyaW5nIGluIHdoaWNoIHRoaXMuY3NzUHJldmlld05hbWVzcGFjZSBwcmVwZW5kZWRcbiAgKi9cbiAgZmkucHJvdG90eXBlLmFwcGx5TmFtZXNwYWNpbmcgPSBmdW5jdGlvbihjc3MsIGZvcmNlZE5hbWVzcGFjZSkge1xuICAgIHZhciBjc3NPYmplY3RBcnJheSA9IGNzcztcbiAgICB2YXIgbmFtZXNwYWNlQ2xhc3MgPSAnLicgKyB0aGlzLmNzc1ByZXZpZXdOYW1lc3BhY2U7XG4gICAgaWYoZm9yY2VkTmFtZXNwYWNlICE9PSB1bmRlZmluZWQpe1xuICAgICAgbmFtZXNwYWNlQ2xhc3MgPSBmb3JjZWROYW1lc3BhY2U7XG4gICAgfVxuXG4gICAgaWYgKHR5cGVvZiBjc3MgPT09ICdzdHJpbmcnKSB7XG4gICAgICBjc3NPYmplY3RBcnJheSA9IHRoaXMucGFyc2VDU1MoY3NzKTtcbiAgICB9XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNzc09iamVjdEFycmF5Lmxlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIgb2JqID0gY3NzT2JqZWN0QXJyYXlbaV07XG5cbiAgICAgIC8vYnlwYXNzIG5hbWVzcGFjaW5nIGZvciBAZm9udC1mYWNlIEBrZXlmcmFtZXMgQGltcG9ydFxuICAgICAgaWYob2JqLnNlbGVjdG9yLmluZGV4T2YoJ0Bmb250LWZhY2UnKSA+IC0xIHx8IG9iai5zZWxlY3Rvci5pbmRleE9mKCdrZXlmcmFtZXMnKSA+IC0xIHx8IG9iai5zZWxlY3Rvci5pbmRleE9mKCdAaW1wb3J0JykgPiAtMSB8fCBvYmouc2VsZWN0b3IuaW5kZXhPZignLmZvcm0tYWxsJykgPiAtMSB8fCBvYmouc2VsZWN0b3IuaW5kZXhPZignI3N0YWdlJykgPiAtMSl7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBpZiAob2JqLnR5cGUgIT09ICdtZWRpYScpIHtcbiAgICAgICAgdmFyIHNlbGVjdG9yID0gb2JqLnNlbGVjdG9yLnNwbGl0KCcsJyk7XG4gICAgICAgIHZhciBuZXdTZWxlY3RvciA9IFtdO1xuICAgICAgICBmb3IgKHZhciBqID0gMDsgaiA8IHNlbGVjdG9yLmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgaWYgKHNlbGVjdG9yW2pdLmluZGV4T2YoJy5zdXBlcm5vdmEnKSA9PT0gLTEpIHsgLy9kbyBub3QgYXBwbHkgbmFtZXNwYWNpbmcgdG8gc2VsZWN0b3JzIGluY2x1ZGluZyBzdXBlcm5vdmFcbiAgICAgICAgICAgIG5ld1NlbGVjdG9yLnB1c2gobmFtZXNwYWNlQ2xhc3MgKyAnICcgKyBzZWxlY3RvcltqXSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG5ld1NlbGVjdG9yLnB1c2goc2VsZWN0b3Jbal0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBvYmouc2VsZWN0b3IgPSBuZXdTZWxlY3Rvci5qb2luKCcsJyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBvYmouc3ViU3R5bGVzID0gdGhpcy5hcHBseU5hbWVzcGFjaW5nKG9iai5zdWJTdHlsZXMsIGZvcmNlZE5hbWVzcGFjZSk7IC8vaGFuZGxlIG1lZGlhIHF1ZXJpZXMgYXMgd2VsbFxuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBjc3NPYmplY3RBcnJheTtcbiAgfTtcblxuICAvKlxuICAgIGdpdmVuIGNzcyBzdHJpbmcgb3Igb2JqZWN0IGFycmF5LCBjbGVhcnMgcG9zc2libGUgbmFtZXNwYWNpbmcgZnJvbVxuICAgIGFsbCBvZiB0aGUgc2VsZWN0b3JzIGluc2lkZSB0aGUgY3NzXG4gICovXG4gIGZpLnByb3RvdHlwZS5jbGVhck5hbWVzcGFjaW5nID0gZnVuY3Rpb24oY3NzLCByZXR1cm5PYmopIHtcbiAgICBpZiAocmV0dXJuT2JqID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybk9iaiA9IGZhbHNlO1xuICAgIH1cbiAgICB2YXIgY3NzT2JqZWN0QXJyYXkgPSBjc3M7XG4gICAgdmFyIG5hbWVzcGFjZUNsYXNzID0gJy4nICsgdGhpcy5jc3NQcmV2aWV3TmFtZXNwYWNlO1xuICAgIGlmICh0eXBlb2YgY3NzID09PSAnc3RyaW5nJykge1xuICAgICAgY3NzT2JqZWN0QXJyYXkgPSB0aGlzLnBhcnNlQ1NTKGNzcyk7XG4gICAgfVxuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjc3NPYmplY3RBcnJheS5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIG9iaiA9IGNzc09iamVjdEFycmF5W2ldO1xuXG4gICAgICBpZiAob2JqLnR5cGUgIT09ICdtZWRpYScpIHtcbiAgICAgICAgdmFyIHNlbGVjdG9yID0gb2JqLnNlbGVjdG9yLnNwbGl0KCcsJyk7XG4gICAgICAgIHZhciBuZXdTZWxlY3RvciA9IFtdO1xuICAgICAgICBmb3IgKHZhciBqID0gMDsgaiA8IHNlbGVjdG9yLmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgbmV3U2VsZWN0b3IucHVzaChzZWxlY3RvcltqXS5zcGxpdChuYW1lc3BhY2VDbGFzcyArICcgJykuam9pbignJykpO1xuICAgICAgICB9XG4gICAgICAgIG9iai5zZWxlY3RvciA9IG5ld1NlbGVjdG9yLmpvaW4oJywnKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG9iai5zdWJTdHlsZXMgPSB0aGlzLmNsZWFyTmFtZXNwYWNpbmcob2JqLnN1YlN0eWxlcywgdHJ1ZSk7IC8vaGFuZGxlIG1lZGlhIHF1ZXJpZXMgYXMgd2VsbFxuICAgICAgfVxuICAgIH1cbiAgICBpZiAocmV0dXJuT2JqID09PSBmYWxzZSkge1xuICAgICAgcmV0dXJuIHRoaXMuZ2V0Q1NTRm9yRWRpdG9yKGNzc09iamVjdEFycmF5KTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIGNzc09iamVjdEFycmF5O1xuICAgIH1cblxuICB9O1xuXG4gIC8qXG4gICAgY3JlYXRlcyBhIG5ldyBzdHlsZSB0YWcgKGFsc28gZGVzdHJveXMgdGhlIHByZXZpb3VzIG9uZSlcbiAgICBhbmQgaW5qZWN0cyBnaXZlbiBjc3Mgc3RyaW5nIGludG8gdGhhdCBjc3MgdGFnXG4gICovXG4gIGZpLnByb3RvdHlwZS5jcmVhdGVTdHlsZUVsZW1lbnQgPSBmdW5jdGlvbihpZCwgY3NzLCBmb3JtYXQpIHtcbiAgICBpZiAoZm9ybWF0ID09PSB1bmRlZmluZWQpIHtcbiAgICAgIGZvcm1hdCA9IGZhbHNlO1xuICAgIH1cblxuICAgIGlmICh0aGlzLnRlc3RNb2RlID09PSBmYWxzZSAmJiBmb3JtYXQgIT09ICdub25hbWVzcGFjZScpIHtcbiAgICAgIC8vYXBwbHkgbmFtZXNwYWNpbmcgY2xhc3Nlc1xuICAgICAgY3NzID0gdGhpcy5hcHBseU5hbWVzcGFjaW5nKGNzcyk7XG4gICAgfVxuXG4gICAgaWYgKHR5cGVvZiBjc3MgIT09ICdzdHJpbmcnKSB7XG4gICAgICBjc3MgPSB0aGlzLmdldENTU0ZvckVkaXRvcihjc3MpO1xuICAgIH1cbiAgICAvL2FwcGx5IGZvcm1hdHRpbmcgZm9yIGNzc1xuICAgIGlmIChmb3JtYXQgPT09IHRydWUpIHtcbiAgICAgIGNzcyA9IHRoaXMuZ2V0Q1NTRm9yRWRpdG9yKHRoaXMucGFyc2VDU1MoY3NzKSk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMudGVzdE1vZGUgIT09IGZhbHNlKSB7XG4gICAgICByZXR1cm4gdGhpcy50ZXN0TW9kZSgnY3JlYXRlIHN0eWxlICMnICsgaWQsIGNzcyk7IC8vaWYgdGVzdCBtb2RlLCBqdXN0IHBhc3MgcmVzdWx0IHRvIGNhbGxiYWNrXG4gICAgfVxuXG4gICAgdmFyIF9fZWwgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChpZCk7XG4gICAgaWYgKF9fZWwpIHtcbiAgICAgIF9fZWwucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChfX2VsKTtcbiAgICB9XG5cbiAgICB2YXIgaGVhZCA9IGRvY3VtZW50LmhlYWQgfHwgZG9jdW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ2hlYWQnKVswXSxcbiAgICAgIHN0eWxlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3R5bGUnKTtcblxuICAgIHN0eWxlLmlkID0gaWQ7XG4gICAgc3R5bGUudHlwZSA9ICd0ZXh0L2Nzcyc7XG5cbiAgICBoZWFkLmFwcGVuZENoaWxkKHN0eWxlKTtcblxuICAgIGlmIChzdHlsZS5zdHlsZVNoZWV0ICYmICFzdHlsZS5zaGVldCkge1xuICAgICAgc3R5bGUuc3R5bGVTaGVldC5jc3NUZXh0ID0gY3NzO1xuICAgIH0gZWxzZSB7XG4gICAgICBzdHlsZS5hcHBlbmRDaGlsZChkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShjc3MpKTtcbiAgICB9XG4gIH07XG5cbiAgZ2xvYmFsLmNzc2pzID0gZmk7XG5cbn0pKHRoaXMpO1xuIiwiXHJcbmNvbnN0IGV4cGxvcmVyRXZlbnQgPSBPYmplY3QuZnJlZXplKHtcclxuICAgIG9ubW91c2VvdmVyOiAxIDw8IDMxLFxyXG4gICAgb25jbGljazogMSA8PCAzMCxcclxuICAgIG9uc2VsZWN0OiAxIDw8IDI5LFxyXG4gICAgb25mb2xkOiAxIDw8IDI4XHJcbn0pO1xyXG5cclxuLy8gSGFuZGxlcyBldmVudHMgZm9yIHRoZSBleHBjc3MgcGFyc2VyXHJcbmNsYXNzIEV2ZW50U3RhdGUge1xyXG4gICAgY29uc3RydWN0b3IoKSB7XHJcbiAgICAgICAgdGhpcy5zdGF0ZSA9IDA7XHJcbiAgICB9XHJcblxyXG4gICAgc2V0KGUpIHtcclxuICAgICAgICB0aGlzLnN0YXRlIHw9IGU7XHJcbiAgICB9XHJcblxyXG4gICAgcmVtb3ZlKGUpIHtcclxuICAgICAgICB0aGlzLnN0YXRlICY9IH5lO1xyXG4gICAgfVxyXG5cclxuICAgIHRvZ2dsZShlKSB7XHJcbiAgICAgICAgdGhpcy5zdGF0ZSBePSBlO1xyXG4gICAgfVxyXG5cclxuICAgIGNoZWNrKGUpIHtcclxuICAgICAgICBpZiAoKHRoaXMuc3RhdGUgJiBlKSAhPSAwKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZXF1YWxzKG90aGVyKXtcclxuICAgICAgICBpZihvdGhlciA9PSB0aGlzLnN0YXRlKXtcclxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSB7XHJcbiAgICBFdmVudFN0YXRlOiBFdmVudFN0YXRlLFxyXG4gICAgZXhwbG9yZXJFdmVudDogZXhwbG9yZXJFdmVudFxyXG59OyIsImNvbnN0IF9jc3NqcyA9IHJlcXVpcmUoXCIuLi9ub2RlX21vZHVsZXMvam90Zm9ybS1jc3MuanMvY3NzLmpzXCIpO1xyXG5jb25zdCB7U2VsZWN0b3JQYXJzZXJ9ID0gcmVxdWlyZShcIi4vc2VsZWN0b3ItcGFyc2VyLmpzXCIpO1xyXG5jb25zdCB7UnVsZVBhcnNlcn0gPSByZXF1aXJlKFwiLi9ydWxlLXBhcnNlci5qc1wiKTtcclxuY29uc3QgRXZlbnRzID0gcmVxdWlyZShcIi4vZXZlbnRzLmpzXCIpO1xyXG5cclxuY2xhc3MgRXhwbG9yZXJDU1Mge1xyXG4gICAgLy8gY2xhc3NOYW1lIGRlc2NyaWJlcyB0aGUgb2JqZWN0IGF0dHJpYnV0ZSBvZiB0aGUgc3R5bGUgYmFzZSwgd2hpY2ggZWl0aGVyIGNvbnRhaW5zICdsJyBmb3IgbGluayBvciAnZScgZm9yIGVudGl0eS4gRGVmYXVsdHMgdG8gJ2NsYXNzJy5cclxuICAgIGNvbnN0cnVjdG9yKGNsYXNzUHJvcGVydHk9J2NsYXNzJywgdGFnTGlzdFNlcGFyYXRvcj0nICcpe1xyXG4gICAgICAgIC8vaW5pdGlhbGl6ZSBwYXJzZXIgb2JqZWN0XHJcbiAgICAgICAgdGhpcy5fcGFyc2VyID0gbmV3IF9jc3Nqcy5jc3NqcygpO1xyXG5cclxuICAgICAgICAvL0FycmF5IG9mIGNzcyB1bml0cyB7c2VsZWN0b3IgPSBcIlwiLCBydWxlcyA9IFt7ZGlyZWN0aXZlID0gXCJcIiwgdmFsdWUgID0gXCJcIn0gLi4uXX1cclxuICAgICAgICB0aGlzLnJhd0NTUyA9IFtdO1xyXG5cclxuICAgICAgICAvL3BhcnNlZCBjc3MgYmxvY2tzIHJlYWR5IHRvIGJlIGFwcGxpZWQgdG8gb2JqZWN0c1xyXG4gICAgICAgIHRoaXMuc3R5bGluZ3MgPSBbXTtcclxuXHJcbiAgICAgICAgdGhpcy5zZWxlY3RvckNvbmZpZyA9IHtcclxuICAgICAgICAgICAgY2xhc3NQcm9wZXJ0eTogY2xhc3NQcm9wZXJ0eSxcclxuICAgICAgICAgICAgdGFnTGlzdFNlcGFyYXRvcjogdGFnTGlzdFNlcGFyYXRvcixcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgIFxyXG5cclxuICAgIC8vZmlsZSBpbnB1dCBmb3IgdGhlIHBhcnNlciBhcyBzdHJpbmdcclxuICAgIHBhcnNlKGNzc1N0cmluZykge1xyXG4gICAgICAgIHRoaXMucmF3Q1NTID0gdGhpcy5fcGFyc2VyLnBhcnNlQ1NTKGNzc1N0cmluZyk7XHJcblxyXG4gICAgICAgIGxldCBycCA9IG5ldyBSdWxlUGFyc2VyKCk7XHJcbiAgICAgICAgbGV0IHNwID0gbmV3IFNlbGVjdG9yUGFyc2VyKHRoaXMuc2VsZWN0b3JDb25maWcpO1xyXG5cclxuICAgICAgICB0aGlzLnJhd0NTUy5mb3JFYWNoKChlbGVtZW50LCBpKSA9PiB7XHJcbiAgICAgICAgICAgIHZhciBzdHlsZSA9IG5ldyBTdHlsaW5nKCk7XHJcbiAgICAgICAgICAgIHZhciBub3JtYWxpemVkU2VsZWN0b3IgPSBlbGVtZW50LnNlbGVjdG9yLnNwbGl0KCcgJykuam9pbignJykudG9Mb3dlckNhc2UoKTtcclxuXHJcbiAgICAgICAgICAgIHN0eWxlLnNlbGVjdG9yID0gc3AucGFyc2VTZWxlY3Rvcihub3JtYWxpemVkU2VsZWN0b3IsIGkpO1xyXG5cclxuICAgICAgICAgICAgZWxlbWVudC5ydWxlcy5mb3JFYWNoKChlbGVtZW50LCBpKSA9PiB7XHJcbiAgICAgICAgICAgICAgICB2YXIgcnVsZSA9IHJwLnBhcnNlUnVsZShlbGVtZW50LmRpcmVjdGl2ZSwgZWxlbWVudC52YWx1ZS5zcGxpdCgnICcpLmpvaW4oJycpLnRvTG93ZXJDYXNlKCkpO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmKHJ1bGUuX3ZhbGlkKXtcclxuICAgICAgICAgICAgICAgICAgICBzdHlsZS5ydWxlcy5wdXNoKHJ1bGUpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuc3R5bGluZ3MucHVzaChzdHlsZSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgLy9tb2RpZmllcyB0aGUgZ2l2ZW4gc3R5bGUgYmFzZWQgb24gdGhlIGdpdmVuIG9iamVjdFxyXG4gICAgc3R5bGUob2JqLCBzdHkpIHtcclxuICAgICAgICB0aGlzLnN0eWxpbmdzLmZvckVhY2goc3R5bGUgPT4gc3R5bGUuYXBwbHkob2JqLCBzdHkpKTtcclxuICAgIH0gXHJcbn1cclxuXHJcbmNsYXNzIFN0eWxpbmcge1xyXG4gICAgY29uc3RydWN0b3IoKSB7XHJcbiAgICAgICAgdGhpcy5zZWxlY3RvcjtcclxuICAgICAgICB0aGlzLnJ1bGVzID0gW107XHJcbiAgICB9XHJcblxyXG4gICAgYXBwbHkob2JqLCBzdHkpe1xyXG4gICAgICAgIGlmKHRoaXMuc2VsZWN0b3IudGVzdChvYmosIHN0eSkpe1xyXG4gICAgICAgICAgICB0aGlzLnJ1bGVzLmZvckVhY2gocnVsZSA9PiBydWxlLmFwcGx5KG9iaiwgc3R5KSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IHtcIkV4cGxvcmVyQ1NTXCI6IEV4cGxvcmVyQ1NTLFxyXG4gICAgICAgICAgICAgICAgICBcIkV2ZW50XCI6RXZlbnRzfSIsImNsYXNzIFBhcnNlciB7XHJcbiAgICBjb25zdHJ1Y3RvcigpIHtcclxuICAgICAgICB0aGlzLl9jdXJJZHggPSAwO1xyXG4gICAgICAgIHRoaXMuX2Jsb2NrID0gLTE7XHJcbiAgICAgICAgdGhpcy5fbGl0ZXJhbCA9IFwiXCI7XHJcbiAgICB9XHJcblxyXG4gICAgX2N1ckNoYXIoKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuX2xpdGVyYWwuY2hhckF0KHRoaXMuX2N1cklkeCk7XHJcbiAgICB9XHJcblxyXG4gICAgX25leHRDaGFyKCkge1xyXG4gICAgICAgIHZhciByZWFjaGVkRW5kID0gdGhpcy5fY3VySWR4ID09ICh0aGlzLl9saXRlcmFsLmxlbmd0aCk7XHJcblxyXG4gICAgICAgIGlmIChyZWFjaGVkRW5kKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuX2N1cklkeCsrO1xyXG5cclxuICAgICAgICB0aGlzLl9jb25zdW1lU3BhY2VzKCk7XHJcblxyXG4gICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgfVxyXG5cclxuICAgIF9jb25zdW1lU3BhY2VzKCkge1xyXG4gICAgICAgIHdoaWxlICh0aGlzLl9jdXJDaGFyKCkgPT0gXCIgXCIpIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMuX2N1cklkeCA+PSB0aGlzLl9saXRlcmFsLmxlbmd0aCAtIDEpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB0aGlzLl9jdXJJZHgrKztcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgX2dldFN0cmluZ1VudGlsKHRlcm1pbmFscykge1xyXG4gICAgICAgIHZhciByZXN1bHQgPSBcIlwiO1xyXG5cclxuICAgICAgICB3aGlsZSAoIXRlcm1pbmFscy5pbmNsdWRlcyh0aGlzLl9jdXJDaGFyKCkpKSB7XHJcbiAgICAgICAgICAgIHJlc3VsdCArPSB0aGlzLl9jdXJDaGFyKCk7XHJcblxyXG4gICAgICAgICAgICBpZiAoIXRoaXMuX25leHRDaGFyKCkpIHtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gcmVzdWx0O1xyXG4gICAgfVxyXG5cclxuICAgIF9lcnJvcihtZXNzYWdlKSB7XHJcbiAgICAgICAgY29uc29sZS5lcnJvcignXFx4MWJbMzFtJXNcXHgxYlswbScsIFwiRXJyb3Igd2hpbGUgcGFyc2luZzogXCIgKyBtZXNzYWdlKTtcclxuICAgIH1cclxuXHJcbiAgICBfd2FybmluZyhtZXNzYWdlKSB7XHJcbiAgICAgICAgY29uc29sZS5lcnJvcignXFx4MWJbMzdtJXNcXHgxYlswbScsIFwiV2FybmluZyA6IFwiICsgbWVzc2FnZSk7XHJcbiAgICB9XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0ge1xyXG4gICAgUGFyc2VyXHJcbn0iLCJjb25zdCB7IFBhcnNlciB9ID0gcmVxdWlyZShcIi4vcGFyc2VyLmpzXCIpO1xyXG5cclxuY2xhc3MgUnVsZVBhcnNlciBleHRlbmRzIFBhcnNlciB7XHJcbiAgICBjb25zdHJ1Y3RvcigpIHtcclxuICAgICAgICBzdXBlcigpO1xyXG4gICAgICAgIHRoaXMuX2F0dHJpYnV0ZSA9IFwiXCI7XHJcbiAgICAgICAgdGhpcy5fcnVsZVRlcm1pbmFscyA9IFtcIlxcblwiLCBcIjtcIl07XHJcbiAgICAgICAgdGhpcy5fcmdiYVRlcm1pbmFscyA9IFsnLCcsICcpJ107XHJcbiAgICAgICAgdGhpcy5fY29sb3JJbml0aWFscyA9IFsnIycsICcwJywgJygnXTtcclxuICAgICAgICB0aGlzLl9pbnRlcnBvbGF0aW9uRW51bXMgPSB7XHJcbiAgICAgICAgICAgICdsaW4nOiBpbnRlcnBvbGF0aW9uVHlwZS5saW5lYXIsXHJcbiAgICAgICAgICAgICdsaW5lYXInOiBpbnRlcnBvbGF0aW9uVHlwZS5saW5lYXJcclxuICAgICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIHBhcnNlUnVsZShhdHRyaWJ1dGUsIHJ1bGUpIHtcclxuICAgICAgICB0aGlzLl9jdXJJZHggPSAwO1xyXG4gICAgICAgIHRoaXMuX2F0dHJpYnV0ZSA9IGF0dHJpYnV0ZTtcclxuICAgICAgICB0aGlzLl9saXRlcmFsID0gcnVsZTtcclxuICAgICAgICB2YXIgcmVzdWx0ID0gdW5kZWZpbmVkO1xyXG5cclxuICAgICAgICAvLyB0cnkgcGFyc2luZyBpbnRlcnBvbGF0aW9uLCBjb2xvciBvciBlbnVtIFxyXG4gICAgICAgIHJlc3VsdCA9IHRoaXMuX3BhcnNlQ29sb3IoKTtcclxuXHJcbiAgICAgICAgaWYgKHJlc3VsdCAhPSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgcmV0dXJuIG5ldyBTaW1wbGVSdWxlKHRoaXMuX2F0dHJpYnV0ZSwgdmFsdWVUeXBlLmNvbG9yLCByZXN1bHQpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gUmVzZXQgcGFyc2VyIGFuZCB0cnkgcGFyc2luZyBpbnRlcnBvbGF0aW9uIHJ1bGVcclxuICAgICAgICB0aGlzLl9jdXJJZHggPSAwO1xyXG5cclxuICAgICAgICB2YXIgdHlwZSA9IHRoaXMuX2dldFN0cmluZ1VudGlsKCcoJyk7XHJcblxyXG4gICAgICAgIHR5cGUgPSB0aGlzLl9pbnRlcnBvbGF0aW9uRW51bXNbdHlwZV07XHJcblxyXG4gICAgICAgIGlmICh0eXBlID09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICByZXR1cm4gbmV3IFNpbXBsZVJ1bGUodGhpcy5fYXR0cmlidXRlLCB2YWx1ZVR5cGUuc3RyaW5nLCB0aGlzLl9saXRlcmFsKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgdGhpcy5fbmV4dENoYXIoKTtcclxuXHJcbiAgICAgICAgcmVzdWx0ID0gdGhpcy5fcGFyc2VJbnRlcnBvbGF0aW9uKHR5cGUpO1xyXG5cclxuICAgICAgICBpZiAocmVzdWx0ID09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAvL21pZ2h0IGJlIG9mIHR5cGUgbnVtYmVyIVxyXG4gICAgICAgICAgICByZXR1cm4gbmV3IFNpbXBsZVJ1bGUodGhpcy5fYXR0cmlidXRlLCB2YWx1ZVR5cGUuc3RyaW5nLCB0aGlzLl9saXRlcmFsKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiByZXN1bHQ7XHJcbiAgICB9XHJcblxyXG4gICAgX3BhcnNlSW50ZXJwb2xhdGlvbih0eXBlKSB7XHJcbiAgICAgICAgdmFyIHZhbGlkID0gdHJ1ZTtcclxuICAgICAgICB2YXIgcHJvcGVydHk7XHJcbiAgICAgICAgdmFyIHZUeXBlO1xyXG4gICAgICAgIHZhciB4ID0gW107XHJcbiAgICAgICAgdmFyIHkgPSBbXTtcclxuXHJcbiAgICAgICAgd2hpbGUgKHRoaXMuX2N1ckNoYXIoKSAhPSAnKScpIHtcclxuICAgICAgICAgICAgeC5wdXNoKHBhcnNlSW50KHRoaXMuX2dldFN0cmluZ1VudGlsKCc9JykpKTtcclxuICAgICAgICAgICAgdGhpcy5fbmV4dENoYXIoKTtcclxuXHJcbiAgICAgICAgICAgIHZhciB0eXBlQ2hlY2sgPSB2VHlwZTtcclxuXHJcbiAgICAgICAgICAgIGlmICh0aGlzLl9jb2xvckluaXRpYWxzLmluY2x1ZGVzKHRoaXMuX2N1ckNoYXIoKSkpIHtcclxuICAgICAgICAgICAgICAgIHkucHVzaCh0aGlzLl9wYXJzZUNvbG9yKCkpO1xyXG4gICAgICAgICAgICAgICAgdlR5cGUgPSB2YWx1ZVR5cGUuY29sb3I7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICB5LnB1c2gocGFyc2VJbnQodGhpcy5fZ2V0U3RyaW5nVW50aWwoWycsJywgJyknXSkpKTtcclxuICAgICAgICAgICAgICAgIHZUeXBlID0gdmFsdWVUeXBlLm51bWJlcjtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKHR5cGVDaGVjayAhPSB1bmRlZmluZWQgJiYgdHlwZUNoZWNrICE9IHZUeXBlKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLl9lcnJvcihcIlR5cGUgb2YgdmFsdWVzIGRvZXNuJ3QgbWF0Y2guXCIpO1xyXG4gICAgICAgICAgICAgICAgdmFsaWQgPSBmYWxzZTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKHRoaXMuX2N1ckNoYXIoKSA9PSAnLCcpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuX25leHRDaGFyKCk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmICh0aGlzLl9jdXJJZHggPj0gdGhpcy5fbGl0ZXJhbC5sZW5ndGggLSAxKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLl9lcnJvcihcIlVuZXhwZWN0ZWQgZW5kIG9mIHJ1bGUuXCIpO1xyXG4gICAgICAgICAgICAgICAgdmFsaWQgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLl9uZXh0Q2hhcigpO1xyXG5cclxuICAgICAgICB2YXIga2V5V29yZCA9IHRoaXMuX2dldFN0cmluZ1VudGlsKCcoJyk7XHJcblxyXG4gICAgICAgIGlmIChrZXlXb3JkLmxvY2FsZUNvbXBhcmUoXCIudXNpbmdcIikgPT0gMCkge1xyXG4gICAgICAgICAgICB0aGlzLl9uZXh0Q2hhcigpO1xyXG4gICAgICAgICAgICBwcm9wZXJ0eSA9IHRoaXMuX2dldFN0cmluZ1VudGlsKCcpJyk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdGhpcy5fZXJyb3IoXCJDb3VsZG4ndCBmaW5kICd1c2luZycgZGlyZWN0aXZlLlwiKTtcclxuICAgICAgICAgICAgdmFsaWQgPSBmYWxzZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICh0aGlzLl9jdXJDaGFyKCkgIT0gJyknKSB7XHJcbiAgICAgICAgICAgIHRoaXMuX2Vycm9yKFwiVW5leHBlY3RlZCBlbmQgb2YgcnVsZSwgZXhwZWN0ZWQgJyknLlwiKTtcclxuICAgICAgICAgICAgdmFsaWQgPSBmYWxzZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICh4Lmxlbmd0aCAhPSB5Lmxlbmd0aCkge1xyXG4gICAgICAgICAgICB0aGlzLl9lcnJvcihcIk51bWJlciBvZiBjb250cm9sIHBvaW50cyBhbmQgdmFsdWVzIGlzIGRpZmZlcmVudC5cIik7XHJcbiAgICAgICAgICAgIHZhbGlkID0gZmFsc2U7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAodlR5cGUgPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgIHRoaXMuX2Vycm9yKFwiVW5rbm93biBOdW1iZXIgb3IgQ29sb3IgVHlwZSBmb3VuZC5cIik7XHJcbiAgICAgICAgICAgIHZhbGlkID0gZmFsc2U7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIFxyXG4gICAgICAgIHJldHVybiBuZXcgSW50ZXJwb2xhdGVkUnVsZSh0aGlzLl9hdHRyaWJ1dGUsIHByb3BlcnR5LCB0eXBlLCB2VHlwZSwgeCwgeSwgdmFsaWQpO1xyXG4gICAgfVxyXG5cclxuICAgIF9wYXJzZUNvbG9yKCkge1xyXG4gICAgICAgIGlmICh0aGlzLl9jdXJDaGFyKCkgPT0gJyMnKSB7XHJcbiAgICAgICAgICAgIHRoaXMuX25leHRDaGFyKCk7XHJcbiAgICAgICAgICAgIHJldHVybiBwYXJzZUludCh0aGlzLl9nZXRTdHJpbmdVbnRpbCh0aGlzLl9ydWxlVGVybWluYWxzKSwgMTYpO1xyXG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy5fY3VyQ2hhcigpID09ICcwJykge1xyXG4gICAgICAgICAgICB0aGlzLl9uZXh0Q2hhcigpO1xyXG4gICAgICAgICAgICBpZiAodGhpcy5fY3VyQ2hhcigpID09ICd4Jykge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5fbmV4dENoYXIoKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiBwYXJzZUludCh0aGlzLl9nZXRTdHJpbmdVbnRpbCh0aGlzLl9ydWxlVGVybWluYWxzKSwgMTYpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLl9jdXJDaGFyKCkgPT0gJygnKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9nZXRSR0JBKCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xyXG4gICAgfVxyXG5cclxuICAgIF9nZXRSR0JBKCkge1xyXG4gICAgICAgIHZhciByID0gcGFyc2VJbnQodGhpcy5fZ2V0U3RyaW5nVW50aWwodGhpcy5fcmdiYVRlcm1pbmFscykpO1xyXG5cclxuICAgICAgICBpZiAodGhpcy5fY3VyQ2hhcigpICE9ICcsJykge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5oZXhWYWx1ZShyLCAwLCAwKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgdGhpcy5fbmV4dENoYXIoKTtcclxuXHJcbiAgICAgICAgdmFyIGcgPSBwYXJzZUludCh0aGlzLl9nZXRTdHJpbmdVbnRpbCh0aGlzLl9yZ2JhVGVybWluYWxzKSk7XHJcblxyXG4gICAgICAgIGlmICh0aGlzLl9jdXJDaGFyKCkgIT0gJywnKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmhleFZhbHVlKHIsIGcsIDApO1xyXG4gICAgICAgIH1cclxuICAgICAgICB0aGlzLl9uZXh0Q2hhcigpO1xyXG5cclxuICAgICAgICB2YXIgYiA9IHBhcnNlSW50KHRoaXMuX2dldFN0cmluZ1VudGlsKHRoaXMuX3JnYmFUZXJtaW5hbHMpKTtcclxuXHJcbiAgICAgICAgaWYgKHRoaXMuX2N1ckNoYXIoKSAhPSAnLCcpIHtcclxuICAgICAgICAgICAgdGhpcy5fbmV4dENoYXIoKTtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuaGV4VmFsdWUociwgZywgYik7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRoaXMuX25leHRDaGFyKCk7XHJcblxyXG4gICAgICAgIHZhciBhID0gcGFyc2VJbnQodGhpcy5fZ2V0U3RyaW5nVW50aWwodGhpcy5fcmdiYVRlcm1pbmFscykpO1xyXG5cclxuICAgICAgICBpZiAodGhpcy5fY3VyQ2hhcigpICE9ICcpJykge1xyXG4gICAgICAgICAgICB0aGlzLl9lcnJvcihcIkV4cGVjdGVkIGNsb3NpbmcgJyknLlwiKVxyXG4gICAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xyXG4gICAgICAgIH1cclxuICAgICAgICB0aGlzLl9uZXh0Q2hhcigpO1xyXG5cclxuICAgICAgICByZXR1cm4gdGhpcy5oZXhWYWx1ZShyLCBnLCBiLCBhKTtcclxuICAgIH1cclxuXHJcbiAgICBoZXhWYWx1ZShyLCBnLCBiLCBhID0gMjU1KSB7XHJcbiAgICAgICAgcmV0dXJuIChyIDw8IDI0KSB8IChnIDw8IDE2KSB8IChiID4+IDgpIHwgYTtcclxuICAgIH1cclxuXHJcbiAgICBoZXhTdHJpbmcociwgZywgYiwgYSA9IDI1NSkge1xyXG4gICAgICAgIHIgPSByLnRvU3RyaW5nKDE2KTtcclxuICAgICAgICBnID0gZy50b1N0cmluZygxNik7XHJcbiAgICAgICAgYiA9IGIudG9TdHJpbmcoMTYpO1xyXG4gICAgICAgIGEgPSBhLnRvU3RyaW5nKDE2KTtcclxuXHJcbiAgICAgICAgaWYgKHIubGVuZ3RoID09IDEpXHJcbiAgICAgICAgICAgIHIgPSBcIjBcIiArIHI7XHJcbiAgICAgICAgaWYgKGcubGVuZ3RoID09IDEpXHJcbiAgICAgICAgICAgIGcgPSBcIjBcIiArIGc7XHJcbiAgICAgICAgaWYgKGIubGVuZ3RoID09IDEpXHJcbiAgICAgICAgICAgIGIgPSBcIjBcIiArIGI7XHJcbiAgICAgICAgaWYgKGEubGVuZ3RoID09IDEpXHJcbiAgICAgICAgICAgIGEgPSBcIjBcIiArIGE7XHJcblxyXG4gICAgICAgIHJldHVybiBcIiNcIiArIHIgKyBnICsgYiArIGE7XHJcbiAgICB9XHJcbn1cclxuXHJcbnZhciB2YWx1ZVR5cGUgPSBPYmplY3QuZnJlZXplKHsgXCJzdHJpbmdcIjogMSwgXCJudW1iZXJcIjogMiwgXCJjb2xvclwiOiAzLCBcImVudW1cIjogNCB9KTtcclxuXHJcbmNsYXNzIFNpbXBsZVJ1bGUge1xyXG4gICAgY29uc3RydWN0b3IoYXR0cmlidXRlLCBhdHRyaWJ1dGVUeXBlLCB2YWx1ZSkge1xyXG4gICAgICAgIHRoaXMuX2F0dHJpYnV0ZSA9IGF0dHJpYnV0ZTtcclxuICAgICAgICB0aGlzLl92YWx1ZVR5cGUgPSBhdHRyaWJ1dGVUeXBlO1xyXG4gICAgICAgIHRoaXMuX3ZhbHVlID0gdmFsdWU7XHJcbiAgICAgICAgdGhpcy5fdmFsaWQgPSB0cnVlO1xyXG4gICAgfVxyXG5cclxuICAgIGFwcGx5KG9iaiwgc3R5KSB7XHJcbiAgICAgICAgc3R5W3RoaXMuX2F0dHJpYnV0ZV0gPSB0aGlzLl92YWx1ZTtcclxuICAgIH1cclxufVxyXG5cclxudmFyIGludGVycG9sYXRpb25UeXBlID0gT2JqZWN0LmZyZWV6ZSh7IFwibGluZWFyXCI6IDEgfSk7XHJcblxyXG5jbGFzcyBJbnRlcnBvbGF0ZWRSdWxlIHtcclxuICAgIGNvbnN0cnVjdG9yKGF0dHJpYnV0ZSwgcHJvcGVydHksIGludGVycG9sVHlwZSwgdmFsdWVUeXBlLCBjb250cm9sUG9pbnRzLCBhdHRyaWJ1dGVWYWx1ZXMsIHZhbGlkKSB7XHJcbiAgICAgICAgdGhpcy5fdHlwZSA9IGludGVycG9sVHlwZTtcclxuICAgICAgICB0aGlzLl9wcm9wZXJ0eSA9IHByb3BlcnR5O1xyXG4gICAgICAgIHRoaXMuX2F0dHJpYnV0ZSA9IGF0dHJpYnV0ZTtcclxuICAgICAgICB0aGlzLl92YWx1ZVR5cGUgPSB2YWx1ZVR5cGU7XHJcbiAgICAgICAgdGhpcy5fY29udHJvbFBvaW50cyA9IGNvbnRyb2xQb2ludHM7XHJcbiAgICAgICAgdGhpcy5fYXR0cmlidXRlVmFsdWVzID0gYXR0cmlidXRlVmFsdWVzO1xyXG4gICAgICAgIHRoaXMuX3ZhbGlkID0gdHJ1ZTsgLy9UT0RPOiBGSVggYWZ0ZXIgZGVidWdnaW5nXHJcbiAgICB9XHJcblxyXG4gICAgYXBwbHkob2JqLCBzdHkpIHtcclxuICAgICAgICBpZiAodGhpcy5fdHlwZSA9PSBpbnRlcnBvbGF0aW9uVHlwZS5saW5lYXIpIHtcclxuICAgICAgICAgICAgc3R5W3RoaXMuX2F0dHJpYnV0ZV0gPSB0aGlzLl9saW4ob2JqW3RoaXMuX3Byb3BlcnR5XSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIF9saW4oYWN0dWFsVmFsdWUpIHtcclxuICAgICAgICAvLyBmaW5kIHJhbmdlIHRoZSB2YWx1ZSBpcyBpbnNpZGUgb2YgYW5kIGludGVycG9sYXRlIGluc2lkZSBpdFxyXG4gICAgICAgIC8vIGFzc3VtZXMgYXNjZW5kaW5nIG9yZGVyIFxyXG4gICAgICAgIHZhciBpbmRleCA9IHRoaXMuX2ZpbmRJbmRleChhY3R1YWxWYWx1ZSk7XHJcblxyXG4gICAgICAgIC8vU21hbGxlciB0aGFuIGFsbCBjb250cm9sIHBvaW50c1xyXG4gICAgICAgIGlmKGluZGV4ID09IC0xKXtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2F0dHJpYnV0ZVZhbHVlc1swXTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vQmlnZ2VyIHRoYW4gYWxsIGNvbnRyb2wgcG9pbnRzXHJcbiAgICAgICAgaWYoaW5kZXggPT0gdGhpcy5fY29udHJvbFBvaW50cy5sZW5ndGgtMSl7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9hdHRyaWJ1dGVWYWx1ZXNbdGhpcy5fYXR0cmlidXRlVmFsdWVzLmxlbmd0aC0xXTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICh0aGlzLl92YWx1ZVR5cGUgPT0gdmFsdWVUeXBlLmNvbG9yKSB7XHJcbiAgICAgICAgICAgIC8vIGludGVycG9sYXRlIHJnYmEgdmFsdWVzXHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9saW5lYXJDb2xvckludGVycG9sYXRpb24oaW5kZXgsIGFjdHVhbFZhbHVlKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAvLyBub3JtYWwgaW50ZXJwb2xhdGlvbiBvZiBudW1iZXJcclxuXHJcbiAgICAgICAgICAgIC8vaW5zaWRlIHJhbmdlIGluZGV4ICYgaW5kZXggKyAxXHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9saW5lYXJJbnRlcnBvbGF0aW9uKGFjdHVhbFZhbHVlLCB0aGlzLl9jb250cm9sUG9pbnRzW2luZGV4XSwgdGhpcy5fYXR0cmlidXRlVmFsdWVzW2luZGV4XSwgdGhpcy5fY29udHJvbFBvaW50c1tpbmRleCsxXSwgdGhpcy5fYXR0cmlidXRlVmFsdWVzW2luZGV4KzFdKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgX2ZpbmRJbmRleCh4KSB7XHJcbiAgICAgICAgdmFyIGlkeCA9IC0xO1xyXG5cclxuICAgICAgICB3aGlsZSAoaWR4IDwgdGhpcy5fY29udHJvbFBvaW50cy5sZW5ndGggJiYgdGhpcy5fY29udHJvbFBvaW50c1tpZHgrMV0gPCB4KSB7XHJcbiAgICAgICAgICAgIGlkeCsrO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIGlkeDtcclxuICAgIH1cclxuXHJcbiAgICBfbGluZWFyQ29sb3JJbnRlcnBvbGF0aW9uKGFjdHVhbFZhbHVlLCBpZHgpIHtcclxuICAgICAgICB2YXIgeTAgPSB0aGlzLl9hdHRyaWJ1dGVWYWx1ZXNbaWR4XTtcclxuICAgICAgICB2YXIgeTEgPSB0aGlzLl9hdHRyaWJ1dGVWYWx1ZXNbaWR4KzFdO1xyXG5cclxuICAgICAgICB2YXIgcmVzdWx0ID0gMDtcclxuICAgICAgICB2YXIgbWFzayA9IDB4MDAwMDAwRkY7IC8vIGFscGhhIG1hc2tcclxuXHJcbiAgICAgICAgLy9mb3IgZWFjaCBjaGFubmVsIGludGVycG9sYXRlIHRoZSB2YWx1ZSBzZXBlcmF0ZWx5XHJcbiAgICAgICAgZm9yKHZhciBpID0gMDsgaSA8IDQ7IGkrKyl7XHJcbiAgICAgICAgICAgIHZhciB5MENoYW5uZWwgPSAoeTAgJiBtYXNrKSA+Pj4gaSo4O1xyXG4gICAgICAgICAgICB2YXIgeTFDaGFubmVsID0gKHkxICYgbWFzaykgPj4+IGkqODtcclxuXHJcbiAgICAgICAgICAgIHJlc3VsdCB8PSB0aGlzLl9saW5lYXJJbnRlcnBvbGF0aW9uKGFjdHVhbFZhbHVlLCB0aGlzLl9jb250cm9sUG9pbnRzW2lkeF0sIHkwQ2hhbm5lbCwgdGhpcy5fY29udHJvbFBvaW50c1tpZHgrMV0sIHkxQ2hhbm5lbCkgPDwgaSo4XHJcblxyXG4gICAgICAgICAgICBtYXNrID0gbWFzayA8PCA4O1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcclxuICAgIH1cclxuXHJcbiAgICBfbGluZWFySW50ZXJwb2xhdGlvbih4LCB4MCwgeTAsIHgxLCB5MSl7XHJcbiAgICAgICAgdmFyIGEgPSAoeTEgLSB5MCkgLyAoeDEgLSB4MClcclxuICAgICAgICB2YXIgYiA9IC1hICogeDAgKyB5MFxyXG4gICAgICAgIHJldHVybiBhICogeCArIGJcclxuICAgIH1cclxuXHJcbiAgICBfaXNJblJhbmdlKHZhbHVlLCBsb3dlciwgdXBwZXIpIHtcclxuICAgICAgICBpZiAodmFsdWUgPCBsb3dlcikge1xyXG4gICAgICAgICAgICByZXR1cm4gLTE7XHJcbiAgICAgICAgfSBlbHNlIGlmICh2YWx1ZSA+IHVwcGVyKSB7XHJcbiAgICAgICAgICAgIHJldHVybiAxO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIDA7XHJcbiAgICB9XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0ge1xyXG4gICAgUnVsZVBhcnNlclxyXG59IiwiY29uc3Qge1BhcnNlcn0gPSByZXF1aXJlKFwiLi9wYXJzZXIuanNcIik7XHJcbmNvbnN0IHtleHBsb3JlckV2ZW50LCBFdmVudFN0YXRlfSA9IHJlcXVpcmUoXCIuL2V2ZW50cy5qc1wiKTtcclxuXHJcbmNsYXNzIFNlbGVjdG9yUGFyc2VyIGV4dGVuZHMgUGFyc2VyIHtcclxuICAgIGNvbnN0cnVjdG9yKGNvbmZpZ3VyYXRpb24pIHtcclxuICAgICAgICBzdXBlcigpO1xyXG4gICAgICAgIHRoaXMuX2NvbmZpZyA9IGNvbmZpZ3VyYXRpb247XHJcbiAgICB9XHJcblxyXG4gICAgcGFyc2VTZWxlY3RvcihzdHJpbmcsIGlkeCkge1xyXG4gICAgICAgIHRoaXMuX2N1cklkeCA9IDA7XHJcbiAgICAgICAgdGhpcy5fbGl0ZXJhbCA9IHN0cmluZztcclxuICAgICAgICB0aGlzLl9ibG9jayA9IGlkeDtcclxuXHJcbiAgICAgICAgdmFyIGxpc3QgPSBbXTtcclxuXHJcbiAgICAgICAgZG8ge1xyXG4gICAgICAgICAgICB2YXIgZXhwID0gdGhpcy5fcGFyc2VFeHByZXNzaW9uKCk7XHJcblxyXG4gICAgICAgICAgICBpZiAoZXhwLnZhbGlkKSB7XHJcbiAgICAgICAgICAgICAgICBsaXN0LnB1c2goZXhwKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgIH0gd2hpbGUgKHRoaXMuX2N1ckNoYXIoKSA9PSAnLCcgJiYgdGhpcy5fbmV4dENoYXIoKSlcclxuICAgICAgICB2YXIgc2VsID0gbmV3IFNlbGVjdG9yKGxpc3QsIHRoaXMuX2NvbmZpZyk7XHJcblxyXG4gICAgICAgIGlmIChsaXN0Lmxlbmd0aCA9PSAwKSB7XHJcbiAgICAgICAgICAgIHNlbC52YWxpZCA9IGZhbHNlO1xyXG4gICAgICAgICAgICB0aGlzLl9lcnJvcihcIkJsb2NrIFwiICsgKHRoaXMuX2Jsb2NrICsgMSkgKyBcIiBoYXMgYmVlbiBza2lwcGVkLCBiZWNhdXNlIHRoZXJlIHdhcyBubyB2YWxpZCBzZWxlY3Rvci5cIik7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gc2VsO1xyXG4gICAgfVxyXG5cclxuICAgIF9wYXJzZUV4cHJlc3Npb24oKSB7XHJcblxyXG4gICAgICAgIHZhciBsZWZ0TW9zdCA9IHRoaXMuX3BhcnNlTGVmdE1vc3QoKTtcclxuXHJcbiAgICAgICAgaWYgKCFsZWZ0TW9zdC52YWxpZCkge1xyXG4gICAgICAgICAgICByZXR1cm4gbGVmdE1vc3Q7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAodGhpcy5fY3VyQ2hhcigpID09IFwiPlwiIHx8IHRoaXMuX2N1ckNoYXIoKSA9PSBcIjxcIikge1xyXG4gICAgICAgICAgICB2YXIgY2hhaW4gPSB0aGlzLl9jdXJDaGFyKCk7XHJcbiAgICAgICAgICAgIHRoaXMuX25leHRDaGFyKCk7XHJcbiAgICAgICAgICAgIHZhciByaWdodFNpZGUgPSB0aGlzLl9wYXJzZVJpZ2h0U2lkZShsZWZ0TW9zdCk7XHJcbiAgICAgICAgICAgIHJpZ2h0U2lkZS5jaGFpbk9wID0gY2hhaW47XHJcbiAgICAgICAgICAgIGxlZnRNb3N0LnJpZ2h0U2lkZSA9IHJpZ2h0U2lkZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBsZWZ0TW9zdDtcclxuICAgIH1cclxuXHJcbiAgICBfcGFyc2VMZWZ0TW9zdCgpIHtcclxuICAgICAgICB2YXIgbGVmdE1vc3QgPSBuZXcgU2VsZWN0b3JFeHByZXNzaW9uKCk7XHJcblxyXG4gICAgICAgIHRoaXMuX3BhcnNlVHlwZShsZWZ0TW9zdCk7XHJcblxyXG4gICAgICAgIGlmICh0aGlzLl9jdXJDaGFyKCkgPT0gXCJbXCIpIHtcclxuICAgICAgICAgICAgdGhpcy5fbmV4dENoYXIoKTtcclxuICAgICAgICAgICAgdGhpcy5fcGFyc2VBdHRyaWJ1dGVCbG9jayhsZWZ0TW9zdCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoIWxlZnRNb3N0LnZhbGlkKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBsZWZ0TW9zdDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuX3BhcnNlRXh0ZW5zaW9ucyhsZWZ0TW9zdCk7XHJcblxyXG4gICAgICAgIHJldHVybiBsZWZ0TW9zdDtcclxuICAgIH1cclxuXHJcbiAgICBfcGFyc2VSaWdodFNpZGUobm9kZSkge1xyXG4gICAgICAgIHZhciByaWdodHNpZGUgPSBuZXcgUmlnaHRTaWRlKCk7XHJcblxyXG4gICAgICAgIHRoaXMuX3BhcnNlVHlwZShyaWdodHNpZGUpO1xyXG5cclxuICAgICAgICBpZiAoIW5vZGUudmFsaWQpIHtcclxuICAgICAgICAgICAgcmlnaHRzaWRlLnZhbGlkID0gZmFsc2U7XHJcbiAgICAgICAgICAgIHJldHVybiByaWdodHNpZGU7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB2YXIgcGFyYW1Gb2xsb3cgPSBbJ1snLCAnIycsICc6JywgJywnLCAnLiddO1xyXG5cclxuICAgICAgICAvL2NoZWNrIGlmIHBhcmFtZXRlciBleGlzdHNcclxuICAgICAgICBpZiAoIXBhcmFtRm9sbG93LmluY2x1ZGVzKHRoaXMuX2N1ckNoYXIoKSkgJiYgdGhpcy5fY3VySWR4IDwgdGhpcy5fbGl0ZXJhbC5sZW5ndGgpIHtcclxuICAgICAgICAgICAgcmlnaHRzaWRlLnBhcmFtZXRlciA9IHRoaXMuX2dldFN0cmluZ1VudGlsKHBhcmFtRm9sbG93KTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICByaWdodHNpZGUucGFyYW1ldGVyID0gMTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICh0aGlzLl9jdXJDaGFyKCkgPT0gJ1snKSB7XHJcbiAgICAgICAgICAgIHRoaXMuX25leHRDaGFyKCk7XHJcbiAgICAgICAgICAgIHRoaXMuX3BhcnNlQXR0cmlidXRlQmxvY2socmlnaHRzaWRlKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICghbm9kZS52YWxpZCkge1xyXG4gICAgICAgICAgICByZXR1cm4gcmlnaHRzaWRlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5fcGFyc2VFeHRlbnNpb25zKHJpZ2h0c2lkZSk7XHJcblxyXG4gICAgICAgIGlmICh0aGlzLl9jdXJDaGFyKCkgPT0gJz4nIHx8IHRoaXMuX2N1ckNoYXIoKSA9PSAnPCcpIHtcclxuICAgICAgICAgICAgdmFyIGNoYWluID0gdGhpcy5fY3VyQ2hhcigpO1xyXG4gICAgICAgICAgICB0aGlzLl9uZXh0Q2hhcigpO1xyXG4gICAgICAgICAgICByaWdodHNpZGUucmlnaHRTaWRlID0gdGhpcy5fcGFyc2VSaWdodFNpZGUocmlnaHRzaWRlKTtcclxuICAgICAgICAgICAgcmlnaHRzaWRlLnJpZ2h0U2lkZS5jaGFpbk9wID0gY2hhaW47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gcmlnaHRzaWRlO1xyXG4gICAgfVxyXG5cclxuICAgIF9wYXJzZUF0dHJpYnV0ZUJsb2NrKG5vZGUpIHtcclxuICAgICAgICB2YXIgZm9sbG93SWQgPSBbJz0nLCAnficsICchJywgJzwnLCAnPicsICddJywgJywnXTtcclxuXHJcbiAgICAgICAgdmFyIGxpc3QgPSBbXTtcclxuXHJcbiAgICAgICAgZG8ge1xyXG4gICAgICAgICAgICB2YXIgaWQgPSB0aGlzLl9nZXRTdHJpbmdVbnRpbChmb2xsb3dJZCk7XHJcblxyXG4gICAgICAgICAgICBpZiAodGhpcy5fY3VyQ2hhcigpID09ICcsJykge1xyXG4gICAgICAgICAgICAgICAgbGlzdC5wdXNoKG5ldyBBdHRyaWJ1dGVDaGVjayhpZCwgdW5kZWZpbmVkLCB1bmRlZmluZWQpKVxyXG4gICAgICAgICAgICB9IGVsc2UgaWYgKHRoaXMuX2N1ckNoYXIoKSA9PSAnXScpIHtcclxuICAgICAgICAgICAgICAgIGxpc3QucHVzaChuZXcgQXR0cmlidXRlQ2hlY2soaWQsIHVuZGVmaW5lZCwgdW5kZWZpbmVkKSlcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICB9IGVsc2UgaWYgKHRoaXMuX2N1ckNoYXIoKSA9PSAnPScgfHwgdGhpcy5fY3VyQ2hhcigpID09ICc8JyB8fCB0aGlzLl9jdXJDaGFyKCkgPT0gJz4nKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgb3AgPSB0aGlzLl9jdXJDaGFyKCk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLl9uZXh0Q2hhcigpO1xyXG5cclxuICAgICAgICAgICAgICAgIGxpc3QucHVzaChuZXcgQXR0cmlidXRlQ2hlY2soaWQsIG9wLCB0aGlzLl9nZXRTdHJpbmdVbnRpbChbJywnLCAnXSddKSkpO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLl9jdXJDaGFyKCkgPT0gJ10nKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodGhpcy5fY3VyQ2hhcigpID09ICd+JyB8fCB0aGlzLl9jdXJDaGFyKCkgPT0gJyEnKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgb3AgPSB0aGlzLl9jdXJDaGFyKCk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLl9uZXh0Q2hhcigpO1xyXG4gICAgICAgICAgICAgICAgb3AgKz0gdGhpcy5fY3VyQ2hhcigpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5fbmV4dENoYXIoKTtcclxuXHJcbiAgICAgICAgICAgICAgICBsaXN0LnB1c2gobmV3IEF0dHJpYnV0ZUNoZWNrKGlkLCBvcCwgdGhpcy5fZ2V0U3RyaW5nVW50aWwoWycsJywgJ10nXSkpKTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5fY3VyQ2hhcigpID09ICddJykge1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgfSB3aGlsZSAodGhpcy5fbmV4dENoYXIoKSAmJiB0aGlzLl9jdXJDaGFyKCkgIT0gJ10nKVxyXG5cclxuICAgICAgICBub2RlLmF0dHJDaGVja2xpc3QgPSBsaXN0O1xyXG5cclxuICAgICAgICBpZiAodGhpcy5fY3VyQ2hhcigpICE9ICddJykge1xyXG4gICAgICAgICAgICBub2RlLnZhbGlkID0gZmFsc2U7XHJcbiAgICAgICAgICAgIHRoaXMuX2Vycm9yKFwiQmxvY2sgXCIgKyAodGhpcy5fYmxvY2sgKyAxKSArIFwiIGhhcyBiZWVuIHNraXBwZWQsIGJlY2F1c2Ugb2YgbWlzc2luZyBicmFja2V0LiBFeHBlY3RlZCAnXScuXCIpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5fbmV4dENoYXIoKTtcclxuICAgIH1cclxuXHJcbiAgICBfcGFyc2VFeHRlbnNpb25zKG5vZGUpIHtcclxuXHJcbiAgICAgICAgdmFyIGZvbGxvdyA9IFsnIycsICcuJywgJywnLCAnOicsICc+JywgJzwnXTtcclxuICAgICAgICB2YXIgaGFzSWQgPSBmYWxzZTtcclxuXHJcbiAgICAgICAgd2hpbGUgKFsnIycsICcuJywgJzonXS5pbmNsdWRlcyh0aGlzLl9jdXJDaGFyKCkpKSB7XHJcblxyXG4gICAgICAgICAgICBpZiAodGhpcy5fY3VyQ2hhcigpID09ICcjJykge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5fbmV4dENoYXIoKTtcclxuICAgICAgICAgICAgICAgIGlmICghaGFzSWQpIHtcclxuICAgICAgICAgICAgICAgICAgICBub2RlLmF0dHJDaGVja2xpc3QucHVzaChuZXcgQXR0cmlidXRlQ2hlY2soJ2lkJywgJz0nLCB0aGlzLl9nZXRTdHJpbmdVbnRpbChmb2xsb3cpKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgaGFzSWQgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLl9nZXRTdHJpbmdVbnRpbChmb2xsb3cpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX3dhcm5pbmcoXCJNdWx0aXBsZSBJZHMgYXJlIG5vdCBzdXBwb3J0ZWQsIG9ubHkgdGhlIGZpcnN0IG9uZSB3aWxsIGJlIHVzZWQuXCIpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2UgaWYgKHRoaXMuX2N1ckNoYXIoKSA9PSAnLicpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuX25leHRDaGFyKCk7XHJcbiAgICAgICAgICAgICAgICBub2RlLmF0dHJDaGVja2xpc3QucHVzaChuZXcgQXR0cmlidXRlQ2hlY2soJ3RhZ3MnLCAnfj0nLCB0aGlzLl9nZXRTdHJpbmdVbnRpbChmb2xsb3cpKSk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLl9uZXh0Q2hhcigpO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmKG5vZGUuZXZlbnRTdGF0ZSA9PSB1bmRlZmluZWQpe1xyXG4gICAgICAgICAgICAgICAgICAgIG5vZGVbXCJldmVudFN0YXRlXCJdID0gbmV3IEV2ZW50U3RhdGUoKTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICB2YXIgZXZlbnQgPSB0aGlzLl9nZXRTdHJpbmdVbnRpbChmb2xsb3cpO1xyXG4gICAgICAgICAgICAgICAgaWYoIWV4cGxvcmVyRXZlbnQuaGFzT3duUHJvcGVydHkoZXZlbnQpKXtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLl93YXJuaW5nKFwiSWdub3JpbmcgdW5rbm93biBFdmVudCAnXCIrZXZlbnQrXCInLlwiKTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbm9kZS5ldmVudFN0YXRlLnNldChleHBsb3JlckV2ZW50W2V2ZW50XSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICghWyc+JywgJzwnLCAnLCddLmluY2x1ZGVzKHRoaXMuX2N1ckNoYXIoKSkgJiYgdGhpcy5fY3VySWR4ID09IHRoaXMuX2xpdGVyYWwubGVuZ3RoIC0gMSkge1xyXG4gICAgICAgICAgICBub2RlLnZhbGlkID0gZmFsc2U7XHJcbiAgICAgICAgICAgIHRoaXMuX2Vycm9yKFwiQmxvY2sgXCIgKyAodGhpcy5fYmxvY2sgKyAxKSArIFwiIGhhcyBiZWVuIHNraXBwZWQuIEV4cGVjdGVkICc+JywgJzwnIG9yICcsJy5cIik7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIF9wYXJzZVR5cGUobm9kZSkge1xyXG4gICAgICAgIGlmICh0aGlzLl9jdXJDaGFyKCkgPT0gXCJsXCIpIHtcclxuICAgICAgICAgICAgbm9kZS50eXBlID0gXCJsXCI7XHJcbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLl9jdXJDaGFyKCkgPT0gXCJlXCIpIHtcclxuICAgICAgICAgICAgbm9kZS50eXBlID0gXCJlXCI7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgbm9kZS52YWxpZCA9IGZhbHNlO1xyXG4gICAgICAgICAgICB0aGlzLl9lcnJvcihcIkJsb2NrIFwiICsgKHRoaXMuX2Jsb2NrICsgMSkgKyBcIiBoYXMgYmVlbiBza2lwcGVkLCBiZWNhdXNlIG9mIG1pc3NpbmcgdHlwZS4gRXhwZWN0ZWQgJ2UnIG9yICdsJy5cIik7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLl9uZXh0Q2hhcigpO1xyXG4gICAgfVxyXG59XHJcblxyXG5jbGFzcyBOb2RlIHtcclxuICAgIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgICAgIHRoaXMudmFsaWQgPSB0cnVlO1xyXG4gICAgfVxyXG59XHJcbi8vIFRPRE86IGFsbG93IGJldHRlciBjdXN0b21pemF0aW9uIG9mIGNsYXNzIGxvY2F0aW9uXHJcbmNsYXNzIFNlbGVjdG9yIGV4dGVuZHMgTm9kZSB7XHJcbiAgICBjb25zdHJ1Y3RvcihleHByZXNzaW9ucywgY29uZmlnKSB7XHJcbiAgICAgICAgc3VwZXIoKTtcclxuICAgICAgICB0aGlzLl9leHByZXNzaW9ucyA9IGV4cHJlc3Npb25zO1xyXG4gICAgICAgIHRoaXMuX2NvbmZpZyA9IGNvbmZpZztcclxuICAgIH1cclxuXHJcbiAgICB2YWxpZGF0ZU9iamVjdChvYmope1xyXG4gICAgICAgcmV0dXJuIG9iai5oYXNPd25Qcm9wZXJ0eSh0aGlzLl9jb25maWcuY2xhc3NQcm9wZXJ0eSk7XHJcbiAgICB9XHJcblxyXG4gICAgdGVzdChvYmosIHN0eSl7XHJcblxyXG4gICAgICAgIGlmKCF0aGlzLnZhbGlkYXRlT2JqZWN0KG9iaikpe1xyXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZih0aGlzLl9leHByZXNzaW9ucy5ldmVyeShleHAgPT4ge3JldHVybiBleHAuZXZlbnRTdGF0ZSAhPSB1bmRlZmluZWQgJiYgc3R5LmV2ZW50U3RhdGUuc3RhdGUgIT0gZXhwLmV2ZW50U3RhdGUuc3RhdGV9KSl7XHJcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiB0aGlzLl9leHByZXNzaW9ucy5zb21lKGV4cCA9PiB7XHJcbiAgICAgICAgICAgIC8vZGlmZmVyZW50aWF0ZSBiZXR3ZWVuIGxpbmtzIGFuZCBlbnRpdGllc1xyXG4gICAgICAgICAgICBpZihleHAudHlwZSAhPSBvYmpbdGhpcy5fY29uZmlnLmNsYXNzUHJvcGVydHldKXtcclxuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gZXhwLmF0dHJDaGVja2xpc3QuZXZlcnkoYXR0ckNoZWNrID0+IHtcclxuXHJcbiAgICAgICAgICAgICAgICBpZihhdHRyQ2hlY2suY29tcGFyYXRvciA9PT0gdW5kZWZpbmVkIHx8IGF0dHJDaGVjay52YWx1ZSA9PT0gdW5kZWZpbmVkKXtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gb2JqLmhhc093blByb3BlcnR5KGF0dHJDaGVjay5pZCk7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmKCFvYmouaGFzT3duUHJvcGVydHkoYXR0ckNoZWNrLmlkKSl7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHN3aXRjaChhdHRyQ2hlY2suY29tcGFyYXRvcil7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgJz0nIDogXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gKG9ialthdHRyQ2hlY2suaWRdID09IGF0dHJDaGVjay52YWx1ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgJyE9JzpcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAob2JqW2F0dHJDaGVjay5pZF0gIT0gYXR0ckNoZWNrLnZhbHVlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSAnfj0nOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIChvYmpbYXR0ckNoZWNrLmlkXS5zcGxpdCh0aGlzLl9jb25maWcudGFnTGlzdFNlcGFyYXRvcikuaW5jbHVkZXMoYXR0ckNoZWNrLnZhbHVlKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgJz4nIDpcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAob2JqW2F0dHJDaGVjay5pZF0gPiBhdHRyQ2hlY2sudmFsdWUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjYXNlICc8JyA6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gKG9ialthdHRyQ2hlY2suaWRdIDwgYXR0ckNoZWNrLnZhbHVlKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAvL1RPRE86IEdyYXBoIFRyYXZlcnNhbCBjaGVja3MsIGNvbXBsZXggZXhwcmVzc2lvbnMgZXRjLlxyXG4gICAgfVxyXG5cclxuXHJcbn1cclxuXHJcbmNsYXNzIFNlbGVjdG9yRXhwcmVzc2lvbiBleHRlbmRzIE5vZGUge1xyXG4gICAgY29uc3RydWN0b3IoKSB7XHJcbiAgICAgICAgc3VwZXIoKTtcclxuICAgICAgICB0aGlzLnR5cGU7XHJcbiAgICAgICAgdGhpcy5ldmVudFN0YXRlO1xyXG4gICAgICAgIHRoaXMuYXR0ckNoZWNrbGlzdCA9IFtdO1xyXG4gICAgICAgIHRoaXMucmlnaHRTaWRlO1xyXG4gICAgfVxyXG59XHJcblxyXG5jbGFzcyBSaWdodFNpZGUgZXh0ZW5kcyBTZWxlY3RvckV4cHJlc3Npb24ge1xyXG4gICAgY29uc3RydWN0b3IoKSB7XHJcbiAgICAgICAgc3VwZXIoKTtcclxuICAgICAgICB0aGlzLnBhcmFtZXRlcjtcclxuICAgICAgICB0aGlzLmNoYWluT3A7XHJcbiAgICB9XHJcbn1cclxuXHJcbmNsYXNzIEF0dHJpYnV0ZUNoZWNrIGV4dGVuZHMgTm9kZSB7XHJcbiAgICBjb25zdHJ1Y3RvcihpZCwgY29tcGFyYXRvciwgdmFsdWUpIHtcclxuICAgICAgICBzdXBlcigpO1xyXG4gICAgICAgIHRoaXMuaWQgPSBpZDtcclxuICAgICAgICB0aGlzLmNvbXBhcmF0b3IgPSBjb21wYXJhdG9yO1xyXG4gICAgICAgIHRoaXMudmFsdWUgPSB2YWx1ZTtcclxuICAgIH1cclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSB7XHJcbiAgICBTZWxlY3RvclBhcnNlclxyXG59OyJdfQ==
