/****************************************************************************
 *
 *      /!\/!\/!\  Duplicate code in public/javascripts/plugins/jquery.cloudinary-donut.js !!  /!\/!\/!\
 *
 ***************************************************************************/
var cloudinary = require('cloudinary');
var conf = require('../config/index');

cloudinary.config(conf.cloudinary);

var roomAvatarDefault = 'room-avatar-default.png';
var userAvatarDefault = 'user-avatar-default.png';
var posterDefault = 'poster-default.png';

function _url(identifier, defaultIdentifier, width, height, background, gravity, effect) {
  defaultIdentifier = defaultIdentifier || '';

  width = (width || width === 0)
    ? width
    : 20;
  height = (height || height === 0)
    ? height
    : 20;

  background = background || '#4fedc0'; // lime green
  gravity = gravity || 'face';

  if (!identifier) {
    if (defaultIdentifier.indexOf('.png') === -1)
      identifier = defaultIdentifier;
    else
      identifier = defaultIdentifier.substr(0, defaultIdentifier.indexOf('.png'));
  }

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

  if (!identifier)
    return '';

  return cloudinary.url(identifier, options);
}

cloudinary.roomAvatar = function(identifier, size, background) {
  return _url(identifier, roomAvatarDefault, size, size, background);
};
cloudinary.userAvatar = function(identifier, size, background) {
  return _url(identifier, userAvatarDefault, size, size, background);
};
cloudinary.poster = function(identifier, background) {
  return _url(identifier, posterDefault, 0, 975, background, 'north_east');
};

module.exports = cloudinary;
