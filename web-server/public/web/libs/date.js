var i18next = require('i18next-client');

module.exports = {
  longDate: function (date) { // dddd Do MMMM YYYY
    var myDate = new Date(date);
    if (isNaN(myDate)) {
      return;
    }
    return i18next.t('date.days.' + myDate.getDay()) + ' ' + myDate.getDate() + ' ' + i18next.t('date.months.' + myDate.getMonth()) + ' ' + myDate.getFullYear();
  },
  dateTime: function (date) { // Do MMMM YYYY, h:mm:ss
    var myDate = new Date(date);
    if (isNaN(myDate)) {
      return;
    }
    return myDate.getDate() +
      ' ' +
      i18next.t('date.months.' + myDate.getMonth()) +
      ' ' +
      myDate.getFullYear() +
      ', ' +
      this.shortTime(date) +
      ':' +
      myDate.getSeconds();
  },
  longDateTime: function (date) { // dddd Do MMMM YYYY à HH:mm:ss
    var myDate = new Date(date);
    if (isNaN(myDate)) {
      return;
    }
    return i18next.t('date.days.' + myDate.getDay()) +
      ' ' +
      myDate.getDate() +
      ' ' +
      i18next.t('date.months.' + myDate.getMonth()) +
      ' ' +
      myDate.getFullYear() +
      ', ' +
      this.shortTime(date) +
      ':' +
      myDate.getSeconds();
  },
  shortTime: function (date) { // HH:mm
    var myDate = new Date(date);
    if (isNaN(myDate)) {
      return;
    }
    var h = myDate.getHours();
    var m = myDate.getMinutes();
    return ((h < 10) ? '0' : '') + h + ':' + ((m < 10) ? '0' : '') + m;
  },
  shortTimeSeconds: function (date) { // HH:mm::ss
    var myDate = new Date(date);
    if (isNaN(myDate)) {
      return;
    }
    return this.shortTime(date) + ':' + myDate.getSeconds();
  },
  shortDayMonth: function (date) { // DD/MM
    var myDate = new Date(date);
    if (isNaN(myDate)) {
      return;
    }
    var dayDate = myDate.getDate();
    var monthDate = (myDate.getMonth() + 1);
    return ((dayDate < 10) ? ('0' + dayDate) : dayDate) + '/' + ((monthDate < 10) ? ('0' + monthDate) : monthDate);
  },
  dayMonthTime: function (date) { // Do MMMM, HH:mm
    var myDate = new Date(date);
    if (isNaN(myDate)) {
      return;
    }
    return myDate.getDate() + ' ' + i18next.t('date.months.' + myDate.getMonth()) + ', ' + this.shortTime(date);
  },
  shortDayMonthTime: function (date) { // D/MM, HH:mm
    var myDate = new Date(date);
    if (isNaN(myDate)) {
      return;
    }
    return this.shortDayMonth(date) + ', ' + this.shortTime(date);
  },
  shortMonthYear: function (date) { // MM/YYYY
    var myDate = new Date(date);
    if (isNaN(myDate)) {
      return;
    }
    var monthDate = (myDate.getMonth() + 1);
    return ((monthDate < 10) ? ('0' + monthDate) : monthDate) + '/' + myDate.getFullYear();
  },
  diffInDays: function (date) {
    var myDate = new Date(date);
    if (isNaN(myDate)) {
      return '';
    }
    var currentDate = new Date();
    return Math.floor((currentDate.getTime() - myDate.getTime()) / (1000 * 60 * 60 * 24));
  },
  isSameDay: function (newDate, previousDate) {
    var sameNewDate = new Date(newDate);
    var samePreviousDate = new Date(previousDate);

    if (isNaN(sameNewDate) || isNaN(samePreviousDate)) {
      return false;
    }
    return ((sameNewDate.getDate() === samePreviousDate.getDate()) &&
      (sameNewDate.getMonth() === samePreviousDate.getMonth()) &&
      (sameNewDate.getFullYear() === samePreviousDate.getFullYear()));
  },
  from: function (format, $element) {
    format = format || 'fromnow';
    if (!$element) return;
    var time = $element.attr('data-time');
    if (!time) return;

    if (format === 'fromnow') {
      $element.text(this.fromnow(time));
      return;
    } else if (format === 'date') {
      $element.text(this.longDate(time));
    }
    $element.attr('title', this.longDateTime(time));
  },
  fromnow: function (date) {
    var myDate = new Date(date);
    if (isNaN(myDate)) {
      return;
    }
    var currentDate = new Date();
    var diff = currentDate.getTime() - myDate.getTime();

    if (Math.abs(diff / 1000) < 60) {
      return i18next.t('date.relativetime.s');
    }
    if (Math.abs(diff / 1000) < 120) {
      return i18next.t('date.relativetime.m');
    }
    var diffMinutes = Math.floor((diff / 1000) / 60);
    if (diffMinutes < 60) {
      return i18next.t('date.relativetime.mm', {minutes: diffMinutes});
    }
    if (diffMinutes < 120) {
      return i18next.t('date.relativetime.h');
    }
    var diffHours = Math.floor(((diff / 1000) / 60) / 60);
    if (diffHours < 24) {
      return i18next.t('date.relativetime.hh', {hours: diffHours});
    }
    if (diffHours < 48) {
      return i18next.t('date.relativetime.d');
    }
    var diffDays = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (diffDays < 30) {
      return i18next.t('date.relativetime.dd', {days: diffDays});
    }
    if (diffDays < 60) {
      return i18next.t('date.relativetime.M');
    }
    var diffMonths = Math.floor(diff / (1000 * 60 * 60 * 24 * 30));
    if (diffMonths < 12) {
      return i18next.t('date.relativetime.MM', {months: diffMonths});
    }
    if (diffMonths < 24) {
      return i18next.t('date.relativetime.y');
    }
    var diffYears = Math.floor(diff / (1000 * 60 * 60 * 24 * 30 * 12));
    return i18next.t('date.relativetime.yy', {years: diffYears});
  },
  block: function (date) {
    var days = this.diffInDays(date);
    if (days === 0) {
      return i18next.t('chat.message.today');
    } else if (days === 1) {
      return i18next.t('chat.message.yesterday');
    } else if (days === 2) {
      return i18next.t('chat.message.the-day-before');
    } else {
      return this.longDate(date);
    }
  }
};
