[![Build Status](https://travis-ci.org/NetOxygen/node-rfc2397.svg?branch=master)](https://travis-ci.org/NetOxygen/node-rfc2397)[![Coverage Status](https://coveralls.io/repos/github/NetOxygen/node-rfc2397/badge.svg?branch=master)](https://coveralls.io/github/NetOxygen/node-rfc2397?branch=master)

# node-rfc2397

NodeJS implementation of [RFC 2397](https://tools.ietf.org/html/rfc2397) (The
"data" URL scheme), both parsing and composing.

## Usage

### `parse(dataurl, callback)`

Parse a [RFC 2397](https://tools.ietf.org/html/rfc2397) compliant string.
`callback` is a `function (err, infos)` that is called as `callback(err)` if
an error arise and `callback(null, infos)` on
success. The `infos` object yielded to `callback` has the following form:

```javascript
{
    mime: "mime/type"     // the mime type (a string)
    parameters: {         // an object composed of the given dataurl parameters
        param1: "value1", // a string
        param2: "value2", // a string
        ...
    },
    data: // a Buffer constructed from the data part of the dataurl
}
```

Example:

```javascript
var moddataurl = require("node-rfc2397");

var dataurl = "data:text/plain;charset=cp866;foo=bar;answer=42,%e1%ab%ae%a2%ae";
moddataurl.parse(dataurl, function (err, infos) {
    // err is null and infos is the following object:
    // {
    //     mime: "text/plain",
    //     parameters: {
    //         charset: "cp866",
    //         foo: "bar",
    //         answer: "42",
    //     },
    //     data: <Buffer e1 ab ae a2 ae>,
    // }
});
```

### `compose(infos[, options], callback)`

Compose a [RFC 2397](https://tools.ietf.org/html/rfc2397) compliant string from
the given object `infos`. If `options` is `{encoding: "base64"}` then `data` will
be encoded in base64. `callback` is a `function (err, dataurl)` that is
called as `callback(err)` if an error arise and `callback(null, dataurl)` on
success.

Example:

```javascript
var moddataurl = require("node-rfc2397");

var infos = {
    mime:"text/plain",
    parameters: {
        charset:"utf-8"
    },
    data: Buffer.from("Hello World!")
};

moddataurl.compose(infos, {encoding: "base64"}, function (err, dataurl) {
    // err is null and dataurl is the following string:
    // "data:text/plain;charset=utf-8;base64,SGVsbG8gV29ybGQh"
});
```

## Tests

To run the test suite, first install the dependencies, then run `npm test`:

```sh
$ npm install
$ npm test
```

For a test coverage report, run `npm test --coverage`:

```sh
$ npm test --coverage
```

## License

[MIT](LICENSE)
