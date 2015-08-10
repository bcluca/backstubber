var pkg = require('../package.json');
var backstubber = require('..');
var port = process.env.PORT || 3333;

backstubber()
    .mount(__dirname + '/simple')
    .mount(__dirname + '/merge', 'https://api.github.com')
    .mount(__dirname + '/form', 'http://httpbin.org')
    .proxy('*', 'https://api.github.com')
    .listen(port);

console.log('%s v%s listening on port %s', pkg.name, pkg.version, port);
