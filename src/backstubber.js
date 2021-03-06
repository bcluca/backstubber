/**
* @author {@link https://github.com/bcluca|Luca Bernardo Ciddio}
* @license MIT
*/
'use strict';

var express    = require('express');
var bodyParser = require('body-parser');
var glob       = require('glob');
var path       = require('path');
var utils      = require('./utils');
var handlers   = require('./handlers');

var VERBS = ['head', 'get', 'post', 'put', 'delete', 'all'];
var STATUS_REGEX = /^[1-5](\d|[xX]){2}$/;

/**
* Creates a new {@link module:backstubber~Backstubber|Backstubber} object.
* @private
* @constructor module:backstubber~Backstubber
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
            app[verb](endpoint, handlers.stubHandler(stub, format));
        } else {
            if (!stubsByStatus[endpoint]) {
                var stubs = [];
                stubsByStatus[endpoint] = stubs;
                app[verb](endpoint, handlers.statusHandler(service, stubs));
            }
            stubsByStatus[endpoint].push({
                pattern : utils.regexForStatus(status || 'xxx'),
                stub    : stub,
                format  : format
            });
        }
        return this;
    };
}

/**
* Proxies all unstubbed calls to an external service.
* @function module:backstubber~Backstubber#proxy
* @param {string} path - Endpoint path, usually set to `*` to proxy all unhandled routes.
* @param {string} service - External service URL.
* @returns {Backstubber} The current {@link module:backstubber~Backstubber|Backstubber} instance, for chaining.
*/
Backstubber.prototype.proxy = function (path, service) {
    utils.requiredArgs('path', 'service', arguments);
    this._app.all(path, handlers.proxyHandler(service));
    return this;
};

/**
* Mounts a directory containing stub definitions. Also provides optional merging with the response from an external service.
* @function module:backstubber~Backstubber#mount
* @param {string} dir - Directory where the stubs are defined.
* @param {string} [service] - External service URL.
* @returns {Backstubber} The current {@link module:backstubber~Backstubber|Backstubber} instance, for chaining.
*/
Backstubber.prototype.mount = function (dir, service) {
    utils.requiredArgs('dir', arguments);

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
* @function module:backstubber~Backstubber#listen
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

module.exports = Backstubber;
