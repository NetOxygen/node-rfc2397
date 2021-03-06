[![NPM Version][npm-image]][npm-url]
[![Build Status][travis-image]][travis-url]
[![Test Coverage][coveralls-image]][coveralls-url]

# node-rfc2397

NodeJS implementation of [RFC 2397][rfc2397-url] (The "data" URL scheme), both
parsing and composing.

## Usage

### `parse(dataurl, callback)`

Parse a [RFC 2397][rfc2397-url] compliant string.  `callback` is a `function
(err, info)` that is called as `callback(err)` if an error arise and
`callback(null, info)` on success. The `info` object yielded to `callback` has
the following form:

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

// URL encoded
var dataurl = "data:text/plain;charset=cp866;foo=bar;answer=42,%e1%ab%ae%a2%ae";
moddataurl.parse(dataurl, function (err, info) {
    // err is null and info is the following object:
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

// Base64
var dataurl = "data:text/plain;charset=utf-8;base64,SGVsbG8gV29ybGQh";
moddataurl.parse(dataurl, function (err, info) {
    // err is null and info is the following object:
    // {
    //    base64: true,
    //    mime: "text/plain",
    //    parameters: {
    //        charset: "utf-8"
    //    },
    //    data: <Buffer 48 65 6c 6c 6f 20 57 6f 72 6c 64 21>
    // }
    info.data.toString(); // "Hello World!"
});
```

### `parseSync(dataurl)`

Synchronous version of `parse()`. This throws if an error occurs. `dataurl` is a
[RFC 2397][rfc2397-url] compliant string. Returns an `info` object, as described
in the documentation of `parse()`.

Example:

```javascript
var moddataurl = require("node-rfc2397");

try {
    var dataurl = "data:text/plain;charset=utf-8,Hello%20World%21";
    var info = moddataurl.parseSync(dataurl)
    console.log(info);
    // {
    //     mime: 'text/plain',
    //     parameters: {
    //         charset: 'utf-8',
    //     },
    //     data: <Buffer 48 65 6c 6c 6f 20 57 6f 72 6c 64 21>
    // }

} catch (err) {
    console.log(err);
    throw err;
}
```

### `compose(info, callback)`

Compose a [RFC 2397][rfc2397-url] compliant string from the given object
`info`. `callback` is a `function (err, dataurl)` that is called as
`callback(err)` if an error arise and `callback(null, dataurl)` on success.

Example:

```javascript
var moddataurl = require("node-rfc2397");

var info = {
    mime:"text/plain",
    parameters: {
        charset:"utf-8"
    },
    base64: true,
    data: Buffer.from("Hello World!")
};

moddataurl.compose(info, function (err, dataurl) {
    // err is null and dataurl is the following string:
    // "data:text/plain;charset=utf-8;base64,SGVsbG8gV29ybGQh"
});
```

### `composeSync(info)`

Synchronous version of `compose()`. This throws if an error occurs. `info` is an
object, as described in the documentation of `compose()`. Returns an
[RFC 2397][rfc2397-url] compliant string.

Example:

```javascript
var moddataurl = require("node-rfc2397");

try {
    var info = {
        mime: "text/plain",
        parameters: {
            charset: "utf-8",
        },
        data: Buffer.from("Hello World!"),
    };
    var dataurl = moddataurl.composeSync(info);
    console.log(dataurl); // data:text/plain;charset=utf-8,Hello%20World%21
} catch (err) {
    console.log(err);
    throw err;
}
```

## Implementation notes

The [RFC 2397][rfc2397-url] is unfortunately vague regarding many details of the
syntax of the data URL scheme. This node module does its best to have a solid
implementation of the specification of the original RFC. However, some
independent choices had to be made where the specification is unclear.

### Duplicate parameter attribute handling

The [RFC 2397][rfc2397-url] does not specify what needs to be done when
duplicate parameter keys are encountered. The approach retained by this
implementation is **first given**.

Example:

```javascript
var moddataurl = require("node-rfc2397");
var info = moddataurl.parseSync("data:text/plain;foo=bar;foo=nope,");
console.log(info);
// {
//     mime: 'text/plain',
//     parameters: { foo: 'bar' },
//     data: <Buffer >,
// }

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

[rfc2397-url]: https://tools.ietf.org/html/rfc2397
[npm-image]: https://img.shields.io/npm/v/node-rfc2397.svg
[npm-url]: https://npmjs.org/package/node-rfc2397
[travis-image]: https://travis-ci.org/NetOxygen/node-rfc2397.svg?branch=master
[travis-url]: https://travis-ci.org/NetOxygen/node-rfc2397
[coveralls-image]: https://coveralls.io/repos/github/NetOxygen/node-rfc2397/badge.svg?branch=master
[coveralls-url]: https://coveralls.io/github/NetOxygen/node-rfc2397?branch=master
