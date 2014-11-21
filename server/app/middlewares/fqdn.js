var debug = require('debug')('fqdn');
var conf = require('../../config/index');

module.exports = function() {
  return function(req, res, next) {
    // is enabled?
    if (conf.fqdn === undefined || conf.fqdn.length < 1) {
      debug('fqdn-middleware: no FQDN configured in conf.fqdn');
      return next();
    }

    var reqHost = req.get('host');
    var reqPort;
    if (reqHost.indexOf(':') !== -1) {
      reqPort = reqHost.substring(reqHost.indexOf(':')+1);
      reqHost = reqHost.substring(0, reqHost.indexOf(':'));
    }

    // is the expected FQDN?
    if (reqHost != conf.fqdn) {
      // note that #anchor is not supported
      var redirectTo = req.protocol + '://' + conf.fqdn + ((reqPort) ? ':'+reqPort : '') + req.originalUrl;
      debug('fqdn-middleware: request on '+reqHost+' now redirected to '+redirectTo);
      return res.redirect(redirectTo);
    }

    debug('fqdn-middleware: allowed requested FQDN: '+reqHost);
    return next();
  };
};