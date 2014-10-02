var debug = require('debug')('chat-server:bouncer');

var bouncer = {};
module.exports = bouncer;

bouncer.redirect = function(req, res) {
  var to = req.session.redirect_to || '/!';
  debug('now redirect to '+to);
  return res.redirect(to);
};

bouncer.set = function(req, url) {
  debug('will redirect on '+url);
  req.session.redirect_to = url;
}

bouncer.reset = function(req) {
  delete req.session.redirect_to;
}