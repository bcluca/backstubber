'use strict';

var expect = require('chai').expect;
var utils  = require('../../src/utils');

describe('Utils', function () {
    describe('#regexForStatus', function () {
        it('can create a regex that matches 200', function () {
            expect(utils.regexForStatus('200')).to.eql(/^200$/);
        });

        it('can create a regex that matches 301', function () {
            expect(utils.regexForStatus('301')).to.eql(/^301$/);
        });

        it('can create a regex that matches 5xx', function () {
            expect(utils.regexForStatus('5xx')).to.eql(/^5\d\d$/);
        });

        it('can create a regex that matches 40X', function () {
            expect(utils.regexForStatus('40X')).to.eql(/^40\d$/);
        });

        it('can create a regex that matches xxx', function () {
            expect(utils.regexForStatus('xxx')).to.eql(/^\d\d\d$/);
        });

        it('can create a regex that matches 1Xx', function () {
            expect(utils.regexForStatus('1Xx')).to.eql(/^1\d\d$/);
        });
    });

    describe('#emptyVal', function () {
        it('returns [] if an array is passed', function () {
            expect(utils.emptyVal([1, 2, 3])).to.eql([]);
        });

        it('returns {} otherwise', function () {
            expect(utils.emptyVal({})).to.eql({});
            expect(utils.emptyVal({ foo: 'bar' })).to.eql({});
            expect(utils.emptyVal(null)).to.eql({});
        });
    });

    describe('#has', function () {
        it('returns false if oa is null', function () {
            expect(utils.has('foo', null)).to.be.false;
        });

        it('returns true if oa is an array that has the value pv', function () {
            expect(utils.has('foo', ['foo'])).to.be.true;
        });

        it('returns false if oa is an array that does not have the value pv', function () {
            expect(utils.has('foo', ['bar', 'baz'])).to.be.false;
        });

        it('returns true if oa is an object that has the property pv', function () {
            expect(utils.has('foo', { foo: 'bar' })).to.be.true;
        });

        it('returns false if oa is an object that does not have the property pv', function () {
            expect(utils.has('foo', { bar: 'baz' })).to.be.false;
        });
    });
});
