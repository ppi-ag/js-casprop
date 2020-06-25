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
            var normalizedSelector = element.selector.split(' ').join('');

            style.selector = sp.parseSelector(normalizedSelector, i);

            element.rules.forEach((element, i) => {
                var rule = rp.parseRule(element.directive, element.value.split(' ').join(''));

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

//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvam90Zm9ybS1jc3MuanMvY3NzLmpzIiwic3JjL2V2ZW50cy5qcyIsInNyYy9leHBsb3Jlci1jc3MuanMiLCJzcmMvcGFyc2VyLmpzIiwic3JjL3J1bGUtcGFyc2VyLmpzIiwic3JjL3NlbGVjdG9yLXBhcnNlci5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25xQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNVNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24oKXtmdW5jdGlvbiByKGUsbix0KXtmdW5jdGlvbiBvKGksZil7aWYoIW5baV0pe2lmKCFlW2ldKXt2YXIgYz1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlO2lmKCFmJiZjKXJldHVybiBjKGksITApO2lmKHUpcmV0dXJuIHUoaSwhMCk7dmFyIGE9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitpK1wiJ1wiKTt0aHJvdyBhLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsYX12YXIgcD1uW2ldPXtleHBvcnRzOnt9fTtlW2ldWzBdLmNhbGwocC5leHBvcnRzLGZ1bmN0aW9uKHIpe3ZhciBuPWVbaV1bMV1bcl07cmV0dXJuIG8obnx8cil9LHAscC5leHBvcnRzLHIsZSxuLHQpfXJldHVybiBuW2ldLmV4cG9ydHN9Zm9yKHZhciB1PVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmUsaT0wO2k8dC5sZW5ndGg7aSsrKW8odFtpXSk7cmV0dXJuIG99cmV0dXJuIHJ9KSgpIiwiLyoganNoaW50IHVudXNlZDpmYWxzZSAqL1xuLyogZ2xvYmFsIHdpbmRvdywgY29uc29sZSAqL1xuKGZ1bmN0aW9uKGdsb2JhbCkge1xuICAndXNlIHN0cmljdCc7XG4gIHZhciBmaSA9IGZ1bmN0aW9uKCkge1xuXG4gICAgdGhpcy5jc3NJbXBvcnRTdGF0ZW1lbnRzID0gW107XG4gICAgdGhpcy5jc3NLZXlmcmFtZVN0YXRlbWVudHMgPSBbXTtcblxuICAgIHRoaXMuY3NzUmVnZXggPSBuZXcgUmVnRXhwKCcoW1xcXFxzXFxcXFNdKj8peyhbXFxcXHNcXFxcU10qPyl9JywgJ2dpJyk7XG4gICAgdGhpcy5jc3NNZWRpYVF1ZXJ5UmVnZXggPSAnKChAbWVkaWEgW1xcXFxzXFxcXFNdKj8peyhbXFxcXHNcXFxcU10qP31cXFxccyo/KX0pJztcbiAgICB0aGlzLmNzc0tleWZyYW1lUmVnZXggPSAnKChALio/a2V5ZnJhbWVzIFtcXFxcc1xcXFxTXSo/KXsoW1xcXFxzXFxcXFNdKj99XFxcXHMqPyl9KSc7XG4gICAgdGhpcy5jb21iaW5lZENTU1JlZ2V4ID0gJygoXFxcXHMqPyg/OlxcXFwvXFxcXCpbXFxcXHNcXFxcU10qP1xcXFwqXFxcXC8pP1xcXFxzKj9AbWVkaWFbXFxcXHNcXFxcU10qPyl7KFtcXFxcc1xcXFxTXSo/KX1cXFxccyo/fSl8KChbXFxcXHNcXFxcU10qPyl7KFtcXFxcc1xcXFxTXSo/KX0pJzsgLy90byBtYXRjaCBjc3MgJiBtZWRpYSBxdWVyaWVzIHRvZ2V0aGVyXG4gICAgdGhpcy5jc3NDb21tZW50c1JlZ2V4ID0gJyhcXFxcL1xcXFwqW1xcXFxzXFxcXFNdKj9cXFxcKlxcXFwvKSc7XG4gICAgdGhpcy5jc3NJbXBvcnRTdGF0ZW1lbnRSZWdleCA9IG5ldyBSZWdFeHAoJ0BpbXBvcnQgLio/OycsICdnaScpO1xuICB9O1xuXG4gIC8qXG4gICAgU3RyaXAgb3V0cyBjc3MgY29tbWVudHMgYW5kIHJldHVybnMgY2xlYW5lZCBjc3Mgc3RyaW5nXG5cbiAgICBAcGFyYW0gY3NzLCB0aGUgb3JpZ2luYWwgY3NzIHN0cmluZyB0byBiZSBzdGlwcGVkIG91dCBvZiBjb21tZW50c1xuXG4gICAgQHJldHVybiBjbGVhbmVkQ1NTIGNvbnRhaW5zIG5vIGNzcyBjb21tZW50c1xuICAqL1xuICBmaS5wcm90b3R5cGUuc3RyaXBDb21tZW50cyA9IGZ1bmN0aW9uKGNzc1N0cmluZykge1xuICAgIHZhciByZWdleCA9IG5ldyBSZWdFeHAodGhpcy5jc3NDb21tZW50c1JlZ2V4LCAnZ2knKTtcblxuICAgIHJldHVybiBjc3NTdHJpbmcucmVwbGFjZShyZWdleCwgJycpO1xuICB9O1xuXG4gIC8qXG4gICAgUGFyc2VzIGdpdmVuIGNzcyBzdHJpbmcsIGFuZCByZXR1cm5zIGNzcyBvYmplY3RcbiAgICBrZXlzIGFzIHNlbGVjdG9ycyBhbmQgdmFsdWVzIGFyZSBjc3MgcnVsZXNcbiAgICBlbGltaW5hdGVzIGFsbCBjc3MgY29tbWVudHMgYmVmb3JlIHBhcnNpbmdcblxuICAgIEBwYXJhbSBzb3VyY2UgY3NzIHN0cmluZyB0byBiZSBwYXJzZWRcblxuICAgIEByZXR1cm4gb2JqZWN0IGNzc1xuICAqL1xuICBmaS5wcm90b3R5cGUucGFyc2VDU1MgPSBmdW5jdGlvbihzb3VyY2UpIHtcblxuICAgIGlmIChzb3VyY2UgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIFtdO1xuICAgIH1cblxuICAgIHZhciBjc3MgPSBbXTtcbiAgICAvL3N0cmlwIG91dCBjb21tZW50c1xuICAgIC8vc291cmNlID0gdGhpcy5zdHJpcENvbW1lbnRzKHNvdXJjZSk7XG5cbiAgICAvL2dldCBpbXBvcnQgc3RhdGVtZW50c1xuXG4gICAgd2hpbGUgKHRydWUpIHtcbiAgICAgIHZhciBpbXBvcnRzID0gdGhpcy5jc3NJbXBvcnRTdGF0ZW1lbnRSZWdleC5leGVjKHNvdXJjZSk7XG4gICAgICBpZiAoaW1wb3J0cyAhPT0gbnVsbCkge1xuICAgICAgICB0aGlzLmNzc0ltcG9ydFN0YXRlbWVudHMucHVzaChpbXBvcnRzWzBdKTtcbiAgICAgICAgY3NzLnB1c2goe1xuICAgICAgICAgIHNlbGVjdG9yOiAnQGltcG9ydHMnLFxuICAgICAgICAgIHR5cGU6ICdpbXBvcnRzJyxcbiAgICAgICAgICBzdHlsZXM6IGltcG9ydHNbMF1cbiAgICAgICAgfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG4gICAgc291cmNlID0gc291cmNlLnJlcGxhY2UodGhpcy5jc3NJbXBvcnRTdGF0ZW1lbnRSZWdleCwgJycpO1xuICAgIC8vZ2V0IGtleWZyYW1lIHN0YXRlbWVudHNcbiAgICB2YXIga2V5ZnJhbWVzUmVnZXggPSBuZXcgUmVnRXhwKHRoaXMuY3NzS2V5ZnJhbWVSZWdleCwgJ2dpJyk7XG4gICAgdmFyIGFycjtcbiAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgYXJyID0ga2V5ZnJhbWVzUmVnZXguZXhlYyhzb3VyY2UpO1xuICAgICAgaWYgKGFyciA9PT0gbnVsbCkge1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICAgIGNzcy5wdXNoKHtcbiAgICAgICAgc2VsZWN0b3I6ICdAa2V5ZnJhbWVzJyxcbiAgICAgICAgdHlwZTogJ2tleWZyYW1lcycsXG4gICAgICAgIHN0eWxlczogYXJyWzBdXG4gICAgICB9KTtcbiAgICB9XG4gICAgc291cmNlID0gc291cmNlLnJlcGxhY2Uoa2V5ZnJhbWVzUmVnZXgsICcnKTtcblxuICAgIC8vdW5pZmllZCByZWdleFxuICAgIHZhciB1bmlmaWVkID0gbmV3IFJlZ0V4cCh0aGlzLmNvbWJpbmVkQ1NTUmVnZXgsICdnaScpO1xuXG4gICAgd2hpbGUgKHRydWUpIHtcbiAgICAgIGFyciA9IHVuaWZpZWQuZXhlYyhzb3VyY2UpO1xuICAgICAgaWYgKGFyciA9PT0gbnVsbCkge1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICAgIHZhciBzZWxlY3RvciA9ICcnO1xuICAgICAgaWYgKGFyclsyXSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHNlbGVjdG9yID0gYXJyWzVdLnNwbGl0KCdcXHJcXG4nKS5qb2luKCdcXG4nKS50cmltKCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzZWxlY3RvciA9IGFyclsyXS5zcGxpdCgnXFxyXFxuJykuam9pbignXFxuJykudHJpbSgpO1xuICAgICAgfVxuXG4gICAgICAvKlxuICAgICAgICBmZXRjaCBjb21tZW50cyBhbmQgYXNzb2NpYXRlIGl0IHdpdGggY3VycmVudCBzZWxlY3RvclxuICAgICAgKi9cbiAgICAgIHZhciBjb21tZW50c1JlZ2V4ID0gbmV3IFJlZ0V4cCh0aGlzLmNzc0NvbW1lbnRzUmVnZXgsICdnaScpO1xuICAgICAgdmFyIGNvbW1lbnRzID0gY29tbWVudHNSZWdleC5leGVjKHNlbGVjdG9yKTtcbiAgICAgIGlmIChjb21tZW50cyAhPT0gbnVsbCkge1xuICAgICAgICBzZWxlY3RvciA9IHNlbGVjdG9yLnJlcGxhY2UoY29tbWVudHNSZWdleCwgJycpLnRyaW0oKTtcbiAgICAgIH1cblxuICAgICAgLy8gTmV2ZXIgaGF2ZSBtb3JlIHRoYW4gYSBzaW5nbGUgbGluZSBicmVhayBpbiBhIHJvd1xuICAgICAgc2VsZWN0b3IgPSBzZWxlY3Rvci5yZXBsYWNlKC9cXG4rLywgXCJcXG5cIik7XG5cbiAgICAgIC8vZGV0ZXJtaW5lIHRoZSB0eXBlXG4gICAgICBpZiAoc2VsZWN0b3IuaW5kZXhPZignQG1lZGlhJykgIT09IC0xKSB7XG4gICAgICAgIC8vd2UgaGF2ZSBhIG1lZGlhIHF1ZXJ5XG4gICAgICAgIHZhciBjc3NPYmplY3QgPSB7XG4gICAgICAgICAgc2VsZWN0b3I6IHNlbGVjdG9yLFxuICAgICAgICAgIHR5cGU6ICdtZWRpYScsXG4gICAgICAgICAgc3ViU3R5bGVzOiB0aGlzLnBhcnNlQ1NTKGFyclszXSArICdcXG59JykgLy9yZWN1cnNpdmVseSBwYXJzZSBtZWRpYSBxdWVyeSBpbm5lciBjc3NcbiAgICAgICAgfTtcbiAgICAgICAgaWYgKGNvbW1lbnRzICE9PSBudWxsKSB7XG4gICAgICAgICAgY3NzT2JqZWN0LmNvbW1lbnRzID0gY29tbWVudHNbMF07XG4gICAgICAgIH1cbiAgICAgICAgY3NzLnB1c2goY3NzT2JqZWN0KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vd2UgaGF2ZSBzdGFuZGFyZCBjc3NcbiAgICAgICAgdmFyIHJ1bGVzID0gdGhpcy5wYXJzZVJ1bGVzKGFycls2XSk7XG4gICAgICAgIHZhciBzdHlsZSA9IHtcbiAgICAgICAgICBzZWxlY3Rvcjogc2VsZWN0b3IsXG4gICAgICAgICAgcnVsZXM6IHJ1bGVzXG4gICAgICAgIH07XG4gICAgICAgIGlmIChzZWxlY3RvciA9PT0gJ0Bmb250LWZhY2UnKSB7XG4gICAgICAgICAgc3R5bGUudHlwZSA9ICdmb250LWZhY2UnO1xuICAgICAgICB9XG4gICAgICAgIGlmIChjb21tZW50cyAhPT0gbnVsbCkge1xuICAgICAgICAgIHN0eWxlLmNvbW1lbnRzID0gY29tbWVudHNbMF07XG4gICAgICAgIH1cbiAgICAgICAgY3NzLnB1c2goc3R5bGUpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBjc3M7XG4gIH07XG5cbiAgLypcbiAgICBwYXJzZXMgZ2l2ZW4gc3RyaW5nIGNvbnRhaW5pbmcgY3NzIGRpcmVjdGl2ZXNcbiAgICBhbmQgcmV0dXJucyBhbiBhcnJheSBvZiBvYmplY3RzIGNvbnRhaW5pbmcgcnVsZU5hbWU6cnVsZVZhbHVlIHBhaXJzXG5cbiAgICBAcGFyYW0gcnVsZXMsIGNzcyBkaXJlY3RpdmUgc3RyaW5nIGV4YW1wbGVcbiAgICAgICAgXFxuXFxuY29sb3I6d2hpdGU7XFxuICAgIGZvbnQtc2l6ZToxOHB4O1xcblxuICAqL1xuICBmaS5wcm90b3R5cGUucGFyc2VSdWxlcyA9IGZ1bmN0aW9uKHJ1bGVzKSB7XG4gICAgLy9jb252ZXJ0IGFsbCB3aW5kb3dzIHN0eWxlIGxpbmUgZW5kaW5ncyB0byB1bml4IHN0eWxlIGxpbmUgZW5kaW5nc1xuICAgIHJ1bGVzID0gcnVsZXMuc3BsaXQoJ1xcclxcbicpLmpvaW4oJ1xcbicpO1xuICAgIHZhciByZXQgPSBbXTtcblxuICAgIHJ1bGVzID0gcnVsZXMuc3BsaXQoJzsnKTtcblxuICAgIC8vcHJvY2Nlc3MgcnVsZXMgbGluZSBieSBsaW5lXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBydWxlcy5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIGxpbmUgPSBydWxlc1tpXTtcblxuICAgICAgLy9kZXRlcm1pbmUgaWYgbGluZSBpcyBhIHZhbGlkIGNzcyBkaXJlY3RpdmUsIGllIGNvbG9yOndoaXRlO1xuICAgICAgbGluZSA9IGxpbmUudHJpbSgpO1xuICAgICAgaWYgKGxpbmUuaW5kZXhPZignOicpICE9PSAtMSkge1xuICAgICAgICAvL2xpbmUgY29udGFpbnMgOlxuICAgICAgICBsaW5lID0gbGluZS5zcGxpdCgnOicpO1xuICAgICAgICB2YXIgY3NzRGlyZWN0aXZlID0gbGluZVswXS50cmltKCk7XG4gICAgICAgIHZhciBjc3NWYWx1ZSA9IGxpbmUuc2xpY2UoMSkuam9pbignOicpLnRyaW0oKTtcblxuICAgICAgICAvL21vcmUgY2hlY2tzXG4gICAgICAgIGlmIChjc3NEaXJlY3RpdmUubGVuZ3RoIDwgMSB8fCBjc3NWYWx1ZS5sZW5ndGggPCAxKSB7XG4gICAgICAgICAgY29udGludWU7IC8vdGhlcmUgaXMgbm8gY3NzIGRpcmVjdGl2ZSBvciB2YWx1ZSB0aGF0IGlzIG9mIGxlbmd0aCAxIG9yIDBcbiAgICAgICAgICAvLyBQTEFJTiBXUk9ORyBXSEFUIEFCT1VUIG1hcmdpbjowOyA/XG4gICAgICAgIH1cblxuICAgICAgICAvL3B1c2ggcnVsZVxuICAgICAgICByZXQucHVzaCh7XG4gICAgICAgICAgZGlyZWN0aXZlOiBjc3NEaXJlY3RpdmUsXG4gICAgICAgICAgdmFsdWU6IGNzc1ZhbHVlXG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy9pZiB0aGVyZSBpcyBubyAnOicsIGJ1dCB3aGF0IGlmIGl0IHdhcyBtaXMgc3BsaXR0ZWQgdmFsdWUgd2hpY2ggc3RhcnRzIHdpdGggYmFzZTY0XG4gICAgICAgIGlmIChsaW5lLnRyaW0oKS5zdWJzdHIoMCwgNykgPT09ICdiYXNlNjQsJykgeyAvL2hhY2sgOilcbiAgICAgICAgICByZXRbcmV0Lmxlbmd0aCAtIDFdLnZhbHVlICs9IGxpbmUudHJpbSgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vYWRkIHJ1bGUsIGV2ZW4gaWYgaXQgaXMgZGVmZWN0aXZlXG4gICAgICAgICAgaWYgKGxpbmUubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgcmV0LnB1c2goe1xuICAgICAgICAgICAgICBkaXJlY3RpdmU6ICcnLFxuICAgICAgICAgICAgICB2YWx1ZTogbGluZSxcbiAgICAgICAgICAgICAgZGVmZWN0aXZlOiB0cnVlXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gcmV0OyAvL3dlIGFyZSBkb25lIVxuICB9O1xuICAvKlxuICAgIGp1c3QgcmV0dXJucyB0aGUgcnVsZSBoYXZpbmcgZ2l2ZW4gZGlyZWN0aXZlXG4gICAgaWYgbm90IGZvdW5kIHJldHVybnMgZmFsc2U7XG4gICovXG4gIGZpLnByb3RvdHlwZS5maW5kQ29ycmVzcG9uZGluZ1J1bGUgPSBmdW5jdGlvbihydWxlcywgZGlyZWN0aXZlLCB2YWx1ZSkge1xuICAgIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICB2YWx1ZSA9IGZhbHNlO1xuICAgIH1cbiAgICB2YXIgcmV0ID0gZmFsc2U7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBydWxlcy5sZW5ndGg7IGkrKykge1xuICAgICAgaWYgKHJ1bGVzW2ldLmRpcmVjdGl2ZSA9PT0gZGlyZWN0aXZlKSB7XG4gICAgICAgIHJldCA9IHJ1bGVzW2ldO1xuICAgICAgICBpZiAodmFsdWUgPT09IHJ1bGVzW2ldLnZhbHVlKSB7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJldDtcbiAgfTtcblxuICAvKlxuICAgICAgRmluZHMgc3R5bGVzIHRoYXQgaGF2ZSBnaXZlbiBzZWxlY3RvciwgY29tcHJlc3MgdGhlbSxcbiAgICAgIGFuZCByZXR1cm5zIHRoZW1cbiAgKi9cbiAgZmkucHJvdG90eXBlLmZpbmRCeVNlbGVjdG9yID0gZnVuY3Rpb24oY3NzT2JqZWN0QXJyYXksIHNlbGVjdG9yLCBjb250YWlucykge1xuICAgIGlmIChjb250YWlucyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICBjb250YWlucyA9IGZhbHNlO1xuICAgIH1cblxuICAgIHZhciBmb3VuZCA9IFtdO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY3NzT2JqZWN0QXJyYXkubGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmIChjb250YWlucyA9PT0gZmFsc2UpIHtcbiAgICAgICAgaWYgKGNzc09iamVjdEFycmF5W2ldLnNlbGVjdG9yID09PSBzZWxlY3Rvcikge1xuICAgICAgICAgIGZvdW5kLnB1c2goY3NzT2JqZWN0QXJyYXlbaV0pO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAoY3NzT2JqZWN0QXJyYXlbaV0uc2VsZWN0b3IuaW5kZXhPZihzZWxlY3RvcikgIT09IC0xKSB7XG4gICAgICAgICAgZm91bmQucHVzaChjc3NPYmplY3RBcnJheVtpXSk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgIH1cbiAgICBpZiAoc2VsZWN0b3IgPT09ICdAaW1wb3J0cycgfHwgZm91bmQubGVuZ3RoIDwgMikge1xuICAgICAgcmV0dXJuIGZvdW5kO1xuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgYmFzZSA9IGZvdW5kWzBdO1xuICAgICAgZm9yIChpID0gMTsgaSA8IGZvdW5kLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHRoaXMuaW50ZWxsaWdlbnRDU1NQdXNoKFtiYXNlXSwgZm91bmRbaV0pO1xuICAgICAgfVxuICAgICAgcmV0dXJuIFtiYXNlXTsgLy93ZSBhcmUgZG9uZSEhIGFsbCBwcm9wZXJ0aWVzIG1lcmdlZCBpbnRvIGJhc2UhXG4gICAgfVxuICB9O1xuXG4gIC8qXG4gICAgZGVsZXRlcyBjc3NPYmplY3RzIGhhdmluZyBnaXZlbiBzZWxlY3RvciwgYW5kIHJldHVybnMgbmV3IGFycmF5XG4gICovXG4gIGZpLnByb3RvdHlwZS5kZWxldGVCeVNlbGVjdG9yID0gZnVuY3Rpb24oY3NzT2JqZWN0QXJyYXksIHNlbGVjdG9yKSB7XG4gICAgdmFyIHJldCA9IFtdO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY3NzT2JqZWN0QXJyYXkubGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmIChjc3NPYmplY3RBcnJheVtpXS5zZWxlY3RvciAhPT0gc2VsZWN0b3IpIHtcbiAgICAgICAgcmV0LnB1c2goY3NzT2JqZWN0QXJyYXlbaV0pO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmV0O1xuICB9O1xuXG4gIC8qXG4gICAgICBDb21wcmVzc2VzIGdpdmVuIGNzc09iamVjdEFycmF5IGFuZCB0cmllcyB0byBtaW5pbWl6ZVxuICAgICAgc2VsZWN0b3IgcmVkdW5kZW5jZS5cbiAgKi9cbiAgZmkucHJvdG90eXBlLmNvbXByZXNzQ1NTID0gZnVuY3Rpb24oY3NzT2JqZWN0QXJyYXkpIHtcbiAgICB2YXIgY29tcHJlc3NlZCA9IFtdO1xuICAgIHZhciBkb25lID0ge307XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjc3NPYmplY3RBcnJheS5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIG9iaiA9IGNzc09iamVjdEFycmF5W2ldO1xuICAgICAgaWYgKGRvbmVbb2JqLnNlbGVjdG9yXSA9PT0gdHJ1ZSkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgdmFyIGZvdW5kID0gdGhpcy5maW5kQnlTZWxlY3Rvcihjc3NPYmplY3RBcnJheSwgb2JqLnNlbGVjdG9yKTsgLy9mb3VuZCBjb21wcmVzc2VkXG4gICAgICBpZiAoZm91bmQubGVuZ3RoICE9PSAwKSB7XG4gICAgICAgIGNvbXByZXNzZWQgPSBjb21wcmVzc2VkLmNvbmNhdChmb3VuZCk7XG4gICAgICAgIGRvbmVbb2JqLnNlbGVjdG9yXSA9IHRydWU7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBjb21wcmVzc2VkO1xuICB9O1xuXG4gIC8qXG4gICAgUmVjZWl2ZWQgMiBjc3Mgb2JqZWN0cyB3aXRoIGZvbGxvd2luZyBzdHJ1Y3R1cmVcbiAgICAgIHtcbiAgICAgICAgcnVsZXMgOiBbe2RpcmVjdGl2ZTpcIlwiLCB2YWx1ZTpcIlwifSwge2RpcmVjdGl2ZTpcIlwiLCB2YWx1ZTpcIlwifSwgLi4uXVxuICAgICAgICBzZWxlY3RvciA6IFwiU09NRVNFTEVDVE9SXCJcbiAgICAgIH1cblxuICAgIHJldHVybnMgdGhlIGNoYW5nZWQobmV3LHJlbW92ZWQsdXBkYXRlZCkgdmFsdWVzIG9uIGNzczEgcGFyYW1ldGVyLCBvbiBzYW1lIHN0cnVjdHVyZVxuXG4gICAgaWYgdHdvIGNzcyBvYmplY3RzIGFyZSB0aGUgc2FtZSwgdGhlbiByZXR1cm5zIGZhbHNlXG5cbiAgICAgIGlmIGEgY3NzIGRpcmVjdGl2ZSBleGlzdHMgaW4gY3NzMSBhbmQgICAgIGNzczIsIGFuZCBpdHMgdmFsdWUgaXMgZGlmZmVyZW50LCBpdCBpcyBpbmNsdWRlZCBpbiBkaWZmXG4gICAgICBpZiBhIGNzcyBkaXJlY3RpdmUgZXhpc3RzIGluIGNzczEgYW5kIG5vdCBjc3MyLCBpdCBpcyB0aGVuIGluY2x1ZGVkIGluIGRpZmZcbiAgICAgIGlmIGEgY3NzIGRpcmVjdGl2ZSBleGlzdHMgaW4gY3NzMiBidXQgbm90IGNzczEsIHRoZW4gaXQgaXMgZGVsZXRlZCBpbiBjc3MxLCBpdCB3b3VsZCBiZSBpbmNsdWRlZCBpbiBkaWZmIGJ1dCB3aWxsIGJlIG1hcmtlZCBhcyB0eXBlPSdERUxFVEVEJ1xuXG4gICAgICBAb2JqZWN0IGNzczEgY3NzIG9iamVjdFxuICAgICAgQG9iamVjdCBjc3MyIGNzcyBvYmplY3RcblxuICAgICAgQHJldHVybiBkaWZmIGNzcyBvYmplY3QgY29udGFpbnMgY2hhbmdlZCB2YWx1ZXMgaW4gY3NzMSBpbiByZWdhcmRzIHRvIGNzczIgc2VlIHRlc3QgaW5wdXQgb3V0cHV0IGluIC90ZXN0L2RhdGEvY3NzLmpzXG4gICovXG4gIGZpLnByb3RvdHlwZS5jc3NEaWZmID0gZnVuY3Rpb24oY3NzMSwgY3NzMikge1xuICAgIGlmIChjc3MxLnNlbGVjdG9yICE9PSBjc3MyLnNlbGVjdG9yKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgLy9pZiBvbmUgb2YgdGhlbSBpcyBtZWRpYSBxdWVyeSByZXR1cm4gZmFsc2UsIGJlY2F1c2UgZGlmZiBmdW5jdGlvbiBjYW4gbm90IG9wZXJhdGUgb24gbWVkaWEgcXVlcmllc1xuICAgIGlmICgoY3NzMS50eXBlID09PSAnbWVkaWEnIHx8IGNzczIudHlwZSA9PT0gJ21lZGlhJykpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICB2YXIgZGlmZiA9IHtcbiAgICAgIHNlbGVjdG9yOiBjc3MxLnNlbGVjdG9yLFxuICAgICAgcnVsZXM6IFtdXG4gICAgfTtcbiAgICB2YXIgcnVsZTEsIHJ1bGUyO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY3NzMS5ydWxlcy5sZW5ndGg7IGkrKykge1xuICAgICAgcnVsZTEgPSBjc3MxLnJ1bGVzW2ldO1xuICAgICAgLy9maW5kIHJ1bGUyIHdoaWNoIGhhcyB0aGUgc2FtZSBkaXJlY3RpdmUgYXMgcnVsZTFcbiAgICAgIHJ1bGUyID0gdGhpcy5maW5kQ29ycmVzcG9uZGluZ1J1bGUoY3NzMi5ydWxlcywgcnVsZTEuZGlyZWN0aXZlLCBydWxlMS52YWx1ZSk7XG4gICAgICBpZiAocnVsZTIgPT09IGZhbHNlKSB7XG4gICAgICAgIC8vcnVsZTEgaXMgYSBuZXcgcnVsZSBpbiBjc3MxXG4gICAgICAgIGRpZmYucnVsZXMucHVzaChydWxlMSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvL3J1bGUyIHdhcyBmb3VuZCBvbmx5IHB1c2ggaWYgaXRzIHZhbHVlIGlzIGRpZmZlcmVudCB0b29cbiAgICAgICAgaWYgKHJ1bGUxLnZhbHVlICE9PSBydWxlMi52YWx1ZSkge1xuICAgICAgICAgIGRpZmYucnVsZXMucHVzaChydWxlMSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICAvL25vdyBmb3IgcnVsZXMgZXhpc3RzIGluIGNzczIgYnV0IG5vdCBpbiBjc3MxLCB3aGljaCBtZWFucyBkZWxldGVkIHJ1bGVzXG4gICAgZm9yICh2YXIgaWkgPSAwOyBpaSA8IGNzczIucnVsZXMubGVuZ3RoOyBpaSsrKSB7XG4gICAgICBydWxlMiA9IGNzczIucnVsZXNbaWldO1xuICAgICAgLy9maW5kIHJ1bGUyIHdoaWNoIGhhcyB0aGUgc2FtZSBkaXJlY3RpdmUgYXMgcnVsZTFcbiAgICAgIHJ1bGUxID0gdGhpcy5maW5kQ29ycmVzcG9uZGluZ1J1bGUoY3NzMS5ydWxlcywgcnVsZTIuZGlyZWN0aXZlKTtcbiAgICAgIGlmIChydWxlMSA9PT0gZmFsc2UpIHtcbiAgICAgICAgLy9ydWxlMSBpcyBhIG5ldyBydWxlXG4gICAgICAgIHJ1bGUyLnR5cGUgPSAnREVMRVRFRCc7IC8vbWFyayBpdCBhcyBhIGRlbGV0ZWQgcnVsZSwgc28gdGhhdCBvdGhlciBtZXJnZSBvcGVyYXRpb25zIGNvdWxkIGJlIHRydWVcbiAgICAgICAgZGlmZi5ydWxlcy5wdXNoKHJ1bGUyKTtcbiAgICAgIH1cbiAgICB9XG5cblxuICAgIGlmIChkaWZmLnJ1bGVzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gZGlmZjtcbiAgfTtcblxuICAvKlxuICAgICAgTWVyZ2VzIDIgZGlmZmVyZW50IGNzcyBvYmplY3RzIHRvZ2V0aGVyXG4gICAgICB1c2luZyBpbnRlbGxpZ2VudENTU1B1c2gsXG5cbiAgICAgIEBwYXJhbSBjc3NPYmplY3RBcnJheSwgdGFyZ2V0IGNzcyBvYmplY3QgYXJyYXlcbiAgICAgIEBwYXJhbSBuZXdBcnJheSwgc291cmNlIGFycmF5IHRoYXQgd2lsbCBiZSBwdXNoZWQgaW50byBjc3NPYmplY3RBcnJheSBwYXJhbWV0ZXJcbiAgICAgIEBwYXJhbSByZXZlcnNlLCBbb3B0aW9uYWxdLCBpZiBnaXZlbiB0cnVlLCBmaXJzdCBwYXJhbWV0ZXIgd2lsbCBiZSB0cmF2ZXJzZWQgb24gcmV2ZXJzZWQgb3JkZXJcbiAgICAgICAgICAgICAgZWZmZWN0aXZlbHkgZ2l2aW5nIHByaW9yaXR5IHRvIHRoZSBzdHlsZXMgaW4gbmV3QXJyYXlcbiAgKi9cbiAgZmkucHJvdG90eXBlLmludGVsbGlnZW50TWVyZ2UgPSBmdW5jdGlvbihjc3NPYmplY3RBcnJheSwgbmV3QXJyYXksIHJldmVyc2UpIHtcbiAgICBpZiAocmV2ZXJzZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXZlcnNlID0gZmFsc2U7XG4gICAgfVxuXG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IG5ld0FycmF5Lmxlbmd0aDsgaSsrKSB7XG4gICAgICB0aGlzLmludGVsbGlnZW50Q1NTUHVzaChjc3NPYmplY3RBcnJheSwgbmV3QXJyYXlbaV0sIHJldmVyc2UpO1xuICAgIH1cbiAgICBmb3IgKGkgPSAwOyBpIDwgY3NzT2JqZWN0QXJyYXkubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciBjb2JqID0gY3NzT2JqZWN0QXJyYXlbaV07XG4gICAgICBpZiAoY29iai50eXBlID09PSAnbWVkaWEnIHx8IChjb2JqLnR5cGUgPT09ICdrZXlmcmFtZXMnKSkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGNvYmoucnVsZXMgPSB0aGlzLmNvbXBhY3RSdWxlcyhjb2JqLnJ1bGVzKTtcbiAgICB9XG4gIH07XG5cbiAgLypcbiAgICBpbnNlcnRzIG5ldyBjc3Mgb2JqZWN0cyBpbnRvIGEgYmlnZ2VyIGNzcyBvYmplY3RcbiAgICB3aXRoIHNhbWUgc2VsZWN0b3JzIGdyb3VwZWQgdG9nZXRoZXJcblxuICAgIEBwYXJhbSBjc3NPYmplY3RBcnJheSwgYXJyYXkgb2YgYmlnZ2VyIGNzcyBvYmplY3QgdG8gYmUgcHVzaGVkIGludG9cbiAgICBAcGFyYW0gbWluaW1hbE9iamVjdCwgc2luZ2xlIGNzcyBvYmplY3RcbiAgICBAcGFyYW0gcmV2ZXJzZSBbb3B0aW9uYWxdIGRlZmF1bHQgaXMgZmFsc2UsIGlmIGdpdmVuLCBjc3NPYmplY3RBcnJheSB3aWxsIGJlIHJldmVyc2x5IHRyYXZlcnNlZFxuICAgICAgICAgICAgcmVzdWx0aW5nIG1vcmUgcHJpb3JpdHkgaW4gbWluaW1hbE9iamVjdCdzIHN0eWxlc1xuICAqL1xuICBmaS5wcm90b3R5cGUuaW50ZWxsaWdlbnRDU1NQdXNoID0gZnVuY3Rpb24oY3NzT2JqZWN0QXJyYXksIG1pbmltYWxPYmplY3QsIHJldmVyc2UpIHtcbiAgICB2YXIgcHVzaFNlbGVjdG9yID0gbWluaW1hbE9iamVjdC5zZWxlY3RvcjtcbiAgICAvL2ZpbmQgY29ycmVjdCBzZWxlY3RvciBpZiBub3QgZm91bmQganVzdCBwdXNoIG1pbmltYWxPYmplY3QgaW50byBjc3NPYmplY3RcbiAgICB2YXIgY3NzT2JqZWN0ID0gZmFsc2U7XG5cbiAgICBpZiAocmV2ZXJzZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXZlcnNlID0gZmFsc2U7XG4gICAgfVxuXG4gICAgaWYgKHJldmVyc2UgPT09IGZhbHNlKSB7XG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNzc09iamVjdEFycmF5Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGlmIChjc3NPYmplY3RBcnJheVtpXS5zZWxlY3RvciA9PT0gcHVzaFNlbGVjdG9yKSB7XG4gICAgICAgICAgY3NzT2JqZWN0ID0gY3NzT2JqZWN0QXJyYXlbaV07XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgZm9yICh2YXIgaiA9IGNzc09iamVjdEFycmF5Lmxlbmd0aCAtIDE7IGogPiAtMTsgai0tKSB7XG4gICAgICAgIGlmIChjc3NPYmplY3RBcnJheVtqXS5zZWxlY3RvciA9PT0gcHVzaFNlbGVjdG9yKSB7XG4gICAgICAgICAgY3NzT2JqZWN0ID0gY3NzT2JqZWN0QXJyYXlbal07XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoY3NzT2JqZWN0ID09PSBmYWxzZSkge1xuICAgICAgY3NzT2JqZWN0QXJyYXkucHVzaChtaW5pbWFsT2JqZWN0KTsgLy9qdXN0IHB1c2gsIGJlY2F1c2UgY3NzU2VsZWN0b3IgaXMgbmV3XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmIChtaW5pbWFsT2JqZWN0LnR5cGUgIT09ICdtZWRpYScpIHtcbiAgICAgICAgZm9yICh2YXIgaWkgPSAwOyBpaSA8IG1pbmltYWxPYmplY3QucnVsZXMubGVuZ3RoOyBpaSsrKSB7XG4gICAgICAgICAgdmFyIHJ1bGUgPSBtaW5pbWFsT2JqZWN0LnJ1bGVzW2lpXTtcbiAgICAgICAgICAvL2ZpbmQgcnVsZSBpbnNpZGUgY3NzT2JqZWN0XG4gICAgICAgICAgdmFyIG9sZFJ1bGUgPSB0aGlzLmZpbmRDb3JyZXNwb25kaW5nUnVsZShjc3NPYmplY3QucnVsZXMsIHJ1bGUuZGlyZWN0aXZlKTtcbiAgICAgICAgICBpZiAob2xkUnVsZSA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgIGNzc09iamVjdC5ydWxlcy5wdXNoKHJ1bGUpO1xuICAgICAgICAgIH0gZWxzZSBpZiAocnVsZS50eXBlID09PSAnREVMRVRFRCcpIHtcbiAgICAgICAgICAgIG9sZFJ1bGUudHlwZSA9ICdERUxFVEVEJztcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy9ydWxlIGZvdW5kIGp1c3QgdXBkYXRlIHZhbHVlXG5cbiAgICAgICAgICAgIG9sZFJ1bGUudmFsdWUgPSBydWxlLnZhbHVlO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY3NzT2JqZWN0LnN1YlN0eWxlcyA9IGNzc09iamVjdC5zdWJTdHlsZXMuY29uY2F0KG1pbmltYWxPYmplY3Quc3ViU3R5bGVzKTsgLy9UT0RPLCBtYWtlIHRoaXMgaW50ZWxsaWdlbnQgdG9vXG4gICAgICB9XG5cbiAgICB9XG4gIH07XG5cbiAgLypcbiAgICBmaWx0ZXIgb3V0cyBydWxlIG9iamVjdHMgd2hvc2UgdHlwZSBwYXJhbSBlcXVhbCB0byBERUxFVEVEXG5cbiAgICBAcGFyYW0gcnVsZXMsIGFycmF5IG9mIHJ1bGVzXG5cbiAgICBAcmV0dXJucyBydWxlcyBhcnJheSwgY29tcGFjdGVkIGJ5IGRlbGV0aW5nIGFsbCB1bm5lY2Vzc2FyeSBydWxlc1xuICAqL1xuICBmaS5wcm90b3R5cGUuY29tcGFjdFJ1bGVzID0gZnVuY3Rpb24ocnVsZXMpIHtcbiAgICB2YXIgbmV3UnVsZXMgPSBbXTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHJ1bGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAocnVsZXNbaV0udHlwZSAhPT0gJ0RFTEVURUQnKSB7XG4gICAgICAgIG5ld1J1bGVzLnB1c2gocnVsZXNbaV0pO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbmV3UnVsZXM7XG4gIH07XG4gIC8qXG4gICAgY29tcHV0ZXMgc3RyaW5nIGZvciBhY2UgZWRpdG9yIHVzaW5nIHRoaXMuY3NzIG9yIGdpdmVuIGNzc0Jhc2Ugb3B0aW9uYWwgcGFyYW1ldGVyXG5cbiAgICBAcGFyYW0gW29wdGlvbmFsXSBjc3NCYXNlLCBpZiBnaXZlbiBjb21wdXRlcyBjc3NTdHJpbmcgZnJvbSBjc3NPYmplY3QgYXJyYXlcbiAgKi9cbiAgZmkucHJvdG90eXBlLmdldENTU0ZvckVkaXRvciA9IGZ1bmN0aW9uKGNzc0Jhc2UsIGRlcHRoKSB7XG4gICAgaWYgKGRlcHRoID09PSB1bmRlZmluZWQpIHtcbiAgICAgIGRlcHRoID0gMDtcbiAgICB9XG4gICAgdmFyIHJldCA9ICcnO1xuICAgIGlmIChjc3NCYXNlID09PSB1bmRlZmluZWQpIHtcbiAgICAgIGNzc0Jhc2UgPSB0aGlzLmNzcztcbiAgICB9XG4gICAgLy9hcHBlbmQgaW1wb3J0c1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY3NzQmFzZS5sZW5ndGg7IGkrKykge1xuICAgICAgaWYgKGNzc0Jhc2VbaV0udHlwZSA9PT0gJ2ltcG9ydHMnKSB7XG4gICAgICAgIHJldCArPSBjc3NCYXNlW2ldLnN0eWxlcyArICdcXG5cXG4nO1xuICAgICAgfVxuICAgIH1cbiAgICBmb3IgKGkgPSAwOyBpIDwgY3NzQmFzZS5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIHRtcCA9IGNzc0Jhc2VbaV07XG4gICAgICBpZiAodG1wLnNlbGVjdG9yID09PSB1bmRlZmluZWQpIHsgLy90ZW1wb3JhcmlseSBvbWl0IG1lZGlhIHF1ZXJpZXNcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICB2YXIgY29tbWVudHMgPSBcIlwiO1xuICAgICAgaWYgKHRtcC5jb21tZW50cyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGNvbW1lbnRzID0gdG1wLmNvbW1lbnRzICsgJ1xcbic7XG4gICAgICB9XG5cbiAgICAgIGlmICh0bXAudHlwZSA9PT0gJ21lZGlhJykgeyAvL2Fsc28gcHV0IG1lZGlhIHF1ZXJpZXMgdG8gb3V0cHV0XG4gICAgICAgIHJldCArPSBjb21tZW50cyArIHRtcC5zZWxlY3RvciArICd7XFxuJztcbiAgICAgICAgcmV0ICs9IHRoaXMuZ2V0Q1NTRm9yRWRpdG9yKHRtcC5zdWJTdHlsZXMsIGRlcHRoICsgMSk7XG4gICAgICAgIHJldCArPSAnfVxcblxcbic7XG4gICAgICB9IGVsc2UgaWYgKHRtcC50eXBlICE9PSAna2V5ZnJhbWVzJyAmJiB0bXAudHlwZSAhPT0gJ2ltcG9ydHMnKSB7XG4gICAgICAgIHJldCArPSB0aGlzLmdldFNwYWNlcyhkZXB0aCkgKyBjb21tZW50cyArIHRtcC5zZWxlY3RvciArICcge1xcbic7XG4gICAgICAgIHJldCArPSB0aGlzLmdldENTU09mUnVsZXModG1wLnJ1bGVzLCBkZXB0aCArIDEpO1xuICAgICAgICByZXQgKz0gdGhpcy5nZXRTcGFjZXMoZGVwdGgpICsgJ31cXG5cXG4nO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vYXBwZW5kIGtleUZyYW1lc1xuICAgIGZvciAoaSA9IDA7IGkgPCBjc3NCYXNlLmxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAoY3NzQmFzZVtpXS50eXBlID09PSAna2V5ZnJhbWVzJykge1xuICAgICAgICByZXQgKz0gY3NzQmFzZVtpXS5zdHlsZXMgKyAnXFxuXFxuJztcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gcmV0O1xuICB9O1xuXG4gIGZpLnByb3RvdHlwZS5nZXRJbXBvcnRzID0gZnVuY3Rpb24oY3NzT2JqZWN0QXJyYXkpIHtcbiAgICB2YXIgaW1wcyA9IFtdO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY3NzT2JqZWN0QXJyYXkubGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmIChjc3NPYmplY3RBcnJheVtpXS50eXBlID09PSAnaW1wb3J0cycpIHtcbiAgICAgICAgaW1wcy5wdXNoKGNzc09iamVjdEFycmF5W2ldLnN0eWxlcyk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBpbXBzO1xuICB9O1xuICAvKlxuICAgIGdpdmVuIHJ1bGVzIGFycmF5LCByZXR1cm5zIHZpc3VhbGx5IGZvcm1hdHRlZCBjc3Mgc3RyaW5nXG4gICAgdG8gYmUgdXNlZCBpbnNpZGUgZWRpdG9yXG4gICovXG4gIGZpLnByb3RvdHlwZS5nZXRDU1NPZlJ1bGVzID0gZnVuY3Rpb24ocnVsZXMsIGRlcHRoKSB7XG4gICAgdmFyIHJldCA9ICcnO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcnVsZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmIChydWxlc1tpXSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgaWYgKHJ1bGVzW2ldLmRlZmVjdGl2ZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJldCArPSB0aGlzLmdldFNwYWNlcyhkZXB0aCkgKyBydWxlc1tpXS5kaXJlY3RpdmUgKyAnOiAnICsgcnVsZXNbaV0udmFsdWUgKyAnO1xcbic7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXQgKz0gdGhpcy5nZXRTcGFjZXMoZGVwdGgpICsgcnVsZXNbaV0udmFsdWUgKyAnO1xcbic7XG4gICAgICB9XG5cbiAgICB9XG4gICAgcmV0dXJuIHJldCB8fCAnXFxuJztcbiAgfTtcblxuICAvKlxuICAgICAgQSB2ZXJ5IHNpbXBsZSBoZWxwZXIgZnVuY3Rpb24gcmV0dXJucyBudW1iZXIgb2Ygc3BhY2VzIGFwcGVuZGVkIGluIGEgc2luZ2xlIHN0cmluZyxcbiAgICAgIHRoZSBudW1iZXIgZGVwZW5kcyBpbnB1dCBwYXJhbWV0ZXIsIG5hbWVseSBpbnB1dCoyXG4gICovXG4gIGZpLnByb3RvdHlwZS5nZXRTcGFjZXMgPSBmdW5jdGlvbihudW0pIHtcbiAgICB2YXIgcmV0ID0gJyc7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBudW0gKiA0OyBpKyspIHtcbiAgICAgIHJldCArPSAnICc7XG4gICAgfVxuICAgIHJldHVybiByZXQ7XG4gIH07XG5cbiAgLypcbiAgICBHaXZlbiBjc3Mgc3RyaW5nIG9yIG9iamVjdEFycmF5LCBwYXJzZXMgaXQgYW5kIHRoZW4gZm9yIGV2ZXJ5IHNlbGVjdG9yLFxuICAgIHByZXBlbmRzIHRoaXMuY3NzUHJldmlld05hbWVzcGFjZSB0byBwcmV2ZW50IGNzcyBjb2xsaXNpb24gaXNzdWVzXG5cbiAgICBAcmV0dXJucyBjc3Mgc3RyaW5nIGluIHdoaWNoIHRoaXMuY3NzUHJldmlld05hbWVzcGFjZSBwcmVwZW5kZWRcbiAgKi9cbiAgZmkucHJvdG90eXBlLmFwcGx5TmFtZXNwYWNpbmcgPSBmdW5jdGlvbihjc3MsIGZvcmNlZE5hbWVzcGFjZSkge1xuICAgIHZhciBjc3NPYmplY3RBcnJheSA9IGNzcztcbiAgICB2YXIgbmFtZXNwYWNlQ2xhc3MgPSAnLicgKyB0aGlzLmNzc1ByZXZpZXdOYW1lc3BhY2U7XG4gICAgaWYoZm9yY2VkTmFtZXNwYWNlICE9PSB1bmRlZmluZWQpe1xuICAgICAgbmFtZXNwYWNlQ2xhc3MgPSBmb3JjZWROYW1lc3BhY2U7XG4gICAgfVxuXG4gICAgaWYgKHR5cGVvZiBjc3MgPT09ICdzdHJpbmcnKSB7XG4gICAgICBjc3NPYmplY3RBcnJheSA9IHRoaXMucGFyc2VDU1MoY3NzKTtcbiAgICB9XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNzc09iamVjdEFycmF5Lmxlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIgb2JqID0gY3NzT2JqZWN0QXJyYXlbaV07XG5cbiAgICAgIC8vYnlwYXNzIG5hbWVzcGFjaW5nIGZvciBAZm9udC1mYWNlIEBrZXlmcmFtZXMgQGltcG9ydFxuICAgICAgaWYob2JqLnNlbGVjdG9yLmluZGV4T2YoJ0Bmb250LWZhY2UnKSA+IC0xIHx8IG9iai5zZWxlY3Rvci5pbmRleE9mKCdrZXlmcmFtZXMnKSA+IC0xIHx8IG9iai5zZWxlY3Rvci5pbmRleE9mKCdAaW1wb3J0JykgPiAtMSB8fCBvYmouc2VsZWN0b3IuaW5kZXhPZignLmZvcm0tYWxsJykgPiAtMSB8fCBvYmouc2VsZWN0b3IuaW5kZXhPZignI3N0YWdlJykgPiAtMSl7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBpZiAob2JqLnR5cGUgIT09ICdtZWRpYScpIHtcbiAgICAgICAgdmFyIHNlbGVjdG9yID0gb2JqLnNlbGVjdG9yLnNwbGl0KCcsJyk7XG4gICAgICAgIHZhciBuZXdTZWxlY3RvciA9IFtdO1xuICAgICAgICBmb3IgKHZhciBqID0gMDsgaiA8IHNlbGVjdG9yLmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgaWYgKHNlbGVjdG9yW2pdLmluZGV4T2YoJy5zdXBlcm5vdmEnKSA9PT0gLTEpIHsgLy9kbyBub3QgYXBwbHkgbmFtZXNwYWNpbmcgdG8gc2VsZWN0b3JzIGluY2x1ZGluZyBzdXBlcm5vdmFcbiAgICAgICAgICAgIG5ld1NlbGVjdG9yLnB1c2gobmFtZXNwYWNlQ2xhc3MgKyAnICcgKyBzZWxlY3RvcltqXSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG5ld1NlbGVjdG9yLnB1c2goc2VsZWN0b3Jbal0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBvYmouc2VsZWN0b3IgPSBuZXdTZWxlY3Rvci5qb2luKCcsJyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBvYmouc3ViU3R5bGVzID0gdGhpcy5hcHBseU5hbWVzcGFjaW5nKG9iai5zdWJTdHlsZXMsIGZvcmNlZE5hbWVzcGFjZSk7IC8vaGFuZGxlIG1lZGlhIHF1ZXJpZXMgYXMgd2VsbFxuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBjc3NPYmplY3RBcnJheTtcbiAgfTtcblxuICAvKlxuICAgIGdpdmVuIGNzcyBzdHJpbmcgb3Igb2JqZWN0IGFycmF5LCBjbGVhcnMgcG9zc2libGUgbmFtZXNwYWNpbmcgZnJvbVxuICAgIGFsbCBvZiB0aGUgc2VsZWN0b3JzIGluc2lkZSB0aGUgY3NzXG4gICovXG4gIGZpLnByb3RvdHlwZS5jbGVhck5hbWVzcGFjaW5nID0gZnVuY3Rpb24oY3NzLCByZXR1cm5PYmopIHtcbiAgICBpZiAocmV0dXJuT2JqID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybk9iaiA9IGZhbHNlO1xuICAgIH1cbiAgICB2YXIgY3NzT2JqZWN0QXJyYXkgPSBjc3M7XG4gICAgdmFyIG5hbWVzcGFjZUNsYXNzID0gJy4nICsgdGhpcy5jc3NQcmV2aWV3TmFtZXNwYWNlO1xuICAgIGlmICh0eXBlb2YgY3NzID09PSAnc3RyaW5nJykge1xuICAgICAgY3NzT2JqZWN0QXJyYXkgPSB0aGlzLnBhcnNlQ1NTKGNzcyk7XG4gICAgfVxuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjc3NPYmplY3RBcnJheS5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIG9iaiA9IGNzc09iamVjdEFycmF5W2ldO1xuXG4gICAgICBpZiAob2JqLnR5cGUgIT09ICdtZWRpYScpIHtcbiAgICAgICAgdmFyIHNlbGVjdG9yID0gb2JqLnNlbGVjdG9yLnNwbGl0KCcsJyk7XG4gICAgICAgIHZhciBuZXdTZWxlY3RvciA9IFtdO1xuICAgICAgICBmb3IgKHZhciBqID0gMDsgaiA8IHNlbGVjdG9yLmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgbmV3U2VsZWN0b3IucHVzaChzZWxlY3RvcltqXS5zcGxpdChuYW1lc3BhY2VDbGFzcyArICcgJykuam9pbignJykpO1xuICAgICAgICB9XG4gICAgICAgIG9iai5zZWxlY3RvciA9IG5ld1NlbGVjdG9yLmpvaW4oJywnKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG9iai5zdWJTdHlsZXMgPSB0aGlzLmNsZWFyTmFtZXNwYWNpbmcob2JqLnN1YlN0eWxlcywgdHJ1ZSk7IC8vaGFuZGxlIG1lZGlhIHF1ZXJpZXMgYXMgd2VsbFxuICAgICAgfVxuICAgIH1cbiAgICBpZiAocmV0dXJuT2JqID09PSBmYWxzZSkge1xuICAgICAgcmV0dXJuIHRoaXMuZ2V0Q1NTRm9yRWRpdG9yKGNzc09iamVjdEFycmF5KTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIGNzc09iamVjdEFycmF5O1xuICAgIH1cblxuICB9O1xuXG4gIC8qXG4gICAgY3JlYXRlcyBhIG5ldyBzdHlsZSB0YWcgKGFsc28gZGVzdHJveXMgdGhlIHByZXZpb3VzIG9uZSlcbiAgICBhbmQgaW5qZWN0cyBnaXZlbiBjc3Mgc3RyaW5nIGludG8gdGhhdCBjc3MgdGFnXG4gICovXG4gIGZpLnByb3RvdHlwZS5jcmVhdGVTdHlsZUVsZW1lbnQgPSBmdW5jdGlvbihpZCwgY3NzLCBmb3JtYXQpIHtcbiAgICBpZiAoZm9ybWF0ID09PSB1bmRlZmluZWQpIHtcbiAgICAgIGZvcm1hdCA9IGZhbHNlO1xuICAgIH1cblxuICAgIGlmICh0aGlzLnRlc3RNb2RlID09PSBmYWxzZSAmJiBmb3JtYXQgIT09ICdub25hbWVzcGFjZScpIHtcbiAgICAgIC8vYXBwbHkgbmFtZXNwYWNpbmcgY2xhc3Nlc1xuICAgICAgY3NzID0gdGhpcy5hcHBseU5hbWVzcGFjaW5nKGNzcyk7XG4gICAgfVxuXG4gICAgaWYgKHR5cGVvZiBjc3MgIT09ICdzdHJpbmcnKSB7XG4gICAgICBjc3MgPSB0aGlzLmdldENTU0ZvckVkaXRvcihjc3MpO1xuICAgIH1cbiAgICAvL2FwcGx5IGZvcm1hdHRpbmcgZm9yIGNzc1xuICAgIGlmIChmb3JtYXQgPT09IHRydWUpIHtcbiAgICAgIGNzcyA9IHRoaXMuZ2V0Q1NTRm9yRWRpdG9yKHRoaXMucGFyc2VDU1MoY3NzKSk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMudGVzdE1vZGUgIT09IGZhbHNlKSB7XG4gICAgICByZXR1cm4gdGhpcy50ZXN0TW9kZSgnY3JlYXRlIHN0eWxlICMnICsgaWQsIGNzcyk7IC8vaWYgdGVzdCBtb2RlLCBqdXN0IHBhc3MgcmVzdWx0IHRvIGNhbGxiYWNrXG4gICAgfVxuXG4gICAgdmFyIF9fZWwgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChpZCk7XG4gICAgaWYgKF9fZWwpIHtcbiAgICAgIF9fZWwucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChfX2VsKTtcbiAgICB9XG5cbiAgICB2YXIgaGVhZCA9IGRvY3VtZW50LmhlYWQgfHwgZG9jdW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ2hlYWQnKVswXSxcbiAgICAgIHN0eWxlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3R5bGUnKTtcblxuICAgIHN0eWxlLmlkID0gaWQ7XG4gICAgc3R5bGUudHlwZSA9ICd0ZXh0L2Nzcyc7XG5cbiAgICBoZWFkLmFwcGVuZENoaWxkKHN0eWxlKTtcblxuICAgIGlmIChzdHlsZS5zdHlsZVNoZWV0ICYmICFzdHlsZS5zaGVldCkge1xuICAgICAgc3R5bGUuc3R5bGVTaGVldC5jc3NUZXh0ID0gY3NzO1xuICAgIH0gZWxzZSB7XG4gICAgICBzdHlsZS5hcHBlbmRDaGlsZChkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShjc3MpKTtcbiAgICB9XG4gIH07XG5cbiAgZ2xvYmFsLmNzc2pzID0gZmk7XG5cbn0pKHRoaXMpO1xuIiwiXG5jb25zdCBleHBsb3JlckV2ZW50ID0gT2JqZWN0LmZyZWV6ZSh7XG4gICAgb25tb3VzZW92ZXI6IDEgPDwgMzEsXG4gICAgb25jbGljazogMSA8PCAzMCxcbiAgICBvbnNlbGVjdDogMSA8PCAyOSxcbiAgICBvbmZvbGQ6IDEgPDwgMjgsXG4gICAgb25pbjogMSA8PCAyNywgLy8gb25seSBzdXBwb3NlZCB0byBiZSB1c2VkIHdpdGggb25zZWxlY3QgYW5kIG1heWJlIG9uZm9sZFxuICAgIG9ub3V0OiAxIDw8IDI2IC8vIC0tIHNlZSBhYm92ZVxufSk7XG5cbi8vIEhhbmRsZXMgZXZlbnRzIGZvciB0aGUgZXhwY3NzIHBhcnNlclxuY2xhc3MgRXZlbnRTdGF0ZSB7XG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHRoaXMuc3RhdGUgPSAwO1xuICAgIH1cblxuICAgIHNldChlKSB7XG4gICAgICAgIHRoaXMuc3RhdGUgfD0gZTtcbiAgICB9XG5cbiAgICByZW1vdmUoZSkge1xuICAgICAgICB0aGlzLnN0YXRlICY9IH5lO1xuICAgIH1cblxuICAgIHRvZ2dsZShlKSB7XG4gICAgICAgIHRoaXMuc3RhdGUgXj0gZTtcbiAgICB9XG5cbiAgICBjaGVjayhlKSB7XG4gICAgICAgIGlmICgodGhpcy5zdGF0ZSAmIGUpICE9IDApIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZXF1YWxzKG90aGVyKXtcbiAgICAgICAgaWYob3RoZXIgPT0gdGhpcy5zdGF0ZSl7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgRXZlbnRTdGF0ZTogRXZlbnRTdGF0ZSxcbiAgICBleHBsb3JlckV2ZW50OiBleHBsb3JlckV2ZW50XG59OyIsImNvbnN0IF9jc3NqcyA9IHJlcXVpcmUoXCIuLi9ub2RlX21vZHVsZXMvam90Zm9ybS1jc3MuanMvY3NzLmpzXCIpO1xuY29uc3Qge1NlbGVjdG9yUGFyc2VyfSA9IHJlcXVpcmUoXCIuL3NlbGVjdG9yLXBhcnNlci5qc1wiKTtcbmNvbnN0IHtSdWxlUGFyc2VyfSA9IHJlcXVpcmUoXCIuL3J1bGUtcGFyc2VyLmpzXCIpO1xuY29uc3QgRXZlbnRzID0gcmVxdWlyZShcIi4vZXZlbnRzLmpzXCIpO1xuXG5jbGFzcyBFeHBsb3JlckNTUyB7XG4gICAgLy8gY2xhc3NOYW1lIGRlc2NyaWJlcyB0aGUgb2JqZWN0IGF0dHJpYnV0ZSBvZiB0aGUgc3R5bGUgYmFzZSwgd2hpY2ggZWl0aGVyIGNvbnRhaW5zICdsJyBmb3IgbGluayBvciAnZScgZm9yIGVudGl0eS4gRGVmYXVsdHMgdG8gJ2NsYXNzJy5cbiAgICBjb25zdHJ1Y3Rvcihjb25maWcpe1xuICAgICAgICAvL2luaXRpYWxpemUgcGFyc2VyIG9iamVjdFxuICAgICAgICB0aGlzLl9wYXJzZXIgPSBuZXcgX2Nzc2pzLmNzc2pzKCk7XG5cbiAgICAgICAgdGhpcy5fcGFyYW1ldGVycyA9IHtcbiAgICAgICAgICAgIGNsYXNzUHJvcGVydHk6ICdjbGFzcycsXG4gICAgICAgICAgICB0YWdMaXN0U2VwYXJhdG9yOicgJyBcbiAgICAgICAgfTtcblxuICAgICAgICAvL0FycmF5IG9mIGNzcyB1bml0cyB7c2VsZWN0b3IgPSBcIlwiLCBydWxlcyA9IFt7ZGlyZWN0aXZlID0gXCJcIiwgdmFsdWUgID0gXCJcIn0gLi4uXX1cbiAgICAgICAgdGhpcy5yYXdDU1MgPSBbXTtcblxuICAgICAgICAvL3BhcnNlZCBjc3MgYmxvY2tzIHJlYWR5IHRvIGJlIGFwcGxpZWQgdG8gb2JqZWN0c1xuICAgICAgICB0aGlzLnN0eWxpbmdzID0gW107XG5cbiAgICAgICAgT2JqZWN0LmFzc2lnbih0aGlzLl9wYXJhbWV0ZXJzLCBjb25maWcpO1xuXG4gICAgICAgIHRoaXMuc2VsZWN0b3JDb25maWcgPSB0aGlzLl9wYXJhbWV0ZXJzO1xuICAgIH1cbiAgIFxuXG4gICAgLy9maWxlIGlucHV0IGZvciB0aGUgcGFyc2VyIGFzIHN0cmluZ1xuICAgIHBhcnNlKGNzc1N0cmluZykge1xuICAgICAgICB0aGlzLnJhd0NTUyA9IHRoaXMuX3BhcnNlci5wYXJzZUNTUyhjc3NTdHJpbmcpO1xuXG4gICAgICAgIGxldCBycCA9IG5ldyBSdWxlUGFyc2VyKCk7XG4gICAgICAgIGxldCBzcCA9IG5ldyBTZWxlY3RvclBhcnNlcih0aGlzLnNlbGVjdG9yQ29uZmlnKTtcblxuICAgICAgICB0aGlzLnJhd0NTUy5mb3JFYWNoKChlbGVtZW50LCBpKSA9PiB7XG4gICAgICAgICAgICB2YXIgc3R5bGUgPSBuZXcgU3R5bGluZygpO1xuICAgICAgICAgICAgdmFyIG5vcm1hbGl6ZWRTZWxlY3RvciA9IGVsZW1lbnQuc2VsZWN0b3Iuc3BsaXQoJyAnKS5qb2luKCcnKTtcblxuICAgICAgICAgICAgc3R5bGUuc2VsZWN0b3IgPSBzcC5wYXJzZVNlbGVjdG9yKG5vcm1hbGl6ZWRTZWxlY3RvciwgaSk7XG5cbiAgICAgICAgICAgIGVsZW1lbnQucnVsZXMuZm9yRWFjaCgoZWxlbWVudCwgaSkgPT4ge1xuICAgICAgICAgICAgICAgIHZhciBydWxlID0gcnAucGFyc2VSdWxlKGVsZW1lbnQuZGlyZWN0aXZlLCBlbGVtZW50LnZhbHVlLnNwbGl0KCcgJykuam9pbignJykpO1xuXG4gICAgICAgICAgICAgICAgaWYocnVsZS5fdmFsaWQpe1xuICAgICAgICAgICAgICAgICAgICBzdHlsZS5ydWxlcy5wdXNoKHJ1bGUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICB0aGlzLnN0eWxpbmdzLnB1c2goc3R5bGUpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvL21vZGlmaWVzIHRoZSBnaXZlbiBzdHlsZSBiYXNlZCBvbiB0aGUgZ2l2ZW4gb2JqZWN0XG4gICAgc3R5bGUob2JqLCBzdHkpIHtcbiAgICAgICAgdGhpcy5zdHlsaW5ncy5mb3JFYWNoKHN0eWxlID0+IHN0eWxlLmFwcGx5KG9iaiwgc3R5KSk7XG4gICAgfVxufVxuXG5jbGFzcyBTdHlsaW5nIHtcbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgdGhpcy5zZWxlY3RvcjtcbiAgICAgICAgdGhpcy5ydWxlcyA9IFtdO1xuICAgIH1cblxuICAgIGFwcGx5KG9iaiwgc3R5KXtcbiAgICAgICAgaWYodGhpcy5zZWxlY3Rvci50ZXN0KG9iaiwgc3R5KSl7XG4gICAgICAgICAgICB0aGlzLnJ1bGVzLmZvckVhY2gocnVsZSA9PiBydWxlLmFwcGx5KG9iaiwgc3R5KSk7XG4gICAgICAgIH1cbiAgICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0ge1wiRXhwbG9yZXJDU1NcIjogRXhwbG9yZXJDU1MsXG4gICAgICAgICAgICAgICAgICBcIkV2ZW50XCI6RXZlbnRzfSIsImNsYXNzIFBhcnNlciB7XG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHRoaXMuX2N1cklkeCA9IDA7XG4gICAgICAgIHRoaXMuX2Jsb2NrID0gLTE7XG4gICAgICAgIHRoaXMuX2xpdGVyYWwgPSBcIlwiO1xuICAgIH1cblxuICAgIF9jdXJDaGFyKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fbGl0ZXJhbC5jaGFyQXQodGhpcy5fY3VySWR4KTtcbiAgICB9XG5cbiAgICBfbmV4dENoYXIoKSB7XG4gICAgICAgIHZhciByZWFjaGVkRW5kID0gdGhpcy5fY3VySWR4ID09ICh0aGlzLl9saXRlcmFsLmxlbmd0aCk7XG5cbiAgICAgICAgaWYgKHJlYWNoZWRFbmQpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuX2N1cklkeCsrO1xuXG4gICAgICAgIHRoaXMuX2NvbnN1bWVTcGFjZXMoKTtcblxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICBfY29uc3VtZVNwYWNlcygpIHtcbiAgICAgICAgd2hpbGUgKHRoaXMuX2N1ckNoYXIoKSA9PSBcIiBcIikge1xuICAgICAgICAgICAgaWYgKHRoaXMuX2N1cklkeCA+PSB0aGlzLl9saXRlcmFsLmxlbmd0aCAtIDEpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLl9jdXJJZHgrKztcbiAgICAgICAgfVxuICAgIH1cblxuICAgIF9nZXRTdHJpbmdVbnRpbCh0ZXJtaW5hbHMpIHtcbiAgICAgICAgdmFyIHJlc3VsdCA9IFwiXCI7XG5cbiAgICAgICAgd2hpbGUgKCF0ZXJtaW5hbHMuaW5jbHVkZXModGhpcy5fY3VyQ2hhcigpKSkge1xuICAgICAgICAgICAgcmVzdWx0ICs9IHRoaXMuX2N1ckNoYXIoKTtcblxuICAgICAgICAgICAgaWYgKCF0aGlzLl9uZXh0Q2hhcigpKSB7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cblxuICAgIF9lcnJvcihtZXNzYWdlKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ1xceDFiWzMxbSVzXFx4MWJbMG0nLCBcIkVycm9yIHdoaWxlIHBhcnNpbmc6IFwiICsgbWVzc2FnZSk7XG4gICAgfVxuXG4gICAgX3dhcm5pbmcobWVzc2FnZSkge1xuICAgICAgICBjb25zb2xlLmVycm9yKCdcXHgxYlszN20lc1xceDFiWzBtJywgXCJXYXJuaW5nIDogXCIgKyBtZXNzYWdlKTtcbiAgICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIFBhcnNlclxufSIsImNvbnN0IHsgUGFyc2VyIH0gPSByZXF1aXJlKFwiLi9wYXJzZXIuanNcIik7XG5cbmNsYXNzIFJ1bGVQYXJzZXIgZXh0ZW5kcyBQYXJzZXIge1xuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICBzdXBlcigpO1xuICAgICAgICB0aGlzLl9hdHRyaWJ1dGUgPSBcIlwiO1xuICAgICAgICB0aGlzLl9ydWxlVGVybWluYWxzID0gW1wiXFxuXCIsIFwiO1wiXTtcbiAgICAgICAgdGhpcy5fcmdiYVRlcm1pbmFscyA9IFsnLCcsICcpJ107XG4gICAgICAgIHRoaXMuX2NvbG9ySW5pdGlhbHMgPSBbJyMnLCAnMCcsICcoJ107XG4gICAgICAgIHRoaXMuX2ludGVycG9sYXRpb25FbnVtcyA9IHtcbiAgICAgICAgICAgICdsaW4nOiBpbnRlcnBvbGF0aW9uVHlwZS5saW5lYXIsXG4gICAgICAgICAgICAnbGluZWFyJzogaW50ZXJwb2xhdGlvblR5cGUubGluZWFyXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgcGFyc2VSdWxlKGF0dHJpYnV0ZSwgcnVsZSkge1xuICAgICAgICB0aGlzLl9jdXJJZHggPSAwO1xuICAgICAgICB0aGlzLl9hdHRyaWJ1dGUgPSBhdHRyaWJ1dGU7XG4gICAgICAgIHRoaXMuX2xpdGVyYWwgPSBydWxlO1xuICAgICAgICB2YXIgcmVzdWx0ID0gdW5kZWZpbmVkO1xuXG4gICAgICAgIC8vIHRyeSBwYXJzaW5nIGludGVycG9sYXRpb24sIGNvbG9yIG9yIGVudW0gXG4gICAgICAgIHJlc3VsdCA9IHRoaXMuX3BhcnNlQ29sb3IoKTtcblxuICAgICAgICBpZiAocmVzdWx0ICE9IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBTaW1wbGVSdWxlKHRoaXMuX2F0dHJpYnV0ZSwgdmFsdWVUeXBlLmNvbG9yLCByZXN1bHQpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gUmVzZXQgcGFyc2VyIGFuZCB0cnkgcGFyc2luZyBpbnRlcnBvbGF0aW9uIHJ1bGVcbiAgICAgICAgdGhpcy5fY3VySWR4ID0gMDtcblxuICAgICAgICB2YXIgdHlwZSA9IHRoaXMuX2dldFN0cmluZ1VudGlsKCcoJyk7XG5cbiAgICAgICAgdHlwZSA9IHRoaXMuX2ludGVycG9sYXRpb25FbnVtc1t0eXBlXTtcblxuICAgICAgICBpZiAodHlwZSA9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgU2ltcGxlUnVsZSh0aGlzLl9hdHRyaWJ1dGUsIHZhbHVlVHlwZS5zdHJpbmcsIHRoaXMuX2xpdGVyYWwpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuX25leHRDaGFyKCk7XG5cbiAgICAgICAgcmVzdWx0ID0gdGhpcy5fcGFyc2VJbnRlcnBvbGF0aW9uKHR5cGUpO1xuXG4gICAgICAgIGlmIChyZXN1bHQgPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAvL21pZ2h0IGJlIG9mIHR5cGUgbnVtYmVyIVxuICAgICAgICAgICAgcmV0dXJuIG5ldyBTaW1wbGVSdWxlKHRoaXMuX2F0dHJpYnV0ZSwgdmFsdWVUeXBlLnN0cmluZywgdGhpcy5fbGl0ZXJhbCk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cblxuICAgIF9wYXJzZUludGVycG9sYXRpb24odHlwZSkge1xuICAgICAgICB2YXIgdmFsaWQgPSB0cnVlO1xuICAgICAgICB2YXIgcHJvcGVydHk7XG4gICAgICAgIHZhciB2VHlwZTtcbiAgICAgICAgdmFyIHggPSBbXTtcbiAgICAgICAgdmFyIHkgPSBbXTtcblxuICAgICAgICB3aGlsZSAodGhpcy5fY3VyQ2hhcigpICE9ICcpJykge1xuICAgICAgICAgICAgeC5wdXNoKHBhcnNlSW50KHRoaXMuX2dldFN0cmluZ1VudGlsKCc9JykpKTtcbiAgICAgICAgICAgIHRoaXMuX25leHRDaGFyKCk7XG5cbiAgICAgICAgICAgIHZhciB0eXBlQ2hlY2sgPSB2VHlwZTtcblxuICAgICAgICAgICAgaWYgKHRoaXMuX2NvbG9ySW5pdGlhbHMuaW5jbHVkZXModGhpcy5fY3VyQ2hhcigpKSkge1xuICAgICAgICAgICAgICAgIHkucHVzaCh0aGlzLl9wYXJzZUNvbG9yKCkpO1xuICAgICAgICAgICAgICAgIHZUeXBlID0gdmFsdWVUeXBlLmNvbG9yO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB5LnB1c2gocGFyc2VJbnQodGhpcy5fZ2V0U3RyaW5nVW50aWwoWycsJywgJyknXSkpKTtcbiAgICAgICAgICAgICAgICB2VHlwZSA9IHZhbHVlVHlwZS5udW1iZXI7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICh0eXBlQ2hlY2sgIT0gdW5kZWZpbmVkICYmIHR5cGVDaGVjayAhPSB2VHlwZSkge1xuICAgICAgICAgICAgICAgIHRoaXMuX2Vycm9yKFwiVHlwZSBvZiB2YWx1ZXMgZG9lc24ndCBtYXRjaC5cIik7XG4gICAgICAgICAgICAgICAgdmFsaWQgPSBmYWxzZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKHRoaXMuX2N1ckNoYXIoKSA9PSAnLCcpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9uZXh0Q2hhcigpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAodGhpcy5fY3VySWR4ID49IHRoaXMuX2xpdGVyYWwubGVuZ3RoIC0gMSkge1xuICAgICAgICAgICAgICAgIHRoaXMuX2Vycm9yKFwiVW5leHBlY3RlZCBlbmQgb2YgcnVsZS5cIik7XG4gICAgICAgICAgICAgICAgdmFsaWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuX25leHRDaGFyKCk7XG5cbiAgICAgICAgdmFyIGtleVdvcmQgPSB0aGlzLl9nZXRTdHJpbmdVbnRpbCgnKCcpO1xuXG4gICAgICAgIGlmIChrZXlXb3JkLmxvY2FsZUNvbXBhcmUoXCIudXNpbmdcIikgPT0gMCkge1xuICAgICAgICAgICAgdGhpcy5fbmV4dENoYXIoKTtcbiAgICAgICAgICAgIHByb3BlcnR5ID0gdGhpcy5fZ2V0U3RyaW5nVW50aWwoJyknKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuX2Vycm9yKFwiQ291bGRuJ3QgZmluZCAndXNpbmcnIGRpcmVjdGl2ZS5cIik7XG4gICAgICAgICAgICB2YWxpZCA9IGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRoaXMuX2N1ckNoYXIoKSAhPSAnKScpIHtcbiAgICAgICAgICAgIHRoaXMuX2Vycm9yKFwiVW5leHBlY3RlZCBlbmQgb2YgcnVsZSwgZXhwZWN0ZWQgJyknLlwiKTtcbiAgICAgICAgICAgIHZhbGlkID0gZmFsc2U7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoeC5sZW5ndGggIT0geS5sZW5ndGgpIHtcbiAgICAgICAgICAgIHRoaXMuX2Vycm9yKFwiTnVtYmVyIG9mIGNvbnRyb2wgcG9pbnRzIGFuZCB2YWx1ZXMgaXMgZGlmZmVyZW50LlwiKTtcbiAgICAgICAgICAgIHZhbGlkID0gZmFsc2U7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodlR5cGUgPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICB0aGlzLl9lcnJvcihcIlVua25vd24gTnVtYmVyIG9yIENvbG9yIFR5cGUgZm91bmQuXCIpO1xuICAgICAgICAgICAgdmFsaWQgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIG5ldyBJbnRlcnBvbGF0ZWRSdWxlKHRoaXMuX2F0dHJpYnV0ZSwgcHJvcGVydHksIHR5cGUsIHZUeXBlLCB4LCB5LCB2YWxpZCk7XG4gICAgfVxuXG4gICAgX3BhcnNlQ29sb3IoKSB7XG4gICAgICAgIGlmICh0aGlzLl9jdXJDaGFyKCkgPT0gJyMnKSB7XG4gICAgICAgICAgICB0aGlzLl9uZXh0Q2hhcigpO1xuICAgICAgICAgICAgcmV0dXJuIHBhcnNlSW50KHRoaXMuX2dldFN0cmluZ1VudGlsKHRoaXMuX3J1bGVUZXJtaW5hbHMpLCAxNik7XG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy5fY3VyQ2hhcigpID09ICcwJykge1xuICAgICAgICAgICAgdGhpcy5fbmV4dENoYXIoKTtcbiAgICAgICAgICAgIGlmICh0aGlzLl9jdXJDaGFyKCkgPT0gJ3gnKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fbmV4dENoYXIoKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gcGFyc2VJbnQodGhpcy5fZ2V0U3RyaW5nVW50aWwodGhpcy5fcnVsZVRlcm1pbmFscyksIDE2KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLl9jdXJDaGFyKCkgPT0gJygnKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fZ2V0UkdCQSgpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICBfZ2V0UkdCQSgpIHtcbiAgICAgICAgdmFyIHIgPSBwYXJzZUludCh0aGlzLl9nZXRTdHJpbmdVbnRpbCh0aGlzLl9yZ2JhVGVybWluYWxzKSk7XG5cbiAgICAgICAgaWYgKHRoaXMuX2N1ckNoYXIoKSAhPSAnLCcpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmhleFZhbHVlKHIsIDAsIDApO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuX25leHRDaGFyKCk7XG5cbiAgICAgICAgdmFyIGcgPSBwYXJzZUludCh0aGlzLl9nZXRTdHJpbmdVbnRpbCh0aGlzLl9yZ2JhVGVybWluYWxzKSk7XG5cbiAgICAgICAgaWYgKHRoaXMuX2N1ckNoYXIoKSAhPSAnLCcpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmhleFZhbHVlKHIsIGcsIDApO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuX25leHRDaGFyKCk7XG5cbiAgICAgICAgdmFyIGIgPSBwYXJzZUludCh0aGlzLl9nZXRTdHJpbmdVbnRpbCh0aGlzLl9yZ2JhVGVybWluYWxzKSk7XG5cbiAgICAgICAgaWYgKHRoaXMuX2N1ckNoYXIoKSAhPSAnLCcpIHtcbiAgICAgICAgICAgIHRoaXMuX25leHRDaGFyKCk7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5oZXhWYWx1ZShyLCBnLCBiKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLl9uZXh0Q2hhcigpO1xuXG4gICAgICAgIHZhciBhID0gcGFyc2VJbnQodGhpcy5fZ2V0U3RyaW5nVW50aWwodGhpcy5fcmdiYVRlcm1pbmFscykpO1xuXG4gICAgICAgIGlmICh0aGlzLl9jdXJDaGFyKCkgIT0gJyknKSB7XG4gICAgICAgICAgICB0aGlzLl9lcnJvcihcIkV4cGVjdGVkIGNsb3NpbmcgJyknLlwiKVxuICAgICAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLl9uZXh0Q2hhcigpO1xuXG4gICAgICAgIHJldHVybiB0aGlzLmhleFZhbHVlKHIsIGcsIGIsIGEpO1xuICAgIH1cblxuICAgIGhleFZhbHVlKHIsIGcsIGIsIGEgPSAyNTUpIHtcbiAgICAgICAgcmV0dXJuIChyIDw8IDI0KSB8IChnIDw8IDE2KSB8IChiID4+IDgpIHwgYTtcbiAgICB9XG5cbiAgICBoZXhTdHJpbmcociwgZywgYiwgYSA9IDI1NSkge1xuICAgICAgICByID0gci50b1N0cmluZygxNik7XG4gICAgICAgIGcgPSBnLnRvU3RyaW5nKDE2KTtcbiAgICAgICAgYiA9IGIudG9TdHJpbmcoMTYpO1xuICAgICAgICBhID0gYS50b1N0cmluZygxNik7XG5cbiAgICAgICAgaWYgKHIubGVuZ3RoID09IDEpXG4gICAgICAgICAgICByID0gXCIwXCIgKyByO1xuICAgICAgICBpZiAoZy5sZW5ndGggPT0gMSlcbiAgICAgICAgICAgIGcgPSBcIjBcIiArIGc7XG4gICAgICAgIGlmIChiLmxlbmd0aCA9PSAxKVxuICAgICAgICAgICAgYiA9IFwiMFwiICsgYjtcbiAgICAgICAgaWYgKGEubGVuZ3RoID09IDEpXG4gICAgICAgICAgICBhID0gXCIwXCIgKyBhO1xuXG4gICAgICAgIHJldHVybiBcIiNcIiArIHIgKyBnICsgYiArIGE7XG4gICAgfVxufVxuXG52YXIgdmFsdWVUeXBlID0gT2JqZWN0LmZyZWV6ZSh7IFwic3RyaW5nXCI6IDEsIFwibnVtYmVyXCI6IDIsIFwiY29sb3JcIjogMywgXCJlbnVtXCI6IDQgfSk7XG5cbmNsYXNzIFNpbXBsZVJ1bGUge1xuICAgIGNvbnN0cnVjdG9yKGF0dHJpYnV0ZSwgYXR0cmlidXRlVHlwZSwgdmFsdWUpIHtcbiAgICAgICAgdGhpcy5fYXR0cmlidXRlID0gYXR0cmlidXRlO1xuICAgICAgICB0aGlzLl92YWx1ZVR5cGUgPSBhdHRyaWJ1dGVUeXBlO1xuICAgICAgICB0aGlzLl92YWx1ZSA9IHZhbHVlO1xuICAgICAgICB0aGlzLl92YWxpZCA9IHRydWU7XG4gICAgfVxuXG4gICAgYXBwbHkob2JqLCBzdHkpIHtcbiAgICAgICAgc3R5W3RoaXMuX2F0dHJpYnV0ZV0gPSB0aGlzLl92YWx1ZTtcbiAgICB9XG59XG5cbnZhciBpbnRlcnBvbGF0aW9uVHlwZSA9IE9iamVjdC5mcmVlemUoeyBcImxpbmVhclwiOiAxIH0pO1xuXG5jbGFzcyBJbnRlcnBvbGF0ZWRSdWxlIHtcbiAgICBjb25zdHJ1Y3RvcihhdHRyaWJ1dGUsIHByb3BlcnR5LCBpbnRlcnBvbFR5cGUsIHZhbHVlVHlwZSwgY29udHJvbFBvaW50cywgYXR0cmlidXRlVmFsdWVzLCB2YWxpZCkge1xuICAgICAgICB0aGlzLl90eXBlID0gaW50ZXJwb2xUeXBlO1xuICAgICAgICB0aGlzLl9wcm9wZXJ0eSA9IHByb3BlcnR5O1xuICAgICAgICB0aGlzLl9hdHRyaWJ1dGUgPSBhdHRyaWJ1dGU7XG4gICAgICAgIHRoaXMuX3ZhbHVlVHlwZSA9IHZhbHVlVHlwZTtcbiAgICAgICAgdGhpcy5fY29udHJvbFBvaW50cyA9IGNvbnRyb2xQb2ludHM7XG4gICAgICAgIHRoaXMuX2F0dHJpYnV0ZVZhbHVlcyA9IGF0dHJpYnV0ZVZhbHVlcztcbiAgICAgICAgdGhpcy5fdmFsaWQgPSB0cnVlOyAvL1RPRE86IEZJWCBhZnRlciBkZWJ1Z2dpbmdcbiAgICB9XG5cbiAgICBhcHBseShvYmosIHN0eSkge1xuICAgICAgICBpZiAodGhpcy5fdHlwZSA9PSBpbnRlcnBvbGF0aW9uVHlwZS5saW5lYXIpIHtcbiAgICAgICAgICAgIHN0eVt0aGlzLl9hdHRyaWJ1dGVdID0gdGhpcy5fbGluKG9ialt0aGlzLl9wcm9wZXJ0eV0pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgX2xpbihhY3R1YWxWYWx1ZSkge1xuICAgICAgICAvLyBmaW5kIHJhbmdlIHRoZSB2YWx1ZSBpcyBpbnNpZGUgb2YgYW5kIGludGVycG9sYXRlIGluc2lkZSBpdFxuICAgICAgICAvLyBhc3N1bWVzIGFzY2VuZGluZyBvcmRlciBcbiAgICAgICAgdmFyIGluZGV4ID0gdGhpcy5fZmluZEluZGV4KGFjdHVhbFZhbHVlKTtcblxuICAgICAgICAvL1NtYWxsZXIgdGhhbiBhbGwgY29udHJvbCBwb2ludHNcbiAgICAgICAgaWYoaW5kZXggPT0gLTEpe1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2F0dHJpYnV0ZVZhbHVlc1swXTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vQmlnZ2VyIHRoYW4gYWxsIGNvbnRyb2wgcG9pbnRzXG4gICAgICAgIGlmKGluZGV4ID09IHRoaXMuX2NvbnRyb2xQb2ludHMubGVuZ3RoLTEpe1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2F0dHJpYnV0ZVZhbHVlc1t0aGlzLl9hdHRyaWJ1dGVWYWx1ZXMubGVuZ3RoLTFdO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRoaXMuX3ZhbHVlVHlwZSA9PSB2YWx1ZVR5cGUuY29sb3IpIHtcbiAgICAgICAgICAgIC8vIGludGVycG9sYXRlIHJnYmEgdmFsdWVzXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fbGluZWFyQ29sb3JJbnRlcnBvbGF0aW9uKGluZGV4LCBhY3R1YWxWYWx1ZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBub3JtYWwgaW50ZXJwb2xhdGlvbiBvZiBudW1iZXJcblxuICAgICAgICAgICAgLy9pbnNpZGUgcmFuZ2UgaW5kZXggJiBpbmRleCArIDFcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9saW5lYXJJbnRlcnBvbGF0aW9uKGFjdHVhbFZhbHVlLCB0aGlzLl9jb250cm9sUG9pbnRzW2luZGV4XSwgdGhpcy5fYXR0cmlidXRlVmFsdWVzW2luZGV4XSwgdGhpcy5fY29udHJvbFBvaW50c1tpbmRleCsxXSwgdGhpcy5fYXR0cmlidXRlVmFsdWVzW2luZGV4KzFdKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIF9maW5kSW5kZXgoeCkge1xuICAgICAgICB2YXIgaWR4ID0gLTE7XG5cbiAgICAgICAgd2hpbGUgKGlkeCA8IHRoaXMuX2NvbnRyb2xQb2ludHMubGVuZ3RoICYmIHRoaXMuX2NvbnRyb2xQb2ludHNbaWR4KzFdIDwgeCkge1xuICAgICAgICAgICAgaWR4Kys7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gaWR4O1xuICAgIH1cblxuICAgIF9saW5lYXJDb2xvckludGVycG9sYXRpb24oYWN0dWFsVmFsdWUsIGlkeCkge1xuICAgICAgICB2YXIgeTAgPSB0aGlzLl9hdHRyaWJ1dGVWYWx1ZXNbaWR4XTtcbiAgICAgICAgdmFyIHkxID0gdGhpcy5fYXR0cmlidXRlVmFsdWVzW2lkeCsxXTtcblxuICAgICAgICB2YXIgcmVzdWx0ID0gMDtcbiAgICAgICAgdmFyIG1hc2sgPSAweDAwMDAwMEZGOyAvLyBhbHBoYSBtYXNrXG5cbiAgICAgICAgLy9mb3IgZWFjaCBjaGFubmVsIGludGVycG9sYXRlIHRoZSB2YWx1ZSBzZXBlcmF0ZWx5XG4gICAgICAgIGZvcih2YXIgaSA9IDA7IGkgPCA0OyBpKyspe1xuICAgICAgICAgICAgdmFyIHkwQ2hhbm5lbCA9ICh5MCAmIG1hc2spID4+PiBpKjg7XG4gICAgICAgICAgICB2YXIgeTFDaGFubmVsID0gKHkxICYgbWFzaykgPj4+IGkqODtcblxuICAgICAgICAgICAgcmVzdWx0IHw9IHRoaXMuX2xpbmVhckludGVycG9sYXRpb24oYWN0dWFsVmFsdWUsIHRoaXMuX2NvbnRyb2xQb2ludHNbaWR4XSwgeTBDaGFubmVsLCB0aGlzLl9jb250cm9sUG9pbnRzW2lkeCsxXSwgeTFDaGFubmVsKSA8PCBpKjhcblxuICAgICAgICAgICAgbWFzayA9IG1hc2sgPDwgODtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuXG4gICAgX2xpbmVhckludGVycG9sYXRpb24oeCwgeDAsIHkwLCB4MSwgeTEpe1xuICAgICAgICB2YXIgYSA9ICh5MSAtIHkwKSAvICh4MSAtIHgwKVxuICAgICAgICB2YXIgYiA9IC1hICogeDAgKyB5MFxuICAgICAgICByZXR1cm4gYSAqIHggKyBiXG4gICAgfVxuXG4gICAgX2lzSW5SYW5nZSh2YWx1ZSwgbG93ZXIsIHVwcGVyKSB7XG4gICAgICAgIGlmICh2YWx1ZSA8IGxvd2VyKSB7XG4gICAgICAgICAgICByZXR1cm4gLTE7XG4gICAgICAgIH0gZWxzZSBpZiAodmFsdWUgPiB1cHBlcikge1xuICAgICAgICAgICAgcmV0dXJuIDE7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gMDtcbiAgICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIFJ1bGVQYXJzZXJcbn0iLCJjb25zdCB7UGFyc2VyfSA9IHJlcXVpcmUoXCIuL3BhcnNlci5qc1wiKTtcbmNvbnN0IHtleHBsb3JlckV2ZW50LCBFdmVudFN0YXRlfSA9IHJlcXVpcmUoXCIuL2V2ZW50cy5qc1wiKTtcblxuY2xhc3MgU2VsZWN0b3JQYXJzZXIgZXh0ZW5kcyBQYXJzZXIge1xuICAgIGNvbnN0cnVjdG9yKGNvbmZpZ3VyYXRpb24pIHtcbiAgICAgICAgc3VwZXIoKTtcbiAgICAgICAgdGhpcy5fY29uZmlnID0gY29uZmlndXJhdGlvbjtcbiAgICB9XG5cbiAgICBwYXJzZVNlbGVjdG9yKHN0cmluZywgaWR4KSB7XG4gICAgICAgIHRoaXMuX2N1cklkeCA9IDA7XG4gICAgICAgIHRoaXMuX2xpdGVyYWwgPSBzdHJpbmc7XG4gICAgICAgIHRoaXMuX2Jsb2NrID0gaWR4O1xuXG4gICAgICAgIHZhciBsaXN0ID0gW107XG5cbiAgICAgICAgZG8ge1xuICAgICAgICAgICAgdmFyIGV4cCA9IHRoaXMuX3BhcnNlRXhwcmVzc2lvbigpO1xuXG4gICAgICAgICAgICBpZiAoZXhwLnZhbGlkKSB7XG4gICAgICAgICAgICAgICAgbGlzdC5wdXNoKGV4cCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgIH0gd2hpbGUgKHRoaXMuX2N1ckNoYXIoKSA9PSAnLCcgJiYgdGhpcy5fbmV4dENoYXIoKSlcbiAgICAgICAgdmFyIHNlbCA9IG5ldyBTZWxlY3RvcihsaXN0LCB0aGlzLl9jb25maWcpO1xuXG4gICAgICAgIGlmIChsaXN0Lmxlbmd0aCA9PSAwKSB7XG4gICAgICAgICAgICBzZWwudmFsaWQgPSBmYWxzZTtcbiAgICAgICAgICAgIHRoaXMuX2Vycm9yKFwiQmxvY2sgXCIgKyAodGhpcy5fYmxvY2sgKyAxKSArIFwiIGhhcyBiZWVuIHNraXBwZWQsIGJlY2F1c2UgdGhlcmUgd2FzIG5vIHZhbGlkIHNlbGVjdG9yLlwiKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBzZWw7XG4gICAgfVxuXG4gICAgX3BhcnNlRXhwcmVzc2lvbigpIHtcblxuICAgICAgICB2YXIgbGVmdE1vc3QgPSB0aGlzLl9wYXJzZUxlZnRNb3N0KCk7XG5cbiAgICAgICAgaWYgKCFsZWZ0TW9zdC52YWxpZCkge1xuICAgICAgICAgICAgcmV0dXJuIGxlZnRNb3N0O1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRoaXMuX2N1ckNoYXIoKSA9PSBcIj5cIiB8fCB0aGlzLl9jdXJDaGFyKCkgPT0gXCI8XCIpIHtcbiAgICAgICAgICAgIHZhciBjaGFpbiA9IHRoaXMuX2N1ckNoYXIoKTtcbiAgICAgICAgICAgIHRoaXMuX25leHRDaGFyKCk7XG4gICAgICAgICAgICB2YXIgcmlnaHRTaWRlID0gdGhpcy5fcGFyc2VSaWdodFNpZGUobGVmdE1vc3QpO1xuICAgICAgICAgICAgcmlnaHRTaWRlLmNoYWluT3AgPSBjaGFpbjtcbiAgICAgICAgICAgIGxlZnRNb3N0LnJpZ2h0U2lkZSA9IHJpZ2h0U2lkZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBsZWZ0TW9zdDtcbiAgICB9XG5cbiAgICBfcGFyc2VMZWZ0TW9zdCgpIHtcbiAgICAgICAgdmFyIGxlZnRNb3N0ID0gbmV3IFNlbGVjdG9yRXhwcmVzc2lvbigpO1xuXG4gICAgICAgIHRoaXMuX3BhcnNlVHlwZShsZWZ0TW9zdCk7XG5cbiAgICAgICAgaWYgKHRoaXMuX2N1ckNoYXIoKSA9PSBcIltcIikge1xuICAgICAgICAgICAgdGhpcy5fbmV4dENoYXIoKTtcbiAgICAgICAgICAgIHRoaXMuX3BhcnNlQXR0cmlidXRlQmxvY2sobGVmdE1vc3QpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCFsZWZ0TW9zdC52YWxpZCkge1xuICAgICAgICAgICAgcmV0dXJuIGxlZnRNb3N0O1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5fcGFyc2VFeHRlbnNpb25zKGxlZnRNb3N0KTtcblxuICAgICAgICByZXR1cm4gbGVmdE1vc3Q7XG4gICAgfVxuXG4gICAgX3BhcnNlUmlnaHRTaWRlKG5vZGUpIHtcbiAgICAgICAgdmFyIHJpZ2h0c2lkZSA9IG5ldyBSaWdodFNpZGUoKTtcblxuICAgICAgICB0aGlzLl9wYXJzZVR5cGUocmlnaHRzaWRlKTtcblxuICAgICAgICBpZiAoIW5vZGUudmFsaWQpIHtcbiAgICAgICAgICAgIHJpZ2h0c2lkZS52YWxpZCA9IGZhbHNlO1xuICAgICAgICAgICAgcmV0dXJuIHJpZ2h0c2lkZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBwYXJhbUZvbGxvdyA9IFsnWycsICcjJywgJzonLCAnLCcsICcuJ107XG5cbiAgICAgICAgLy9jaGVjayBpZiBwYXJhbWV0ZXIgZXhpc3RzXG4gICAgICAgIGlmICghcGFyYW1Gb2xsb3cuaW5jbHVkZXModGhpcy5fY3VyQ2hhcigpKSAmJiB0aGlzLl9jdXJJZHggPCB0aGlzLl9saXRlcmFsLmxlbmd0aCkge1xuICAgICAgICAgICAgcmlnaHRzaWRlLnBhcmFtZXRlciA9IHRoaXMuX2dldFN0cmluZ1VudGlsKHBhcmFtRm9sbG93KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJpZ2h0c2lkZS5wYXJhbWV0ZXIgPSAxO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRoaXMuX2N1ckNoYXIoKSA9PSAnWycpIHtcbiAgICAgICAgICAgIHRoaXMuX25leHRDaGFyKCk7XG4gICAgICAgICAgICB0aGlzLl9wYXJzZUF0dHJpYnV0ZUJsb2NrKHJpZ2h0c2lkZSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIW5vZGUudmFsaWQpIHtcbiAgICAgICAgICAgIHJldHVybiByaWdodHNpZGU7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLl9wYXJzZUV4dGVuc2lvbnMocmlnaHRzaWRlKTtcblxuICAgICAgICBpZiAodGhpcy5fY3VyQ2hhcigpID09ICc+JyB8fCB0aGlzLl9jdXJDaGFyKCkgPT0gJzwnKSB7XG4gICAgICAgICAgICB2YXIgY2hhaW4gPSB0aGlzLl9jdXJDaGFyKCk7XG4gICAgICAgICAgICB0aGlzLl9uZXh0Q2hhcigpO1xuICAgICAgICAgICAgcmlnaHRzaWRlLnJpZ2h0U2lkZSA9IHRoaXMuX3BhcnNlUmlnaHRTaWRlKHJpZ2h0c2lkZSk7XG4gICAgICAgICAgICByaWdodHNpZGUucmlnaHRTaWRlLmNoYWluT3AgPSBjaGFpbjtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiByaWdodHNpZGU7XG4gICAgfVxuXG4gICAgX3BhcnNlQXR0cmlidXRlQmxvY2sobm9kZSkge1xuICAgICAgICB2YXIgZm9sbG93SWQgPSBbJz0nLCAnficsICchJywgJzwnLCAnPicsICddJywgJywnXTtcblxuICAgICAgICB2YXIgbGlzdCA9IFtdO1xuXG4gICAgICAgIGRvIHtcbiAgICAgICAgICAgIHZhciBpZCA9IHRoaXMuX2dldFN0cmluZ1VudGlsKGZvbGxvd0lkKTtcblxuICAgICAgICAgICAgaWYgKHRoaXMuX2N1ckNoYXIoKSA9PSAnLCcpIHtcbiAgICAgICAgICAgICAgICBsaXN0LnB1c2gobmV3IEF0dHJpYnV0ZUNoZWNrKGlkLCB1bmRlZmluZWQsIHVuZGVmaW5lZCkpXG4gICAgICAgICAgICB9IGVsc2UgaWYgKHRoaXMuX2N1ckNoYXIoKSA9PSAnXScpIHtcbiAgICAgICAgICAgICAgICBsaXN0LnB1c2gobmV3IEF0dHJpYnV0ZUNoZWNrKGlkLCB1bmRlZmluZWQsIHVuZGVmaW5lZCkpXG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHRoaXMuX2N1ckNoYXIoKSA9PSAnPScgfHwgdGhpcy5fY3VyQ2hhcigpID09ICc8JyB8fCB0aGlzLl9jdXJDaGFyKCkgPT0gJz4nKSB7XG4gICAgICAgICAgICAgICAgdmFyIG9wID0gdGhpcy5fY3VyQ2hhcigpO1xuICAgICAgICAgICAgICAgIHRoaXMuX25leHRDaGFyKCk7XG5cbiAgICAgICAgICAgICAgICBsaXN0LnB1c2gobmV3IEF0dHJpYnV0ZUNoZWNrKGlkLCBvcCwgdGhpcy5fZ2V0U3RyaW5nVW50aWwoWycsJywgJ10nXSkpKTtcblxuICAgICAgICAgICAgICAgIGlmICh0aGlzLl9jdXJDaGFyKCkgPT0gJ10nKSB7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAodGhpcy5fY3VyQ2hhcigpID09ICd+JyB8fCB0aGlzLl9jdXJDaGFyKCkgPT0gJyEnKSB7XG4gICAgICAgICAgICAgICAgdmFyIG9wID0gdGhpcy5fY3VyQ2hhcigpO1xuICAgICAgICAgICAgICAgIHRoaXMuX25leHRDaGFyKCk7XG4gICAgICAgICAgICAgICAgb3AgKz0gdGhpcy5fY3VyQ2hhcigpO1xuICAgICAgICAgICAgICAgIHRoaXMuX25leHRDaGFyKCk7XG5cbiAgICAgICAgICAgICAgICBsaXN0LnB1c2gobmV3IEF0dHJpYnV0ZUNoZWNrKGlkLCBvcCwgdGhpcy5fZ2V0U3RyaW5nVW50aWwoWycsJywgJ10nXSkpKTtcblxuICAgICAgICAgICAgICAgIGlmICh0aGlzLl9jdXJDaGFyKCkgPT0gJ10nKSB7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgfSB3aGlsZSAodGhpcy5fbmV4dENoYXIoKSAmJiB0aGlzLl9jdXJDaGFyKCkgIT0gJ10nKVxuXG4gICAgICAgIG5vZGUuYXR0ckNoZWNrbGlzdCA9IGxpc3Q7XG5cbiAgICAgICAgaWYgKHRoaXMuX2N1ckNoYXIoKSAhPSAnXScpIHtcbiAgICAgICAgICAgIG5vZGUudmFsaWQgPSBmYWxzZTtcbiAgICAgICAgICAgIHRoaXMuX2Vycm9yKFwiQmxvY2sgXCIgKyAodGhpcy5fYmxvY2sgKyAxKSArIFwiIGhhcyBiZWVuIHNraXBwZWQsIGJlY2F1c2Ugb2YgbWlzc2luZyBicmFja2V0LiBFeHBlY3RlZCAnXScuXCIpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5fbmV4dENoYXIoKTtcbiAgICB9XG5cbiAgICBfcGFyc2VFeHRlbnNpb25zKG5vZGUpIHtcblxuICAgICAgICB2YXIgZm9sbG93ID0gWycjJywgJy4nLCAnLCcsICc6JywgJz4nLCAnPCddO1xuICAgICAgICB2YXIgaGFzSWQgPSBmYWxzZTtcblxuICAgICAgICB3aGlsZSAoWycjJywgJy4nLCAnOiddLmluY2x1ZGVzKHRoaXMuX2N1ckNoYXIoKSkpIHtcblxuICAgICAgICAgICAgaWYgKHRoaXMuX2N1ckNoYXIoKSA9PSAnIycpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9uZXh0Q2hhcigpO1xuICAgICAgICAgICAgICAgIGlmICghaGFzSWQpIHtcbiAgICAgICAgICAgICAgICAgICAgbm9kZS5hdHRyQ2hlY2tsaXN0LnB1c2gobmV3IEF0dHJpYnV0ZUNoZWNrKCdpZCcsICc9JywgdGhpcy5fZ2V0U3RyaW5nVW50aWwoZm9sbG93KSkpO1xuICAgICAgICAgICAgICAgICAgICBoYXNJZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fZ2V0U3RyaW5nVW50aWwoZm9sbG93KTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fd2FybmluZyhcIk11bHRpcGxlIElkcyBhcmUgbm90IHN1cHBvcnRlZCwgb25seSB0aGUgZmlyc3Qgb25lIHdpbGwgYmUgdXNlZC5cIik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAodGhpcy5fY3VyQ2hhcigpID09ICcuJykge1xuICAgICAgICAgICAgICAgIHRoaXMuX25leHRDaGFyKCk7XG4gICAgICAgICAgICAgICAgbm9kZS5hdHRyQ2hlY2tsaXN0LnB1c2gobmV3IEF0dHJpYnV0ZUNoZWNrKCd0YWdzJywgJ349JywgdGhpcy5fZ2V0U3RyaW5nVW50aWwoZm9sbG93KSkpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9uZXh0Q2hhcigpO1xuXG4gICAgICAgICAgICAgICAgaWYobm9kZS5ldmVudFN0YXRlID09IHVuZGVmaW5lZCl7XG4gICAgICAgICAgICAgICAgICAgIG5vZGVbXCJldmVudFN0YXRlXCJdID0gbmV3IEV2ZW50U3RhdGUoKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB2YXIgZXZlbnQgPSB0aGlzLl9nZXRTdHJpbmdVbnRpbChmb2xsb3cpO1xuICAgICAgICAgICAgICAgIGlmKCFleHBsb3JlckV2ZW50Lmhhc093blByb3BlcnR5KGV2ZW50KSl7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX3dhcm5pbmcoXCJJZ25vcmluZyB1bmtub3duIEV2ZW50ICdcIitldmVudCtcIicuXCIpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIG5vZGUuZXZlbnRTdGF0ZS5zZXQoZXhwbG9yZXJFdmVudFtldmVudF0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghWyc+JywgJzwnLCAnLCddLmluY2x1ZGVzKHRoaXMuX2N1ckNoYXIoKSkgJiYgdGhpcy5fY3VySWR4ID09IHRoaXMuX2xpdGVyYWwubGVuZ3RoIC0gMSkge1xuICAgICAgICAgICAgbm9kZS52YWxpZCA9IGZhbHNlO1xuICAgICAgICAgICAgdGhpcy5fZXJyb3IoXCJCbG9jayBcIiArICh0aGlzLl9ibG9jayArIDEpICsgXCIgaGFzIGJlZW4gc2tpcHBlZC4gRXhwZWN0ZWQgJz4nLCAnPCcgb3IgJywnLlwiKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIF9wYXJzZVR5cGUobm9kZSkge1xuICAgICAgICBpZiAodGhpcy5fY3VyQ2hhcigpID09IFwibFwiKSB7XG4gICAgICAgICAgICBub2RlLnR5cGUgPSBcImxcIjtcbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLl9jdXJDaGFyKCkgPT0gXCJlXCIpIHtcbiAgICAgICAgICAgIG5vZGUudHlwZSA9IFwiZVwiO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbm9kZS52YWxpZCA9IGZhbHNlO1xuICAgICAgICAgICAgdGhpcy5fZXJyb3IoXCJCbG9jayBcIiArICh0aGlzLl9ibG9jayArIDEpICsgXCIgaGFzIGJlZW4gc2tpcHBlZCwgYmVjYXVzZSBvZiBtaXNzaW5nIHR5cGUuIEV4cGVjdGVkICdlJyBvciAnbCcuXCIpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5fbmV4dENoYXIoKTtcbiAgICB9XG59XG5cbmNsYXNzIE5vZGUge1xuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICB0aGlzLnZhbGlkID0gdHJ1ZTtcbiAgICB9XG59XG4vLyBUT0RPOiBhbGxvdyBiZXR0ZXIgY3VzdG9taXphdGlvbiBvZiBjbGFzcyBsb2NhdGlvblxuY2xhc3MgU2VsZWN0b3IgZXh0ZW5kcyBOb2RlIHtcbiAgICBjb25zdHJ1Y3RvcihleHByZXNzaW9ucywgY29uZmlnKSB7XG4gICAgICAgIHN1cGVyKCk7XG4gICAgICAgIHRoaXMuX2V4cHJlc3Npb25zID0gZXhwcmVzc2lvbnM7XG4gICAgICAgIHRoaXMuX2NvbmZpZyA9IGNvbmZpZztcbiAgICB9XG5cbiAgICB2YWxpZGF0ZU9iamVjdChvYmope1xuICAgICAgIHJldHVybiBvYmouaGFzT3duUHJvcGVydHkodGhpcy5fY29uZmlnLmNsYXNzUHJvcGVydHkpO1xuICAgIH1cblxuICAgIHRlc3Qob2JqLCBzdHkpe1xuXG4gICAgICAgIGlmKCF0aGlzLnZhbGlkYXRlT2JqZWN0KG9iaikpe1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYodGhpcy5fZXhwcmVzc2lvbnMuZXZlcnkoZXhwID0+IHtyZXR1cm4gZXhwLmV2ZW50U3RhdGUgIT0gdW5kZWZpbmVkICYmIHN0eS5ldmVudFN0YXRlLnN0YXRlICE9IGV4cC5ldmVudFN0YXRlLnN0YXRlfSkpe1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRoaXMuX2V4cHJlc3Npb25zLnNvbWUoZXhwID0+IHtcbiAgICAgICAgICAgIC8vZGlmZmVyZW50aWF0ZSBiZXR3ZWVuIGxpbmtzIGFuZCBlbnRpdGllc1xuICAgICAgICAgICAgaWYoZXhwLnR5cGUgIT0gb2JqW3RoaXMuX2NvbmZpZy5jbGFzc1Byb3BlcnR5XSl7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiBleHAuYXR0ckNoZWNrbGlzdC5ldmVyeShhdHRyQ2hlY2sgPT4ge1xuXG4gICAgICAgICAgICAgICAgaWYoYXR0ckNoZWNrLmNvbXBhcmF0b3IgPT09IHVuZGVmaW5lZCB8fCBhdHRyQ2hlY2sudmFsdWUgPT09IHVuZGVmaW5lZCl7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBvYmouaGFzT3duUHJvcGVydHkoYXR0ckNoZWNrLmlkKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBpZighb2JqLmhhc093blByb3BlcnR5KGF0dHJDaGVjay5pZCkpe1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgc3dpdGNoKGF0dHJDaGVjay5jb21wYXJhdG9yKXtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgJz0nIDogXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIChvYmpbYXR0ckNoZWNrLmlkXSA9PSBhdHRyQ2hlY2sudmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSAnIT0nOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAob2JqW2F0dHJDaGVjay5pZF0gIT0gYXR0ckNoZWNrLnZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgJ349JzpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gKG9ialthdHRyQ2hlY2suaWRdLnNwbGl0KHRoaXMuX2NvbmZpZy50YWdMaXN0U2VwYXJhdG9yKS5pbmNsdWRlcyhhdHRyQ2hlY2sudmFsdWUpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgJz4nIDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gKG9ialthdHRyQ2hlY2suaWRdID4gYXR0ckNoZWNrLnZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgJzwnIDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gKG9ialthdHRyQ2hlY2suaWRdIDwgYXR0ckNoZWNrLnZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcblxuICAgICAgICAvL1RPRE86IEdyYXBoIFRyYXZlcnNhbCBjaGVja3MsIGNvbXBsZXggZXhwcmVzc2lvbnMgZXRjLlxuICAgIH1cblxuXG59XG5cbmNsYXNzIFNlbGVjdG9yRXhwcmVzc2lvbiBleHRlbmRzIE5vZGUge1xuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICBzdXBlcigpO1xuICAgICAgICB0aGlzLnR5cGU7XG4gICAgICAgIHRoaXMuZXZlbnRTdGF0ZTtcbiAgICAgICAgdGhpcy5hdHRyQ2hlY2tsaXN0ID0gW107XG4gICAgICAgIHRoaXMucmlnaHRTaWRlO1xuICAgIH1cbn1cblxuY2xhc3MgUmlnaHRTaWRlIGV4dGVuZHMgU2VsZWN0b3JFeHByZXNzaW9uIHtcbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgc3VwZXIoKTtcbiAgICAgICAgdGhpcy5wYXJhbWV0ZXI7XG4gICAgICAgIHRoaXMuY2hhaW5PcDtcbiAgICB9XG59XG5cbmNsYXNzIEF0dHJpYnV0ZUNoZWNrIGV4dGVuZHMgTm9kZSB7XG4gICAgY29uc3RydWN0b3IoaWQsIGNvbXBhcmF0b3IsIHZhbHVlKSB7XG4gICAgICAgIHN1cGVyKCk7XG4gICAgICAgIHRoaXMuaWQgPSBpZDtcbiAgICAgICAgdGhpcy5jb21wYXJhdG9yID0gY29tcGFyYXRvcjtcbiAgICAgICAgdGhpcy52YWx1ZSA9IHZhbHVlO1xuICAgIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgU2VsZWN0b3JQYXJzZXJcbn07Il19
