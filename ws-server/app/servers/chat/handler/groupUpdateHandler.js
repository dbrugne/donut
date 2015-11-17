'use strict';
var logger = require('../../../../../shared/util/logger').getLogger('donut', __filename.replace(__dirname + '/', ''));
var async = require('async');
var _ = require('underscore');
var validator = require('validator');
var cloudinary = require('../../../../../shared/util/cloudinary').cloudinary;
var linkify = require('linkifyjs');
var errors = require('../../../util/errors');

var Handler = function (app) {
  this.app = app;
};

module.exports = function (app) {
  return new Handler(app);
};

var handler = Handler.prototype;

handler.call = function (data, session, next) {
  var user = session.__currentUser__;
  var group = session.__group__;
  var passwordPattern = /(.{4,255})$/i;

  var that = this;

  async.waterfall([

    function check (callback) {
      if (!data.group_id) {
        return callback('params-group-id');
      }

      if (!group) {
        return callback('group-not-found');
      }

      if (!group.isOwner(user.id) && session.settings.admin !== true) {
        return callback('not-admin-owner');
      }

      return callback(null);
    },

    function validate (callback) {
      // @doc: https://www.npmjs.org/package/validator

      if (!data.data || data.data.length < 1) {
        return callback('params-data');
      }

      var errors = {};
      var sanitized = {};

      // description
      if (_.has(data.data, 'description')) {
        if (!validator.isLength(data.data.description, 0, 200)) {
          errors.description = 'description'; // Description should be 200 characters max.
        } else {
          var description = data.data.description;
          description = validator.stripLow(description, true);
          description = validator.escape(description);
          if (description !== group.description) {
            sanitized.description = description;
          }
        }
      }

      // disclaimer
      if (_.has(data.data, 'disclaimer')) {
        if (!validator.isLength(data.data.disclaimer, 0, 200)) {
          errors.description = 'description'; // Description should be 200 characters max.
        } else {
          var disclaimer = data.data.disclaimer;
          if (disclaimer !== group.disclaimer) {
            sanitized.disclaimer = disclaimer;
          }
        }
      }

      // website
      if (_.has(data.data, 'website') && data.data.website) {
        if (data.data.website.length < 5 && data.data.website.length > 255) {
          errors.website = 'website-size'; // website should be 5 characters min and 255 characters max.;
        } else {
          var link = linkify.find(data.data.website);
          if (!link || !link[0] || !link[0].type || !link[0].value || !link[0].href || link[0].type !== 'url') {
            errors.website = 'website-url'; // website should be a valid site URL
          } else {
            var website = {
              href: link[0].href,
              title: link[0].value
            };
          }
        }
      }
      if (website !== group.website) {
        sanitized.website = website;
      }

      // color
      if (_.has(data.data, 'color')) {
        if (data.data.color !== '' && !validator.isHexColor(data.data.color)) {
          errors.color = 'color-hexadecimal'; // Color should be explained has hexadecimal (e.g.: #FF00AA).
        } else {
          var color = data.data.color.toLocaleUpperCase();
          if (color !== group.color) {
            sanitized.color = color;
          }
        }
      }

      // A password is to update
      if (_.has(data.data, 'password')) {
        var password = data.data.password;
        // Add password or change password
        if (password !== null) {
          // Change password
          if (passwordPattern.test(password) && (password /* user.generateHash(password)*/ !== group.password || !_.has(group.toJSON(), 'password'))) {
            sanitized.password = validator.escape(password); // user.generateHash(password);
          }
          // password is null, Remove password attr from document
        } else {
          // a password is set on the room, so remove it
          if (_.has(group.toJSON(), 'password')) {
            sanitized.password = undefined;
          }
        }
      }

      if (session.settings.admin === true) {
        // visibility
        if (_.has(data.data, 'visibility')) {
          var visibility = !!data.data.visibility;
          if (group.visibility !== visibility) {
            sanitized.visibility = !!data.data.visibility;
          }
        }

        // priority
        if (_.has(data.data, 'priority')) {
          if (data.data.priority !== '' && !validator.isNumeric(data.data.priority)) {
            errors.color = 'color-integer'; // Priority should be explained has number (integer).
          } else {
            var priority = data.data.priority;
            if (priority !== group.priority) {
              sanitized.priority = priority;
            }
          }
        }
      }

      if (Object.keys(errors).length > 0) {
        return callback(errors); // object
      }

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
        if (avatar.path) {
          sanitized.avatar = avatar.path;
        }

        // remove actual image
        if (avatar.remove && avatar.remove === true && group.avatar) {
          sanitized.avatar = '';

          // remove previous picture
          cloudinary.api.delete_resources([group.avatarId()], function (result) {
            logger.warn(result.deleted);
          });
        }
      }

      return callback(null, sanitized);
    },

    function update (sanitized, callback) {
      _.each(sanitized, function (element, key) {
        group.set(key, sanitized[key]);
      });
      group.save(function (err) {
        return callback(err, sanitized);
      });
    },

    function broadcast (sanitized, callback) {
      // notify only certain fields
      var sanitizedToNotify = {};
      var fieldToNotify = ['avatar', 'color'];
      _.each(Object.keys(sanitized), function (key) {
        if (fieldToNotify.indexOf(key) !== -1) {
          if (key === 'avatar') {
            sanitizedToNotify['avatar'] = group._avatar();
          } else if (key === 'color') {
            sanitizedToNotify['color'] = sanitized[key];
            sanitizedToNotify['avatar'] = group._avatar();
          }
        }
      });

      if (Object.keys(sanitizedToNotify).length < 1) {
        return callback(null);
      }

      var event = {
        name: group.name,
        group_id: group.id,
        data: sanitizedToNotify
      };
      var ids = group.getIdsByType('members');
      var channelsName = [];
      _.each(ids, function (uid) {
        channelsName.push('user:' + uid);
      });
      that.app.globalChannelService.pushMessageToMultipleChannels('connector', 'group:updated', event, channelsName, {}, callback);
    }

  ], function (err) {
    if (err) {
      if (_.isObject(err)) {
        _.each(err, function (e) {
          logger.warn('[group:updated] ' + e);
        });
        return next(null, {code: 400, err: err});
      }
      return errors.getHandler('group:updated', next)(err);
    }

    next(null, {});
  });
};
