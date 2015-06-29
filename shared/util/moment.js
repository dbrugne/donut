var moment = require('../../node_modules/moment/moment');
var l = require('../../node_modules/moment/locale/fr');
var i18next = require('./i18next');

var momentFormat = (i18next.lng() == 'fr')
    ? {
    relativeTime: {
        future: "%s",
        past: "%s",
        s: "à l'instant",
        m: "1mn",
        mm: "%dmin",
        h: "1h",
        hh: "%dh",
        d: "hier",
        dd: "%d jours",
        M: "un mois",
        MM: "%d mois",
        y: "un an",
        yy: "%d ans"
    }
}
    : {
    relativeTime: {
        future: "%s",
        past: "%s",
        s: "just now",
        m: "1mn",
        mm: "%dmin",
        h: "1h",
        hh: "%dh",
        d: "yesterday",
        dd: "%d days",
        M: "one month",
        MM: "%d months",
        y: "one year",
        yy: "%d years"
    }
};

moment.locale(i18next.lng(), momentFormat);

module.exports = moment;