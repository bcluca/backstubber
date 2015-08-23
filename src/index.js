/**
* Simple yet powerful backend stubs.
* @module backstubber
* @version v0.1.23
* @author {@link https://github.com/bcluca|Luca Bernardo Ciddio}
* @license MIT
*/
'use strict';

var Backstubber = require('./backstubber');

/**
* Factory method returning a new {@link module:backstubber~Backstubber|Backstubber} instance.
* @returns A new {@link module:backstubber~Backstubber|Backstubber} instance.
*/
module.exports = function () {
    return new Backstubber();
};
