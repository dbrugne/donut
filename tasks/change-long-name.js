var _ = require('underscore');
var async = require('async');
var RoomModel = require('../shared/models/room');

module.exports = function (grunt) {
  grunt.registerTask('change-long-name', 'change long room name', function () {
    var done = this.async();
    grunt.log.ok('starting');
    grunt.log.ok('...');
    var count = {
      room: { found: 0, good: 0, bad: 0, changed: 0},
    };

    var longRoomname = [
      "cosplay_manga_mania",
      "GraphCode-Universe",
      "framboisechocolat",
      "WTCetANTOINEDANIEL",
      "DONUT_A_LA_FRAISE",
      "Au_Pays_des_Mangas",
      "World-of-Warplane",
      "AjisaiFanGraphicArts",
      "LaGuerreDesClans",
      "LesTaresFontDuSki",
      "BetisesPleinLaTete",
      "YumeGyakusetsuFans",
      "Warmachine_Horde",
      "TuVeuxVoirMaCorne",
      "donutreconnaissance",
      "Jeu_Du_Soir_Bonsoir",
      "Loup-Garous-En-Ligne",
      "ActionStingyTruth",
      "Retour_vers_le_futur",
      "LeCoinDesDessineux",
      "LeDonutDissident",
      "Les_Fans_De_Viandes",
      "Dessins-FansArts",
      "LesfanVideo_Youtube",
      "Otakus-Mafia-World4",
      "Super_Village_Ninja",
      "IllustratriceEnHerbe",
      "Les_fans-duDELIRE_XD",
      "ApprendreLeJaponais",
      "DonutDeEsoterisme",
      "Aide_Informatique",
      "mode_japonaise_3^",
      "Otakus-Mafia-World",
      "SurLeDosDeLaLicorne",
      "LicorneRoseInvisible",
      "-_-sebabass_dev-_-",
      "testyoannprivate",
      "thelegendofzelda",
      "Subreddit_RFrance",
      "Framerkork_project",
      "ActionPaintballWH",
      "Je_Suis_Un_Donut",
      "Lolternet_over_9000",
      "WakfutchatDonuts",
      "The_Walking_Dead",
      "GuildeWakfuLenald",
      "AIRSOFTrhonesalpes",
      "video-game-retro",
      "Otakucelibataire",
      "PoneyLicornePandaPik",
      "PresentsAParisManga",
      "Dessins-FansArts",
      "AnnversaireEddycr",
      "FairyTailImgInedites",
      "JCulture_Anime_Manga",
      "Lantre-des-Panda",
      "Mangas-Adaptations",
      "PandoraVillageNinja",
      "ParleDeTaMusique",
      "YumeIsOurGoddess",
      "YumeSamaWeLoveYou",
      "ledonjondeNaheulbeuk",
      "marketingLEANantes",
      "mondialDeLAuto2014",
      "AddictPandoraHearts"
    ];

    var changeName = [
      "CosplayManga",
      "GraphCode",
      "framboisechoco",
      "WTCANTOINEDANI",
      "DONUTALAFRAISE",
      "AuPaysdMangas",
      "WorldofWarplan",
      "AjisaiGraphic",
      "GuerreDesClans",
      "TaresFontDuSki",
      "BetisesPleinLa",
      "YumeGyakusetsu",
      "WarmachineHord",
      "TuVeuxVoirMaCo",
      "reconnaissance",
      "Jeu_Du_Soir",
      "Loup-Garous",
      "ActionStingyTr",
      "RetourVleFutur",
      "CoinDessineux",
      "DonutDissident",
      "FansViandes",
      "Dessins-FanArt",
      "fanVideoYoutub",
      "OtakMafiaWorld",
      "Village_Ninja",
      "Illustratrice",
      "FansduDELIREXD",
      "ApprendreLeJap",
      "DonutEsoterism",
      "AideInformatic",
      "mode_japonaise",
      "OtakuMafiaWrld",
      "SurDosLicorne",
      "LicorneRose",
      "sebabass_dev",
      "testyoann",
      "legendofzelda",
      "SubreddRFrance",
      "Framerkork",
      "ActionPaintbal",
      "JeSuisUnDonut",
      "Lolternet",
      "WakfutchatDonu",
      "TheWalkingDead",
      "GuildeWakfuLen",
      "AIRSOFT_rAlpes",
      "VideoGameRetro",
      "Otakucelib",
      "PoneyLicorne",
      "AParisManga",
      "DessinsFanArt",
      "AnnivEddycr",
      "FairyTailImg",
      "JCultAnimManga",
      "LantreDesPanda",
      "Mangas-Adapt",
      "PandoraVillage",
      "ParleDeTaMusic",
      "YumeIsGoddess",
      "YumeSamaLoveU",
      "donjonNaheulbe",
      "MTKGLEANantes",
      "mondialAuto14",
      "PandoraHearts"
    ];

    var longIterator = function (model, fn) {

      var type = 'room';

      count.room.found++;
      if (model.name && model.name.length > 15) {
        count[type].bad++;
        _.find(longRoomname, function(name, index, fn) {
          if (name === model.name) {
            model.name = changeName[index];
            model.save(function (err) {
              if (err) {
                return fn(err);
              }
              grunt.log.ok('long name :' + model.name + ' change name : ' + changeName[index]);
              count.room.changed++;
            });
          }
        });
      } else {
        count[type].good++;
      }
      fn(null);
    };

    async.series([

      function roomsName (callback) {
        RoomModel.find({}, 'name', function (err, models) {
          if (err) {
            return callback(err);
          }

          async.eachSeries(models, longIterator, callback);
        });
      },
    ], function (err) {
      if (err) {
        grunt.log.error(err + ' ');
        return done();
      }
      grunt.log.ok('Rooms : ' + count.room.found + ' name(s) found [ ' + count.room.bad + ' long name(s) and ' + count.room.good + ' good name(s) and ' + count.room.changed + ' changed ]');
      grunt.log.ok('Successfully done');
      done();
    })
  });
};
