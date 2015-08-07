#!/usr/bin/env node
var pkg = require('../package.json');
var backstubber = require('..');
var base = __dirname + '/../examples/';

console.log(pkg.name + ' ' + pkg.version);

backstubber()
    .mount(base + 'hello')
    .mount(base + 'merge', 'https://api.github.com')
    .mount('*', 'https://api.github.com')
    .listen(3333);
