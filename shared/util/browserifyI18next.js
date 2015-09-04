var _ = require('underscore');
var through = require('through');
var filenamePattern = /translation\.json/;

var wrap = function (template) {
  return 'module.exports = {"fr":{"translation":' + template + '}}';
};

function compiler (text) {
  var locales = JSON.parse(text);
  locales = _.omit(locales, ['404', 'title', 'meta', 'email']);
  var source = JSON.stringify(locales);
  return source;
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
    this.queue(wrap(compiler(input)));
    this.queue(null);
  };
  return through(write, end);
};