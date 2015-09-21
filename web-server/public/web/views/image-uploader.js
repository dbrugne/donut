var $ = require('jquery');
var _ = require('underscore');
var Backbone = require('backbone');
var common = require('@dbrugne/donut-common');
var donutDebug = require('../libs/donut-debug');

var debug = donutDebug('donut:image-uploader');

var ImageUploaderView = Backbone.View.extend({
  template: require('../templates/image-uploader.html'),

  data: {}, // will be filled here and read in form view

  events: {
    'click .change': 'onChange',
    'click .cancel': 'onCancel',
    'click .remove': 'onRemove'
  },

  initialize: function (options) {
    delete options.el; // already saved by Backbone.View, now should be removed from cloudinary options
    this.options = _.extend({
      theme: 'white',
      success: _.noop,
      current: '',
      field_name: 'image',
      tags: '',
      upload_preset: 'uxfd2ikf',
      sources: ['local', 'url', 'camera'], // ['local', 'url', 'camera']
      multiple: false,
      cropping: 'server',
      client_allowed_formats: ['png', 'gif', 'jpeg'],
      max_file_size: 20000000 // 20Mo
    }, options);

    // current == v1401656005/avatar-537b98832244d66015d7692f.jpg

    this.render();
  },
  render: function () {
    var options = _.extend({}, this.options);

    options.imgTag = '';
    if (options.current)
      options.imgTag = this._getImageTag(options.current);
    if (this.data.public_id)
      options.imgTag = this._getImageTag(this.data.public_id, this.data.version);
    var html = this.template(options);
    this.$el.html(html);

    this.options.error = ''; // display error only once
    return this;
  },
  onCancel: function (event) {
    event.preventDefault();
    this.render();
  },
  onRemove: function (event) {
    this.options.current = '';
    this.data = {remove: true};
    if (_.isFunction(this.options.success))
      this.options.success(this.data);
    this.render();
  },
  onChange: function (event) {
    event.preventDefault();
    var that = this;
    // @doc: http://cloudinary.com/documentation/upload_widget#setup
    cloudinary.openUploadWidget(this.options, function (err, result) {
      if (err) {
        if (err.message && err.message == 'User closed widget')
          return;

        debug('cloudinary error: ', err);
        that.options.error = err.message;
        return that.render();
      }
      if (!result || !result[0])
        return debug('cloudinary result is empty!!');

      that.data = {
        public_id: result[0].public_id,
        version: result[0].version,
        path: result[0].path
      };

      that.options.success(that.data);
      that.render();
    }
    );
  },
  /**
   * Return image tag (30*30) for the given imageId[, version]
   *
   * @param imageId cloudinary ID or donut image token
   * @param version cloudinary version (optional)
   * @returns string
   */
  _getImageTag: function (identifier, version) {
    if (!identifier || identifier == '')
      return '';

    // @hacks

    var url;
    if (version) {
      url = 'https://res.cloudinary.com/roomly/image/upload/b_rgb:ffffff,c_fill,f_jpg,g_face,h_30,w_30/'
        + 'v' + version + '/' + identifier + '.jpg';
    } else {
      if (identifier.indexOf('__width__') !== -1)
        url = common.cloudinarySize(identifier, 30);
      else
        url = identifier.replace('h_1100,w_430', 'h_30,w_30');
    }

    return "<img src='" + url + "' alt='current image thumbnail'>";
  }

});


module.exports = ImageUploaderView;