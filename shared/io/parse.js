'use strict';
var Parse = require('parse/node');
var conf = require('../../config/index');

Parse.initialize(
  conf.parse.applicationId,
  conf.parse.javaScriptKey,
  conf.parse.masterKey
);

module.exports = Parse;
