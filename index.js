'use strict';

var express = require('express');
var bodyParser = require('body-parser');
var glob = require('glob');
var path = require('path');
var http = require('http');
var https = require('https');
var url = require('url');

var VERBS = ['head', 'get', 'post', 'put', 'delete', 'all'];
var RESERVED_ATTRS = ['_$$'];

function Backstubber() {
    var app = express();

    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(bodyParser.json());

    this.app = app;
}

function factory() {
    return new Backstubber();
}

function isReservedAttr(attr) {
    return RESERVED_ATTRS.indexOf(attr) !== -1;
}

function transform(stub, data) {
    var dst = {};
    var resAttrWins = !!stub._$$;

    if (stub.hasOwnProperty('_$$') && data) {
        dst = data;
    }

    Object.keys(stub).forEach(function (attr) {
        if (isReservedAttr(attr)) {
            return;
        }
        var value = stub[attr];
        var resValue = data && data[attr];

        switch (typeof value) {
            case 'object':
                dst[attr] = transform(value, resValue);
                break;
            case 'function':
                dst[attr] = value();
                break;
            default:
                if (!dst.hasOwnProperty(attr) || !resAttrWins) {
                    dst[attr] = value;
                }
        }
    });

    return dst;
}

function sendData(data, res) {
    res.setHeader('Content-Type', 'application/json');
    res.send(data);
}

function fetch(req, service, callback) {
    var serviceUrl = url.parse(service);
    var proto = serviceUrl.protocol === 'https:' ? https : http;
    var headers = { 'user-agent' : 'node.js' };
    var bodyString = '';

    if (req.body && Object.keys(req.body).length > 0) {
        bodyString = JSON.stringify(req.body);
        headers['Content-Type'] = 'application/json';
        headers['Content-Length'] = bodyString.length;
    }

    var options = {
        method   : req.method,
        hostname : serviceUrl.hostname,
        path     : req.url,
        headers  : headers
    };

    if (serviceUrl.port) {
        options.port = serviceUrl.port;
    }

    var proxyReq = proto.request(options, function (res) {
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
    }).on('error', callback);

    if (bodyString) {
        proxyReq.write(bodyString);
    }

    proxyReq.end();
}

function stubHandler(filePath, ext, service) {
    var serveStub = function (stub, res, data) {
        if (ext === '.js' || service) {
            stub = transform(stub, data);
        }
        sendData(stub, res);
    };

    return function (req, res) {
        var stub = require(filePath);
        if (service) {
            fetch(req, service, function (err, data) {
                if (err) {
                    console.trace(err);
                }
                serveStub(stub, res, data);
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
            var relativeDir = path.dirname(relativePath);
            var endpoint = '/';

            if (relativeDir !== '.') {
                endpoint += relativeDir;
            }

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
