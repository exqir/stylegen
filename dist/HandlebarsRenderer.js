"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Handlebars = require('handlebars');
var path = require('path');
var btoa = require('btoa');
var atob = require('atob');
Handlebars.registerHelper("pp", function (object) {
    return new Handlebars.SafeString(JSON.stringify(object));
});
Handlebars.registerHelper("eq", function (a, b) {
    return a === b;
});
Handlebars.registerHelper("rellink", function (link, options) {
    try {
        if (options.data.root.pagecwd) {
            return path.relative(options.data.root.pagecwd, path.resolve(options.data.root.pageroot, link));
        } else {
            return link;
        }
    } catch (e) {
        console.log(e);
        return link;
    }
});
/**
 * Build in renderer, that is taken as default if no external is given.
 */

var HandlebarsRenderer = function () {
    function HandlebarsRenderer(options) {
        var _this = this;

        _classCallCheck(this, HandlebarsRenderer);

        this.options = options;
        this.engine = Handlebars;
        if (!!options && !!options.partialLibs) {
            this.partialLibs = options.partialLibs;
            this.partialLibs.forEach(function (lib) {
                return lib.partials(_this.engine, atob);
            });
        }
    }

    _createClass(HandlebarsRenderer, [{
        key: 'render',
        value: function render(component) {
            // NOTHING TO DO HERE?!
            return component;
        }
    }, {
        key: 'registerablePartial',
        value: function registerablePartial(name, content) {
            return 'engine.registerPartial("' + name + '", engine.compile(atob(\'' + btoa(content.trim()) + '\')));';
        }
    }]);

    return HandlebarsRenderer;
}();

exports.HandlebarsRenderer = HandlebarsRenderer;