'use strict';
var logger = require('pomelo-logger').getLogger('web', __filename);
var express = require('express');
var router = express.Router();

var search = require('../../../shared/util/search');
router.get('/rest/search', function (req, res) {
  // @todo : only rooms on landing page ? So all following params are useless?
  var skip = {
    users: req.query.skip_users ? req.query.skip_users : 0,
    rooms: req.query.skip_rooms ? req.query.skip_rooms : 0,
    groups: req.query.skip_groups ? req.query.skip_groups : 0
  };
  var options = {
    users: false,
    rooms: true,
    groups: true,
    limit: {
      users: req.query.limit || 50,
      rooms: req.query.limit || 50,
      groups: req.query.limit || 50
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
