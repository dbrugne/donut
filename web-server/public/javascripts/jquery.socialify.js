(function ($) {
  'use strict';
  $.socialify = {};

  $.socialify.facebook = function (config) {
    // popup
    if (!window.FB) {
      return this.popup('https://www.facebook.com/sharer/sharer.php', {
        u: config.url
      });
    }

    // ui
    return window.FB.ui({
      method: 'feed',
      name: config.name,
      link: config.url,
      picture: config.picture,
      description: config.description
    });
  };

  $.socialify.twitter = function (config) {
    return this.popup('https://twitter.com/intent/tweet', {
      text: config.text,
      url: config.url
    });
  };

  $.socialify.google = function (config) {
    return this.popup('https://plus.google.com/share', {
      url: config.url
    });
  };

  $.socialify.popup = function (url, params) {
    var k, popup, qs, v;
    if (params == null) {
      params = {};
    }
    popup = {
      width: 500,
      height: 350
    };
    popup.top = (window.screen.height / 2) - (popup.height / 2);
    popup.left = (window.screen.width / 2) - (popup.width / 2);
    qs = (function () {
      var _results;
      _results = [];
      for (k in params) {
        v = params[k];
        _results.push('' + k + '=' + (this.encode(v)));
      }
      return _results;
    }.call(this)).join('&');
    if (qs) {
      qs = '?' + qs;
    }
    var q = 'toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,resizable=yes,left=' +
      popup.left +
      ',top=' +
      popup.top +
      ',width=' +
      popup.width + ',height=' + popup.height;
    return window.open(url + qs, 'targetWindow', q);
  };

  $.socialify.is_encoded = function (str) {
    return decodeURIComponent(str) !== str;
  };

  $.socialify.encode = function (str) {
    if (this.is_encoded(str)) {
      return str;
    } else {
      return encodeURIComponent(str);
    }
  };

}(window.jQuery));
