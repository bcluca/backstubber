/**
* Simple yet powerful backend stubs.
* @module backstubber
* @version v0.1.22
* @license MIT
* @author {@link https://github.com/bcluca|Luca Bernardo Ciddio}
*/
'use strict';

var express = require('express');
var bodyParser = require('body-parser');
var glob = require('glob');
var path = require('path');
var http = require('http');
var https = require('https');
var url = require('url');
var extend = require('extend');

var VERBS = ['head', 'get', 'post', 'put', 'delete', 'all'];
var STATUS_REGEX = /^[1-5](\d|[xX]){2}$/;
var MERGE_OP = '_$$';
var OPS = [MERGE_OP];

/**
* Creates a new {@link module:backstubber~Backstubber|Backstubber} object.
* @private
* @constructor
* @returns {Backstubber} A new {@link module:backstubber~Backstubber|Backstubber} instance.
*/
function Backstubber() {
    var app = express();
    var stubsByStatus = {};

    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(bodyParser.json());

    this._app = app;

    this._registerStub = function (stub, format, verb, endpoint, service, status) {
        if (!service) {
            app[verb](endpoint, stubHandler(stub, format));
        } else {
            if (!stubsByStatus[endpoint]) {
                var stubs = [];
                stubsByStatus[endpoint] = stubs;
                app[verb](endpoint, statusHandler(service, stubs));
            }
            stubsByStatus[endpoint].push({
                pattern : regexForStatus(status || 'xxx'),
                stub    : stub,
                format  : format
            });
        }
        return this;
    };
}

/**
* Factory method returning a new {@link module:backstubber~Backstubber|Backstubber} instance.
* @returns A new {@link module:backstubber~Backstubber|Backstubber} instance.
*/
module.exports = function () {
    return new Backstubber();
};

function regexForStatus(status) {
    return new RegExp('^' + status.toString().replace(/[xX]/g, '\\d') + '$');
}

function emptyVal(oa) {
    return oa instanceof Array ? [] : {};
}

function has(av, oa) {
    if (!oa) { return false; }
    return oa instanceof Array ? oa.indexOf(av) !== -1 : oa.hasOwnProperty(av);
}

function opEval(op, data, req, originalRes) {
    return typeof op === 'function' ? op(data, req, originalRes) : !!op;
}

function opVal(av, oa, data, req, originalRes) {
    if (!oa) { return false; }
    return oa instanceof Array ? false : opEval(oa[av], data, req, originalRes);
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

function transform(stub, data, req, originalRes) {
    if (stub === null) { return null; }
    if (typeof stub === 'function') { return stub(data, req, originalRes); }

    var dst = data && has(MERGE_OP, stub) ? data : emptyVal(stub);
    var resAttrWins = opVal(MERGE_OP, stub, data, req, originalRes);

    Object.keys(stub).forEach(function (attr) {
        if (isOp(attr, stub)) {
            return;
        }
        var value = stub[attr];
        var resValue = data ? data[attr] : null;

        switch (typeof value) {
            case 'object':
                setVal(transform(value, resValue, req, originalRes), attr, dst);
                break;
            case 'function':
                setVal(value(resValue, req, originalRes), attr, dst);
                break;
            default:
                if (!dst.hasOwnProperty(attr) || !resAttrWins) {
                    setVal(value, attr, dst);
                }
        }
    });

    return dst;
}

function sendData(data, res, originalRes) {
    var headers = {};
    var status = 200;
    data = data !== null ? JSON.stringify(data) : '';

    if (originalRes) {
        extend(headers, originalRes.headers);
        status = originalRes.statusCode;
    }

    if (data) {
        headers['content-type'] = 'application/json;charset=utf-8';
        headers['content-length'] = Buffer.byteLength(data, 'utf8');
    }

    res.writeHead(status, headers);
    res.end(data, 'utf8');
}

function fetch(req, service, callback) {
    var serviceUrl = url.parse(service);
    var proto = serviceUrl.protocol === 'https:' ? https : http;
    var bodyString = '';
    var headers = extend({ 'user-agent': 'node.js' }, req.headers, {
        host              : serviceUrl.hostname,
        accept            : 'application/json',
        'accept-encoding' : 'utf-8'
    });

    if (req.body && Object.keys(req.body).length > 0) {
        bodyString = JSON.stringify(req.body);
        extend(headers, {
            'content-type'   : 'application/json',
            'content-length' : Buffer.byteLength(bodyString, 'utf8')
        });
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
        res.setEncoding('utf8');
        res.on('data', function (chunk) {
            body += chunk;
        }).on('end', function () {
            var data = null;
            if (body) {
                try {
                    data = JSON.parse(body);
                } catch (ex) {
                    console.warn('Could not parse JSON body for', options.method, options.path);
                }
            }
            res.body = data;
            callback(null, data, res);
        });
    }).on('error', callback);

    if (bodyString) {
        proxyReq.write(bodyString);
    }

    proxyReq.end();
}

function serveStub(stub, format, req, res, data, originalRes) {
    if (format === 'js' || data) {
        stub = transform(stub, data, req, originalRes);
    }
    sendData(stub, res, originalRes);
}

function stubHandler(stub, format) {
    return function (req, res) {
        serveStub(stub, format, req, res);
    };
}

function proxyHandler(service) {
    return function (req, res) {
        fetch(req, service, function (err, data, originalRes) {
            if (err) {
                console.trace(err);
            }
            sendData(data, res, originalRes);
        });
    };
}

function statusHandler(service, stubs) {
    return function (req, res) {
        fetch(req, service, function (err, data, originalRes) {
            if (err) {
                console.trace(err);
            }
            var noMatches = stubs.every(function (statusStub) {
                if (statusStub.pattern.test(originalRes.statusCode)) {
                    serveStub(statusStub.stub, statusStub.format, req, res, data, originalRes);
                    return false;
                }
                return true;
            });
            if (noMatches) {
                sendData(data, res, originalRes);
            }
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

/**
* Proxies all unstubbed calls to an external service.
* @param {string} path - Endpoint path, usually set to `*` to proxy all unhandled routes.
* @param {string} service - External service URL.
* @returns {Backstubber} The current {@link module:backstubber~Backstubber|Backstubber} instance, for chaining.
*/
Backstubber.prototype.proxy = function (path, service) {
    requiredArgs('path', 'service', arguments);
    this._app.all(path, proxyHandler(service));
    return this;
};

/**
* Mounts a directory containing stub definitions. Also provides optional merging with the response from an external service.
* @param {string} dir - Directory where the stubs are defined.
* @param {string} [service] - External service URL.
* @returns {Backstubber} The current {@link module:backstubber~Backstubber|Backstubber} instance, for chaining.
*/
Backstubber.prototype.mount = function (dir, service) {
    requiredArgs('dir', arguments);

    if (dir === '*') {
        // For backward compatibility with v0.1.9 and below
        this.proxy('*', service);
        return this;
    }

    var self = this;
    glob.sync(dir + '/**/*.@(json|js)').forEach(function (filePath) {
        var ext    = path.extname(filePath);
        var name   = path.basename(filePath, ext);
        var vs     = name.split('.');
        var verb   = vs[0];
        var status = vs[1];

        if (VERBS.indexOf(verb) === -1) {
            throw new Error("unknown verb '" + verb + "'");
        }
        if (status && !service) {
            throw new Error("'service' is required for status code specific stubs");
        }
        if (status && !STATUS_REGEX.test(status)) {
            throw new Error("'" + status + "' is not a valid HTTP status code");
        }

        var relativePath = path.relative(dir, filePath);
        var relativeDir  = path.dirname(relativePath);
        var endpoint     = '/';
        var stub         = require(filePath);
        var format       = ext.substr(1);

        if (relativeDir !== '.') {
            endpoint += relativeDir;
        }

        self._registerStub(stub, format, verb, endpoint, service, status);
    });

    return this;
};

function stubVerbFn(verb) {
    return function (route, stub, service, status) {
        return this._registerStub(stub, 'js', verb, route, service, status);
    };
}

/**
* Stubs an individual `HEAD` route, optionally merging with the response from an external service.
* If a status code is passed, this will only stub calls that receive a matching status code from the service.
* @function module:backstubber~Backstubber#head
* @param {string} route - Endpoint route.
* @param {object} stub - Stub definition.
* @param {string} [service] - Service URL.
* @param {number|string} [status] - HTTP status code, e.g. 200, 301, 3xx.
* @returns {Backstubber} The current {@link module:backstubber~Backstubber|Backstubber} instance, for chaining.
*/
Backstubber.prototype.head = stubVerbFn('head');

/**
* Stubs an individual `GET` route, optionally merging with the response from an external service.
* If a status code is passed, this will only stub calls that receive a matching status code from the service.
* @function module:backstubber~Backstubber#get
* @param {string} route - Endpoint route.
* @param {object} stub - Stub definition.
* @param {string} [service] - Service URL.
* @param {number|string} [status] - HTTP status code, e.g. 200, 301, 3xx.
* @returns {Backstubber} The current {@link module:backstubber~Backstubber|Backstubber} instance, for chaining.
*/
Backstubber.prototype.get = stubVerbFn('get');

/**
* Stubs an individual `POST` route, optionally merging with the response from an external service.
* If a status code is passed, this will only stub calls that receive a matching status code from the service.
* @function module:backstubber~Backstubber#post
* @param {string} route - Endpoint route.
* @param {object} stub - Stub definition.
* @param {string} [service] - Service URL.
* @param {number|string} [status] - HTTP status code, e.g. 200, 301, 3xx.
* @returns {Backstubber} The current {@link module:backstubber~Backstubber|Backstubber} instance, for chaining.
*/
Backstubber.prototype.post = stubVerbFn('post');

/**
* Stubs an individual `PUT` route, optionally merging with the response from an external service.
* If a status code is passed, this will only stub calls that receive a matching status code from the service.
* @function module:backstubber~Backstubber#put
* @param {string} route - Endpoint route.
* @param {object} stub - Stub definition.
* @param {string} [service] - Service URL.
* @param {number|string} [status] - HTTP status code, e.g. 200, 301, 3xx.
* @returns {Backstubber} The current {@link module:backstubber~Backstubber|Backstubber} instance, for chaining.
*/
Backstubber.prototype.put = stubVerbFn('put');

/**
* Stubs an individual `DELETE` route, optionally merging with the response from an external service.
* If a status code is passed, this will only stub calls that receive a matching status code from the service.
* @function module:backstubber~Backstubber#delete
* @param {string} route - Endpoint route.
* @param {object} stub - Stub definition.
* @param {string} [service] - Service URL.
* @param {number|string} [status] - HTTP status code, e.g. 200, 301, 3xx.
* @returns {Backstubber} The current {@link module:backstubber~Backstubber|Backstubber} instance, for chaining.
*/
Backstubber.prototype.delete = stubVerbFn('delete');

/**
* Stubs an individual route for all HTTP verbs, optionally merging with the response from an external service.
* If a status code is passed, this will only stub calls that receive a matching status code from the service.
* @function module:backstubber~Backstubber#all
* @param {string} route - Endpoint route.
* @param {object} stub - Stub definition.
* @param {string} [service] - Service URL.
* @param {number|string} [status] - HTTP status code, e.g. 200, 301, 3xx.
* @returns {Backstubber} The current {@link module:backstubber~Backstubber|Backstubber} instance, for chaining.
*/
Backstubber.prototype.all = stubVerbFn('all');

/**
* Binds and listens for connections on the specified host and port. This method is identical to Node’s
* {@link https://nodejs.org/api/http.html#http_server_listen_port_hostname_backlog_callback|http.Server.listen()}.
* @param {number} port - The port this service will listen on.
* @param {string} [hostname=Any IPv4 address.] - The service hostname.
* @param {number} [backlog=511] - The maximum length of the queue of pending connections.
* @param {function} [callback] - Callback function to be called when this server starts listening.
* @returns {Backstubber} The current {@link module:backstubber~Backstubber|Backstubber} instance, for chaining.
*/
Backstubber.prototype.listen = function () {
    this._app.listen.apply(this._app, arguments);
    return this;
};
