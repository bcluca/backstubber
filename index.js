'use strict';

var express = require('express');
var glob = require('glob');
var path = require('path');

var VERBS = ['head', 'get', 'post', 'put', 'delete', 'all'];

function Backstubber() {
    this.app = express();
}

function factory() {
    return new Backstubber();
}

Backstubber.prototype.mount = function (dir, fallback) {
    var self = this;
    glob.sync(dir + '/**/*.json').forEach(function (filePath) {
        var relativePath = path.relative(dir, filePath);
        var endpoint = path.dirname(relativePath);
        var verb = path.basename(filePath, '.json');
        var file = require(filePath);

        if (VERBS.indexOf(verb) === -1) {
            throw new Error("unknown verb '" + verb + "'");
        }

        self.app[verb]('/' + endpoint, function (req, res) {
            res.setHeader('Content-Type', 'application/json');
            res.send(file);
        });
    });
    return this;
};

Backstubber.prototype.listen = function () {
    this.app.listen.apply(this.app, arguments);
    return this;
};

module.exports = factory;
