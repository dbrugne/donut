var cloudinary = require('cloudinary');

var conf = require('../../config');
cloudinary.config(conf.cloudinary);

var roomAvatarDefault = 'room-avatar-default.png';
var userAvatarDefault = 'user-avatar-default.png';
var posterDefault = 'poster-default.png';

function _url(data, width, height, gravity, effect) {
  var defaultIdentifier = data.default;
  var identifier = data.identifier;
  var background = data.color || '#ffffff';
  var facebook = data.facebook;

  width = (width && width > 0)
    ? width
    : '__width__';
  height = (height && width > 0)
    ? height
    : '__height__';

  gravity = gravity || 'face';

  var options = {
    secure: true,
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

  return cloudinary.url(identifier, options);
}

module.exports = {

  cloudinary: cloudinary,

  roomAvatar: function(identifier, color, size) {
    return _url({
      default: roomAvatarDefault,
      identifier: identifier,
      color: color
    }, size, size);
  },

  userAvatar: function(identifier, color, facebook, size) {
    return _url({
      default: userAvatarDefault,
      identifier: identifier,
      color: color,
      facebook: facebook
    }, size, size);
  },

  poster: function(identifier, color, blur) {
    if (!identifier)
      return '';
    var effect = (blur === true)
      ? 'blur:800'
      : null;
    return _url({
      default: posterDefault,
      identifier: identifier,
      color: color,
    }, 430, 1100, 'center', effect);
  }

};