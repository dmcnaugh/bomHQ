/**
 * Created with JetBrains WebStorm.
 * User: dmcnaughton
 * Date: 31/08/13
 * Time: 7:14 AM
 * To change this template use File | Settings | File Templates.
 */
var assert = require('assert')
    , util = require('util')
    , debug = require('express/node_modules/debug')('di'); // TODO: this dependency needs to be resolved properly

/**
 * Module Constructor:
 * @type {Function}
 * @param {Object} options - option flags as object: global [true] , strict [false]
 */
exports = module.exports = function(options) {

    var diQueue = {};

    // From NODE: modules.js
    // If obj.hasOwnProperty has been overridden, then calling
    // obj.hasOwnProperty(prop) will break.
    // See: https://github.com/joyent/node/issues/1707
    function hasOwnProperty(obj, prop) {
        return Object.prototype.hasOwnProperty.call(obj, prop);
    }

    /**
     * Resolve and default options
     */
    options = options || {};
    options.global = (options.global === undefined) ? true : options.global;
    options.strict =  (options.strict === undefined) ? false : options.strict;

    /**
     * Public method: please - adds a target (object) to the dependency list identified by the given token
     * @param {*} target
     * @param {String} token
     * @returns the target
     */
    exports.please = function (target,token) {

        assert(token, 'missing token');
        assert(typeof token === "string", 'token must be a string');
        debug('Asked nicely to keep: ', token);
        assert(!hasOwnProperty(diQueue, token), 'duplicate token \"'+token+'\" encountered');

        diQueue[token] = target;  // don't actually care what target is

        return target;

    };

    /**
     * Public method: thankYou - how would you describe it?
     * @param {Array} tokens, [target]
     * @param {Function} [target]
     * @returns {*}
     */
    exports.thankYou = function () {

        //TODO: Validation of args incomplete
        assert(arguments.length == 1 || arguments.length == 2, 'missing arguments')
        assert(util.isArray(arguments[0]), 'must inject from array');

        if(arguments.length == 2) {
            var tokens = arguments[0];
            var target = arguments[1];
        } else {
            var tokens = arguments[0].slice(0,-1);
            var target = arguments[0][arguments[0].length-1];
        }

        var args =[];

        for(var i= 0, l=tokens.length; i < l; i++) {
            if(options.strict) assert(hasOwnProperty(diQueue, tokens[i]), 'token \"'+tokens[i]+'\" not found');
            args.push(diQueue[tokens[i]]);
        }

        //TODO: need a debug here

        return target.apply(this, args); // apply is the magic that injects the arguments into the target function

    };

    if(!options.strict) {

        debug('You have authorised this leak'); //TODO: a better message please

        /**
         * Public method: leak -
         * @param token
         * @returns {*}
         */
        exports.leak = function(token) {

            if(hasOwnProperty(diQueue,token)) return diQueue[token];  //TODO: need a debug here

        }
    };

    /**
     * Make methods global (based on options.global)
     */
    if(options.global) {
        global.please = exports.please;
        global.thankYou = exports.thankYou;
        global.leak = exports.leak;
        debug('Going global'); //TODO: a better message please
    }

    return exports;
}