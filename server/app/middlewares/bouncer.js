var debug = require('debug')('chat-server:redirect');

var bouncer = {};
module.exports = bouncer;

bouncer.set = function(req, url) {
  debug('set redirect on '+url);
  req.session.redirect_to = url;
};

bouncer.redirect = function(req, res) {
  var to = req.session.redirect_to || '/!';
  debug('now redirect to '+to);
  return res.redirect(to);
};

bouncer.reset = function(req) {
  debug('clear redirect on '+req.session.redirect_to);
  delete req.session.redirect_to;
};