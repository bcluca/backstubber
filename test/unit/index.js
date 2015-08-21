'use strict';

var expect      = require('chai').expect;
var Backstubber = require('../../src/backstubber');
var backstubber = require('../../src');

describe('Backstubber factory', function () {
    it('returns a new Backstubber instance', function () {
        expect(backstubber()).to.be.instanceOf(Backstubber);
    });
});
