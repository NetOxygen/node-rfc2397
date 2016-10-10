"use strict";

var re = require("./rfc3986-regexp");


/*
 * Decode "%xx hex" encoded strings into a Buffer.
 */
function pct_decode(urlencoded) {
    var correctly_encoded = new RegExp(
        "^(?:" + re.unreserved.source + "|" + re.escaped.source + ")*$"
    );
    var splitter = new RegExp("(" + re.escaped.source + ")");

    if (!urlencoded.match(correctly_encoded))
        throw new Error("malformed data");

    var buffers = urlencoded.split(splitter).map(function (part) {
        if (part.match(re.escaped)) {
            // FIXME: use Buffer.from() for NodeJS 6+
            return new Buffer(/* remove leading `%' */part.slice(1), "hex");
        } else {
            // FIXME: use Buffer.from() for NodeJS 6+
            return new Buffer(part, "ascii");
        }
    });

    return Buffer.concat(buffers);
}


/*
 * Encode argument into a percent encoded string.
 */
function pct_encode(arg) {
    var encoded = new Uint8Array(arg).reduce(function (str, byte) {
        var char = String.fromCharCode(byte);
        if (char.match(re.unreserved)) {
            return str + char;
        } else {
            return str + "%" + byte.toString(16);
        }
    }, "");

    return encoded;
}


/*
 * validate and decode a base64 encoded string into a buffer.
 */
function base64_decode(base64encoded) {
    // see https://stackoverflow.com/questions/475074/regex-to-parse-or-validate-base64-data/475217#475217
    var correctly_encoded = new RegExp(
        "^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$"
    );

    if (!base64encoded.match(correctly_encoded))
        throw new Error("malformed data");

    // FIXME: use Buffer.from() for NodeJS 6+
    return new Buffer(base64encoded, 'base64');
}


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
        var groups = dataurl.match(/^data:(.*?),(.*)$/);
        if (!groups)
            return callback(new Error("malformed dataurl"));

        // index 0 is the full match
        var mediatype = groups[1].split(";"); // capture group (1)
        var data      = groups[2];            // capture group (2)

        // base64 is a special case and the last element (if present).
        var base64 = mediatype[mediatype.length - 1] === "base64" && mediatype.pop();
        // mime (i.e. type/subtype) is the first element.
        var mime = mediatype.shift();
        // parameters follow
        var parameters;
        try {
            parameters = mediatype.reduce(function (parameters, parameter) {
                var splitted = parameter.split("=");
                if (splitted.length !== 2)
                    throw new Error("invalid dataurl parameter");
                parameters[splitted[0]] = splitted[1]; // FIXME: pct_decode() both key and value try/catch
                return parameters;
            }, {});
        } catch (err) {
            return callback(err);
        }

        if (mime.length === 0 && Object.keys(parameters).length === 0) {
            // If <mediatype> is omitted, it defaults to
            // text/plain;charset=US-ASCII.
            mime = 'text/plain';
            parameters.charset = "US-ASCII";
        } else if (mime.length === 0 && "charset" in parameters) {
            // As a shorthand, "text/plain" can be omitted but the charset
            // parameter supplied.
            mime = 'text/plain';
        }

        try {
            data = (base64 ? base64_decode : pct_decode)(data);
        } catch (err) {
            return callback(err);
        }

        return callback(null, {
            mime: mime,
            parameters: parameters,
            data: data
        });
    },


    compose: function (obj, options, callback) {
        if ('undefined' === typeof callback) {
            callback = options;
            options = {};
        }

        var mime = obj.mime || "";
        var parameters = obj.parameters || {};
        var parametersString = Object.keys(parameters).reduce(function (params, key) {
            return params + ";" + key + "=" + parameters[key]; //FIXME: pct_encode() key and value
        }, "");
        var mediatype = mime + parametersString;

        if (!Buffer.isBuffer(obj.data))
            return callback(new TypeError("unexpected type for obj.data (did you provide a Buffer?)"));

        var data = "";
        if (true === options.base64) {
            mediatype += ";base64";
            data = obj.data.toString("base64");
        } else {
            try {
                data = pct_encode(obj.data);
            } catch (err) {
                return callback(err);
            }
        }

        return callback(null, "data:" + mediatype + "," + data);
    },
};
