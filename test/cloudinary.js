var _ = require('underscore');
var chai = require('chai');
chai.should();

var cloudinary = require('../shared/util/cloudinary');
var UserModel = require('../shared/models/user');
var RoomModel = require('../shared/models/room');

describe('shared/util/cloudinary', function () {

  describe('.roomAvatar()', function () {
    it('is function', function () {
      cloudinary.roomAvatar.should.be.a('function');
    });
    it('without identifier', function () {
      cloudinary.roomAvatar('').should.equal('https://res.cloudinary.com/roomly/image/upload/b_rgb:ffffff,c_fill,d_room-avatar-default.png,f_jpg,g_face,h___height__,w___width__/room-avatar-default');
    });
    it('color', function () {
      cloudinary.roomAvatar('', '#123456').should.equal('https://res.cloudinary.com/roomly/image/upload/b_rgb:123456,c_fill,d_room-avatar-default.png,f_jpg,g_face,h___height__,w___width__/room-avatar-default');
    });
    it('without size', function () {
      cloudinary.roomAvatar('v1409643461/rciev5ubaituvx5bclnz.jpg', '#FF0000').should.equal('https://res.cloudinary.com/roomly/image/upload/b_rgb:ff0000,c_fill,d_room-avatar-default.png,f_jpg,g_face,h___height__,w___width__/v1409643461/rciev5ubaituvx5bclnz.jpg');
    });
    it('with size', function () {
      cloudinary.roomAvatar('v1409643461/rciev5ubaituvx5bclnz.jpg', '#FF0000', 120).should.equal('https://res.cloudinary.com/roomly/image/upload/b_rgb:ff0000,c_fill,d_room-avatar-default.png,f_jpg,g_face,h_120,w_120/v1409643461/rciev5ubaituvx5bclnz.jpg');
    });
  });

  describe('.userAvatar()', function () {
    it('is function', function () {
      cloudinary.userAvatar.should.be.a('function');
    });
    it('without identifier', function () {
      cloudinary.userAvatar('').should.equal('https://res.cloudinary.com/roomly/image/upload/b_rgb:ffffff,c_fill,d_user-avatar-default.png,f_jpg,g_face,h___height__,w___width__/user-avatar-default');
    });
    it('color', function () {
      cloudinary.userAvatar('', '#123456').should.equal('https://res.cloudinary.com/roomly/image/upload/b_rgb:123456,c_fill,d_user-avatar-default.png,f_jpg,g_face,h___height__,w___width__/user-avatar-default');
    });
    it('without size', function () {
      cloudinary.userAvatar('v1409643461/rciev5ubaituvx5bclnz.jpg', '#FF0000').should.equal('https://res.cloudinary.com/roomly/image/upload/b_rgb:ff0000,c_fill,d_user-avatar-default.png,f_jpg,g_face,h___height__,w___width__/v1409643461/rciev5ubaituvx5bclnz.jpg');
    });
    it('with size', function () {
      cloudinary.userAvatar('v1409643461/rciev5ubaituvx5bclnz.jpg', '#FF0000', null, 120).should.equal('https://res.cloudinary.com/roomly/image/upload/b_rgb:ff0000,c_fill,d_user-avatar-default.png,f_jpg,g_face,h_120,w_120/v1409643461/rciev5ubaituvx5bclnz.jpg');
    });
    it('facebook', function () {
      cloudinary.userAvatar('', '#FF0000', '10202931824149737', 120).should.equal('https://graph.facebook.com/10202931824149737/picture?height=120&width=120');
    });
  });

  describe('.poster()', function () {
    it('is function', function () {
      cloudinary.poster.should.be.a('function');
    });
    it('without identifier', function () {
      cloudinary.poster('').should.equal('');
    });
    it('color', function () {
      cloudinary.poster('v1415790619/xdj4tzf7r7dm18f2vuem.png', '#123456').should.equal('https://res.cloudinary.com/roomly/image/upload/b_rgb:123456,c_fill,d_poster-default.png,f_jpg,g_center,h_1100,w_430/v1415790619/xdj4tzf7r7dm18f2vuem.png');
    });
    it('without blur', function () {
      cloudinary.poster('v1415790619/xdj4tzf7r7dm18f2vuem.png', '#FF0000').should.equal('https://res.cloudinary.com/roomly/image/upload/b_rgb:ff0000,c_fill,d_poster-default.png,f_jpg,g_center,h_1100,w_430/v1415790619/xdj4tzf7r7dm18f2vuem.png');
    });
    it('with blur', function () {
      cloudinary.poster('v1415790619/xdj4tzf7r7dm18f2vuem.png', '#FF0000', true).should.equal('https://res.cloudinary.com/roomly/image/upload/b_rgb:ff0000,c_fill,d_poster-default.png,e_blur:800,f_jpg,g_center,h_1100,w_430/v1415790619/xdj4tzf7r7dm18f2vuem.png');
    });
  });

});

describe('shared/models/room', function () {

  var model = new RoomModel({
    name: '#roomTest',
    color: '#123456',
    avatar: 'v1409643461/rciev5ubaituvx5bclnz.jpg',
    poster: 'v1415790619/xdj4tzf7r7dm18f2vuem.png'
  });

  it('._avatar()', function () {
    model._avatar.should.be.a('function');
    model._avatar().should.equal('https://res.cloudinary.com/roomly/image/upload/b_rgb:123456,c_fill,d_room-avatar-default.png,f_jpg,g_face,h___height__,w___width__/v1409643461/rciev5ubaituvx5bclnz.jpg');
    model._avatar(120).should.equal('https://res.cloudinary.com/roomly/image/upload/b_rgb:123456,c_fill,d_room-avatar-default.png,f_jpg,g_face,h_120,w_120/v1409643461/rciev5ubaituvx5bclnz.jpg');
  });

  it('._poster()', function () {
    model._poster.should.be.a('function');
    model._poster().should.equal('https://res.cloudinary.com/roomly/image/upload/b_rgb:123456,c_fill,d_poster-default.png,f_jpg,g_center,h_1100,w_430/v1415790619/xdj4tzf7r7dm18f2vuem.png');
    model._poster(true).should.equal('https://res.cloudinary.com/roomly/image/upload/b_rgb:123456,c_fill,d_poster-default.png,e_blur:800,f_jpg,g_center,h_1100,w_430/v1415790619/xdj4tzf7r7dm18f2vuem.png');

    model.poster = null;
    model._poster().should.equal('');
  });

});

describe('shared/models/user', function () {

  var model = new UserModel({
    username: 'damien',
    color: '#123456',
    avatar: 'v1409643461/rciev5ubaituvx5bclnz.jpg',
    poster: 'v1415790619/xdj4tzf7r7dm18f2vuem.png'
  });

  it('._avatar()', function () {
    model._avatar.should.be.a('function');
    model._avatar().should.equal('https://res.cloudinary.com/roomly/image/upload/b_rgb:123456,c_fill,d_user-avatar-default.png,f_jpg,g_face,h___height__,w___width__/v1409643461/rciev5ubaituvx5bclnz.jpg');
    model._avatar(120).should.equal('https://res.cloudinary.com/roomly/image/upload/b_rgb:123456,c_fill,d_user-avatar-default.png,f_jpg,g_face,h_120,w_120/v1409643461/rciev5ubaituvx5bclnz.jpg');

    model.avatar = '';
    model.facebook = { token: 'rciev5ubaituvx5bclnz', id: '1234567890' };
    model._avatar().should.equal('https://graph.facebook.com/1234567890/picture?height=__height__&width=__width__');
    model._avatar(120).should.equal('https://graph.facebook.com/1234567890/picture?height=120&width=120');
  });

  it('._poster()', function () {
    model._poster.should.be.a('function');
    model._poster().should.equal('https://res.cloudinary.com/roomly/image/upload/b_rgb:123456,c_fill,d_poster-default.png,f_jpg,g_center,h_1100,w_430/v1415790619/xdj4tzf7r7dm18f2vuem.png');
    model._poster(true).should.equal('https://res.cloudinary.com/roomly/image/upload/b_rgb:123456,c_fill,d_poster-default.png,e_blur:800,f_jpg,g_center,h_1100,w_430/v1415790619/xdj4tzf7r7dm18f2vuem.png');

    model.poster = null;
    model._poster().should.equal('');
  });

});