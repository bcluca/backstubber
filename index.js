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

function transform(stub) {
    var obj = {};
    Object.keys(stub).forEach(function (attr) {
        var value = stub[attr];
        switch (typeof value) {
            case 'object':
                obj[attr] = transform(value);
                break;
            case 'function':
                obj[attr] = value();
                break;
            default:
                obj[attr] = value;
        }
    });
    return obj;
}

Backstubber.prototype.mount = function (dir, fallback) {
    var self = this;
    glob.sync(dir + '/**/*.@(json|js)').forEach(function (filePath) {
        var extension = path.extname(filePath);
        var verb = path.basename(filePath, extension);

        if (VERBS.indexOf(verb) === -1) {
            throw new Error("unknown verb '" + verb + "'");
        }

        var relativePath = path.relative(dir, filePath);
        var endpoint = path.dirname(relativePath);

        self.app[verb]('/' + endpoint, function (req, res) {
            var stub = require(filePath);
            if (extension === '.js') {
                stub = transform(stub);
            }
            res.setHeader('Content-Type', 'application/json');
            res.send(stub);
        });
    });
    return this;
};

Backstubber.prototype.listen = function () {
    this.app.listen.apply(this.app, arguments);
    return this;
};

module.exports = factory;
