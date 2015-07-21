/**
 * This module allows usage of underscore template as server render engine.
 *
 * Used by express in web-server and by emailer.
 *
 * @source: https://github.com/jerolimov/comprise
 */

var debug = require('debug')('donut:templating');
var _ = require('underscore');
var async = require('async');
var cons = require('consolidate');
var path = require('path');

var Renderer = function(options) {
  options = options || {};

  // @todo : implement underscore template caching
  // @todo : implement default layout

  this.extension = options.extension || 'html';
  this.templateDir = options.templateDir || path.join(__dirname, '/../../web-server/views');
  this.layoutDir = options.layoutDir || this.templateDir + '/_layout';
  this.partialDir = options.partialDir || this.templateDir + '/_partials';

  this.defaultVariables = options.defaultVariables || {};
  this.consolidateConfiguration = {};

  // activate consolidate file cache
  if (process.env.NODE_ENV !== 'development')
    this.consolidateConfiguration.cache = true;
};

Renderer.prototype.resolve = function(directory, template) {
  var ext = path.extname(template);
  if (ext !== '.'+this.extension)
    template += '.'+this.extension;

  return path.resolve(directory, template);
};

Renderer.prototype.render = function(template, variables, callback) {
  debug('Renderer render called for '+template);

  variables = _.extend(this.consolidateConfiguration, this.defaultVariables, variables);

  // launch initial rendering (expected view)
  this.renderView(this.resolve(this.templateDir, template), variables, callback);
};

/**
 * Render 'template' file with 'variables' as parameters.
 * Then render detected partials and place them in previous result.
 * If a layout was set in 'template' the function call itself recursively with additionnal 'html' params.
 *
 * @param template  | String
 * @param variables | {}
 * @param content   | String, optionnal
 * @param callback
 */
Renderer.prototype.renderView = function(template, variables, content, callback) {
  if (!_.isFunction(callback)) {
    callback = content;
    content = null;
  }

  var layout = null;
  var partials = [];
  var partialsIndex = 1;
  var _variables = _.clone(variables);

  _variables.layout = function(template) {
    layout = template;
    return ''; // avoid accidental output
  };

  _variables.content = function() {
    return content;
  };

  _variables.partial = function(_template, partialVariables) {
    debug('include partial', _template);

    var key = '#!_comprise_'+(partialsIndex++)+'_partial_!#';

    var vars;
    if (partialVariables) {
      vars = _.extend(partialVariables, _variables);
    } else {
      vars = _variables;
    }

    partials.push({
      key: key,
      template: _template,
      variables: vars
    });

    return key;
  };

  // render view
  var that = this;
  async.waterfall([

    function renderTemplateWithConsolidate(fn) {
      cons['underscore'](template, _variables, fn);
    },

    function renderPartialsTemplates(html, fn) {
      if (!partials.length)
        return fn(null, html);

      that.renderPartials(partials, html, fn);
    },

    function renderLayoutTemplate(html, fn) {
      if (!layout)
        return fn(null, html);

      that.renderView(that.resolve(that.layoutDir, layout), _variables, html, fn);
    }

  ], callback);
};

Renderer.prototype.renderPartials = function(partials, html, callback) {
  debug('render partials');

  var that = this;
  async.each(partials, function(partial, fn) {

    var filename = that.resolve(that.partialDir, partial.template);

    // avoid that the same Object reference is passed to consolidate that use it to store filename of each template rendering
    // bug viewed only on very fast machine (production)
    var variables = _.clone(partial.variables);
    cons['underscore'](filename, variables, function(err, _html) {
      if (err)
        return fn(err);

      html = html.replace(partial.key, _html);

      debug('partial '+partial.template+' replaced in key '+partial.key);
      return fn(null);
    });

  }, function(err) {
    if (err){
      return callback(err);}

    debug('partials done');
    return callback(null, html);
  });

};

exports.Renderer = Renderer;

// Express 4.0
exports.express = function(options) {
  return function(filename, variables, callback) {
    debug('express render function called for '+filename+' with callback: '+!!(_.isFunction(callback)));
    new Renderer(options).render(filename, variables, callback);
  };
};

exports.standard = function(options) {
  return new Renderer(options);
};