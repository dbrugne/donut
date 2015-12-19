'use strict';
var logger = require('../util/logger').getLogger('emailer', __filename);
var common = require('@dbrugne/donut-common/server');
var Parse = require('parse/node');
var conf = require('../../config/index');
var i18next = require('../util/i18next');
var _ = require('underscore');

var parse = {};
module.exports = parse;

Parse.initialize(
  conf.parse.applicationId,
  conf.parse.javaScriptKey,
  conf.parse.masterKey
);

/**
 * Send to all mobile/tablet of the given 'toUid'
 * @param {string} toUid
 * @param {object} data
 * @param {string} img
 * @param {function} callback
 *
 * https://parse.com/docs/js/guide#push-notifications-sending-options
 */
function sendToMobile (toUid, data, img, callback) {
  if (!toUid) {
    return callback('"toUid" param is mandatory');
  }
  if (!_.isObject(data)) {
    return callback('Second argument should be an object');
  }

  // iOS only, increment the value indicated in the top right corner of the app icon
  data.badge = 'Increment';

  // Image display on the notification
  if (img != null) {
    data.img = common.cloudinary.prepare(img, 48);
  }

  var query = new Parse.Query(Parse.Installation);
  query.equalTo('uid', toUid);

  process.nextTick(function () {
    Parse.Push.send({
      where: query,
      data: data
    }, {
      success: function () {
        callback(null);
      },
      error: function (err) {
        logger.error('Error while sending notification to "' + toUid + '": ' + err);
        callback(err);
      }
    });
  });
}

/** =================================================================
 *
 * Notifications
 *
 * ================================================================== */

parse.userMessage = function (toUid, fromUsername, message, avatar, callback) {
  sendToMobile(toUid, {
    title: i18next.t('email.usermessage.subject', {username: fromUsername}),
    alert: message,
    type: 'usermessage'
  }, avatar, callback);
};

parse.userMention = function (toUid, fromUsername, roomIdentifier, message, avatar, callback) {
  sendToMobile(toUid, {
    title: i18next.t('email.usermention.subject', {username: fromUsername, roomname: roomIdentifier}),
    alert: message,
    type: 'usermention'
  }, avatar, callback);
};

parse.roomTopic = function (toUid, roomIdentifier, topic, avatar, callback) {
  sendToMobile(toUid, {
    title: i18next.t('email.roomtopic.subject', {roomname: roomIdentifier}),
    alert: topic,
    type: 'roomtopic'
  }, avatar, callback);
};

parse.roomMessage = function (toUid, roomIdentifier, message, avatar, callback) {
  sendToMobile(toUid, {
    title: i18next.t('email.roommessage.subject', {roomname: roomIdentifier}),
    alert: message,
    type: 'roommessage'
  }, avatar, callback);
};

parse.roomJoin = function (toUid, fromUsername, roomIdentifier, avatar, callback) {
  sendToMobile(toUid, {
    title: 'Donut.me',
    alert: i18next.t('email.roomjoin.subject', {roomname: roomIdentifier, username: fromUsername}),
    type: 'roomjoin'
  }, avatar, callback);
};

/** =========================================================================
 * roomRequestType
 * ========================================================================== */

parse.roomJoinRequest = function (toUid, fromUsername, roomIdentifier, avatar, callback) {
  sendToMobile(toUid, {
    title: i18next.t('email.roomjoinrequest.subject', {roomname: roomIdentifier}),
    alert: i18next.t('email.roomjoinrequest.content.title', {roomname: roomIdentifier, username: fromUsername}),
    type: 'roomjoinrequest'
  }, avatar, callback);
};

parse.roomAllowed = function (toUid, fromUsername, roomIdentifier, avatar, callback) {
  sendToMobile(toUid, {
    title: i18next.t('email.roomallow.subject', {roomname: roomIdentifier}),
    alert: i18next.t('email.roomallow.content.title', {roomname: roomIdentifier}),
    type: 'roomallowed'
  }, avatar, callback);
};

parse.roomRefuse = function (toUid, fromUsername, roomIdentifier, avatar, callback) {
  sendToMobile(toUid, {
    title: i18next.t('email.roomrefuse.subject', {roomname: roomIdentifier}),
    alert: i18next.t('email.roomrefuse.content.title', {roomname: roomIdentifier}),
    type: 'roomrefuse'
  }, avatar, callback);
};

parse.roomInvite = function (toUid, fromUsername, roomIdentifier, avatar, callback) {
  sendToMobile(toUid, {
    title: 'Donut.me',
    alert: i18next.t('email.roominvite.content.title', {roomname: roomIdentifier, username: fromUsername}),
    type: 'roominvite'
  }, avatar, callback);
};

parse.roomDelete = function (toUid, fromUsername, roomIdentifier, avatar, callback) {
  sendToMobile(toUid, {
    title: i18next.t('email.roomdelete.subject', {roomname: roomIdentifier}),
    alert: i18next.t('email.roomdelete.content.title', {roomname: roomIdentifier}),
    type: 'roomdelete'
  }, avatar, callback);
};

parse.roomCreate = function (toUid, fromUsername, roomIdentifier, avatar, callback) {
  sendToMobile(toUid, {
    title: i18next.t('email.roomcreate.subject', {roomname: roomIdentifier}),
    alert: i18next.t('email.roomcreate.content.title', {roomname: roomIdentifier, username: fromUsername}),
    type: 'roomcreate'
  }, avatar, callback);
};

/** =========================================================================
 * roomPromoteType
 * ========================================================================== */

parse.roomOp = function (toUid, roomIdentifier, avatar, callback) {
  sendToMobile(toUid, {
    title: i18next.t('email.roomop.subject', {roomname: roomIdentifier}),
    alert: i18next.t('email.roomop.content.title', {roomname: roomIdentifier}),
    type: 'roomOp'
  }, avatar, callback);
};

parse.roomDeop = function (toUid, roomIdentifier, avatar, callback) {
  sendToMobile(toUid, {
    title: i18next.t('email.roomdeop.subject', {roomname: roomIdentifier}),
    alert: i18next.t('email.roomdeop.content.title', {roomname: roomIdentifier}),
    type: 'roomDeop'
  }, avatar, callback);
};

parse.roomKick = function (toUid, roomIdentifier, avatar, callback) {
  sendToMobile(toUid, {
    title: 'Donut.me',
    alert: i18next.t('email.roomkick.content.title', {roomname: roomIdentifier}),
    type: 'roomKick'
  }, avatar, callback);
};

parse.roomBan = function (toUid, roomIdentifier, avatar, callback) {
  sendToMobile(toUid, {
    title: 'Donut.me',
    alert: i18next.t('email.roomban.content.title', {roomname: roomIdentifier}),
    type: 'roomBan'
  }, avatar, callback);
};

parse.roomDeban = function (toUid, roomIdentifier, avatar, callback) {
  sendToMobile(toUid, {
    title: 'Donut.me',
    alert: i18next.t('email.roomdeban.content.title', {roomname: roomIdentifier}),
    type: 'roomDeban'
  }, avatar, callback);
};

parse.roomVoice = function (toUid, roomIdentifier, avatar, callback) {
  sendToMobile(toUid, {
    title: 'Donut.me',
    alert: i18next.t('email.roomvoice.content.title', {roomname: roomIdentifier}),
    type: 'roomVoice'
  }, avatar, callback);
};

parse.roomDevoice = function (toUid, roomIdentifier, avatar, callback) {
  sendToMobile(toUid, {
    title: 'Donut.me',
    alert: i18next.t('email.roomdevoice.content.title', {roomname: roomIdentifier}),
    type: 'roomDevoice'
  }, avatar, callback);
};

/** =========================================================================
 * groupRequestType
 * ========================================================================== */

parse.groupJoinRequest = function (toUid, fromUsername, groupIdentifier, avatar, callback) {
  sendToMobile(toUid, {
    title: i18next.t('email.groupjoinrequest.subject', {groupname: groupIdentifier}),
    alert: i18next.t('email.groupjoinrequest.content.title', {groupname: groupIdentifier, username: fromUsername}),
    type: 'groupJoinRequest'
  }, avatar, callback);
};

parse.groupAllowed = function (toUid, fromUsername, groupIdentifier, avatar, callback) {
  sendToMobile(toUid, {
    title: i18next.t('email.groupallow.subject', {groupname: groupIdentifier}),
    alert: i18next.t('email.groupallow.content.title', {groupname: groupIdentifier}),
    type: 'groupAllowed'
  }, avatar, callback);
};

parse.groupRefuse = function (toUid, fromUsername, groupIdentifier, avatar, callback) {
  sendToMobile(toUid, {
    title: i18next.t('email.grouprefuse.subject', {groupname: groupIdentifier}),
    alert: i18next.t('email.grouprefuse.content.title', {groupname: groupIdentifier}),
    type: 'groupRefuse'
  }, avatar, callback);
};

parse.groupInvite = function (toUid, fromUsername, groupIdentifier, avatar, callback) {
  sendToMobile(toUid, {
    title: 'Donut.me',
    alert: i18next.t('email.groupinvite.content.title', {groupname: groupIdentifier, username: fromUsername}),
    type: 'groupInvite'
  }, avatar, callback);
};

parse.groupDisallow = function (toUid, fromUsername, groupIdentifier, avatar, callback) {
  sendToMobile(toUid, {
    title: 'Donut.me',
    alert: i18next.t('email.groupdisallow.content.title', {groupname: groupIdentifier}),
    type: 'groupDisallow'
  }, avatar, callback);
};

parse.groupBan = function (toUid, fromUsername, groupIdentifier, avatar, callback) {
  sendToMobile(toUid, {
    title: i18next.t('email.groupban.subject', {groupname: groupIdentifier}),
    alert: i18next.t('email.groupban.content.title', {groupname: groupIdentifier}),
    type: 'groupBan'
  }, avatar, callback);
};

parse.groupDeban = function (toUid, fromUsername, groupIdentifier, avatar, callback) {
  sendToMobile(toUid, {
    title: i18next.t('email.groupdeban.subject', {groupname: groupIdentifier}),
    alert: i18next.t('email.groupdeban.content.title', {groupname: groupIdentifier}),
    type: 'groupDeban'
  }, avatar, callback);
};

parse.groupOp = function (toUid, fromUsername, groupIdentifier, avatar, callback) {
  sendToMobile(toUid, {
    title: i18next.t('email.groupop.subject', {groupname: groupIdentifier}),
    alert: i18next.t('email.groupop.content.title', {groupname: groupIdentifier}),
    type: 'groupOp'
  }, avatar, callback);
};

parse.groupDeop = function (toUid, fromUsername, groupIdentifier, avatar, callback) {
  sendToMobile(toUid, {
    title: i18next.t('email.groupdeop.subject', {groupname: groupIdentifier}),
    alert: i18next.t('email.groupdeop.content.title', {groupname: groupIdentifier}),
    type: 'groupDeop'
  }, avatar, callback);
};