[![Build Status](https://travis-ci.org/NetOxygen/node-rfc2397.svg?branch=master)](https://travis-ci.org/NetOxygen/node-rfc2397)

# node-rfc2397

NodeJS implementation of RFC 2397 (also know as the "data url scheme" or "data
uri"), both parsing and composing.

## Usage

### `parse(dataurl, callback)`

Parse a RFC 2397 compliant string. The callback function expects two arguments,
the error (if any) and the resulting object of the following form:

```javascript
{
    mime:               // the mime type (a string)
    parameters: {       // an object composed of the given dataurl parameters
        param1: value1, // a string
        param2: value2, // a string
        ...
    },
    data: // a Buffer constructed from the data part of the dataurl
}
```

Example:

```javascript
var rfc2397 = require("node-rfc2397");

var dataurl = "data:text/plain;charset=cp866;foo=bar;answer=42,%e1%ab%ae%a2%ae";
rfc2397.parse(dataurl, function (err, obj) {
    // obj is the following object:
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

### `compose(obj, options, callback)` or `compose(obj, callback)`

Compose a RFC 2397 compliant string from the given object `obj`. Pass
`{ base64: true }` as `options`if the data needs to be base64 encoded.
The callback function expects two arguments, the error (if any) and the
resulting string.

Example: 

```javascript
var rfc2397 = require("node-rfc2397");

var obj = {
    mime: 'text/plain',
    parameters: {
        charset: "US-ASCII",
    },
    data: Buffer.from("Hello World!"),
};

rfc2397.compose(obj, { base64: true }, function (err, dataurl) {
    // dataurl is the following string:
    // "data:text/plain;charset=US-ASCII,SGVsbG8gV29ybGQK"
});
```
