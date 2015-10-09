'use strict';
var cloudinary = require('cloudinary');

var conf = require('../../config');
cloudinary.config(conf.cloudinary);

var roomAvatarDefault = 'room-avatar-default.png';
var userAvatarDefault = 'user-avatar-default.png';
var posterDefault = 'poster-default.png';

function imageUrl (data, width, height) {
  var identifier = data.identifier;
  var background = data.color || '#ffffff';
  var facebook = data.facebook;

  width = (width && width > 0)
    ? width
    : '__width__';
  height = (height && width > 0)
    ? height
    : '__height__';

  var options = {
    secure: true,
    fetch_format: 'jpg',
    background: 'rgb:' + background.replace('#', '').toLocaleLowerCase()
  };

  options.crop = (data.crop)
    ? data.crop
    : 'fill';

  if (data.default) {
    options.default_image = data.default;
  }
  if (width !== 0) {
    options.width = '' + width;
  }
  if (height !== 0) {
    options.height = '' + height;
  }
  if (data.gravity) {
    options.gravity = data.gravity;
  }
  if (data.effect) {
    options.effect = data.effect;
  }

  // Facebook profile image
  if (!identifier && facebook) {
    return 'https://graph.facebook.com/' + facebook + '/picture?height=' + height + '&width=' + width;
  }

  // Default image
  if (!identifier && options.default_image) {
    identifier = data.default.replace(/\.png$/i, '');
    delete options.default_image;

    // remove blur (if set) for default images
    if (options.effect) {
      delete options.effect;
    }
  }

  return cloudinary.url(identifier, options);
}

module.exports = {
  cloudinary: cloudinary,

  roomAvatar: function (identifier, color, size) {
    return imageUrl({
      default: roomAvatarDefault,
      identifier: identifier,
      color: color,
      gravity: 'face'
    }, size, size);
  },

  userAvatar: function (identifier, color, facebook, size) {
    return imageUrl({
      default: userAvatarDefault,
      identifier: identifier,
      color: color,
      gravity: 'face',
      facebook: facebook
    }, size, size);
  },

  poster: function (identifier, color, blur) {
    if (!identifier) {
      return '';
    }

    return imageUrl({
      default: posterDefault,
      identifier: identifier,
      color: color,
      gravity: 'center',
      effect: (blur === true)
        ? 'blur:800'
        : null
    }, 430, 1100);
  },

  messageFile: function (element, size) {
    if (!element.path) {
      return '';
    }

    if (element.type === 'raw') {
      console.warn(element);
      return {
        type: 'raw',
        filename: element.filename,
        url: cloudinary.url(element.path, {secure: true, resource_type: 'raw'})
      };
    } else {
      return {
        type: 'image',
        url: imageUrl({
          identifier: element.path,
          gravity: 'center',
          crop: '__crop__'
        }, size, size)
      };
    }
  }
};
