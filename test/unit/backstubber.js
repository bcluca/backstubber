'use strict';

var chai        = require('chai');
var expect      = chai.expect;
var sinon       = require('sinon');
var sinonChai   = require('sinon-chai');
var backstubber = require('../../src');

chai.use(sinonChai);

describe('Backstubber', function () {
    var app = backstubber();
    var sandbox = sinon.sandbox.create();

    afterEach(function () {
        sandbox.restore();
    });

    describe('#mount', function () {
        it('pending');
    });

    describe('#proxy', function () {
        it('pending');
    });

    describe('#_registerStub', function () {
        it('pending');
    });

    describe('HTTP methods', function () {
        beforeEach(function () {
            sandbox.stub(app, '_registerStub');
        });

        describe('#head', function () {
            it('delegates to #_registerStub', function () {
                app.head('route', 'stub', 'service', 'status');
                expect(app._registerStub).to.have.been.calledWith('stub', 'js', 'head', 'route', 'service', 'status');
            });
        });

        describe('#get', function () {
            it('delegates to #_registerStub', function () {
                app.get('route', 'stub', 'service', 'status');
                expect(app._registerStub).to.have.been.calledWith('stub', 'js', 'get', 'route', 'service', 'status');
            });
        });

        describe('#post', function () {
            it('delegates to #_registerStub', function () {
                app.post('route', 'stub', 'service', 'status');
                expect(app._registerStub).to.have.been.calledWith('stub', 'js', 'post', 'route', 'service', 'status');
            });
        });

        describe('#put', function () {
            it('delegates to #_registerStub', function () {
                app.put('route', 'stub', 'service', 'status');
                expect(app._registerStub).to.have.been.calledWith('stub', 'js', 'put', 'route', 'service', 'status');
            });
        });

        describe('#delete', function () {
            it('delegates to #_registerStub', function () {
                app.delete('route', 'stub', 'service', 'status');
                expect(app._registerStub).to.have.been.calledWith('stub', 'js', 'delete', 'route', 'service', 'status');
            });
        });

        describe('#all', function () {
            it('delegates to #_registerStub', function () {
                app.all('route', 'stub', 'service', 'status');
                expect(app._registerStub).to.have.been.calledWith('stub', 'js', 'all', 'route', 'service', 'status');
            });
        });
    });

    describe('#listen', function () {
        it('delegates to express app#listen', function () {
            sandbox.stub(app._app, 'listen');
            app.listen(3333, 'foo', 'bar');
            expect(app._app.listen).to.have.been.calledWith(3333, 'foo', 'bar');
        });
    });
});
