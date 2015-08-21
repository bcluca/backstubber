'use strict';

var chai      = require('chai');
var expect    = chai.expect;
var sinon     = require('sinon');
var sinonChai = require('sinon-chai');
var utils     = require('../../src/utils');

chai.use(sinonChai);

describe('Utils', function () {
    var sandbox = sinon.sandbox.create();

    afterEach(function () {
        sandbox.restore();
    });

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

    describe('#opEval', function () {
        describe('with an op value', function () {
            it('returns true if op is truthy', function () {
                expect(utils.opEval(true)).to.be.true;
                expect(utils.opEval(1)).to.be.true;
            });

            it('returns false if op is falsy', function () {
                expect(utils.opEval(false)).to.be.false;
                expect(utils.opEval(0)).to.be.false;
            });
        });

        describe('with an op function', function () {
            var mockOpFn;

            beforeEach(function () {
                mockOpFn = sandbox.stub().returns(42);
            });

            it('calls op and returns its return value', function () {
                expect(utils.opEval(mockOpFn)).to.equal(42);
                expect(mockOpFn).to.have.been.calledOnce;
            });

            it('passes data, req and originalRes to op', function () {
                utils.opEval(mockOpFn, 'data', 'req', 'originalRes');
                expect(mockOpFn).to.have.been.calledWith('data', 'req', 'originalRes');
            });
        });
    });

    describe('#opVal', function () {
        it('returns false if oa is null', function () {
            expect(utils.opVal('_$$', null)).to.be.false;
        });

        it ('returns false if oa is an array', function () {
            expect(utils.opVal('_$$', [1, 2, 3])).to.be.false;
            expect(utils.opVal('_$$', ['_$$', 1, 2, 3])).to.be.false;
        });

        it('returns the op evaluation otherwise', function () {
            var mockObj = { _$$: 'opFn' };
            sandbox.stub(utils, 'opEval').returns('foo');
            expect(utils.opVal('_$$', mockObj, 'data', 'req', 'originalRes')).to.eql('foo');
            expect(utils.opEval).to.have.been.calledWith('opFn', 'data', 'req', 'originalRes');
        });
    });

    describe('#isOp', function () {
        describe('within an array', function () {
            it('returns true if the pi index points to a valid op', function () {
                expect(utils.isOp(1, ['foo', '_$$', 'bar'])).to.be.true;
            });

            it('returns false if the pi index does not point to a valid op', function () {
                expect(utils.isOp(0, ['foo', '_$$', 'bar'])).to.be.false;
                expect(utils.isOp(1, ['foo', '_$', 'bar'])).to.be.false;
            });
        });

        describe('within an object', function () {
            it('returns true if the pi property is a valid op', function () {
                expect(utils.isOp('_$$', {})).to.be.true;
            });

            it('returns false if the pi property is not a valid op', function () {
                expect(utils.isOp('_$', {})).to.be.false;
            });
        });
    });

    describe('#setVal', function () {
        it('pushes the value if oa is an array', function () {
            var array = [1, 2, 3];
            utils.setVal(42, 0, array);
            expect(array.length).to.equal(4);
            expect(array[3]).to.equal(42);
        });

        it('sets the pi property to value if oa is an object', function () {
            var obj = { foo: 'bar'};
            utils.setVal(42, 'baz', obj);
            expect(obj).to.haveOwnProperty('baz');
            expect(obj.baz).to.equal(42);
        });
    });

    describe('#transform', function () {
        it('pending');
    });

    describe('#requiredArgs', function () {
        it('pending');
    });
});
