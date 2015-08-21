'use strict';

var expect      = require('chai').expect;
var sinon       = require('sinon');
var backstubber = require('../../src');

describe('Backstubber', function () {
    var app = backstubber();
    var sandbox = sinon.sandbox.create();

    afterEach(function () {
        sandbox.restore();
    });

    describe('HTTP methods', function () {
        beforeEach(function () {
            sandbox.stub(app, '_registerStub');
        });

        describe('#head', function () {
            it('delegates to #_registerStub', function () {
                app.head('route', 'stub', 'service', 'status');
                expect(app._registerStub.calledWith('stub', 'js', 'head', 'route', 'service', 'status')).to.be.true;
            });
        });

        describe('#get', function () {
            it('delegates to #_registerStub', function () {
                app.get('route', 'stub', 'service', 'status');
                expect(app._registerStub.calledWith('stub', 'js', 'get', 'route', 'service', 'status')).to.be.true;
            });
        });

        describe('#post', function () {
            it('delegates to #_registerStub', function () {
                app.post('route', 'stub', 'service', 'status');
                expect(app._registerStub.calledWith('stub', 'js', 'post', 'route', 'service', 'status')).to.be.true;
            });
        });

        describe('#put', function () {
            it('delegates to #_registerStub', function () {
                app.put('route', 'stub', 'service', 'status');
                expect(app._registerStub.calledWith('stub', 'js', 'put', 'route', 'service', 'status')).to.be.true;
            });
        });

        describe('#delete', function () {
            it('delegates to #_registerStub', function () {
                app.delete('route', 'stub', 'service', 'status');
                expect(app._registerStub.calledWith('stub', 'js', 'delete', 'route', 'service', 'status')).to.be.true;
            });
        });

        describe('#all', function () {
            it('delegates to #_registerStub', function () {
                app.all('route', 'stub', 'service', 'status');
                expect(app._registerStub.calledWith('stub', 'js', 'all', 'route', 'service', 'status')).to.be.true;
            });
        });
    });

    describe('#listen', function () {
        it('delegates to express app#listen', function () {
            sandbox.stub(app._app, 'listen');
            app.listen(3333, 'foo', 'bar');
            expect(app._app.listen.calledWith(3333, 'foo', 'bar')).to.be.true;
        });
    });
});
