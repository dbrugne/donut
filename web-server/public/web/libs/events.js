var $ = require('jquery');
var _ = require('underscore');
var common = require('@dbrugne/donut-common/browser');
var date = require('./date');
var app = require('../libs/app');

var templates = {
  'hello': require('../templates/event/block-hello.html'),
  'command:help': require('../templates/event/help.html'),
  'ping': require('../templates/event/ping.html'),
  'user:online': require('../templates/event/status.html'),
  'user:offline': require('../templates/event/status.html'),
  'room:out': require('../templates/event/status.html'),
  'room:in': require('../templates/event/status.html'),
  'room:message': require('../templates/event/message.html'),
  'room:message:cant:respond': require('../templates/event/message-cant-respond.html'),
  'user:message': require('../templates/event/message.html'),
  'room:topic': require('../templates/event/room-topic.html'),
  'room:deop': require('../templates/event/promote.html'),
  'room:kick': require('../templates/event/promote.html'),
  'room:ban': require('../templates/event/promote.html'),
  'room:deban': require('../templates/event/promote.html'),
  'room:voice': require('../templates/event/promote.html'),
  'room:devoice': require('../templates/event/promote.html'),
  'room:op': require('../templates/event/promote.html'),
  'room:groupban': require('../templates/event/group-promote.html'),
  'room:groupdisallow': require('../templates/event/group-promote.html'),
  'user:ban': require('../templates/event/user-promote.html'),
  'user:deban': require('../templates/event/user-promote.html')
};

var exports = module.exports = function (options) {
  this.discussion = options.model;
  this.currentUserId = options.currentUserId;
  this.$el = options.el; // at this time it's empty
  this.empty = true;
  this.topEvent = '';
  this.bottomEvent = '';
};

exports.prototype.insertBottom = function (type, data) {
  var event = this._data(type, data);

  var id = event.data.id;
  if (this.$el.find('#' + id).length && type !== 'room:message:cant:respond') {
    return console.warn('history and realtime event colision', id);
  }

  var previous = this.bottomEvent;

  var html = '';

  // new date block
  if (!previous || !date.isSameDay(event.data.time, previous.data.time)) {
    html += require('../templates/event/block-date.html')({
      time: event.data.time,
      date: date.block(event.data.time)
    });
  }

  // new message block
  if (this.block(event, previous)) {
    html += this.renderBlockUser(event);
  }

  // render event
  html += this._renderEvent(event);

  // previous saving
  if (!this.topEvent && !this.bottomEvent) {
    this.topEvent = this.bottomEvent = event; // first inserted element
  } else {
    this.bottomEvent = event;
  }

  this.empty = false;
  this.$el.append(html);
};

exports.prototype.insertTop = function (events) {
  if (events.length === 0) {
    return;
  }
  this.$unviewedContainer = this.$el.closest('.discussion').find('.date-ctn').find('.ctn-unviewed');

  var html = '';
  var previous;
  _.each(events, _.bind(function (e) {
    var event = this._data(e.type, e.data);
    var firstUnviewed = (this.discussion.get('first_unviewed') === event.data.id);

    // try to render event (before)
    var _html = this._renderEvent(event);
    if (!_html) {
      return;
    }

    // new message block
    if (this.block(event, previous)) {
      _html = this.renderBlockUser(event) + _html;
    }

    // new unviewed block
    if (firstUnviewed) {
      console.log('PREMIER TROUVEEEEEE');
      _html = require('../templates/event/block-unviewed.html')({
        time: event.data.time
      }) + _html;
      this.$unviewedContainer.html(require('../templates/event/block-unviewed-top.html')({
        time: event.data.time,
        date: date.longDateTime(event.data.time)
      }));
    }

    // new date block
    if (!previous || !date.isSameDay(event.data.time, previous.data.time)) {
      _html = require('../templates/event/block-date.html')({
        time: event.data.time,
        date: date.block(event.data.time)
      }) + _html;
    }

    html += _html;
    if (!previous) {
      // first event in events will be the new this.topEvent for next batch
      this.topEvent = event;
    }
    previous = event;
    if (this.empty) {
      // empty DOM, bottom element will be the last of this loop
      this.bottomEvent = event;
    }
  }, this));

  if (!this.empty) {
    // remove systematically first date block in $el
    this.$el.find('.block.date:first').remove();
  }

  this.empty = false;
  this.$el.prepend(html);
};

exports.prototype.replaceLastDisconnectBlock = function ($lastDisconnectBlock, $previousEventDiv, events) {
  if (!events.length) {
    $lastDisconnectBlock.replaceWith('');
    return;
  }

  events = events.reverse();

  var html = '';
  var previous;
  _.each(events, _.bind(function (e) {
    var event = this._data(e.type, e.data);

    // try to render event (before)
    var _html = this._renderEvent(event);
    if (!_html) {
      return;
    }

    // new message block
    if ((previous && this.block(event, previous)) || (!previous && event.data.user_id !== $previousEventDiv.data('userId'))) {
      _html = this.renderBlockUser(event) + _html;
    }

    // new date block
    if ((!previous && !date.isSameDay(event.data.time, $previousEventDiv.data('time'))) ||
      (previous && !date.isSameDay(event.data.time, previous.data.time))) {
      _html = require('../templates/event/block-date.html')({
        time: event.data.time,
        date: date.block(event.data.time)
      }) + _html;
    }

    previous = event;
    this.bottomEvent = event;
    html += _html;
  }, this));

  this.empty = false;
  $lastDisconnectBlock.replaceWith(html);
};

exports.prototype.block = function (event, previous) {
  var messagesTypes = [ 'room:message', 'user:message' ];
  if (messagesTypes.indexOf(event.type) === -1) {
    return false;
  }
  if (!previous) {
    return true;
  }
  if (messagesTypes.indexOf(previous.type) === -1 && previous.type !== 'room:message:cant:respond') {
    return true;
  }
  if (!date.isSameDay(event.data.time, previous.data.time)) {
    return true;
  }
  return event.data.user_id !== previous.data.user_id;
};

/**
 * event {
 *   type: String,
 *   data: {}
 * }
 */
exports.prototype._data = function (type, data) {
  if (!type) {
    return;
  }

  data = (!data) ? {} : _.clone(data);

  data.id = data.id || _.uniqueId('auto_');
  data.time = data.time || Date.now();

  // special: hello block
  if (type === 'room:in' && this.currentUserId === data.user_id) {
    type = 'hello';
    data.identifier = this.discussion.get('identifier');
    data.mode = this.discussion.get('mode');
    data.allow_user_request = this.discussion.get('allow_user_request');
    data.group_name = this.discussion.get('group_name');
    data.group_id = this.discussion.get('group_id');
    data.owner_username = this.discussion.get('owner_username');
    data.owner_id = this.discussion.get('owner_id');
  }

  data.type = type.replace(':', '');
  data.stype = type.replace('room:', '').replace('user:', '');

  // spammed & edited
  data.spammed = (data.spammed === true);
  data.edited = (data.edited === true);

  // avatar
  if (data.avatar) {
    data.avatar = common.cloudinary.prepare(data.avatar, 40);
  }
  if (data.by_avatar) {
    data.by_avatar = common.cloudinary.prepare(data.by_avatar, 40);
  }
  if (data.to_avatar) {
    data.to_avatar = common.cloudinary.prepare(data.to_avatar, 40);
  }

  // user:promote
  if (data.to_user_id) {
    data.target = (app.user.get('user_id') === data.to_user_id)
      ? 'me'
      : 'other';
  }

  if (data.message || data.topic) {
    var subject = data.message || data.topic;
    subject = common.markup.toHtml(subject, {
      template: require('../templates/markup.html'),
      style: 'color: ' + this.discussion.get('color')
    });

    // @todo dbr : replace with UTF-8 emojis
    subject = $.smilify(subject);

    if (data.message) {
      data.message = subject;
    } else {
      data.topic = subject;
    }
  }

  // files
  if (data.files) {
    var files = [];
    _.each(data.files, function (f) {
      if (f.type !== 'raw') {
        f.href = common.cloudinary.prepare(f.url, 1500, 'limit');
        f.thumbnail = common.cloudinary.prepare(f.url, 100, 'fill');
      }
      files.push(f);
    });

    if (files && files.length > 0) {
      data.files = files;
    }
  }

  // date
  data.dateshort = date.shortTime(data.time);
  data.datefull = date.longDateTime(data.time);

  return {
    type: type,
    data: data
  };
};

exports.prototype.renderBlockUser = function (event) {
  var html = '';
  try {
    html = require('../templates/event/block-user.html')(event);
  } catch (e) {
    console.error('render exception: ' + event.type, e);
  }
  return html;
};

exports.prototype._renderEvent = function (event) {
  try {
    var template = templates[event.type];
    if (!template) {
      console.warn('render was unable to find template: ' + event.type);
      return ''; // avoid 'undefined'
    }
    return template(event);
  } catch (e) {
    console.error('render exception, see below: ' + event.type, e);
    return ''; // avoid 'undefined'
  }
};
