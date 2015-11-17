'use strict';
var logger = require('pomelo-logger').getLogger('web', __filename);
var express = require('express');
var router = express.Router();

var search = require('../../../shared/util/search');
router.get('/rest/search', function (req, res) {
  var skip = {
    rooms: req.query.skip_rooms ? req.query.skip_rooms : 0
  };
  var options = {
    rooms: true,
    limit: {
      rooms: req.query.limit || 50
    },
    skip: skip
  };
  search(
    req.query.q,
    options,
    function (err, results) {
      if (err) {
        logger.debug('rest/search error: ' + err);
        res.status(500).send('internal error');
      } else {
        res.status(200).send(results);
      }
    }
  );
});

module.exports = router;
