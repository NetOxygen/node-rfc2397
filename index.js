"use strict";

var iconv = require("iconv-lite");


/*
 * Decode "%xx hex" encoded strings into a Buffer.
 */
function pct_decode(urlencoded) {
    /*
     * see https://tools.ietf.org/html/rfc3986#section-2.3
     * unreserved  = ALPHA / DIGIT / "-" / "." / "_" / "~"
     */
    var unreserved = /[A-Za-z0-9\-\._~]/;

    /*
     * see https://tools.ietf.org/html/rfc3986#section-2.1
     *  pct-encoded = "%" HEXDIG HEXDIG
     */
    var pct_encoded = /%[A-Fa-f0-9]{2}/;

    var correctly_encoded = new RegExp(
        "^(?:" + unreserved.source + "|" + pct_encoded.source + ")*$"
    );

    if (!urlencoded.match(correctly_encoded))
        throw new Error("malformed data");

    var splitter = new RegExp(
        "(" + pct_encoded.source + ")"
    );

    var buffers = urlencoded.split(splitter).map(function (part) {
        if (part.match(pct_encoded)) {
            // FIXME: use Buffer.from() for NodeJS 6+
            return new Buffer(/* remove leading `%' */part.slice(1), "hex");
        } else {
            // FIXME: use Buffer.from() for NodeJS 6+
            return new Buffer(part, "ascii");
        }
    });

    return Buffer.concat(buffers);
};

/*
 * Encode str into a percent encoded string.
 */
function pct_encode(str, charset) {
    if (!iconv.encodingExists(charset))
        throw new Error("unsupported charset (" + charset + ")");
    /*
     * see https://tools.ietf.org/html/rfc3986#section-2.3
     * unreserved  = ALPHA / DIGIT / "-" / "." / "_" / "~"
     */
    var unreserved = /[A-Za-z0-9\-\._~]/;

    var pct_encoded = str.split("").reduce(function (str, char) {
        if (char.match(unreserved)) {
            return str + char;
        } else {
            return str + iconv.encode(char, charset).toString("hex").match(/[A-Fa-f0-9]{2}/).map(function (hex) {
                return "%" + hex;
            });
        }
    }, "");

    return pct_encoded;
};


module.exports = {
    /*
     * See RFC 2397 section 3 for more details about the dataurl format.
     *
     *   dataurl    := "data:" [ mediatype ] [ ";base64" ] "," data
     *   mediatype  := [ type "/" subtype ] *( ";" parameter )
     *   data       := *urlchar
     *   parameter  := attribute "=" value*
     *
     */
    parse: function (dataurl, callback) {
        // capture groups:
        //   (1) [ mediatype ] [ ";base64" ]
        //   (2) data
        var dataurl_splitter = /^(?:data:){1}([^,]*)(?:,)(.+)$/;
        var split = dataurl.match(dataurl_splitter);
        if (null === split)
            return callback(new Error("malformed dataurl"));

        // 0 is full match
        var mediatype = split[1].split(";"); // capture group (1)
        var data      = split[2];            // capture group (2)

        // base64 is last element (if present) and is a special case
        var base64 = mediatype[mediatype.length - 1] === "base64" && mediatype.pop();

        // first element of mediatype is the MIME (if present)
        var mime = mediatype.shift() || 'text/plain';

        var parameters = mediatype.reduce(function (params, param) {
            var split = param.split("=", 2);
            var key   = split[0];
            var value = split[1];
            if (!key || !value)
                return params; // be "nice" and ignore invalid properties
            params[key.toLowerCase()] = value;
            return params;
        }, {});

        if (mime.toLowerCase().match(/^text\//) && !parameters['charset'])
            parameters['charset'] = 'US-ASCII';

        try {
            return callback(null, {
                mime: mime,
                parameters: parameters,
                data: base64 ? new Buffer(data, 'base64') : pct_decode(data),
            });
        } catch (err) {
            return callback(err);
        }
    },

    compose: function (obj, options, callback) {
        if ('undefined' === typeof callback) {
            callback = options;
            options = {}
        }

        var mime = obj.mime || "";
        var parameters = obj.parameters || {};
        var charset = parameters.charset || "US-ASCII";
        var parametersString = Object.keys(parameters).reduce(function (params, key) {
            return params + ";" + key + "=" + parameters[key];
        }, "");
        var mediatype = mime + parametersString;

        if (!iconv.encodingExists(charset))
            return callback(new Error("unsupported charset (" + charset + ")"));

        if (!Buffer.isBuffer(obj.data))
            return callback(new Error("unexpected type for obj.data (did you provide a Buffer?)"));

        var data = "";
        if (true === options.base64) {
            mediatype += ";base64";
            data = obj.data.toString("base64");
        } else {
            try {
                data = pct_encode(iconv.decode(obj.data, charset), charset);
            } catch (err) {
                return callback(err);
            }
        }

        return callback(null, "data:" + mediatype + "," + data);
    },
};
