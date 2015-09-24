var $ = require('jquery');
var _ = require('underscore');
var common = require('@dbrugne/donut-common/browser');
var i18next = require('i18next-client');
var date = require('./date');

var exports = module.exports = {};

exports.renderAndInsert = function (event, previous, container) {

};

exports.prepare = function (event, discussion) {
  var data = event.toJSON();
  data.data = _.clone(event.get('data'));

  // spammed & edited
  if (event.getGenericType() === 'message') {
    data.spammed = (event.get('spammed') === true);
    data.edited = (event.get('edited') === true);
  }

  // avatar
  if (event.get('data').avatar) {
    data.data.avatar = common.cloudinary.prepare(event.get('data').avatar, 30);
  }
  if (event.get('data').by_avatar) {
    data.data.by_avatar = common.cloudinary.prepare(event.get('data').by_avatar, 30);
  }

  if (data.data.message || data.data.topic) {
    var subject = data.data.message || data.data.topic;
    subject = common.markup.toHtml(subject, {
      template: require('../templates/markup.html'),
      style: 'color: ' + discussion.get('color')
    });

    subject = $.smilify(subject);

    if (data.data.message) {
      data.data.message = subject;
    } else {
      data.data.topic = subject;
    }
  }

  // images
  if (data.data.images) {
    var images = [];
    _.each(data.data.images, function (i) {
      images.push({
        url: common.cloudinary.prepare(i, 1500, 'limit'),
        thumbnail: common.cloudinary.prepare(i, 50, 'fill')
      });
    });

    if (images && images.length > 0) {
      data.data.images = images;
    }
  }

  // date
  var time = event.get('time');
  // @todo sp : bundle following logic in a libs/date.eventDate function
  var dateObject = new Date(time);
  var diff = (Date.now() - dateObject.getTime().valueOf()) / 1000;
  if (diff <= 86400) {
    data.data.dateshort = date.shortTime(time);
  } else if (diff <= 604800) {
    data.data.dateshort = (isNaN(dateObject)) ? '' : i18next.t('date.days.' + dateObject.getDay());
  } else if (2592000) {
    data.data.dateshort = date.shortDayMonth(time);
  } else {
    data.data.dateshort = date.shortMonthYear(time);
  }
  data.data.datefull = date.longDateTime(time);

  // rendering attributes
  data.unviewed = !!event.get('unviewed');

  return data;
};

exports.block = function (event, html) {
  var template;
  if (event.getGenericType() === 'message') {
    template = require('../templates/event/block-message.html');
  } else if (event.getGenericType() === 'inout') {
    template = require('../templates/event/block-status.html');
  } else {
    return html;
  }
  var data = {
    items: html,
    data: event.get('data')
  };
  data.data.avatar = common.cloudinary.prepare(data.data.avatar, 30);
  return template(data);
};

exports.render = function (event, discussion) {
  var data = this.prepare(event, discussion);
  try {
    var template;
    switch (data.type) {
      case 'room:in':
        if (event.getGenericType() === 'hello') {
          template = require('../templates/event/hello.html');
          data.name = discussion.get('name');
          data.mode = discussion.get('mode');
          data.username = discussion.get('owner').get('username');
        } else {
          template = require('../templates/event/in-out-on-off.html');
        }
        break;
      case 'user:online':
      case 'user:offline':
      case 'room:out':
        template = require('../templates/event/in-out-on-off.html');
        break;
      case 'ping':
        template = require('../templates/event/ping.html');
        break;
      case 'room:message':
      case 'user:message':
        template = require('../templates/event/message.html');
        break;
      case 'room:deop':
        template = require('../templates/event/room-deop.html');
        break;
      case 'room:kick':
        template = require('../templates/event/room-kick.html');
        break;
      case 'room:ban':
        template = require('../templates/event/room-ban.html');
        break;
      case 'room:deban':
        template = require('../templates/event/room-deban.html');
        break;
      case 'room:voice':
        template = require('../templates/event/room-voice.html');
        break;
      case 'room:devoice':
        template = require('../templates/event/room-devoice.html');
        break;
      case 'room:op':
        template = require('../templates/event/room-op.html');
        break;
      case 'room:topic':
        template = require('../templates/event/room-topic.html');
        break;
      case 'user:ban':
        template = require('../templates/event/user-ban.html');
        break;
      case 'user:deban':
        template = require('../templates/event/user-deban.html');
        break;
      case 'command:help':
        template = require('../templates/event/help.html');
        break;
      default:
        return;
    }
    return template(data);
  } catch (e) {
    console.error('Render exception, see below', e);
    return false;
  }
};

// @todo : migrate date block here
// @todo : implement a global addEvent(event, previous, container)
