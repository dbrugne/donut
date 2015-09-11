'use strict';
var chai = require('chai');
chai.should();

var input = require('../ws-server/app/util/input');

describe('util/input', function () {
  describe('.filter()', function () {
    it('is function', function () {
      input.filter.should.be.a('function');
    });
    it('parameters', function () {
      input.filter().should.equal(false);
      input.filter('string').should.equal('string');
      input.filter('string', 512).should.equal('string');
    });
    it('maxlength', function () {
      input.filter('').should.equal(false);
      input.filter('string', 5).should.equal(false);
      input.filter('string', 6).should.equal('string');
      input.filter('string', 7).should.equal('string');
    });
    it('do noting', function () {
      input.filter('regular string').should.equal('regular string');
      input.filter('regular string\non two lines').should.equal('regular string\non two lines');
    });
    it('smileys', function () {
      input.filter(':)').should.equal(':)');
      input.filter('<3').should.equal('<3');
      input.filter('</3').should.equal('</3');
      input.filter('<3 </3 <3').should.equal('<3 </3 <3');
      input.filter(':P <3 </3 :)').should.equal(':P <3 </3 :)');
    });
    it('preserve html', function () {
      input.filter('<br>').should.equal('<br>');
      input.filter('<strong>enabled</strong>').should.equal('<strong>enabled</strong>');
      input.filter("<script>alert('go go go!')</script>").should.equal("<script>alert('go go go!')</script>");
    });
    it('full', function () {
      var complexString = 'words are :P <3 </3 :) but \'style\' is "still" or <strong>enabled</strong>, and <a href="http://google.com">links</a>. Or www.google.com and http://yahoo.fr/ with an XSS <script>alert(\'go go go!\')</script> @damien dans #donut';
      input.filter(complexString).should.equal(complexString);
    });
  });

  describe('.mentions()', function () {
    it('is function', function () {
      input.mentions.should.be.a('function');
    });
  });
});
