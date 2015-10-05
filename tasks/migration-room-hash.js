var async = require('async');
var RoomModel = require('../shared/models/room');

module.exports = function (grunt) {
  grunt.registerTask('migration-room-hash', function () {
    var done = this.async();

    async.waterfall([

      function (callback) {
        RoomModel.find({}).exec(function (err, rooms) {
          if (err) {
            return callback(err);
          }

          async.eachSeries(rooms, function (room, cb) {
            room.name = room.name.replace('#', '').replace('^', '');
            if (room.name.length > 20) {
              grunt.log.error('too long room name: ', room.name, room.name.length);
            }
            /* else if (room.name.length === 20) {
             grunt.log.warn('almost too long room name: ', room.name, room.name.length);
             }*/

            if (room.name === 'Ajisai-FanGraphicArts') {
              room.name = 'AjisaiFanGraphicArts'; // 21-20
            }
            if (room.name === 'PoneyLicornePandaPika') {
              room.name = 'PoneyLicornePandaPika'; // 21-
            }
            if (room.name === 'DesBetisesPleinLaTete') {
              room.name = 'BetisesPleinLaTete'; // 21-18
            }
            if (room.name === 'YumeGyakusetsuFanClub') {
              room.name = 'YumeGyakusetsuFans'; // 21-18
            }
            if (room.name === 'LesPresentsDeParisManga') {
              room.name = 'PresentsAParisManga'; // 22-19
            }
            if (room.name === 'FairyTailImageInedites') {
              room.name = 'FairyTailImgInedites'; // 22-20
            }
            if (room.name === 'J-Culture_Anime_Manga') {
              room.name = 'JCulture_Anime_Manga'; // 21-20
            }
            if (room.name === 'Pandora_Village_Ninja') {
              room.name = 'PandoraVillageNinja'; // 21-19
            }
            if (room.name === 'mondialDeLAutomobile2014') {
              room.name = 'mondialDeLAuto2014'; // 24-18
            }
            if (room.name === 'PiyoSurLeDosDeLaLicorne') {
              room.name = 'PiyoSurLeDosDeLaLicorne'; // 23-
            }
            if (room.name === 'Licorne_Rose_Invisible') {
              room.name = 'LicorneRoseInvisible'; // 22-20
            }
            if (room.name === 'Le-coin-des-dessineux') {
              room.name = 'LeCoinDesDessineux'; // 21-18
            }

            room.save(cb);
          }, callback);
        });
      }

    ], function (err) {
      if (err) {
        grunt.log.error(err);
      }
      done(err);
    });
  });
};
