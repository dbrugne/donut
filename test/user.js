'use strict';
var chai = require('chai');
chai.should();

// init mongodb connection
require('../shared/io/mongoose')('mongodb://localhost:27017/mocha');

var UserModel = require('../shared/models/user');
var RoomModel = require('../shared/models/room');

function getEmptyModel (callback) {
  var model = new UserModel();
  model.save(function (err, doc) {
    return callback(err, doc);
  });
}

function getSampleModel () {
  return new UserModel({
    blocked: [{
      room: '560ac109c8d94d5628d3f1ab'
    }, {
      room: new RoomModel({_id: '560ac109c8d94d5628d3f000'})
    }]
  });
}

describe('user', function () {
  beforeEach(function (done) {
    UserModel.remove({}, done);
  });

  describe('.findBlocked()', function () {
    var model = getSampleModel();
    it('is function', function () {
      model.findBlocked.should.be.a('function');
    });
    it('find', function () {
      model.findBlocked('560ac109c8d94d5628d3f1ab').should.be.ok;
      model.findBlocked('560ac109c8d94d5628d3f000').should.be.ok;
    });
    it('not find', function () {
      (typeof model.findBlocked('notexist') === 'undefined').should.be.true;
    });
  });
  describe('.isRoomBlocked()', function () {
    it('is function', function () {
      var model = getSampleModel();
      model.isRoomBlocked.should.be.a('function');
    });
    it('is blocked', function () {
      var model = getSampleModel();
      model.isRoomBlocked('560ac109c8d94d5628d3f1ab').should.be.true;
      model.isRoomBlocked('560ac109c8d94d5628d3f000').should.be.true;
    });
    it('isn\'t blocked', function () {
      var model = getSampleModel();
      model.isRoomBlocked('560ac109c8d94d5628d3f222').should.be.false;
    });
  });
  describe('.isRoomBlocked()', function () {
    it('is function', function () {
      var model = getSampleModel();
      model.isRoomBlocked.should.be.a('function');
    });
    it('is blocked', function () {
      var model = getSampleModel();
      model.isRoomBlocked('560ac109c8d94d5628d3f1ab').should.be.true;
      model.isRoomBlocked('560ac109c8d94d5628d3f000').should.be.true;
    });
    it('isn\'t blocked', function () {
      var model = getSampleModel();
      model.isRoomBlocked('560ac109c8d94d5628d3f222').should.be.false;
    });
  });

  describe('.addBlockedRoom()', function () {
    it('is function', function () {
      var model = getSampleModel();
      model.addBlockedRoom.should.be.a('function');
    });
    it('not already exists', function (done) {
      getEmptyModel(function (err, model) {
        if (err) {
          return done(err);
        }
        model.addBlockedRoom('560ac109c8d94d5628d3f111', 'kick', 'watch me!', function (err) {
          if (err) {
            return done(err);
          }
          model.isRoomBlocked('560ac109c8d94d5628d3f111').should.be.true;
          model.findBlocked('560ac109c8d94d5628d3f111').why.should.equal('kick');
          model.findBlocked('560ac109c8d94d5628d3f111').reason.should.equal('watch me!');
          done();
        });
      });
    });
    it('already exists', function (done) {
      getEmptyModel(function (err, model) {
        if (err) {
          return done(err);
        }
        model.addBlockedRoom('560ac109c8d94d5628d3f222', 'kick', 'watch me!', function (err) {
          if (err) {
            return done(err);
          }
          model.addBlockedRoom('560ac109c8d94d5628d3f222', 'ban', 'watch me harder!', function (err) {
            if (err) {
              return done(err);
            }
            model.isRoomBlocked('560ac109c8d94d5628d3f222').should.be.true;
            model.findBlocked('560ac109c8d94d5628d3f222').why.should.equal('ban');
            model.findBlocked('560ac109c8d94d5628d3f222').reason.should.equal('watch me harder!');
            model.blocked.length.should.be.equal(1);
            done();
          });
        });
      });
    });
  });

  describe('.removeBlockedRoom()', function () {
    it('is function', function () {
      var model = getSampleModel();
      model.removeBlockedRoom.should.be.a('function');
    });
    it('not exists', function (done) {
      getEmptyModel(function (err, model) {
        if (err) {
          return done(err);
        }
        model.removeBlockedRoom('560ac109c8d94d5628d3f111', function (err) {
          if (err) {
            return done(err);
          }
          model.isRoomBlocked('560ac109c8d94d5628d3f111').should.be.false;
          done();
        });
      });
    });
    it('exists', function (done) {
      getEmptyModel(function (err, model) {
        if (err) {
          return done(err);
        }
        model.addBlockedRoom('560ac109c8d94d5628d3f111', 'kick', 'watch me!', function (err) {
          if (err) {
            return done(err);
          }
          model.isRoomBlocked('560ac109c8d94d5628d3f111').should.be.true;
          model.removeBlockedRoom('560ac109c8d94d5628d3f111', function (err) {
            if (err) {
              return done(err);
            }
            model.isRoomBlocked('560ac109c8d94d5628d3f111').should.be.false;
            done();
          });
        });
      });
    });
  });
});
