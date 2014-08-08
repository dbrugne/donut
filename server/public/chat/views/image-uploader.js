define([
  'jquery',
  'underscore',
  'backbone',
  'text!templates/image-uploader.html',
  'text!templates/image-uploader-progress.html'
], function ($, _, Backbone, ImageUploaderTemplate, progressBarTemplate) {
  var ImageUploaderView = Backbone.View.extend({

    template: _.template(ImageUploaderTemplate),

    templateProgress: _.template(progressBarTemplate),

    data: {}, // will be filled here and read in form view

    events: {
      'click .change': 'onChange',
      'click .cancel': 'onCancel',
      'click .remove': 'onRemove',
    },

    initialize: function(options) {
      this.options = _.extend({
        current: '',
        field_name: 'image',
        tags: ''
      }, options);

      // current == v1401656005/avatar-537b98832244d66015d7692f.jpg

      this.render('current');
    },
    render: function(type) {
      var options = _.extend({ type: type }, this.options);

      if (type == 'current') {

        options.imgTag = '';

        if (options.current)
          options.imgTag = this._getImageTag(options.current);

        if (this.data.public_id)
          options.imgTag = this._getImageTag(this.data.public_id, this.data.version);

        this._render(options);

      } else if (options.type == 'error') {

        this._render(options);

      } else if (type == 'uploader') {

        this._render(options);

        /**
         * When using unsigned upload only:
         *
         *   upload_preset,
         *   callback,
         *   public_id,
         *   folder,
         *   tags,
         *   context,
         *   face_coordinates,
         *   custom_coordinates
         *
         * parameters are allowed.
         */

        var that = this;
        var $cloudinaryFileupload = this.$el.find('.cloudinary_fileupload');
        $cloudinaryFileupload.unsigned_cloudinary_upload("uxfd2ikf", {
          callback: "http://" + window.location.hostname + "/vendor/cloudinary_js/html/cloudinary_cors.html",
          tags: this.options.tags,
          crop: 'limit',
          gravity: 'face',
          width: 800,
          height: 600
        });
        $cloudinaryFileupload.bind('cloudinaryprogress', function(e, data) {

          that.progress(Math.round((data.loaded * 100.0) / data.total));

        });
        $cloudinaryFileupload.bind('cloudinaryfail', function() {
          console.log('cloudinaryfail');
          console.log(arguments);
          that.render('error');
        });
        $cloudinaryFileupload.bind('cloudinarydone', function(e, data) {

//          console.log(data.result);

          that.data = {
            public_id: data.result.public_id,
            version: data.result.version,
            path: data.result.path
          }

          that.render('current');

        });

      }

      return this;
    },
    _render: function(options) {
      var html = this.template(options);
      this.$el.html(html);
      return this;
    },
    progress: function(percentage) {
      this.$el.find('.uploader-form').hide();
      var html = this.templateProgress({ percentage: percentage });
      this.$el.find('.progress')
        .html(html)
        .show();
    },
    onChange: function(event) {
      event.preventDefault();
      this.render('uploader');
    },
    onCancel: function(event) {
      event.preventDefault();
      this.render('current');
    },
    onRemove: function(event) {
      this.options.current = '';
      this.data = {remove: true};
      this.render('current');
    },
    _getImageTag: function(imageId, version){
      var opts = {
        width: 30,
        height: 30,
        crop: 'fill'
      };
      if (version)
        opts.version = version;

      var tags = $.cloudinary.image(imageId, opts);

      if (!tags || tags.length < 1)
        return;

      /** @var tag HTMLImageElement */
      var tag = tags[0];

      return this._domObjToString(tag);
    },
    _domObjToString: function(o) {
      // @source: http://jquery-howto.blogspot.com/2009/02/how-to-get-full-html-string-including.html
      if(!o || !o.tagName)
        return;

      var el = document.createElement("div");

      el.appendChild(o.cloneNode(false));
      var s = el.innerHTML;
      el = null;
      return s;
    }

  });

  return ImageUploaderView;
});