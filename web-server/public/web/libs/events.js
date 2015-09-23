var $ = require('jquery');
var _ = require('underscore');
var common = require('@dbrugne/donut-common/browser');
var i18next = require('i18next-client');
var date = require('./date');

var exports = module.exports = {};

exports.prepare = function (event, discussion) {
  var data = event.toJSON();
  data.data = _.clone(event.get('data'));

  // spammed & edited
  if (event.getGenericType() === 'message') {
    data.spammed = (event.get('spammed') === true);
    data.edited = (event.get('edited') === true);
  }

  // avatar
  var size = (event.getGenericType() !== 'inout')
    ? 30
    : 20;
  if (event.get('data').avatar) {
    data.data.avatar = common.cloudinary.prepare(event.get('data').avatar, size);
  }
  if (event.get('data').by_avatar) {
    data.data.by_avatar = common.cloudinary.prepare(event.get('data').by_avatar, size);
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