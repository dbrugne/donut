var _ = require('underscore');
var through = require('through');
var filenamePattern = /translation\.json/;
var localePattern = /\/([a-z]+)\/translation\.json/;

var wrap = function (template, locale) {
  return 'module.exports = {"' + locale + '":{"translation":' + template + '}}';
};

function compiler (text) {
  var locales = JSON.parse(text);
  locales = _.omit(locales, ['404', 'title', 'meta', 'email']);
  return JSON.stringify(locales);
}

module.exports = function (file, b) {
  if (!filenamePattern.test(file)) {
    return through();
  }
  var input = '';
  var write = function (buffer) {
    input += buffer;
  };
  var end = function () {
    var matches = file.match(localePattern);
    this.queue(wrap(compiler(input), matches[1]));
    this.queue(null);
  };
  return through(write, end);
};