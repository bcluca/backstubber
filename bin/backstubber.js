#!/usr/bin/env node
var pkg         = require('../package.json');
var backstubber = require('..');
var program     = require('commander');
var fs          = require('fs');
var cmds        = [];

function pushCmd(cmd) {
    return function (val, memo) {
        memo.push({
            cmd : cmd,
            val : val
        });
        return memo;
    };
}

function error(err) {
    console.error('error:', err);
    process.exit(1);
}

program
    .version(pkg.version)
    .option('-p, --port <port>', 'set the port (defaults to 3333)')
    .option('-m, --mount <dir>[,<service>]', 'mount stubs directory, with optional service', pushCmd('mount'), cmds)
    .option('-P, --proxy <endpoint|*>,<service>', 'proxy unhandled calls (use * to catch all)', pushCmd('proxy'), cmds)
    .parse(process.argv);

if (!process.argv.slice(2).length || !cmds.length) {
    program.help();
}

var app  = backstubber();
var port = program.port || 3333;

cmds.forEach(function (m) {
    var params  = m.val.split(',');
    var path    = params[0];
    var service = params[1];

    if (m.cmd === 'mount') {
        try {
            var stat = fs.statSync(path);
            if (!stat.isDirectory()) {
                error(path + ' is not a directory');
            }
            path = fs.realpathSync(path);
        } catch(err) {
            error(path + ' does not exist');
        }
    }

    try {
        app[m.cmd](path, service);
    } catch (err) {
        error(err.message);
    }
});

app.listen(port);
console.log('%s v%s listening on port %s', pkg.name, pkg.version, port);
