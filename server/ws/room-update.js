var async = require('async');
var helper = require('./helper');
var validator = require('validator');
var sanitize = require('sanitize-caja');
var cloudinary = require('../app/cloudinary');

module.exports = function(io, socket, data) {

  async.waterfall([

    function retrieveRoom(callback) {

      helper.retrieveRoom(data.name, function (err, room) {

        if (err)
          return callback('Unable to find user: ' + err, null);

        return callback(null, room);

      });

    },

    function permissions(room, callback) {

      if (!room.owner || !room.owner._id)
        return callback('This room "'+data.name+'" hasn\'t owner specified');

      if (socket.getUserId() != room.owner._id.toString())
        return callback('Current user "'+socket.getUsername()+'" is not allowed'
          +' to edit this room "'+data.name);

      return callback(null, room);

    },

    // validate, sanitized and identify field to be update
    function validate(room, callback) {

      // @doc: https://www.npmjs.org/package/validator

      if (!data.data || data.data.length < 1)
        return callback('No data to update');

      var errors = {};
      var sanitized = {};

      // description
      if (helper._.has(data.data, 'description')) {
        if (!validator.isLength(data.data.description, 0, 200)) {
          errors.description = 'Description should be 200 characters max.';
        } else {
          var description = data.data.description;
          description = validator.stripLow(description, true);
          description = sanitize(description);
          description = validator.escape(description);
          if (description != room.description)
            sanitized.description = description;
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
          if (website != room.website)
            sanitized.website = website;
        }
      }

      // color
      if (helper._.has(data.data, 'color')) {
        if (data.data.color != '' && !validator.isHexColor(data.data.color)) {
          errors.color = 'Color should be explained has hexadecimal (e.g.: #FF00AA).';
        } else {
          var color = data.data.color.toLocaleUpperCase();
          if (color != room.color)
            sanitized.color = color;
        }
      }

      // permanent
      if (helper._.has(data.data, 'permanent')) {
        var permanent = validator.toBoolean(data.data.permanent);
        if (permanent != room.permanent)
          sanitized.permanent = permanent;
      }

      var errNum = Object.keys(errors).length;
      if (errNum > 0) {
        socket.emit('room:update', {
          name: room.name,
          success: false,
          errors: errors
        });
        return callback('Errors in form data: '+Object.keys(errors).toString());
      }

      return callback(null, room, sanitized);

    },

    function images(room, sanitized, callback) {

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
        if (avatar.remove && avatar.remove == true && room.avatar) {
          sanitized.avatar = '';

          // remove previous picture from cloudinary?
          cloudinary.api.delete_resources([room.avatarId()], function(result){
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
        if (poster.remove && poster.remove == true && room.poster) {
          sanitized.poster = '';

          // remove previous picture from cloudinary?
          cloudinary.api.delete_resources([room.posterId()], function(result){
            console.log(result.deleted);
          });
        }
      }

      return callback(null, room, sanitized);

    },

    function update(room, sanitized, callback) {

      for (var field in sanitized) {
        room.set(field, sanitized[field]);
      }

      room.save(function(err) {
        if (err)
          return callback('Error when saving room "'+room.name+'": '+err);

        socket.emit('room:update', {
          name: room.name,
          success: true
        });

        return callback(null, room, sanitized);
      });

    },

    function broadcast(room, sanitized, callback) {

      var updatedEvent = {};
      if (Object.keys(sanitized).length > 0) {
        // push room modifcations to room sockets
        updatedEvent = {
          name: room.name,
          data: sanitized
        };
        io.to(room.name).emit('room:updated', updatedEvent);
      }

      return callback(null, room, sanitized, updatedEvent);
    },

  ], function (err, room, sanitized, event) {
    if (err)
      return helper.handleError(err);

    // activity
    // helper.record('room:updated', socket, data);
    // @todo : specific event log, no in room/message history
  });

};
