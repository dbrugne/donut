var express = require('express');
var router = express.Router();
var i18next = require('../../../shared/util/i18next');
var bouncer = require('../middlewares/bouncer');
var conf = require('../../../config/index');

router.get('/create', function(req, res) {

  var meta = {
    title         : i18next.t("title.create"),
    description   : i18next.t("title.create"),
    ogtitle       : i18next.t("title.create"),
    ogdescription : i18next.t("title.create"),
    oglocale      : i18next.t("meta.locale"),
    ogalternate   : i18next.t("meta.alternate"),
    image         : i18next.t("title.create"),
    type          : 'object'
  };

  res.render('create', {
    meta: meta
  });
});

module.exports = router;