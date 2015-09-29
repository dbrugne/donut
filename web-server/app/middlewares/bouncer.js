'use strict';
var logger = require('../../../shared/util/logger').getLogger('web', __filename);

var bouncer = {};
module.exports = bouncer;

bouncer.set = function (req, url) {
  logger.debug('set redirect on ' + url);
  req.session.redirect_to = url;
};

bouncer.redirect = function (req, res) {
  var to = req.session.redirect_to || '/!';
  logger.debug('now redirect to ' + to);
  return res.redirect(to);
};

bouncer.reset = function (req) {
  logger.debug('clear redirect on ' + req.session.redirect_to);
  delete req.session.redirect_to;
};
