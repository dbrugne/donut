'use strict';
var errors = require('../../../util/errors');
var async = require('async');
var disposableDomains = require('disposable-email-domains');
var validator = require('validator');

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

  var _methods = [
    'add',        // Add the domain to the list of allowed_domains
    'delete'      // Delete the domain from the list of allowed_domains
  ];

  if (!data.group_id || !data.domain || !data.method) {
    return errors.getHandler('group:mail:domain', next)('wrong-format');
  }

  if (!group) {
    return errors.getHandler('group:mail:domain', next)('group-not-found');
  }

  if (disposableDomains.indexOf(data.domain) !== -1) {
    return errors.getHandler('group:mail:domain', next)('domain');
  }

  if (_methods.indexOf(data.method) === -1) {
    return errors.getHandler('group:mail:domain', next)('params');
  }

  if (!group.isOwner(user.id) && !user.admin) {
    return errors.getHandler('group:mail:domain', next)('not-allowed');
  }

  // @todo make an isValidDomain
  if (data.domain[0] !== '@' || !validator.isFQDN(data.domain.substring(1))) {
    return errors.getHandler('group:mail:domain', next)('domain');
  }

  this[data.method](data.domain.toLowerCase(), group, next);
};

handler.add = function (domain, group, next) {
  async.waterfall([
    function check (callback) {
      if (group.allowed_domains.indexOf(domain) !== -1) {
        return callback('mail-already-exist');
      }

      return callback(null);
    },

    function addDomain (callback) {
      group.update({$addToSet: { allowed_domains: domain }}, function (err) {
        return callback(err);
      });
    }
  ], function (err) {
    if (err) {
      return errors.getHandler('group:mail:domain:add', next)(err);
    }

    return next(null, {success: true});
  });
};

handler.delete = function (domain, group, next) {
  async.waterfall([
    function check (callback) {
      if (group.allowed_domains.indexOf(domain) === -1) {
        return callback('not-found');
      }

      return callback(null);
    },

    function deleteDomain (callback) {
      group.update({$pull: {allowed_domains: domain}}, function (err) {
        return callback(err);
      });
    }
  ], function (err) {
    if (err) {
      return errors.getHandler('group:mail:domain:delete', next)(err);
    }

    return next(null, {success: true});
  });
};