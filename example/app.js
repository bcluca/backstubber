var pkg = require('../package.json');
var backstubber = require('..');
var port = process.env.PORT || 3333;

backstubber()
    .mount(__dirname + '/hello')
    .mount(__dirname + '/merge', 'https://api.github.com')
    .mount(__dirname + '/httpbin', 'http://httpbin.org')
    .mount('*', 'https://api.github.com')
    .listen(port);

console.log('%s v%s listening on port %s', pkg.name, pkg.version, port);
