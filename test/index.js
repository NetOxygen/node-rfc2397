"use strict";
/* jshint -W030 */
/* global describe:true */
/* global context:true */
/* global it:true */

var chai   = require("chai");
var expect = chai.expect;
var iconv  = require('iconv-lite');

var rfc2397 = require('../');

describe("node-rfc2397", function () {
    describe("parse", function () {
        context("when given RFC 2397 examples", function () {
            it("should parse the 'brief note' example successfully", function (done) {
                rfc2397.parse("data:,A%20brief%20note", function (err, obj) {
                    expect(err).to.not.exist;
                    expect(obj).to.deep.equal({
                        mime: "text/plain",
                        parameters: {
                            charset: "US-ASCII",
                        },
                        data: new Buffer("A brief note", "ascii")
                    });
                    return done();
                });
            });
            it("should parse the 'charset parameter' example successfully", function (done) {
                // note: original RFC text ('%be%fg%be') has been changed for
                // '%be%d3%be' as proposed in errata (ID: 2009) since 'g' is
                // obviously not a hex digit
                // see https://www.rfc-editor.org/errata_search.php?eid=2009
                rfc2397.parse("data:text/plain;charset=iso-8859-7,%be%d3%be", function (err, obj) {
                    expect(err).to.not.exist;
                    expect(obj).to.deep.equal({
                        mime: "text/plain",
                        parameters: {
                            charset: "iso-8859-7",
                        },
                        data: new Buffer("bed3be", "hex"),
                    });
                    return done();
                });
            });
            it("should parse the 'Larry' example successfully", function (done) {
                var data = "R0lGODdhMAAwAPAAAAAAAP///ywAAAAAMAAwAAAC8Iy" +
                "Pqcvt3wCcDkiLc7C0qwyGHhSWpjQu5yqmCYsapyuvUUlvONmOZtfzgFz" +
                    "ByTB10QgxOR0TqBQejhRNzOfkVJ+5YiUqrXF5Y5lKh/DeuNcP5yLWGsE" +
                    "btLiOSpa/TPg7JpJHxyendzWTBfX0cxOnKPjgBzi4diinWGdkF8kjdfn" +
                    "ycQZXZeYGejmJlZeGl9i2icVqaNVailT6F5iJ90m6mvuTS4OK05M0vDk" +
                    "0Q4XUtwvKOzrcd3iq9uisF81M1OIcR7lEewwcLp7tuNNkM3uNna3F2JQ" +
                    "Fo97Vriy/Xl4/f1cf5VWzXyym7PHhhx4dbgYKAAA7";
                var larry = "data:image/gif;base64," + data;
                rfc2397.parse(larry, function (err, obj) {
                    expect(err).to.not.exist;
                    expect(obj).to.deep.equal({
                        mime: 'image/gif',
                        parameters: {},
                        data: new Buffer(data, "base64"),
                    });
                    return done();
                });
            });
            it("should parse the 'application/vnd-xxx-query' example successfully", function (done) {
                // note: original RFC text (select_vcount,fcol_from_fieldtable/local)
                // has been changed because it is not correctly percent encoded
                var data = "select_vcount%2cfcol_from_fieldtable%2flocal";
                var vnd = "data:application/vnd-xxx-query," + data;
                rfc2397.parse(vnd, function (err, obj) {
                    expect(err).to.not.exist;
                    expect(obj).to.deep.equal({
                        mime: 'application/vnd-xxx-query',
                        parameters: {},
                        data: new Buffer("select_vcount,fcol_from_fieldtable/local", "ascii"),
                    });
                    return done();
                });
            });
        });
        context("when given a dataurl with several parameters", function () {
            it("should parse it successfully", function (done) {
                rfc2397.parse("data:text/plain;charset=cp866;foo=bar;answer=42,%e1%AB%ae%A2%ae", function (err, obj) {
                    expect(err).to.not.exist;
                    expect(obj).to.deep.equal({
                        mime: "text/plain",
                        parameters: {
                            charset: "cp866",
                            foo: "bar",
                            answer: "42",
                        },
                        data: new Buffer([0xe1, 0xab, 0xae, 0xa2, 0xae]),
                    });
                    return done();
                });
            });
        });
        context("when given a dataurl with base64 encoded text with mime specified", function () {
            it("should parse it successfully", function (done) {
                rfc2397.parse("data:text/plain;base64,SGVsbG8gV29ybGQ=", function (err, obj) {
                    expect(err).to.not.exist;
                    expect(obj).to.deep.equal({
                        mime: "text/plain",
                        parameters: { },
                        data: new Buffer("Hello World"),
                    });
                    return done();
                });
            });
        });
        context("when given a dataurl with base64 encoded text with mime and charset specified", function () {
            it("should parse it successfully", function (done) {
                var data = "QXMtdHUgZOlq4CBmYWl0IGNlcyBy6nZlcyBO6W8sIHF1aSBz" +
                    "ZW1ibGVudCBwbHVzIHZyYWlzIHF1ZSBsYSBy6WFsaXTpID8K";
                rfc2397.parse("data:text/plain;charset=ISO-8859-1;base64," + data, function (err, obj) {
                    expect(err).to.not.exist;
                    expect(obj).to.deep.equal({
                        mime: "text/plain",
                        parameters: {
                            charset: "ISO-8859-1",
                        },
                        data: new Buffer(data, "base64"),
                    });
                    return done();
                });
            });
        });
        context("when given a minimal dataurl with base64 encoded text", function () {
            it("should parse it successfully", function (done) {
                rfc2397.parse("data:;base64,QSBicmllZiBub3Rl", function (err, obj) {
                    expect(err).to.not.exist;
                    expect(obj).to.deep.equal({
                        mime: "text/plain",
                        parameters: {
                            charset: "US-ASCII",
                        },
                        data: new Buffer("A brief note"),
                    });
                    return done();
                });
            });
        });
        context("when given a minimal dataurl with a base64 encoded image", function () {
            it("should parse it successfully", function (done) {
                var data = "R0lGODlhAQABAIABAP///wAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";
                rfc2397.parse("data:image/gif;base64," + data, function (err, obj) {
                    expect(err).to.not.exist;
                    expect(obj).to.deep.equal({
                        mime: "image/gif",
                        parameters: {},
                        data: new Buffer(data, "base64"),
                    });
                    return done();
                });
            });
        });
        context("when given dataurl is invalid", function () {
            it("should callback a 'malformed dataurl' error", function (done) {
                rfc2397.parse("I am NOT a dataurl", function (err, dataurl) {
                    expect(err).to.be.an.instanceof(Error);
                    expect(err.message).to.equal("malformed dataurl");
                    return done();
                });
            });
        });
        context("when given a dataurl with bad data", function () {
            it("should callback a 'malformed data' error", function (done) {
                rfc2397.parse("data:,%fgabc", function (err, dataurl) {
                    expect(err).to.be.an.instanceof(Error);
                    expect(err.message).to.equal("malformed data");
                    return done();
                });
            });
        });
    });
    describe("compose", function () {
        context("when given RFC 2397 examples", function () {
            it("should compose the 'brief note' example successfully", function (done) {
                var obj = {
                    data: new Buffer("A brief note", "ascii")
                };
                rfc2397.compose(obj, function (err, dataurl) {
                    expect(err).to.not.exist;
                    expect(dataurl).to.equal("data:,A%20brief%20note");
                    return done();
                });
            });
            it("should compose the 'charset parameter' example successfully", function (done) {
                var obj =  {
                    mime: "text/plain",
                    parameters: {
                        charset: "iso-8859-7",
                    },
                    data: new Buffer("bed3be", "hex"),
                };
                rfc2397.compose(obj, function (err, dataurl) {
                    expect(err).to.not.exist;
                    expect(dataurl).to.equal("data:text/plain;charset=iso-8859-7,%be%d3%be");
                    return done();
                });
            });
            it("should compose the 'Larry' example successfully", function (done) {
                var data = "R0lGODdhMAAwAPAAAAAAAP///ywAAAAAMAAwAAAC8Iy" +
                "Pqcvt3wCcDkiLc7C0qwyGHhSWpjQu5yqmCYsapyuvUUlvONmOZtfzgFz" +
                    "ByTB10QgxOR0TqBQejhRNzOfkVJ+5YiUqrXF5Y5lKh/DeuNcP5yLWGsE" +
                    "btLiOSpa/TPg7JpJHxyendzWTBfX0cxOnKPjgBzi4diinWGdkF8kjdfn" +
                    "ycQZXZeYGejmJlZeGl9i2icVqaNVailT6F5iJ90m6mvuTS4OK05M0vDk" +
                    "0Q4XUtwvKOzrcd3iq9uisF81M1OIcR7lEewwcLp7tuNNkM3uNna3F2JQ" +
                    "Fo97Vriy/Xl4/f1cf5VWzXyym7PHhhx4dbgYKAAA7";
                var larry = "data:image/gif;base64," + data;
                var obj = {
                    mime: 'image/gif',
                    parameters: {},
                    data: new Buffer(data, "base64"),
                };
                rfc2397.compose(obj, { base64: true }, function (err, dataurl) {
                    expect(err).to.not.exist;
                    expect(dataurl).to.equal(larry);
                    return done();
                });
            });
            it("should compose the 'application/vnd-xxx-query' example successfully", function (done) {
                var data = "select_vcount%2cfcol_from_fieldtable%2flocal";
                var vnd = "data:application/vnd-xxx-query," + data;
                var obj = {
                    mime: 'application/vnd-xxx-query',
                    parameters: {},
                    data: new Buffer("select_vcount,fcol_from_fieldtable/local", "ascii"),
                };
                rfc2397.compose(obj, function (err, dataurl) {
                    expect(err).to.not.exist;
                    expect(dataurl).to.equal(vnd);
                    return done();
                });
            });
        });
        context("when given an object with several parameters", function () {
            it("should compose it successfully", function (done) {
                var obj = {
                    mime: "text/plain",
                    parameters: {
                        charset: "cp866",
                        foo: "bar",
                        answer: "42",
                    },
                    data: new Buffer([0xe1, 0xab, 0xae, 0xa2, 0xae]),
                };
                rfc2397.compose(obj, function (err, dataurl) {
                    expect(err).to.not.exist;
                    expect(dataurl).to.equal("data:text/plain;charset=cp866;foo=bar;answer=42,%e1%ab%ae%a2%ae");
                    return done();
                });
            });
        });
        context("when given an object with text to encode to base64", function () {
            it("should compose it successfully", function (done) {
                var obj = {
                    data: new Buffer("A brief note"),
                };
                rfc2397.compose(obj, { base64: true }, function (err, dataurl) {
                    expect(err).to.not.exist;
                    expect(dataurl).to.equal("data:;base64,QSBicmllZiBub3Rl");
                    return done();
                });
            });
        });
        context("when given an object with text to encode to base64 and mime is specified", function () {
            it("should compose it successfully", function (done) {
                var obj = {
                    mime: "text/plain",
                    data: new Buffer("Hello World"),
                };
                rfc2397.compose(obj, { base64: true }, function (err, dataurl) {
                    expect(err).to.not.exist;
                    expect(dataurl).to.equal("data:text/plain;base64,SGVsbG8gV29ybGQ=");
                    return done();
                });
            });
        });
        context("when given an object with text to encode to base64 and mime and charset are specified", function () {
            it("should compose it successfully", function (done) {
                var data = "QXMtdHUgZOlq4CBmYWl0IGNlcyBy6nZlcyBO6W8sIHF1aSBz" +
                    "ZW1ibGVudCBwbHVzIHZyYWlzIHF1ZSBsYSBy6WFsaXTpID8K";
                var obj = {
                    mime: "text/plain",
                    parameters: {
                        charset: "ISO-8859-1",
                    },
                    data: new Buffer(data, "base64"),
                };
                rfc2397.compose(obj, { base64: true }, function (err, dataurl) {
                    expect(err).to.not.exist;
                    expect(dataurl).to.equal("data:text/plain;charset=ISO-8859-1;base64," + data);
                    return done();
                });
            });
        });
        context("when given an object with a base64 encoded image", function () {
            it("should compose it successfully", function (done) {
                var data = "R0lGODlhAQABAIABAP///wAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";
                var obj = {
                    mime: "image/gif",
                    data: new Buffer(data, "base64"),
                };
                rfc2397.compose(obj, { base64: true }, function (err, dataurl) {
                    expect(err).to.not.exist;
                    expect(dataurl).to.equal("data:image/gif;base64," + data);
                    return done();
                });
            });
        });
        context("when the given charset encoding does not exist", function () {
            it("should callback an 'unsupported charset' error", function (done) {
                var obj = {
                    mime: "text/plain",
                    parameters: {
                        charset: "klingon",
                    },
                    data: new Buffer("Heghlu'meH QaQ jajvam!"),
                };
                rfc2397.compose(obj, function (err, dataurl) {
                    expect(err).to.be.an.instanceof(Error);
                    expect(err.message).to.equal("unsupported charset (klingon)");
                    return done();
                });
            });
        });
        context("when the given data is not a Buffer", function () {
            it("should callback an 'unexpected type for obj.data' error", function (done) {
                var obj = {
                    data: new Date(),
                };
                rfc2397.compose(obj, function (err, dataurl) {
                    expect(err).to.be.an.instanceof(Error);
                    expect(err.message).to.equal("unexpected type for obj.data (did you provide a Buffer?)");
                    return done();
                });
            });
        });
    });
});
