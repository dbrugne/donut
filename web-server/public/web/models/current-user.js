var _ = require('underscore');
var Backbone = require('backbone');
var client = require('../libs/client');
var UserModel = require('./user');

var CurrentUserModel = UserModel.extend({
  initialize: function (options) {
    this.listenTo(client, 'preferences:update', this.setPreference);

    var that = this;
    this.listenTo(client, 'connecting', function () { that.set('status', 'connecting'); });
    this.listenTo(client, 'connect', function () { that.set('status', 'online'); });
    this.listenTo(client, 'disconnect', function () { that.set('status', 'offline'); });
    this.listenTo(client, 'reconnect', function () { that.set('status', 'online'); });
    this.listenTo(client, 'reconnect_attempt', function () { that.set('status', 'connecting'); });
    this.listenTo(client, 'reconnecting', function () { that.set('status', 'connecting'); });
    this.listenTo(client, 'reconnect_error', function () { that.set('status', 'connecting'); });
    this.listenTo(client, 'reconnect_failed', function () { that.set('status', 'error'); });
    this.listenTo(client, 'error', function () { that.set('status', 'error'); });

    this._initialize(options);
  },

  setPreference: function (data, options) {
    options = options || {};

    var keys = Object.keys(data);
    if (!keys || !keys.length)
      return;

    var key = keys[0];
    if (!key)
      return;

    var preferences = this.get('preferences') || {};
    preferences[key] = data[key];
    this.set('preferences', preferences, options);
  },
  setPreferences: function (preferences, options) {
    options = options || {};

    if (!preferences)
      return;

    var newPreferences = {}; // reset all previous keys
    _.each(preferences, function (value, key, list) {
      newPreferences[key] = value;
    });

    this.set('preferences', newPreferences, options);
  },

  shouldDisplayExitPopin: function () {
    var preferences = this.get('preferences');

    // if no preference set OR browser:exitpopin equal to true, we show
    if (!preferences || typeof preferences['browser:exitpopin'] == 'undefined' || preferences['browser:exitpopin'] === true)
      return true;

    return false;
  },
  shouldDisplayWelcome: function () {
    var preferences = this.get('preferences');

    // if no preference set OR browser:welcome equal to true, we show
    if (!preferences || typeof preferences['browser:welcome'] == 'undefined' || preferences['browser:welcome'] === true)
      return true;

    return false;
  },
  shouldPlaySound: function () {
    var preferences = this.get('preferences');

    // if no preference set OR browser:sound equal to true, we play
    if (!preferences || typeof preferences['browser:sounds'] == 'undefined' || preferences['browser:sounds'] === true)
      return true;

    return false;
  },

  shouldDisplayDesktopNotif: function () {
    var preferences = this.get('preferences');

    // if no preference set OR browser:sound equal to true, we play
    if (!preferences || typeof preferences['notif:channels:desktop'] == 'undefined')
      return false;

    if (preferences['notif:channels:desktop'] === true)
      return true;
    else
      return false;
  },

  _setCookie: function (name, value, exdays) {
    exdays = exdays || 365; // 1 year by default
    var d = new Date();
    d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
    var expires = 'expires=' + d.toUTCString();
    document.cookie = name + '=' + value + '; ' + expires;
  },
  _getCookie: function (name) {
    var cname = name + '=';
    var ca = document.cookie.split(';');
    for (var i = 0; i < ca.length; i++) {
      var c = ca[i];
      while (c.charAt(0) == ' ') c = c.substring(1);
      var value;
      if (c.indexOf(cname) != -1)
        value = c.substring(cname.length, c.length);
      if (typeof value != 'undefined') {
        if (value == 'true') // boolean compliance
          return true;
        else if (value == 'false')
          return false;
        else
          return value;
      }
    }
    return '';
  },

  isAdmin: function () {
    return (this.get('admin') === true) ? true : false;
  }

});


module.exports = new CurrentUserModel();