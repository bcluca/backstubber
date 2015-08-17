Backstubber
===========

Simple yet powerful backend stubs.

Installation
------------

    $ npm install backstubber

Install globally with `npm install -g backstubber` to use the `backstubber` CLI binary.

Features
--------

Backstubber lets you easily stub any JSON backend, e.g.:

* Serve JSON files directly from your file system
* Generate dynamic data using functions
* Merge actual service responses with your stubs, adding or modifying attributes

API docs
--------

You can find this README and the latest API docs at [bcluca.github.io/backstubber](http://bcluca.github.io/backstubber).

Usage
-----

#### As a library

Create your app with `backstubber()` and mount your fake endpoints, optionally proxying all unhandled calls to a real service, e.g.:

````javascript
var backstubber = require('backstubber');

backstubber()
    .mount(__dirname + '/simple')
    .mount(__dirname + '/merge', 'https://api.github.com')
    .mount(__dirname + '/form', 'http://httpbin.org')
    .proxy('*', 'https://api.github.com')
    .listen(3333);
````

In each endpoint directory, create JSON or JavaScript files named after the HTTP verbs you want your service to respond to, e.g.:

    example/
    ├── app.js
    ├── form
    │   └── post
    │       └── post.json
    └── simple
        ├── faker
        │   └── get.js
        ├── hello
        │   └── get.json
        └── random
            └── get.js

Example `get.json` defining a simple static stub:

````json
{
    "foo" : "bar"
}
````

The following example defines a dynamic stub that is merged on top of a real response from an external service:

````json
{
    "_$$" : false,
    "awesome" : true,
    "followers" : 424242
}
````

Original response from the external service:

````json
{
    "login": "bcluca",
    "url": "https://api.github.com/users/bcluca",
    "type": "User",
    "name": "Luca Bernardo Ciddio",
    "company": "YellowPages.com",
    "followers": 11
}
````

Stubbed response:

````json
{
    "login": "bcluca",
    "url": "https://api.github.com/users/bcluca",
    "type": "User",
    "name": "Luca Bernardo Ciddio",
    "company": "YellowPages.com",
    "followers": 424242,
    "awesome": true
}
````

The `followers` attribute is modified and a new `awesome` attribute is added.

You can also stub individual routes inline, e.g.:

````javascript
var backstubber = require('backstubber');

backstubber()
    .get('/foo/bar', { foo: 'bar' })
    .post('/test', { test: true })
    .all('/baz', { _$$: true, baz: true }, 'https://api.github.com')
    .listen(3333);
````

#### As a binary

    Usage: backstubber [options]

    Options:

      -h, --help                        output usage information
      -V, --version                     output the version number
      -m, --mount <dir[,service]>       mount stubs directory, with optional service
      -P, --proxy <endpoint|*,service>  proxy unhandled calls (use * to catch all)
      -p, --port <port>                 set the port (defaults to 3333)

Examples:

    $ backstubber -m example/simple
    $ backstubber -m example/simple -m example/merge,https://api.github.com -p 8080
    $ backstubber --mount=example/simple --port=3000
    $ backstubber -m example/merge,https://api.github.com -P *,https://api.github.com

##### Note

If you are using the `backstubber` binary and your stubs require any packages, make sure you have those installed either locally in any `node_modules` directory up the tree, or globally.

For instance, if you want to mount the stubs defined in `./example/simple/`, please run `npm install` or `npm install -g faker` first.

Merging with `_$$`
------------------

If you add a service url to your `mount()` calls, your stub will proxy all calls to an actual service and merge the responses. In your endpoint file, you can reference the original response with the `_$$` attribute.

Setting `_$$` to a falsy value (e.g. `false` or `0`) merges your stub data on top of the original response. A truthy value (e.g. `true` or `1`) makes the original attributes "win" over your stub data.

`_$$` is falsy by default, meaning that all stubs will overwrite the original response if no `_$$` attributes are present.

The `rate_limit` example illustrates the use of merging overrides:

````javascript
module.exports = {
    _$$ : 1,              // original attrs merged over the stub
    resources : {
        _$$ : 1,          // same here
        search : {
            _$$ : 0,      // this allows the stub to overwrite foo and limit
            foo : 'bar',
            limit : 42
        },
        core : 42         // this gets replaced by the original core attr
    },
    rate : {
        _$$ : 0,          // limit will be 42 in the final response
        limit : 42
    }
};
````

`_$$` also works with arrays, e.g.:

````json
["_$$", {
    "foo" : "bar"
}]
````

You can remove attributes from the original response by setting them to `undefined`, e.g.:

````javascript
module.exports = {
    _$$ : false,
    documentation_url : undefined           // this attr will be removed
};
````

Note that this is only allowed in JavaScript stubs. If you are using JSON for your stubs and need this functionality, please use JavaScript instead.

You can also have full control over merging by referencing the original response inside functions, e.g.:

````javascript
module.exports = {
    _$$ : true,                             // response data takes priority
    message : function (data) {             // custom merging, _$$ ignored
        return 'Original message: ' + data; // uses original attr data
    },
    documentation_url : 'new url'           // _$$ not ignored here
};
````

Functions can also be used to define merging behavior, e.g.:

````javascript
module.exports = {
    _$$ : function (data) {
        console.log(data);          // original data also available
        return Math.random() < 0.5; // dynamic merge
    },
    message : 'Updated message'     // randomly merged
};
````

Request object
--------------

In addition to the current `data` chunk, you can use the original request object `req` inside callback functions, e.g.:

````javascript
module.exports = {
    userAgent : function (data, req) {
        return req.headers['user-agent'];
    },
    query : function (data, req) {
        return req.query;
    }
};
````

Response object
---------------

Inside callback functions, you can also access the original response from the external service, e.g.:

````javascript
module.exports = {
    _$$ : function (data, req, res) {
        res.statusCode = 200;          // Change status code from 404 to 200
        res.headers.status = '200 OK'; // Update status header (github sends that too)
        return true;
    },
    headers : function (data, req, res) {
        console.log(res.body);         // You can access the original response body
        return res.headers;            // Just to show updated headers
    }
};
````

As shown in the example above, you can also access the original response body and change your fake response status and headers. This works in inline stubs as well, e.g.:

````javascript
backstubber()
    .get('/headers', function (data, req, res) {
        return {
            headers : res.headers
        };
    }, 'https://api.github.com')
    .listen(3333);
````

Please note that Backstubber will overwrite the `content-type` and `content-length` headers, to make sure that a valid JSON response is sent.

HTTP status codes
-----------------

When you interact with an external service, you can restrict your stubs to specific HTTP status codes by adding a prefix to their name, e.g.:

    example/status/
    └── status
        └── :status
            ├── get.200.json
            ├── get.4xx.js
            └── get.json

The `x` in the status code pattern will match any number.

Stubs with no status specified will be used as a fallback, when no specific status codes are matched. If no generic stubs are found, the request will be proxied to the external service, as usual.

In the example above you can also notice the use of parameters. Naming an endpoint directory with a leading colon, e.g. `:status`, will make that part of the actual URL available in `req.params`, e.g. `req.params.status`.

Example app
-----------

Run with:

    $ node example/app.js

Test endpoints:

Endpoint | Description
--- | ---
`GET /hello`             | Simple _Hello!_ message
`GET /random`            | Dynamic output using callbacks
`GET /faker`             | Example using Faker generators
`GET /`                  | Simple proxy to the github API
`POST /post`             | Simple `POST` example
`GET /orgs/github`       | Merging example using JavaScript
`GET /users/bcluca`      | Merging example using JSON
`GET /rate_limit`        | Example showing merging overrides
`GET /users/bcluca/orgs` | Array merging example
`GET /fn`                | Using response data in callbacks
`GET /events`            | Root handler example
`GET /dynamic`           | Dynamic merging example
`GET /req?foo=bar`       | Example using the request object
`GET /status/:status`    | HTTP status code specific stubs
`GET /res`               | Example using the response object
`GET /headers`           | Inline stub showing response headers
