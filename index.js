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
        if (char.match(re.unreserved))
            return str + char;
        else {
            // this byte need to be "%xx hex" encoded
            var hex = byte.toString(16);
            if (hex.length == 1) // e.g. 0x1 would be 1 but we need 01
                hex = "0" + hex;
            return str + "%" + hex;
        }
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
    parseSync: function (dataurl) {
        // capture groups:
        //   (1) [ mediatype ] [ ";base64" ]
        //   (2) data
        var groups = dataurl.match(/^data:(.*?),(.*)$/);
        if (!groups)
            throw new Error("malformed dataurl");

        // index 0 is the full match
        var mediatype = groups[1].split(";"); // capture group (1)
        var data      = groups[2];            // capture group (2)

        var info = {};
        // base64 is a special case and the last element (if present).
        if (mediatype[mediatype.length - 1] === "base64") {
            info.base64 = true;
            mediatype.pop(); // remove "base64" from the mediatype
        }
        // mime (i.e. type/subtype) is the first element.
        info.mime = mediatype.shift();
        // parameters follow
        info.parameters = mediatype.reduce(function (parameters, parameter) {
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

            // Attribute values in [RFC2045] are allowed to be either
            // represented as tokens or as quoted strings.
            value = value.replace(/^"/, "").replace(/"$/, "");

            if (attribute in parameters)
                throw new Error("duplicate parameter key: " + attribute);
            parameters[attribute] = value;
            return parameters;
        }, {});

        var mime_omitted = (info.mime.length === 0);
        if (mime_omitted && Object.keys(info.parameters).length === 0) {
            // If <mediatype> is omitted, it defaults to
            // text/plain;charset=US-ASCII.
            info.mime = 'text/plain';
            info.parameters.charset = "US-ASCII";
        } else if (mime_omitted && "charset" in info.parameters) {
            // As a shorthand, "text/plain" can be omitted but the charset
            // parameter supplied.
            info.mime = 'text/plain';
        }

        info.data = (info.base64 ? base64_decode : pct_decode)(data);

        return info;
    },

    parse: function (dataurl, callback) {
        try {
            return callback(null, this.parseSync(dataurl));
        } catch (err) {
            return callback(err);
        };
    },

    composeSync: function (info) {
        if (!Buffer.isBuffer(info.data))
            throw new TypeError("expected info.data to be a Buffer");

        var mediatype = [];
        mediatype.push(info.mime || "");
        var parameters = info.parameters || {};
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
        if (info.base64) {
            base64 = ";base64";
            encode = base64_encode;
        }
        var data = encode(info.data);

        return "data:" + mediatype.join(";") + base64 + "," + data;
    },

    compose: function (info, callback) {
        try {
            return callback(null, this.composeSync(info));
        } catch (err) {
            return callback(err);
        }
    },
};
