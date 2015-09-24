var $ = require('jquery');
var _ = require('underscore');
var common = require('@dbrugne/donut-common/browser');
var date = require('./date');

var templates = {
  'hello': require('../templates/event/block-hello.html'),
  'user:online': require('../templates/event/status.html'),
  'user:offline': require('../templates/event/status.html'),
  'room:out': require('../templates/event/status.html'),
  'room:in': require('../templates/event/status.html'),
  'ping': require('../templates/event/ping.html'),
  'room:message': require('../templates/event/message.html'),
  'user:message': require('../templates/event/message.html'),
  'room:deop': require('../templates/event/room-deop.html'),
  'room:kick': require('../templates/event/room-kick.html'),
  'room:ban': require('../templates/event/room-ban.html'),
  'room:deban': require('../templates/event/room-deban.html'),
  'room:voice': require('../templates/event/room-voice.html'),
  'room:devoice': require('../templates/event/room-devoice.html'),
  'room:op': require('../templates/event/room-op.html'),
  'room:topic': require('../templates/event/room-topic.html'),
  'user:ban': require('../templates/event/user-ban.html'),
  'user:deban': require('../templates/event/user-deban.html'),
  'command:help': require('../templates/event/help.html')
};

var exports = module.exports = function (options) {
  this.discussion = options.model;
  this.$el = options.$el;
  this.topEvent = '';
  this.bottomEvent = '';
};

exports.prototype.render = function (event, direction) {
  var previous = (direction === 'top')
    ? this.topEvent
    : this.bottomEvent;

  var html = '';

  // new date block
  if (!previous || !date.isSameDay(event.get('time'), previous.get('time'))) {
    html += require('../templates/event/block-date.html')({
      time: event.get('time'),
      date: date.block(event.get('time'))
    });
  }

  // new message block
  if (this.block(event, previous)) {
    html += require('../templates/event/block-user.html')({
      user_id: event.get('data').user_id,
      username: event.get('data').username,
      avatar: common.cloudinary.prepare(event.get('data').avatar, 30)
    });
  }

  // render event
  html += this._render(event.get('type'), this._data(event));

  // previous
  if (direction === 'top') {
    this.topEvent = event;
  } else {
    this.bottomEvent = event;
  }

  return html;
};

exports.prototype.block = function (event, previous) {
  var messagesTypes = [ 'room:message', 'user:message' ];
  if (messagesTypes.indexOf(event.get('type')) === -1) {
    return false;
  }
  if (!previous) {
    console.log('previous');
    return true;
  }
  if (messagesTypes.indexOf(previous.get('type')) === -1) {
    console.log('notmess2');
    return true;
  }
  if (!date.isSameDay(event.get('time'), previous.get('time'))) {
    console.log('date');
    return true;
  }
  if (event.get('data').user_id !== previous.get('data').user_id) {
    console.log('notuse');
    return true;
  }
  return false;
};

exports.prototype._data = function (event) {
  var data = event.toJSON();
  data.data = _.clone(event.get('data'));

  // room
  data.name = this.discussion.get('name');
  data.mode = this.discussion.get('mode');
  data.owner = this.discussion.get('owner').get('username');

  // spammed & edited
  data.spammed = (event.get('spammed') === true);
  data.edited = (event.get('edited') === true);

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
      style: 'color: ' + this.discussion.get('color')
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
  data.data.dateshort = date.shortTime(time);
  data.data.datefull = date.longDateTime(time);

  // rendering attributes
  data.unviewed = !!event.get('unviewed');

  return data;
};
exports.prototype._render = function (type, data) {
  try {
    return templates[type](data);
  } catch (e) {
    console.error('render exception, see below', e);
    return false;
  }
};

