/**
* @author {@link https://github.com/bcluca|Luca Bernardo Ciddio}
* @license MIT
*/
'use strict';

var extend = require('extend');
var http   = require('http');
var https  = require('https');
var url    = require('url');
var utils  = require('./utils');

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
        stub = utils.transform(stub, data, req, originalRes);
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

module.exports = {
    sendData      : sendData,
    fetch         : fetch,
    serveStub     : serveStub,
    stubHandler   : stubHandler,
    proxyHandler  : proxyHandler,
    statusHandler : statusHandler
};
