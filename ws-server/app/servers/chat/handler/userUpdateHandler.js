'use strict';
var logger = require('../../../../../shared/util/logger').getLogger('donut', __filename);
var async = require('async');
var _ = require('underscore');
var Room = require('../../../../../shared/models/room');
var validator = require('validator');
var cloudinary = require('../../../../../shared/util/cloudinary').cloudinary;
var common = require('@dbrugne/donut-common');

var Handler = function (app) {
  this.app = app;
};

module.exports = function (app) {
  return new Handler(app);
};

var handler = Handler.prototype;

handler.call = function (data, session, next) {
  var user = session.__currentUser__;

  var that = this;

  async.waterfall([

    function validate (callback) { // @doc: https://www.npmjs.org/package/validator

      if (!data.data || data.data.length < 1) {
        return callback('No data to update');
      }

      var errors = {};
      var sanitized = {};

      // bio
      if (_.has(data.data, 'bio')) {
        if (!validator.isLength(data.data.bio, 0, 200)) {
          errors.bio = 'bio'; // Bio should be 200 characters max.
        } else {
          var bio = data.data.bio;
          bio = validator.stripLow(bio, true);
          bio = validator.escape(bio);
          if (bio !== user.bio) {
            sanitized.bio = bio;
          }
        }
      }

      // location
      if (_.has(data.data, 'location')) {
        if (!validator.isLength(data.data.location, 0, 70)) {
          errors.location = 'location'; // Location should be 70 characters max.
        } else {
          var location = data.data.location;
          location = validator.trim(location);
          location = validator.escape(location);
          if (location !== user.location) {
            sanitized.location = location;
          }
        }
      }

      // website
      if (_.has(data.data, 'website') && data.data.website) {
        if (data.data.website.length < 5 && data.data.website.length > 255) {
          errors.website = 'website-size'; // website should be 5 characters min and 255 characters max.;
        } else {
          var link = common.getLinkify().find(data.data.website);
          if (!link || !link[0] || !link[0].type || !link[0].value || !link[0].href || link[0].type !== 'url') {
            errors.website = 'website-url';
          } // website should be a valid site URL
          else {
            var website = {
              href: link[0].href,
              title: link[0].value
            };
          }
        }
      }
      sanitized.website = website;

      // color
      if (_.has(data.data, 'color')) {
        if (data.data.color !== '' && !validator.isHexColor(data.data.color)) {
          errors.color = 'color-hexadecimal'; // Color should be explained has hexadecimal (e.g.: #FF00AA).
        } else {
          var color = data.data.color.toLocaleUpperCase();
          if (color !== user.color) {
            sanitized.color = color;
          }
        }
      }

      // welcome
      if (_.has(data.data, 'welcome')) {
        var welcome = validator.toBoolean(data.data.welcome);
        if (welcome !== user.welcome) {
          sanitized.welcome = welcome;
        }
      }

      // positions
      if (_.has(data.data, 'positions')) {
        var welcome = validator.toBoolean(data.data.welcome);
        if (welcome != user.welcome) {
          sanitized.welcome = welcome;
        }

        if (!_.isArray(data.data.positions)) {
          errors.positions = 'positions'; // Positions should be an array
        } else {
          sanitized.positions = JSON.stringify(data.data.positions);
        }
      }

      var errNum = Object.keys(errors).length;
      if (errNum > 0) {
        return callback(errors);
      } // object

      return callback(null, sanitized);
    },

    /**
     * We receive following fields (e.g.: data.data.avatar):
     *
     *  {
     *    public_id: 'jfs0fbpit5ozwnvx4uem',
     *    version: 1407505236,
     *    path: 'v1407505236/jfs0fbpit5ozwnvx4uem.jpg'
     *  }
     */
      function images (sanitized, callback) {
      if (_.has(data.data, 'avatar')) {
        var avatar = data.data.avatar;

        // new image
        if (avatar.path)
          sanitized.avatar = avatar.path;

        // remove actual image
        if (avatar.remove && avatar.remove == true && user.avatar) {
          sanitized.avatar = '';

          // remove previous picture
          cloudinary.api.delete_resources([user.avatarId()], function (result) {
            logger.warn(result.deleted);
          });
        }
      }

      if (_.has(data.data, 'poster')) {
        var poster = data.data.poster;

        // new image
        if (poster.path) {
          sanitized.poster = poster.path;
        }

        // remove actual image
        if (poster.remove && poster.remove === true && user.poster) {
          sanitized.poster = '';

          // remove previous picture
          cloudinary.api.delete_resources([user.posterId()], function (result) {
            logger.warn(result.deleted);
          });
        }
      }

      return callback(null, sanitized);
    },

    function update (sanitized, callback) {
      for (var field in sanitized) {
        user.set(field, sanitized[field]);
      }
      user.save(function (err) {
        return callback(err, sanitized);
      });
    },

    function broadcast (sanitized, callback) {
      // notify only certain fields
      var sanitizedToNotify = {};
      var fieldToNotify = ['avatar', 'positions'];
      _.each(Object.keys(sanitized), function (key) {
        if (fieldToNotify.indexOf(key) != -1) {
          if (key === 'avatar') {
            sanitizedToNotify[key] = user._avatar();
          }
          else if (key === 'positions') {
            sanitizedToNotify[key] = JSON.parse(sanitized[key]);
          }
          else {
            sanitizedToNotify[key] = sanitized[key];
          }
        }
      });

      if (Object.keys(sanitizedToNotify).length < 1) {
        return callback(null, sanitized);
      } // nothing to notify

      var event = {
        username: user.username,
        user_id: user.id,
        data: sanitizedToNotify
      };
      that.app.globalChannelService.pushMessage('connector', 'user:updated', event, 'user:' + user.id, {}, function (err) {
        if (err) {
          logger.error(err);
        }

        return callback(null, sanitized);
      });
    },

    function prepareEventForOthers (sanitized, callback) {
      // notify only certain fields
      var sanitizedToNotify = {};
      var fieldToNotify = ['avatar', 'poster', 'color'];
      _.each(Object.keys(sanitized), function (key) {
        if (fieldToNotify.indexOf(key) != -1) {
          if (key === 'avatar') {
            sanitizedToNotify['avatar'] = user._avatar();
          }
          else if (key === 'poster') {
            sanitizedToNotify['poster'] = user._poster();
          }
          else if (key === 'color') {
            sanitizedToNotify['color'] = sanitized[key];
            sanitizedToNotify['avatar'] = user._avatar();
            sanitizedToNotify['poster'] = user._poster();
          }
        }
      });

      if (Object.keys(sanitizedToNotify).length < 1) {
        return callback(null, null);
      } // nothing to notify

      var event = {
        username: user.username,
        user_id: user.id,
        data: sanitizedToNotify
      };

      return callback(null, event);
    },

    function broadcastOneToOnes (event, callback) {
      if (!event) {
        return callback(null, event);
      }

      // inform onetoones
      if (user.onetoones && user.onetoones.length > 0) {
        _.each(user.onetoones, function (userId) {
          that.app.globalChannelService.pushMessage('connector', 'user:updated', event, 'user:' + userId, {}, function (err) {
            if (err) {
              logger.error('Error while pushing user:updated message to ' + userId + ' on user:update: ' + err);
            }
          });
        });
      }

      return callback(null, event);
    },

    function broadcastRooms (event, callback) {
      if (!event) {
        return callback(null, event);
      }

      Room.findByUser(user.id).exec(function (err, rooms) {
        if (err) {
          return callback(err);
        }

        // inform rooms
        if (rooms && rooms.length) {
          _.each(rooms, function (room) {
            that.app.globalChannelService.pushMessage('connector', 'user:updated', event, room.name, {}, function (err) {
              if (err) {
                logger.error('Error while pushing user:updated message to ' + room.name + ' on user:update: ' + err);
              }
            });
          });
        }

        return callback(null);
      });
    }

  ], function (err) {
    if (err) {
      logger.error('[user:update] ' + err);
      return next(null, {code: 500, err: 'internal'});
    }

    next(null, {});
  });

};
