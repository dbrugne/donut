var _ = require('underscore');
var Notify = require('notifyjs');
var Backbone = require('backbone');
var emojione = require('emojione');

var debug = require('./donut-debug')('donut:desktop');

window.n = module.exports = {
  notify: function (tag, title, body, uri) {
    if (!Notify.needsPermission) {
      this._notify(tag, title, body, uri);
    } else if (Notify.isSupported()) {
      Notify.requestPermission(
        _.bind(function () {
          this._notify(tag, title, body, uri);
        }, this),
        _.bind(function () {
          debug('desktop notification permission has been denied by the user');
        }, this)
      );
    }
  },
  _notify: function (tag, title, body, uri) {
    title = (title)
      ? emojione.shortnameToUnicode(title)
      : '';
    body = (body)
      ? emojione.shortnameToUnicode(body)
      : '';

    var n = new Notify(title, {
      body: body || '', // avoid 'undefined'
      tag: tag,
      timeout: 10,
      closeOnClick: true,
      icon: '/images/icon-80.png',
      notifyClick: _.bind(function (event) {
        if (uri) {
          window.focus();
          Backbone.history.navigate(uri, {trigger: true});
        }
      }, this),
      notifyError: _.bind(function (err) {
        debug('desktop notification error', err);
      })
    });

    n.show();
  },
  isSupported: function () {
    return Notify.isSupported();
  },
  needsPermission: function () {
    return Notify.needsPermission;
  }
};
