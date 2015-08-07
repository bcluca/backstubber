#!/usr/bin/env node
var pkg = require('../package.json');
var backstubber = require('..');

console.log(pkg.name + ' ' + pkg.version);

backstubber()
    .mount(__dirname + '/../example')
    .mount('*', 'https://api.github.com')
    .listen(3333);
