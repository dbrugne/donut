var async = require('async');
var _ = require('underscore');
var HistoryRoom = require('../shared/models/historyroom');
var HistoryOne = require('../shared/models/historyone');

module.exports = function(grunt) {

    /**
     * historyroom:
     * - delete ObjectId('5452aa0e9837489660ab19b1'), ObjectId('5452aa0e9837489660ab19af'), ObjectId('5452aa0e9837489660ab19b0')
     * - add user (<- data.user_id)
     * - add by_user (<- data.by_user_id)
     * - dry data.time
     *           .name
     *           .user_id
     *           .username
     *           .avatar
     *           .color
     *           .by_user_id
     *           .by_username
     *           .by_avatar
     *           .by_color
     */
    grunt.registerTask('pomelo-migration-room', function() {
        var done = this.async();
        grunt.log.ok('start migration (can take a while)');

        var start = Date.now();
        var count = {saved: 0, ignored: 0, error: 0};

        var dryFields = [
            'time',
            'name',
            'user_id',
            'username',
            'avatar',
            'color',
            'by_user_id',
            'by_username',
            'by_avatar',
            'by_color'
        ];

        async.waterfall([

            function removeInvalids(callback) {
                HistoryRoom.findOneAndRemove({ _id: '5452aa0e9837489660ab19b1' }, function() {});
                HistoryRoom.findOneAndRemove({ _id: '5452aa0e9837489660ab19af' }, function() {});
                HistoryRoom.findOneAndRemove({ _id: '5452aa0e9837489660ab19b0' }, function() {});
                return callback();
            },

            // @source: http://stackoverflow.com/questions/14867697/mongoose-full-collection-scan

            function prepare(callback) {
                var stream = HistoryRoom.find({user: {$exists: false}}).limit(50000).stream();
                var parallels = [];

                stream.on('data', function (doc) {
                    if (!doc.data || !doc.data.user_id) {
                        count.ignored ++;
                        return;
                    }

                    // user_id
                    doc.user = doc.data.user_id;

                    // by_user_id
                    if (doc.data.by_user_id)
                      doc.by_user = doc.data.by_user_id;

                    // data
                    var wet = _.clone(doc.data);
                    doc.data = _.omit(wet, dryFields);

                    // save
                    parallels.push(function(cb) {
                        doc.save(function(err) {
                            if (err) {
                                count.error ++;
                                grunt.log.error('Error on document saving: '+err);
                                return cb();
                            }

                            count.saved ++;
                            return cb();
                        });
                    });
                }).on('error', function (err) {
                    return callback('Error while iterating on history: '+err);
                }).on('close', function () {
                    return callback(null, parallels);
                });
            },

            function run(parallels, callback) {
                async.parallelLimit(parallels, 10, function(err) {
                    if (err)
                        return callback('Error while saving history: '+err);

                    return callback(null);
                });
            }


        ], function(err) {
            if (err) {
                grunt.log.error(err+' ');
                done();
            } else {
                var duration = Date.now() - start;
                grunt.log.ok('Successfully done ('+count.saved+' saved, '+count.ignored+' ignored, '+count.error+' error) in '+duration+'ms');
                done();
            }
        });

    });

    /**
     * historyone:
     * - dry data.time
     *           .to
     *           .from
     *           .from_username
     *           .from_user_id
     *           .from_avatar
     *           .from_color
     *           .to_user_id
     *           .to_username
     */
    grunt.registerTask('pomelo-migration-one', function() {
        var done = this.async();
        grunt.log.ok('start migration (can take a while)');

        var start = Date.now();
        var count = {saved: 0, ignored: 0, error: 0};

        var dryFields = [
            'time',
            'to',
            'from',
            'from_username',
            'from_user_id',
            'from_avatar',
            'from_color',
            'to_user_id',
            'to_username',
            'user_id', // user:on/offline
            'username', // user:on/offline
            'avatar', // user:on/offline
            'color', // user:on/offline
            'id', // ???
            'name' // fixed by _.clone
        ];

        async.waterfall([

            function removeInvalids(callback) {
                HistoryOne.findOneAndRemove({ _id: '547619218ba9ac9548671caa' }, function() {});
                return callback();
            },

            // @source: http://stackoverflow.com/questions/14867697/mongoose-full-collection-scan

            function prepare(callback) {
                var stream = HistoryOne.find({'data.to': {$exists: true}}).sort({_id: 'asc'}).limit(50000).stream();
                var parallels = [];

                stream.on('data', function (doc) {
                    if (!doc.data || !doc.data.to) {
                        count.ignored ++;
                        return;
                    }

                    // data
                    var wet = _.clone(doc.data);
                    if (doc.event == 'user:online' || doc.event == 'user:offline') {
                        doc.from = wet.from;
                        doc.to = wet.to;
                    }
                    doc.data = _.omit(wet, dryFields);

                    // save
                    parallels.push(function(cb) {
                        doc.save(function(err) {
                            if (err) {
                                count.error ++;
                                grunt.log.error('Error on document saving: '+err);
                                return cb();
                            }

                            count.saved ++;
                            return cb();
                        });
                    });
                }).on('error', function (err) {
                    return callback('Error while iterating on history: '+err);
                }).on('close', function () {
                    return callback(null, parallels);
                });
            },

            function run(parallels, callback) {
                async.parallelLimit(parallels, 10, function(err) {
                    if (err)
                        return callback('Error while saving history: '+err);

                    return callback(null);
                });
            }


        ], function(err) {
            if (err) {
                grunt.log.error(err+' ');
                done();
            } else {
                var duration = Date.now() - start;
                grunt.log.ok('Successfully done ('+count.saved+' saved, '+count.ignored+' ignored, '+count.error+' error) in '+duration+'ms');
                done();
            }
        });

    });
}
