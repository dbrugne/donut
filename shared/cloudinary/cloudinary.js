(function($) {
  var exports, cloudinaryLibrary;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = exports = require('cloudinary');
    exports.config(require('../config/index').cloudinary);
    cloudinaryLibrary = function () {
      return exports;
    }
  } else if ($) {
    exports = $.cd = {};
    cloudinaryLibrary = function() {
      return $.cloudinary; // not ready on DOM loading
    };
  } else {
    return;
  }

  var roomAvatarDefault = 'room-avatar-default.png';
  var userAvatarDefault = 'user-avatar-default.png';
  var posterDefault = 'poster-default.png';

  function parse(identifier) {
    var data = {
      cloudinary: null,
      color: null,
      facebook: null
    };

    var parts;
    if (identifier.indexOf('#!#') !== -1)
      parts = identifier.split('#!#');
    else
      parts = [identifier];

    for (var i=0; i<parts.length; i++) {
      if (parts[i].indexOf('=') === -1)
        continue;
      var pair = parts[i].split('=');
      if (!data.hasOwnProperty(pair[0]))
        continue;
      data[pair[0]] = pair[1];
    }
    return data;
  }

  function _urlNoDefault(token, width, height) {
    if (!token) return;
    var opts = {
      width: width || 30,
      height: height || 30,
      crop: 'fill'
    };

    var identifier;
    if (typeof token == 'object') {
      opts.version = token.version;
      identifier = token.id;
    } else {
      var data = parse(token);
      identifier = data.cloudinary;

      if (!identifier) {
        if (data.facebook) {
          return 'https://graph.facebook.com/'+facebook+'/picture?height='+height+'&width='+width;
        }

        return; // no valid identifier found
      }
    }

    return cloudinaryLibrary().url(identifier, opts);
  }

  function _url(token, defaultIdentifier, width, height, gravity, effect) {
    if (!token) return;
    var data = parse(token);

    var identifier = data.cloudinary;
    var background = data.color || '#ffffff';
    var facebook = data.facebook;

    defaultIdentifier = defaultIdentifier || '';

    width = (width || width === 0)
      ? width
      : 20;
    height = (height || height === 0)
      ? height
      : 20;

    gravity = gravity || 'face';

    var options = {
      fetch_format: 'jpg',
      crop: 'fill',
      gravity: gravity,
      default_image: defaultIdentifier,
      background: 'rgb:'+background.replace('#', '').toLocaleLowerCase()
    };

    if (width != 0)
      options.width = ''+width;
    if (height != 0)
      options.height = ''+height;
    if (effect)
      options.effect = effect;

    if (!identifier && facebook) {
      return 'https://graph.facebook.com/'+facebook+'/picture?height='+height+'&width='+width;
    }

    if (!identifier) {
      if (defaultIdentifier.indexOf('.png') === -1)
        identifier = defaultIdentifier;
      else
        identifier = defaultIdentifier.substr(0, defaultIdentifier.indexOf('.png'));

      // remove blur (if set) for default images
      if (options.effect)
        delete options.effect;
    }

    return cloudinaryLibrary().url(identifier, options);
  }

  exports.roomAvatar = function(identifier, size) {
    return _url(identifier, roomAvatarDefault, size, size);
  };
  exports.userAvatar = function(identifier, size) {
    return _url(identifier, userAvatarDefault, size, size);
  };
  exports.poster = function(identifier) {
    if (!identifier)
      return '';
    return _url(identifier, posterDefault, 430, 1100, 'center');
  };
  exports.posterBlured = function(identifier) {
    if (!identifier)
      return '';

    return _url(identifier, posterDefault, 430, 1100, 'center', 'blur:800');
  };
  exports.noDefault = function(identifier, width, height) {
    return _urlNoDefault(identifier, width, height);
  };
  exports.natural = function(identifier, width, height) {
    width = width || 1500;
    height = height || 1000;
    if (!identifier) return;
    var opts = {
      width: width,
      height: height,
      crop: 'limit'
    };
    return cloudinaryLibrary().url(identifier, opts);
  };

})((typeof jQuery != 'undefined')?jQuery:false);