define([
  'jquery',
  'underscore',
  'backbone'
], function ($, _, Backbone) {

  var Debug = function() {
    this.key = 'donut.debug'+'=';
    this.isOn = false;
    if (this.cookieIsOn())
      this.isOn = true;

    localStorage.debug = ''; // ('*') // @todo socket.io-client debug
  };

  Debug.prototype.cookieIsOn = function() {
    var ca = document.cookie.split(';');
    for (var i=0; i<ca.length; i++) {
      var c = ca[i];
      while (c.charAt(0)==' ') c = c.substring(1);
      var value;
      if (c.indexOf(this.key) != -1)
        value = c.substring(this.key.length, c.length);
      if (typeof value != 'undefined') {
        if (value == 'true')
          return true;
        else
          return false;
      }
    }
    return false;
  };

  Debug.prototype.on = function() {
    console.log('debug mode set to on');
    var d = new Date();
    d.setTime(d.getTime() + (365*24*60*60*1000));
    var expires = "expires="+d.toUTCString();
    document.cookie = this.key+"true; " + expires;
    this.isOn = true;
  };

  Debug.prototype.off = function() {
    console.log('debug mode set to off');
    document.cookie = this.key+"; expires=Thu, 01 Jan 1970 00:00:00 UTC";
    this.isOn = false;
  };

  Debug.prototype.log = function() {
    if (this.isOn === true)
      console.log.apply(console, arguments);
  };

  return new Debug();

});