"use strict";
/* jshint -W030 */
/* global describe:true */
/* global context:true */
/* global it:true */

var util = require("util");

var chai   = require("chai");
var expect = chai.expect;

var moddataurl = require('../');


describe("node-rfc2397", function () {
    describe("parseSync", function () {
        context("when given a dataurl without data", function () {
            it("should parse it successfully", function () {
                expect(moddataurl.parseSync("data:text/plain,")).to.deep.equal({
                    mime: "text/plain",
                    parameters: {},
                    data: Buffer.from([])
                });
            });
        });
        context("when given RFC 2397 examples", function () {
            it("should parse the 'brief note' example successfully", function () {
                expect(moddataurl.parseSync("data:,A%20brief%20note")).to.deep.equal({
                    mime: "text/plain",
                    parameters: {
                        charset: "US-ASCII",
                    },
                    data: Buffer.from("A brief note", "ascii")
                });
            });
            it("should parse the 'charset parameter' example successfully", function () {
                // note: original RFC text ('%be%fg%be') has been changed for
                // '%be%d3%be' as proposed in errata (ID: 2009) since 'g' is
                // obviously not a hex digit
                // see https://www.rfc-editor.org/errata_search.php?eid=2009
                expect(moddataurl.parseSync("data:text/plain;charset=iso-8859-7,%be%d3%be")).to.deep.equal({
                    mime: "text/plain",
                    parameters: {
                        charset: "iso-8859-7",
                    },
                    data: Buffer.from("bed3be", "hex"),
                });
            });
            it("should parse the 'Larry' example successfully", function () {
                var data = "R0lGODdhMAAwAPAAAAAAAP///ywAAAAAMAAwAAAC8Iy" +
                    "Pqcvt3wCcDkiLc7C0qwyGHhSWpjQu5yqmCYsapyuvUUlvONmOZtfzgFz" +
                    "ByTB10QgxOR0TqBQejhRNzOfkVJ+5YiUqrXF5Y5lKh/DeuNcP5yLWGsE" +
                    "btLiOSpa/TPg7JpJHxyendzWTBfX0cxOnKPjgBzi4diinWGdkF8kjdfn" +
                    "ycQZXZeYGejmJlZeGl9i2icVqaNVailT6F5iJ90m6mvuTS4OK05M0vDk" +
                    "0Q4XUtwvKOzrcd3iq9uisF81M1OIcR7lEewwcLp7tuNNkM3uNna3F2JQ" +
                    "Fo97Vriy/Xl4/f1cf5VWzXyym7PHhhx4dbgYKAAA7";
                var larry = "data:image/gif;base64," + data;
                expect(moddataurl.parseSync(larry)).to.deep.equal({
                    mime: 'image/gif',
                    parameters: {},
                    base64: true,
                    data: Buffer.from(data, "base64"),
                });
            });
            it("should parse the 'application/vnd-xxx-query' example successfully", function () {
                // note: original RFC text (select_vcount,fcol_from_fieldtable/local)
                // has been changed because it is not correctly percent encoded
                var data = "select_vcount%2cfcol_from_fieldtable%2flocal";
                var vnd = "data:application/vnd-xxx-query," + data;
                expect(moddataurl.parseSync(vnd)).to.deep.equal({
                    mime: 'application/vnd-xxx-query',
                    parameters: {},
                    data: Buffer.from("select_vcount,fcol_from_fieldtable/local", "ascii"),
                });
            });
        });
        describe("type/subtype and charset", function () {
            context("when given a minimal dataurl without charset and without type/subtype", function () {
                it("should parse it successfully and default to text/plain;charset=US-ASCII", function () {
                    expect(moddataurl.parseSync("data:,")).to.deep.equal({
                        mime: "text/plain",
                        parameters: {
                            charset: "US-ASCII",
                        },
                        data: Buffer.from([])
                    });
                });
            });
            context("when given a dataurl with charset but no type/subtype", function () {
                it("should parse it successfully and default to text/plain", function () {
                    expect(moddataurl.parseSync("data:;charset=utf-8,")).to.deep.equal({
                        mime: "text/plain",
                        parameters: {
                            charset: "utf-8",
                        },
                        data: Buffer.from([])
                    });
                });
            });
            context("when given a dataurl with type/subtype and charset specified", function () {
                it("should parse it successfully", function () {
                    expect(moddataurl.parseSync("data:text/plain;charset=ISO-8859-1,")).to.deep.equal({
                        mime: "text/plain",
                        parameters: {
                            charset: "ISO-8859-1",
                        },
                        data: Buffer.from([])
                    });
                });
            });
        });
        describe("parameters", function () {
            context("when given a dataurl with several parameters", function () {
                it("should parse it successfully", function () {
                    expect(moddataurl.parseSync("data:text/plain;charset=cp866;foo=bar;answer=42,")).to.deep.equal({
                        mime: "text/plain",
                        parameters: {
                            charset: "cp866",
                            foo: "bar",
                            answer: "42",
                        },
                        data: Buffer.from([])
                    });
                });
            });
            context("when given an URL encoded key parameter", function () {
                it("should parse it successfully", function () {
                    expect(moddataurl.parseSync("data:text/plain;A%20brief%20note=hello,")).to.deep.equal({
                        mime: "text/plain",
                        parameters: {
                            "A brief note": "hello"
                        },
                        data: Buffer.from([])
                    });
                });
            });
            context("when given 'base64' as key parameter", function () {
                it("should parse it successfully", function () {
                    expect(moddataurl.parseSync("data:text/plain;base64=foo,")).to.deep.equal({
                        mime: "text/plain",
                        parameters: {
                            base64: "foo",
                        },
                        data: Buffer.from([])
                    });
                });
            });
            context("when given duplicate parameter keys", function () {
                it("should throw a duplicate parameter keys error", function () {
                    expect(moddataurl.parseSync("data:text/plain;foo=bar;foo=nope,")).to.deep.equal({
                        mime: "text/plain",
                        parameters: {
                            foo: "bar",
                        },
                        data: Buffer.from([])
                    });
                });
            });
            context("when given an URL encoded value parameter", function () {
                it("should parse it successfully", function () {
                    expect(moddataurl.parseSync("data:text/plain;hello=A%20brief%20note,")).to.deep.equal({
                        mime: "text/plain",
                        parameters: {
                            hello: "A brief note",
                        },
                        data: Buffer.from([])
                    });
                });
            });
        });
        describe("base64 encoding", function () {
            context("when given a dataurl with base64 encoded text with type/subtype specified", function () {
                it("should parse it successfully", function () {
                    expect(moddataurl.parseSync("data:text/plain;base64,SGVsbG8gV29ybGQ=")).to.deep.equal({
                        mime: "text/plain",
                        parameters: {},
                        base64: true,
                        data: Buffer.from("Hello World"),
                    });
                });
            });
            context("when given a minimal dataurl with a base64 encoded image", function () {
                it("should parse it successfully", function () {
                    var data = "R0lGODlhAQABAIABAP///wAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";
                    expect(moddataurl.parseSync("data:image/gif;base64," + data)).to.deep.equal({
                        mime: "image/gif",
                        parameters: {},
                        base64: true,
                        data: Buffer.from(data, "base64"),
                    });
                });
            });
        });
        context("when given an invalid dataurl", function () {
            context("when the dataurl is malformed", function () {
                it("should yield a 'malformed dataurl' error", function () {
                    expect(function () {
                        moddataurl.parseSync("I am NOT a dataurl");
                    }).to.throw(Error, "malformed dataurl");
                });
            });
            context("when the dataurl has an invalid parameter", function () {
                it("should yield a 'invalid dataurl parameter' error", function () {
                    expect(function () {
                        moddataurl.parseSync("data:;this=is=invalid,A%20brief%20note");
                    }).to.throw(Error, "invalid dataurl parameter");
                });
            });
            context("when the data is badly URL encoded", function () {
                it("should yield a 'malformed data' error", function () {
                    expect(function () {
                        moddataurl.parseSync("data:,%fgabc");
                    }).to.throw(Error, "malformed data");
                });
            });
            context("when the data is badly base64 encoded", function () {
                it("should yield a 'malformed data' error", function () {
                    expect(function () {
                        moddataurl.parseSync("data:;base64,bad-base64-data");
                    }).to.throw(Error, "malformed data");
                });
            });
        });
    });
    describe("parse", function () {
        context("when given a RFC2397 compliant dataurl", function () {
            it("should provide the resulting info object via the callback function", function (done) {
                moddataurl.parse("data:text/plain,", function (err, info) {
                    if (err)
                        return done(err);
                    expect(info).to.deep.equal({
                        mime: "text/plain",
                        parameters: {},
                        data: Buffer.from([])
                    });
                    return done();
                });
            });
        });
        context("when given an invalid dataurl", function () {
            it("should callback an error", function (done) {
                moddataurl.parse("Luke, I am your father!", function (err, info) {
                    expect(err).to.be.an.instanceof(Error);
                    return done();
                });
            });
        });
    });
    describe("composeSync", function () {
        context("when given RFC 2397 examples", function () {
            it("should compose the 'brief note' example successfully", function () {
                var info = {
                    data: Buffer.from("A brief note", "ascii")
                };
                expect(moddataurl.composeSync(info)).to.equal("data:,A%20brief%20note");
            });
            it("should compose the 'charset parameter' example successfully", function () {
                var info =  {
                    mime: "text/plain",
                    parameters: {
                        charset: "iso-8859-7",
                    },
                    data: Buffer.from("bed3be", "hex"),
                };
                expect(moddataurl.composeSync(info)).to.equal("data:text/plain;charset=iso-8859-7,%be%d3%be");
            });
            it("should compose the 'Larry' example successfully", function () {
                var data = "R0lGODdhMAAwAPAAAAAAAP///ywAAAAAMAAwAAAC8Iy" +
                "Pqcvt3wCcDkiLc7C0qwyGHhSWpjQu5yqmCYsapyuvUUlvONmOZtfzgFz" +
                    "ByTB10QgxOR0TqBQejhRNzOfkVJ+5YiUqrXF5Y5lKh/DeuNcP5yLWGsE" +
                    "btLiOSpa/TPg7JpJHxyendzWTBfX0cxOnKPjgBzi4diinWGdkF8kjdfn" +
                    "ycQZXZeYGejmJlZeGl9i2icVqaNVailT6F5iJ90m6mvuTS4OK05M0vDk" +
                    "0Q4XUtwvKOzrcd3iq9uisF81M1OIcR7lEewwcLp7tuNNkM3uNna3F2JQ" +
                    "Fo97Vriy/Xl4/f1cf5VWzXyym7PHhhx4dbgYKAAA7";
                var larry = "data:image/gif;base64," + data;
                var info = {
                    mime: 'image/gif',
                    parameters: {},
                    base64: true,
                    data: Buffer.from(data, "base64"),
                };
                expect(moddataurl.composeSync(info)).to.equal(larry);
            });
            it("should compose the 'application/vnd-xxx-query' example successfully", function () {
                var data = "select_vcount%2cfcol_from_fieldtable%2flocal";
                var vnd = "data:application/vnd-xxx-query," + data;
                var info = {
                    mime: 'application/vnd-xxx-query',
                    parameters: {},
                    data: Buffer.from("select_vcount,fcol_from_fieldtable/local", "ascii"),
                };
                expect(moddataurl.composeSync(info)).to.equal(vnd);
            });
        });
        describe("type/subtype and charset", function () {
            context("when given an object with type/subtype specified", function () {
                it("should compose it successfully", function () {
                    var info = {
                        mime: "text/plain",
                        data: Buffer.from([])
                    };
                    expect(moddataurl.composeSync(info)).to.equal("data:text/plain,");
                });
            });
            context("when given an object with both type/subtype and charset specified", function () {
                it("should compose it successfully", function () {
                    var info = {
                        mime: "text/plain",
                        parameters: {
                            charset: "ISO-8859-1",
                        },
                        data: Buffer.from([])
                    };
                    expect(moddataurl.composeSync(info)).to.equal("data:text/plain;charset=ISO-8859-1,");
                });
            });
            context("when data is 0x0", function () {
                it("should compose it successfully as %00 in URL encoding", function () {
                    var info = {
                        data: Buffer.from([0x00]),
                    };
                    expect(moddataurl.composeSync(info)).to.equal("data:,%00");
                });
            });
        });
        describe("parameters", function () {
            context("when given an object with several parameters", function () {
                it("should compose it successfully", function () {
                    var info = {
                        mime: "text/plain",
                        parameters: {
                            charset: "cp866",
                            foo: "bar",
                            answer: "42",
                        },
                        data: Buffer.from([0xe1, 0xab, 0xae, 0xa2, 0xae]),
                    };
                    // FIXME: we could fail this test because the order is
                    // not guaranteed here.
                    expect(moddataurl.composeSync(info)).to.equal("data:text/plain;charset=cp866;foo=bar;answer=42,%e1%ab%ae%a2%ae");
                });
            });
            context("when given an URL encoded key parameter", function () {
                it("should compose it successfully", function () {
                    var info = {
                        parameters: {
                            "A brief note": "hello",
                        },
                        data: Buffer.from([])
                    };
                    expect(moddataurl.composeSync(info)).to.equal("data:;A%20brief%20note=hello,");
                });
            });
            context("when given an URL encoded value parameter", function () {
                it("should compose it successfully", function () {
                    var info = {
                        parameters: {
                            hello: "A brief note",
                        },
                        data: Buffer.from([])
                    };
                    expect(moddataurl.composeSync(info)).to.equal("data:;hello=A%20brief%20note,");
                });
            });

        });
        describe("base64 encoding", function () {
            context("when given an object with text to encode to base64", function () {
                it("should compose it successfully", function () {
                    var info = {
                        base64: true,
                        data: Buffer.from("A brief note"),
                    };
                    expect(moddataurl.composeSync(info)).to.equal("data:;base64,QSBicmllZiBub3Rl");
                });
            });
            context("when given an object with a base64 encoded image", function () {
                it("should compose it successfully", function () {
                    var data = "R0lGODlhAQABAIABAP///wAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";
                    var info = {
                        mime: "image/gif",
                        base64: true,
                        data: Buffer.from(data, "base64"),
                    };
                    expect(moddataurl.composeSync(info)).to.equal("data:image/gif;base64," + data);
                });
            });
        });
        context("when data is invalid", function () {
            context("when the given data is not a Buffer", function () {
                it("should callback an 'unexpected type for info.data' error", function () {
                    var info = {
                        data: new Date(),
                    };
                    expect(function () {
                        moddataurl.composeSync(info);
                    }).to.throw(Error, "expected info.data to be a Buffer");
                });
            });
        });
    });
    describe("compose", function () {
        context("when given a valid object", function () {
            it("should provide the resulting dataurl via the callback function", function (done) {
                var info = {
                    mime: "text/plain",
                    parameters: {},
                    data: Buffer.from([])
                };
                moddataurl.compose(info, function (err, dataurl) {
                    if (err)
                        return done(err);
                    expect(dataurl).to.equal("data:text/plain,");
                    return done();
                });
            });
        });
        context("when given an object with invalid data", function () {
            it("should callback an error", function (done) {
                var info = {
                    data: new Date(),
                };
                moddataurl.compose(info, function (err, dataurl) {
                    expect(err).to.be.an.instanceof(Error);
                    return done();
                });
            });
        });
    });
});
