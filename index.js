'use strict';

var express = require('express');
var glob = require('glob');
var path = require('path');
var http = require('http');
var https = require('https');
var url = require('url');

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

function sendData(data, res) {
    res.setHeader('Content-Type', 'application/json');
    res.send(data);
}

function fetch(req, service, callback) {
    var serviceUrl = url.parse(service);
    var proto = serviceUrl.protocol === 'https:' ? https : http;
    var options = {
        method   : req.method,
        hostname : serviceUrl.hostname,
        path     : req.url,
        port     : req.port,
        headers: {
            'user-agent' : 'node.js'
        }
    };

    proto.request(options, function (res) {
        var body = '';
        res.on('data', function (chunk) {
            body += chunk;
        }).on('end', function () {
            var data = {};
            if (body) {
                try {
                    data = JSON.parse(body);
                } catch (ex) {
                    console.warn('Could not parse JSON body for', options.method, options.path);
                }
            }
            callback(null, data);
        });
    }).on('error', callback).end();
}

function stubHandler(filePath, ext, service) {
    var serveStub = function (stub, res) {
        if (ext === '.js') {
            stub = transform(stub);
        }
        sendData(stub, res);
    };

    return function (req, res) {
        var stub = require(filePath);
        if (service) {
            fetch(req, service, function (err, data) {
                if (err) {
                    console.trace(err);
                } else {
                    // TODO: merge response with stub if needed
                }
                serveStub(stub, res);
            });
        } else {
            serveStub(stub, res);
        }
    };
}

function proxy(service) {
    return function (req, res) {
        fetch(req, service, function (err, data) {
            if (err) {
                console.trace(err);
            }
            sendData(data, res);
        });
    };
}

Backstubber.prototype.mount = function (dir, service) {
    var self = this;
    if (dir === '*') {
        if (service) {
            this.app.all('*', proxy(service));
        } else {
            throw new Error('service required in proxy mode');
        }
    } else {
        glob.sync(dir + '/**/*.@(json|js)').forEach(function (filePath) {
            var ext = path.extname(filePath);
            var verb = path.basename(filePath, ext);

            if (VERBS.indexOf(verb) === -1) {
                throw new Error("unknown verb '" + verb + "'");
            }

            var relativePath = path.relative(dir, filePath);
            var endpoint = '/' + path.dirname(relativePath);

            self.app[verb](endpoint, stubHandler(filePath, ext, service));
        });
    }
    return this;
};

Backstubber.prototype.listen = function () {
    this.app.listen.apply(this.app, arguments);
    return this;
};

module.exports = factory;
