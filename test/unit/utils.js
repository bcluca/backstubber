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
});
