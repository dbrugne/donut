var async = require('async');
var helper = require('./helper');
var User = require('../app/models/user');
var validator = require('validator');
var sanitize = require('sanitize-caja');
var cloudinary = require('../app/cloudinary');

module.exports = function(io, socket, data) {

  async.waterfall([

    function retrieveUser(callback) {

      User.findById(socket.getUserId(), function(err, user) {

        if (err)
          return callback('Unable to find user: ' + err, null);

        return callback(null, user);

      });

    },

    // validate, sanitized and identify field to be update
    function validate(user, callback) {

      // @doc: https://www.npmjs.org/package/validator

      if (!data.data || data.data.length < 1)
        return callback('No data to update');

      var errors = {};
      var sanitized = {};

      // bio
      if (helper._.has(data.data, 'bio')) {
        if (!validator.isLength(data.data.bio, 0, 200)) {
          errors.bio = 'Bio should be 200 characters max.';
        } else {
          var bio = data.data.bio;
          bio = validator.stripLow(bio, true);
          bio = sanitize(bio);
          bio = validator.escape(bio);
          if (bio != user.bio)
            sanitized.bio = bio;
        }
      }

      // location
      if (helper._.has(data.data, 'location')) {
        if (!validator.isLength(data.data.location, 0, 70)) {
          errors.location = 'Location should be 70 characters max.';
        } else {
          var location = data.data.location;
          location = validator.trim(location);
          location = validator.escape(location);
          if (location != user.location)
            sanitized.location = location;
        }
      }

      // website
      if (helper._.has(data.data, 'website')) {
        var opts = {
          require_protocol: false,
          require_tld: true,
          allow_underscores: true
        };
        if (data.data.website != '' && !validator.isURL(data.data.website, opts)) {
          errors.website = 'Website should be a valid site URL';
        } else {
          var website = data.data.website;
          website = validator.trim(website);
          website = validator.escape(website);
          if (website != user.website)
            sanitized.website = website;
        }
      }

      // color
      if (helper._.has(data.data, 'color')) {
        if (data.data.color != '' && !validator.isHexColor(data.data.color)) {
          errors.color = 'Color should be explained has hexadecimal (e.g.: #FF00AA).';
        } else {
          var color = data.data.color.toLocaleUpperCase();
          if (color != user.color)
            sanitized.color = color;
        }
      }

      // general
      if (helper._.has(data.data, 'general')) {
        var general = validator.toBoolean(data.data.general);
        if (general != user.general)
          sanitized.general = general;
      }

      var errNum = Object.keys(errors).length;
      if (errNum > 0) {
        socket.emit('user:update', {
          success: false,
          errors: errors
        });
        return callback('Errors in form data: '+Object.keys(errors).toString());
      }

      return callback(null, user, sanitized);

    },

    function images(user, sanitized, callback) {

      /**
       * We receive following fields (e.g.: data.data.avatar):
       *
       *  {
       *    public_id: 'jfs0fbpit5ozwnvx4uem',
       *    version: 1407505236,
       *    path: 'v1407505236/jfs0fbpit5ozwnvx4uem.jpg'
       *  }
       *
       * As $.cloudinary can build URL based on 'path' (that contain both public_id
       * and version) we store only 'path' as model 'avatar' field value:
       *
       *   $.cloudinary.url("v1407505236/jfs0fbpit5ozwnvx4uem.jpg")
       *   -> "http://res.cloudinary.com/roomly/image/upload/v1407505236/jfs0fbpit5ozwnvx4uem.jpg"
       */

      if (helper._.has(data.data, 'avatar')) {
        var avatar = data.data.avatar;

        // new image
        if (avatar.path)
          sanitized.avatar = avatar.path;

        // remove actual image
        if (avatar.remove && avatar.remove == true && user.avatar) {
          sanitized.avatar = '';

          // remove previous picture from cloudinary?
          cloudinary.api.delete_resources([user.avatarId()], function(result){
              console.log(result.deleted);
          });
        }
      }

      if (helper._.has(data.data, 'poster')) {
        var poster = data.data.poster;

        // new image
        if (poster.path)
          sanitized.poster = poster.path;

        // remove actual image
        if (poster.remove && poster.remove == true && user.poster) {
          sanitized.poster = '';

          // remove previous picture from cloudinary?
          cloudinary.api.delete_resources([user.posterId()], function(result){
            console.log(result.deleted);
          });
        }
      }

      return callback(null, user, sanitized);

    },

    function update(user, sanitized, callback) {

      for (var field in sanitized) {
        user.set(field, sanitized[field]);
      }

      user.save(function(err) {
        if (err)
          return callback('Error when saving user "'+user.username+'": '+err);

        socket.emit('user:update', {
          success: true
        });

        return callback(null, user, sanitized);
      });

    },

    function broadcast(user, sanitized, callback) {

      // notify only certain fields
      var sanitizedToNotify = {};
      var fieldToNotify = ['avatar','poster','color'];
      helper._.each(Object.keys(sanitized), function(key) {
        if (fieldToNotify.indexOf(key) != -1) {
          sanitizedToNotify[key] = sanitized[key];
        }
      });

      if (Object.keys(sanitizedToNotify).length > 0) {
        var updatedEvent = {
          user_id: user._id.toString(),
          username: user.username,
          data: sanitizedToNotify
        };

        // user itself
        io.to('user:'+socket.request.user._id).emit('user:updated', updatedEvent);

        // rooms user
        var rooms = helper.userRooms(io, user._id.toString());
        helper._.each(rooms, function(room) {
          console.log(room);
          io.to(room).emit('user:updated', updatedEvent);
        });

        // @todo : onetoone attendees
      }

      return callback(null, user, sanitized);
    },

  ], function (err, user, sanitized) {
    if (err)
      return helper.handleError(err);

    // activity
    // helper.record('user:updated', socket, data);
    // @todo : specific event log, no in room/message history
  });

};
