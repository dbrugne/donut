var $ = require('jquery');
var _ = require('underscore');
var Backbone = require('backbone');
var donutDebug = require('../libs/donut-debug');

var debug = donutDebug('donut:input');

var InputImagesView = Backbone.View.extend({
  template: require('../templates/input-images.html'),

  images: '',

  events: {
    'click .add-image': 'onAddImage',
    'click .add-file': 'onAddFile',
    'click .remove-image': 'onRemoveImage'
  },

  initialize: function (options) {
    // should be initialized with {} on .initialize(), else all the view
    // instances will share the same object (#110)
    this.images = {};
    this.$preview = this.$('.preview');
  },

  render: function () {
    return this;
  },

  reset: function () {
    this.images = {};
    this.$preview.find('.image').remove();
    this.hidePreview();
  },

  list: function () {
    return _.map(this.images, function (i) {
      return {
        public_id: i.public_id,
        version: i.version,
        path: i.path,
        type: i.resource_type,
        filename: i.original_filename,
        size: i.bytes >= 1000000
          ? (i.bytes / 1000000).toFixed(2) + ' Mb'
          : i.bytes >= 1000
          ? (i.bytes / 1000).toFixed(2) + ' Kb'
          : i.bytes + ' b.'
      };
    });
  },

  onAddImage: function (event) {
    this.openCloudinaryWidget(event, 'image');
  },
  onAddFile: function (event) {
    this.openCloudinaryWidget(event);
  },
  openCloudinaryWidget: function (event, type) {
    event.preventDefault();

    // @doc: http://cloudinary.com/documentation/upload_widget#setup
    var options = {
      theme: 'white',
      upload_preset: 'discussion',
      sources: ['local'], // ['local', 'url', 'camera']
      multiple: true,
      client_allowed_formats: null,
      max_file_size: 20000000, // 20Mo
      max_files: 5,
      thumbnail_transformation: {width: 80, height: 80, crop: 'fill'}
    };

    if (type === 'image') {
      options.sources.push('camera');
      options.sources.push('url');
    }

    var that = this;
    cloudinary.openUploadWidget(options,
      function (err, result) {
        if (err) {
          if (err.message && err.message === 'User closed widget') {
            return;
          }
          debug('cloudinary error: ', err);
        }
        if (!result) {
          return debug('cloudinary result is empty!');
        }

        _.each(result, function (uploaded) {
          that.$preview.find('.add-image').before(that.template({data: uploaded}));
          // add to collection
          that.images[uploaded.public_id] = uploaded;
          // show preview
          that.showPreview();
        });
      }
    );
  },
  onRemoveImage: function (event) {
    event.preventDefault();
    var cid = $(event.currentTarget).closest('.image').data('cloudinaryId');
    // remove from collection
    if (this.images[cid]) {
      delete this.images[cid];
    }
    // remove preview
    this.$preview.find('.image[data-cloudinary-id="' + cid + '"]').remove();
    // hide previews
    if (_.keys(this.images).length < 1) {
      this.hidePreview();
    }
  },
  showPreview: function () {
    this.$preview.show();
  },
  hidePreview: function () {
    this.$preview.hide();
  }
});

module.exports = InputImagesView;
