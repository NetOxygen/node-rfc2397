"use strict";
/* jshint -W030 */
/* global describe:true */
/* global context:true */
/* global it:true */

var util = require("util");

var chai   = require("chai");
var expect = chai.expect;

var rfc2397 = require('../');


describe("node-rfc2397", function () {
    describe("parse", function () {
        context("when given a dataurl without data", function () {
            it("should parse it successfully", function (done) {
                rfc2397.parse("data:text/plain,", function (err, obj) {
                    if (err)
                        return done(err);
                    expect(obj).to.deep.equal({
                        mime: "text/plain",
                        parameters: {},
                        data: new Buffer([])
                    });
                    return done();
                });
            });
        });
        context("when given RFC 2397 examples", function () {
            it("should parse the 'brief note' example successfully", function (done) {
                rfc2397.parse("data:,A%20brief%20note", function (err, obj) {
                    if (err)
                        return done(err);
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
                    if (err)
                        return done(err);
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
                    if (err)
                        return done(err);
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
                    if (err)
                        return done(err);
                    expect(obj).to.deep.equal({
                        mime: 'application/vnd-xxx-query',
                        parameters: {},
                        data: new Buffer("select_vcount,fcol_from_fieldtable/local", "ascii"),
                    });
                    return done();
                });
            });
        });
        describe("type/subtype and charset", function () {
            context("when given a minimal dataurl without charset and without type/subtype", function () {
                it("should parse it successfully and default to text/plain;charset=US-ASCII", function (done) {
                    rfc2397.parse("data:,", function (err, obj) {
                        if (err)
                            return done(err);
                        expect(obj).to.deep.equal({
                            mime: "text/plain",
                            parameters: {
                                charset: "US-ASCII",
                            },
                            data: new Buffer([])
                        });
                        return done();
                    });
                });
            });
            context("when given a dataurl with charset but no type/subtype", function () {
                it("should parse it successfully and default to text/plain", function (done) {
                    rfc2397.parse("data:;charset=utf-8,", function (err, obj) {
                        if (err)
                            return done(err);
                        expect(obj).to.deep.equal({
                            mime: "text/plain",
                            parameters: {
                                charset: "utf-8",
                            },
                            data: new Buffer([])
                        });
                        return done();
                    });
                });
            });
            context("when given a dataurl with type/subtype and charset specified", function () {
                it("should parse it successfully", function (done) {
                    rfc2397.parse("data:text/plain;charset=ISO-8859-1,", function (err, obj) {
                        if (err)
                            return done(err);
                        expect(obj).to.deep.equal({
                            mime: "text/plain",
                            parameters: {
                                charset: "ISO-8859-1",
                            },
                            data: new Buffer([])
                        });
                        return done();
                    });
                });
            });
        });
        describe("parameters", function () {
            context("when given a dataurl with several parameters", function () {
                it("should parse it successfully", function (done) {
                    rfc2397.parse("data:text/plain;charset=cp866;foo=bar;answer=42,", function (err, obj) {
                        if (err)
                            return done(err);
                        expect(obj).to.deep.equal({
                            mime: "text/plain",
                            parameters: {
                                charset: "cp866",
                                foo: "bar",
                                answer: "42",
                            },
                            data: new Buffer([])
                        });
                        return done();
                    });
                });
            });
            context("when given an URL encoded key parameter", function () {
                it("should parse it successfully", function (done) {
                    rfc2397.parse("data:text/plain;A%20brief%20note=hello,", function (err, obj) {
                        if (err)
                            return done(err);
                        expect(obj).to.deep.equal({
                            mime: "text/plain",
                            parameters: {
                                "A brief note": "hello"
                            },
                            data: new Buffer([])
                        });
                        return done();
                    });
                });
            });
            context("when given an URL encoded value parameter", function () {
                it("should parse it successfully", function (done) {
                    rfc2397.parse("data:text/plain;hello=A%20brief%20note,", function (err, obj) {
                        if (err)
                            return done(err);
                        expect(obj).to.deep.equal({
                            mime: "text/plain",
                            parameters: {
                                hello: "A brief note",
                            },
                            data: new Buffer([])
                        });
                        return done();
                    });
                });
            });
        });
        describe("base64 encoding", function () {
            context("when given a dataurl with base64 encoded text with type/subtype specified", function () {
                it("should parse it successfully", function (done) {
                    rfc2397.parse("data:text/plain;base64,SGVsbG8gV29ybGQ=", function (err, obj) {
                        if (err)
                            return done(err);
                        expect(obj).to.deep.equal({
                            mime: "text/plain",
                            parameters: {},
                            data: new Buffer("Hello World"),
                        });
                        return done();
                    });
                });
            });
            context("when given a minimal dataurl with a base64 encoded image", function () {
                it("should parse it successfully", function (done) {
                    var data = "R0lGODlhAQABAIABAP///wAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";
                    rfc2397.parse("data:image/gif;base64," + data, function (err, obj) {
                        if (err)
                            return done(err);
                        expect(obj).to.deep.equal({
                            mime: "image/gif",
                            parameters: {},
                            data: new Buffer(data, "base64"),
                        });
                        return done();
                    });
                });
            });
        });
        context("when given an invalid dataurl", function () {
            context("when the dataurl is malformed", function () {
                it("should yield a 'malformed dataurl' error", function (done) {
                    rfc2397.parse("I am NOT a dataurl", function (err, dataurl) {
                        expect(err).to.be.an.instanceof(Error);
                        expect(err.message).to.equal("malformed dataurl");
                        return done();
                    });
                });
            });
            context("when the dataurl has an invalid parameter", function () {
                it("should yield a 'invalid dataurl parameter' error", function (done) {
                    rfc2397.parse("data:;this=is=invalid,A%20brief%20note", function (err, dataurl) {
                        expect(err).to.be.an.instanceof(Error);
                        expect(err.message).to.equal("invalid dataurl parameter");
                        return done();
                    });
                });
            });
            context("when the data is badly URL encoded", function () {
                it("should yield a 'malformed data' error", function (done) {
                    rfc2397.parse("data:,%fgabc", function (err, dataurl) {
                        expect(err).to.be.an.instanceof(Error);
                        expect(err.message).to.equal("malformed data");
                        return done();
                    });
                });
            });
            context("when the data is badly base64 encoded", function () {
                it("should yield a 'malformed data' error", function (done) {
                    rfc2397.parse("data:;base64,bad-base64-data", function (err, dataurl) {
                        expect(err).to.be.an.instanceof(Error);
                        expect(err.message).to.equal("malformed data");
                        return done();
                    });
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
                    if (err)
                        return done(err);
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
                    if (err)
                        return done(err);
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
                    if (err)
                        return done(err);
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
                    if (err)
                        return done(err);
                    expect(dataurl).to.equal(vnd);
                    return done();
                });
            });
        });
        describe("type/subtype and charset", function () {
            context("when given an object with type/subtype specified", function () {
                it("should compose it successfully", function (done) {
                    var obj = {
                        mime: "text/plain",
                        data: new Buffer([])
                    };
                    rfc2397.compose(obj, function (err, dataurl) {
                        if (err)
                            return done(err);
                        expect(dataurl).to.equal("data:text/plain,");
                        return done();
                    });
                });
            });
            context("when given an object with both type/subtype and charset specified", function () {
                it("should compose it successfully", function (done) {
                    var obj = {
                        mime: "text/plain",
                        parameters: {
                            charset: "ISO-8859-1",
                        },
                        data: new Buffer([])
                    };
                    rfc2397.compose(obj, function (err, dataurl) {
                        if (err)
                            return done(err);
                        expect(dataurl).to.equal("data:text/plain;charset=ISO-8859-1,");
                        return done();
                    });
                });
            });
        });
        describe("parameters", function () {
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
                        if (err)
                            return done(err);
                        // FIXME: we could fail this test because the order is
                        // not guaranteed here.
                        expect(dataurl).to.equal("data:text/plain;charset=cp866;foo=bar;answer=42,%e1%ab%ae%a2%ae");
                        return done();
                    });
                });
            });
            context("when given an URL encoded key parameter", function () {
                it("should compose it successfully", function (done) {
                    var obj = {
                        parameters: {
                            "A brief note": "hello",
                        },
                        data: new Buffer([])
                    };
                    rfc2397.compose(obj, function (err, dataurl) {
                        if (err)
                            return done(err);
                        expect(dataurl).to.equal("data:;A%20brief%20note=hello,");
                        return done();
                    });
                });
            });
            context("when given an URL encoded value parameter", function () {
                it("should compose it successfully", function (done) {
                    var obj = {
                        parameters: {
                            hello: "A brief note",
                        },
                        data: new Buffer([])
                    };
                    rfc2397.compose(obj, function (err, dataurl) {
                        if (err)
                            return done(err);
                        expect(dataurl).to.equal("data:;hello=A%20brief%20note,");
                        return done();
                    });
                });
            });
        });
        describe("base64 encoding", function () {
            context("when given an object with text to encode to base64", function () {
                it("should compose it successfully", function (done) {
                    var obj = {
                        data: new Buffer("A brief note"),
                    };
                    rfc2397.compose(obj, { base64: true }, function (err, dataurl) {
                        if (err)
                            return done(err);
                        expect(dataurl).to.equal("data:;base64,QSBicmllZiBub3Rl");
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
                        if (err)
                            return done(err);
                        expect(dataurl).to.equal("data:image/gif;base64," + data);
                        return done();
                    });
                });
            });
        });
        context("when data is invalid", function () {
            context("when the given data is not a Buffer", function () {
                it("should callback an 'unexpected type for obj.data' error", function (done) {
                    var obj = {
                        data: new Date(),
                    };
                    rfc2397.compose(obj, function (err, dataurl) {
                        expect(err).to.be.an.instanceof(TypeError);
                        expect(err.message).to.equal("expected obj to be a Buffer");
                        return done();
                    });
                });
            });
        });
    });
});
