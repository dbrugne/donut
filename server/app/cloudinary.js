var cloudinary = require('cloudinary');
var conf = require('../config/index');

cloudinary.config(conf.cloudinary);

function _url(identifier, transformation, defaultIdentifier) {
  defaultIdentifier = defaultIdentifier || 'default/default';

  if (!identifier)
    identifier = defaultIdentifier;

  var options = {
    default: defaultIdentifier
  };

  if (transformation)
    options.transformation = transformation;

  return cloudinary.url(identifier, options);
}

cloudinary.roomAvatar = function(identifier, transformation) {
  return _url(identifier, transformation, 'default/room-avatar-default');
};
cloudinary.roomPoster = function(identifier, transformation) {
  return _url(identifier, transformation, 'default/room-poster-default');
};
cloudinary.userAvatar = function(identifier, transformation) {
  return _url(identifier, transformation, 'default/user-avatar-default');
};
cloudinary.userPoster = function(identifier, transformation) {
  return _url(identifier, transformation, 'default/user-poster-default');
};

module.exports = cloudinary;
