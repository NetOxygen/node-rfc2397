/*
 * some Regular Expressions for URL encoding.
 *
 * see https://tools.ietf.org/html/rfc3986#appendix-A
 */
"use strict";

/*
 * unreserved  = ALPHA / DIGIT / "-" / "." / "_" / "~"
 */
module.exports.unreserved = /[A-Za-z0-9\-\._~]/;

/*
 *  escaped     = pct-encoded
 *  pct-encoded = "%" HEXDIG HEXDIG
 */
module.exports.escaped = /%[A-Fa-f0-9]{2}/;
