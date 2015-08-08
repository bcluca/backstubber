Backstubber
===========

Simple yet powerful backend stubs.

Installation
------------

    $ npm install backstubber

Install globally with `npm install -g backstubber` to use the `backstubber` CLI binary (coming soon).

Features
--------

Backstubber lets you easily stub your JSON backend, e.g.:

* Serve JSON files directly from your file system
* Generate dynamic data using functions
* Merge actual service responses with your stubs, adding or modifying attributes

Usage
-----

Create your app with `backstubber()` and mount your endpoint directories, e.g.:

````javascript
var backstubber = require('backstubber');

backstubber()
    .mount(__dirname + '/hello')
    .mount(__dirname + '/merge', 'https://api.github.com')
    .mount('*', 'https://api.github.com')
    .listen(3333);
````

In your endpoint directories, create JSON or JavaScript files named after the HTTP verbs you want your service to respond to, e.g.:

    example/
    ├── app.js
    ├── hello
    │   ├── faker
    │   │   └── get.js
    │   ├── random
    │   │   └── get.js
    │   └── say
    │       └── get.json
    ├── httpbin
    │   └── post
    │       └── post.json
    └── merge
        ├── orgs
        │   └── github
        │       └── get.js
        ├── rate_limit
        │   └── get.js
        └── users
            └── bcluca
                └── get.json

Merging
-------

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

Example app
-----------

Run with:

    $ node example/app.js

Test endpoints:

Endpoint | Description
--- | ---
`GET /say`          | Simple _Hello!_ message
`GET /random`       | Dynamic output using functions
`GET /faker`        | Example using Faker generators
`GET /`             | Simple proxy to the github API
`GET /orgs/github`  | Merging example using JavaScript
`GET /users/bcluca` | Merging example using JSON
`GET /rate_limit`   | Example showing merging overrides
