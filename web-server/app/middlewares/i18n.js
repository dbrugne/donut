var i18next = require('../../../shared/util/i18next');
var express = require('express');
var router = express.Router();

/**
 * See: https://github.com/jamuhl/i18next-node
 *
 * Handle the multiple incompatibility with Express 4.0
 */

var i18n = {};
module.exports = i18n;

/**
 * Middleware that perform language detection and add helper to views
 * @param req
 * @param res
 * @param next
 */
i18n.middleware = function(req, res, next) {
  i18next.handle(req, res, decorateViewWithHelper);

  function decorateViewWithHelper() {
    res.locals.i = function() {
      return function(text) {
        return res.locals.t(text);
      }
    };
    next();
  }

};

/**
 * Routes that server i18next javascript and dynamic resources to browser
 *
 * Note: not using serveClientScript, we use instead the bower-AMD-jQuery
 * compliant version
 */
var options = {
  maxAge: 60 * 60 // 1h, default: 60 * 60 * 24 * 30
};
i18next
  .serveDynamicResources(router, options)
  .serveMissingKeyRoute(router, options);

i18n.router = router;
