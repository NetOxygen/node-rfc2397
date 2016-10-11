"use strict";

var re = require("./rfc3986-regexp");


/*
 * validate and decode "%xx hex" encoded strings into a Buffer.
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
            return Buffer.from(/* remove leading `%' */part.slice(1), "hex");
        } else {
            return Buffer.from(part, "ascii");
        }
    });

    return Buffer.concat(buffers);
}


/*
 * Encode argument into a percent encoded string.
 */
function pct_encode(arg) {
    // convert arg to an array of bytes and escape every one of them that is
    // "unsafe" (i.e. unreserved).
    var bytes   = Uint8Array.from(Buffer.from(arg));
    var encoded = bytes.reduce(function (str, byte) {
        var char = String.fromCharCode(byte);
        var esc  = char.match(re.unreserved) ? char : "%" + byte.toString(16);
        return str + esc;
    }, "");
    return encoded;
}


/*
 * validate and decode a base64 encoded string into a buffer.
 */
function base64_decode(base64encoded) {
    // we validate "by hand" the base64encoded data, because Buffer.from will
    // "successfully" parse non-base64 data.
    //
    // regexp taken from
    // https://stackoverflow.com/questions/475074/regex-to-parse-or-validate-base64-data/475217#475217
    var correctly_encoded = new RegExp(
        "^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$"
    );

    if (!base64encoded.match(correctly_encoded))
        throw new Error("malformed data");

    return Buffer.from(base64encoded, 'base64');
}


/*
 * Encode argument into a base64 encoded string.
 */
function base64_encode(arg) {
    var buff = Buffer.from(arg);
    return buff.toString("base64");
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
                /*
                 * pct_encode() both attribute and value, see § 3:
                 *
                 * "attribute" and "value" are the corresponding tokens from
                 * [RFC2045], represented using URL escaped encoding of
                 * [RFC2396] as necessary.
                */
                var attribute = pct_decode(splitted[0]).toString();
                var value     = pct_decode(splitted[1]).toString();
                parameters[attribute] = value;
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


    compose: function (infos, options, callback) {
        if ('undefined' === typeof callback) {
            callback = options;
            options = {};
        }

        if (!Buffer.isBuffer(infos.data))
            return callback(new TypeError("expected infos.data to be a Buffer"));

        var mediatype = [];
        mediatype.push(infos.mime || "");
        var parameters = infos.parameters || {};
        Object.keys(parameters).forEach(function (key) {
            /*
             * pct_encode() both attribute and value, see § 3:
             *
             * "attribute" and "value" are the corresponding tokens from
             * [RFC2045], represented using URL escaped encoding of
             * [RFC2396] as necessary.
             */
            var attribute = pct_encode(key);
            var value     = pct_encode(parameters[key]);
            mediatype.push(attribute + "=" + value);
        });

        var base64 = "";
        var encode = pct_encode;
        if (options.encoding === 'base64') {
            base64 = ";base64";
            encode = base64_encode;
        }
        var data = encode(infos.data);

        return callback(null, "data:" + mediatype.join(";") + base64 + "," + data);
    },
};
