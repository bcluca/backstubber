'use strict';

var express = require('express');
var bodyParser = require('body-parser');
var glob = require('glob');
var path = require('path');
var http = require('http');
var https = require('https');
var url = require('url');

var VERBS = ['head', 'get', 'post', 'put', 'delete', 'all'];
var MERGE_OP = '_$$';
var OPS = [MERGE_OP];

function Backstubber() {
    var app = express();

    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(bodyParser.json());

    this.app = app;
}

function factory() {
    return new Backstubber();
}

function emptyVal(oa) {
    return oa instanceof Array ? [] : {};
}

function has(av, oa) {
    if (!oa) { return false; }
    return oa instanceof Array ? oa.indexOf(av) !== -1 : oa.hasOwnProperty(av);
}

function opEval(op, data) {
    return typeof op === 'function' ? op(data) : !!op;
}

function opVal(av, oa, data) {
    if (!oa) { return false; }
    return oa instanceof Array ? false : opEval(oa[av], data);
}

function isOp(ai, oa) {
    var op = oa instanceof Array ? oa[ai] : ai;
    return OPS.indexOf(op) !== -1;
}

function setVal(value, ai, oa) {
    if (oa instanceof Array) {
        oa.push(value);
    } else {
        oa[ai] = value;
    }
}

function transform(stub, data, req) {
    if (stub === null) { return null; }
    if (typeof stub === 'function') { return stub(data, req); }

    var dst = data && has(MERGE_OP, stub) ? data : emptyVal(stub);
    var resAttrWins = opVal(MERGE_OP, stub, data);

    Object.keys(stub).forEach(function (attr) {
        if (isOp(attr, stub)) {
            return;
        }
        var value = stub[attr];
        var resValue = data ? data[attr] : null;

        switch (typeof value) {
            case 'object':
                setVal(transform(value, resValue, req), attr, dst);
                break;
            case 'function':
                setVal(value(resValue, req), attr, dst);
                break;
            default:
                if (!dst.hasOwnProperty(attr) || !resAttrWins) {
                    setVal(value, attr, dst);
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
    var stub = require(filePath);

    var serveStub = function (stub, res, data, req) {
        if (ext === '.js' || service) {
            stub = transform(stub, data, req);
        }
        sendData(stub, res);
    };

    return function (req, res) {
        if (service) {
            fetch(req, service, function (err, data) {
                if (err) {
                    console.trace(err);
                }
                serveStub(stub, res, data, req);
            });
        } else {
            serveStub(stub, res, null, req);
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

function requiredArgs() {
    var names = Array.prototype.slice.call(arguments);
    var values = names.pop();

    names.forEach(function (name, i) {
        var value = values[i];
        if (name !== null && (typeof value === 'undefined' || value === null)) {
            throw new Error("missing '" + name + "' argument");
        }
    });
}

Backstubber.prototype.proxy = function (path, service) {
    requiredArgs('path', 'service', arguments);
    this.app.all(path, proxy(service));
    return this;
};

Backstubber.prototype.mount = function (dir, service) {
    requiredArgs('dir', arguments);

    if (dir === '*') {
        // For backward compatibility with v0.1.9 and below
        this.proxy('*', service);
        return this;
    }

    var self = this;
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

    return this;
};

Backstubber.prototype.listen = function () {
    this.app.listen.apply(this.app, arguments);
    return this;
};

module.exports = factory;
