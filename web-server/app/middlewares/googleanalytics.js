'use strict';
var conf = require('../../../config/index');

var tracker = '';
var template = '<script>'
  + "(function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){"
  + '  (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),'
  + '  m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)'
  + "  })(window,document,'script','//www.google-analytics.com/analytics.js','ga');"
  + ''
  + "ga('create', '{{UID}}', '{{URL}}', {'cookieDomain': 'none'});"
  + "ga('send', 'pageview');"
  + '</script>';

if (conf.google && conf.google.analytics && conf.google.analytics.uid) {
  tracker = template
    .replace('{{UID}}', conf.google.analytics.uid);
}

module.exports = function () {
  return function (req, res, next) {
    res.locals.googleanalytics = tracker
      .replace('{{URL}}', conf.url);
    next();
  };
};
