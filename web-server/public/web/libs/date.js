var i18next = require('i18next-client');
var $ = require('jquery');

module.exports = {
  longDate: function (date) {
    var myDate = new Date(date);
    return i18next.t('date.days.' + myDate.getDay()) + ' ' + myDate.getDate() + ' ' + i18next.t('date.months.' + myDate.getMonth()) + ' ' + myDate.getFullYear();
  },
  dateTime: function (date) {
    var myDate = new Date(date);
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
  longDateTime: function (date) {
    var myDate = new Date(date);
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
  shortTime: function (date) {
    var myDate = new Date(date);
    return myDate.getHours() + ':' + myDate.getMinutes();
  },
  shortDayMonth: function (date) {
    var myDate = new Date(date);
    var dayDate = myDate.getDate();
    var monthDate = (myDate.getMonth() + 1);
    return ((dayDate < 10) ? ('0' + dayDate) : dayDate) + '/' + ((monthDate < 10) ? ('0' + monthDate) : monthDate);
  },
  shortDayMonthTime: function (date) {
    var myDate = new Date(date);
    return myDate.getDate() + ' ' + i18next.t('date.months.' + myDate.getMonth()) + ', ' + this.shortTime(date);
  },
  shortMonthYear: function (date) {
    var myDate = new Date(date);
    var monthDate = (myDate.getMonth() + 1);
    return ((monthDate < 10) ? ('0' + monthDate) : monthDate) + '/' + myDate.getFullYear();
  },
  diffInDays: function (date) {
    var myDate = new Date(date);
    var currentDate = new Date();
    return Math.ceil((currentDate.getTime() - myDate.getTime()) / (1000 * 60 * 60 * 24));
  },
  from: function (format, $element) {
    format = format || 'fromnow';

    var element = $($element);
    var time = element.attr('data-time');
    if (!time) return;

    if (format === 'fromnow') {
      //element.text(dateObject.fromNow());
      return;
    } else if (format === 'date') {
      element.text(this.longDate(time));
    }
    element.attr('title', this.longDateTime(time));
  },
  test: function () {
    console.log('longDate(2015-09-02T13:52:13.083Z) :  mercredi 2 septembre 2015 >> ' + this.longDate('2015-09-02T13:52:13.083Z'));
    console.log('dateTime(2015-09-02T13:52:13.083Z) :  2 septembre 2015, 15:52:13 >> ' + this.dateTime('2015-09-02T13:52:13.083Z'));
    console.log('longDateTime(2015-09-02T13:52:13.083Z) :  mercredi 2 septembre 2015, 15:52:13 >> ' + this.longDateTime('2015-09-02T13:52:13.083Z'));
    console.log('shortTime(2015-09-02T13:52:13.083Z) :  15:52 >> ' + this.shortTime('2015-09-02T13:52:13.083Z'));
    console.log('shortDayMonth(2015-09-02T13:52:13.083Z) :  02/09 >> ' + this.shortDayMonth('2015-09-02T13:52:13.083Z'));
    console.log('shortDayMonthTime(2015-09-02T13:52:13.083Z) :  2 septembre, 15:52 >> ' + this.shortDayMonthTime('2015-09-02T13:52:13.083Z'));
    console.log('shortMonthYear(2015-09-02T13:52:13.083Z) :  09/2015 >> ' + this.shortMonthYear('2015-09-02T13:52:13.083Z'));
    console.log('diffInDays(2015-09-02T13:52:13.083Z) : 21 >> ' + this.diffInDays('2015-09-02T13:52:13.083Z'));
  }
};

