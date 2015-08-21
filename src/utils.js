/**
* @author {@link https://github.com/bcluca|Luca Bernardo Ciddio}
* @license MIT
*/
'use strict';

var MERGE_OP = '_$$';
var OPS = [MERGE_OP];

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

module.exports = {
    regexForStatus : regexForStatus,
    emptyVal       : emptyVal,
    has            : has,
    opEval         : opEval,
    opVal          : opVal,
    isOp           : isOp,
    setVal         : setVal,
    transform      : transform,
    requiredArgs   : requiredArgs
};
