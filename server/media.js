// three stores:
// thumbStore: thumbnails
// largeStore: large images for display purposes (carousel, popups etc)
// imageStore: original images to be used to produce a new large image if the image is manipulated (e.g. watermarking)

var WATERMARK = "© Outremerveilles";

FS.debug=true;

// function to resize incoming images based on longest side
var resizeImage = function (w, h, max) {
  if (w > max || h > max) {
    var ratio = w / h;
    if (w > h) {
        w = max;
        h = Math.floor(w / ratio);
    } else {
        h = max;
        w = Math.floor(h * ratio);
    }
  }

  return {width: w, height: h};
};



var thumbStore = new FS.Store.S3("thumb", {
  region: Meteor.settings.aws.region,
  accessKeyId: Meteor.settings.aws.access_key,
  secretAccessKey: Meteor.settings.aws.secret,
  bucket: 'gallerie.thumb',
  ACL:'public-read',
    beforeWrite: function(fileObj) {
      // append -thumb to file name
      var newName = MediaLibrary.appendToFileName(fileObj.name().toLowerCase(), '-thumb');
      return {
        name: newName
      }
    },
    transformWrite: function(fileObj, readStream, writeStream) {
      // convert to png
      fileObj.extension('png', {store: 'thumb'});
      fileObj.type('image/png', {store: 'thumb'});
      var transformer = gm(readStream, fileObj.name({store: 'thumb'}));
      transformer.size({bufferStream: true}, FS.Utility.safeCallback(function (err, size) {
        if (!err) {
          var newSize = resizeImage(size.width, size.height, getSetting('imageWidthThumb', 250)),
              width = newSize.width,
              height = newSize.height,
              cropLen = (width - height) > 0 ? height : width, // choose shortest side's length
              x = (width / 2) - (cropLen / 2),
              y = (height / 2) - (cropLen / 2);

          transformer.resize(width, height).autoOrient().quality(60).crop(cropLen, cropLen, x, y).gravity('SouthEast').stroke("#ffffff").drawText(10, 50, WATERMARK).stream('PNG').pipe(writeStream);

          // save dimensions
          fileObj.update({$set: {'metadata.widthTmb': width, 'metadata.heightTmb': height}});
        }

      }));

    },
    maxTries: 2
  });

// store for images in their original form
// shrinks images if exceed maximum width or height as specified by settings
var imageStore = new FS.Store.S3("default", {
  region: Meteor.settings.aws.region,
  accessKeyId: Meteor.settings.aws.access_key,
  secretAccessKey: Meteor.settings.aws.secret,
  bucket: 'gallerie.default',
  ACL:'public-read',
      beforeWrite: function(fileObj) {
          // Change the filename to lowercase
        var newName = fileObj.name().toLowerCase();
        return {
          name: newName
        }
      },
      transformWrite: function (fileObj, readStream, writeStream) {

        var transformer = gm(readStream, fileObj.name({store: 'default'}));

        transformer.size({bufferStream: true}, FS.Utility.safeCallback(function (err, size) {
          if (!err) {
            var newSize = resizeImage(size.width, size.height, getSetting('imageWidthMax', 1400));
            var width = newSize.width;
            var height = newSize.height;

            transformer.resize(width, height).autoOrient().gravity('SouthEast').stroke("#ffffff").drawText(10, 50, WATERMARK).stream().pipe(writeStream);

            // save dimensions
            fileObj.update({$set: {'metadata.width': width, 'metadata.height': height}});
          }
        }));
      },
      maxTries: 2
    }
  );

var largeStore = new FS.Store.S3("image_lg",  {
  region: Meteor.settings.aws.region,
  accessKeyId: Meteor.settings.aws.access_key,
  secretAccessKey: Meteor.settings.aws.secret,
  bucket: 'gallerie.large',
  ACL:'public-read',
    beforeWrite: function(fileObj) {
          // change the filename to lowercase
        var newName = MediaLibrary.appendToFileName(fileObj.name().toLowerCase(), '-lg');
        return {
          name: newName
        }
    },
    transformWrite: function(fileObj, readStream, writeStream) {
      var transformer = gm(readStream, fileObj.name({store: 'image_lg'}));
      transformer.size({bufferStream: true}, FS.Utility.safeCallback(function (err, size) {
        if (!err) {

            var width = size.width;
            var height = size.height;
            var lgWidth = getSetting('imageWidthLarge', 900);

            if(width > lgWidth || height > lgWidth) {
                var newSize = resizeImage(width, height, lgWidth);
                width = newSize.width;
                height = newSize.height;
            }

            transformer.resize(width, height).autoOrient().quality(80).gravity('SouthEast').stroke("#ffffff").drawText(10, 50, WATERMARK).stream().pipe(writeStream);

            // save dimensions
            fileObj.update({$set: {'metadata.widthLg': width, 'metadata.heightLg': height}});

          }

      }));

    },
    maxTries: 2
  }
);

var mediumStore = new FS.Store.S3("image_md",  {
  region: Meteor.settings.aws.region,
  accessKeyId: Meteor.settings.aws.access_key,
  secretAccessKey: Meteor.settings.aws.secret,
  bucket: 'gallerie.medium',
  ACL:'public-read',
    beforeWrite: function(fileObj) {
          // change the filename to lowercase
        var newName = MediaLibrary.appendToFileName(fileObj.name().toLowerCase(), '-md');
        return {
          name: newName
        }
    },
    transformWrite: function(fileObj, readStream, writeStream) {
      var transformer = gm(readStream, fileObj.name({store: 'image_md'}));
      transformer.size({bufferStream: true}, FS.Utility.safeCallback(function (err, size) {
        if (!err) {

            var width = size.width;
            var height = size.height;
            var mdWidth = getSetting('imageWidthMedium', 450);

            if(width > mdWidth || height > mdWidth) {
                var newSize = resizeImage(width, height, mdWidth);
                width = newSize.width;
                height = newSize.height;
            }

            transformer.resize(width, height).autoOrient().quality(60).gravity('SouthEast').stroke("#ffffff").drawText(10, 50, WATERMARK).stream().pipe(writeStream);
            fileObj.update({$set: {'metadata.widthMd': width, 'metadata.heightMd': height}});

          }

      }));

    },
    maxTries: 2
  }
);

// set the image path (just removing 'cfs')
//FS.HTTP.setBaseUrl('');

Media = new FS.Collection("media", {
      stores: [
        thumbStore,
        imageStore,
        largeStore,
        mediumStore
      ],
      filter: {
        maxSize: 5000000, //in bytes (1 Mb)
        allow: {
          contentTypes: ['image/*']
        },
        // onInvalid: function (message) {
        //   alert("One or more files are invalid or too large.")
        //   // throw new Meteor.Error(413, "Invalid file or file too large.");
        // }
      }
    });


Media.allow({
      insert: function(userId) {
        return isAdminById(userId);
      },
      update: function(userId) {
        return isAdminById(userId);
      },
      remove: function(userId) {
        return isAdminById(userId);
      },
      download: function(userId) {
        return true;
      },
      fetch: []
    });


 // publish all media, omit unnecessary fields
 Meteor.publish("mediaList", function(terms) {
    if ( ! isAdminById(this.userId))
          throw new Meteor.Error(403, 'Permission denied');

    check(terms, {
      sort: Object,
      limit: Number,
      searchQuery: String
    });

    var query = new RegExp( terms.searchQuery, 'i' );
    var results = Media.find({$or: [
                            {'metadata.title': query},
                            {'metadata.credit': query},
                            {'metadata.caption': query},
                            {'original.name': query},
                            {'metadata.tags.name': query},
                            {'metadata.albums.title': query}
                           ]}, { sort: terms.sort}, {limit: terms.limit}, { fields: {"copies.default": 0}});

    return results;
 });

 // publish all media thumbnails for selection into an album, omit unnecessary fields
 Meteor.publish("mediaThumbnails", function(options) {
    if ( ! isAdminById(this.userId))
        throw new Meteor.Error(403, 'Permission denied');
    this.unblock(); // don't wait for this publication to finish to proceed
    check(options, {
      sort: Object,
    });

    options['reactive'] = false;
    var results = Media.find({}, options, { fields: { "original.name": 1,
                                                      "metadata": 1,
                                                      "copies.thumb": 1 }} );
    return results;
 });



 // publish only media in a specific album, sort by 'weight'
 Meteor.publish("albumMedia", function(albumSlug, options) {

      var album = Albums.findOne({slug: albumSlug});

      if (!! album) {
        var visible = !! album.isVisible;
        if (visible || isAdminById(this.userId)) {
            var albumId = album._id;
            options = !! options ? options : {};
            options['reactive'] = false;
            options.sort = { 'metadata.albums.weight': 1 };
            return Media.find({ 'metadata.albums._id': albumId}, options, { fields: {'copies.default': 0, 'copies.thumb': 0 }});
        }
      }
      return this.ready();

 });


 // publish only samples of media from every album
 Meteor.publish("albumListMedia", function() {

      var albums = Albums.find({ isVisible: 1 }, {fields: {'content': 1}}).fetch();

      if (!! albums) {
        var mediaIds = {};
        _.each(albums, function(a) {
            if (!! a.content && a.content.length > 0 ) {

              // obtain the featured image plus sample images for each album
              var featured = _.findWhere(a.content, { isFeatured: 1}),
              featuredId;

              if (!! featured && typeof featured !== undefined && typeof featured.hasOwnProperty('id') ) {
                featuredId = featured.id;
              } else {
                featuredId = a.content[0].id;
              }

              var media = Media.find({'metadata.albums._id': a._id}, { fields: {_id: 1}}).fetch();

              featured = _.findWhere(media, { _id: featuredId });
              var count =  getSetting('numberSamplesFromAlbum', 3); // # of samples (including featured)

              // get samples from album, excluding the featured image and any images already included in publication
              var samples = _.sample(_.difference(media, _.union(featured, mediaIds)), --count );

              var union = _.union(samples, featured);

              mediaIds = _.union(union, mediaIds);

            }
        });
        mediaIds = _.pluck(mediaIds, '_id'); // reduce to an array of ids
        return Media.find({ _id:{ $in: mediaIds }}, {reactive: false}, { fields: {'copies.image_md': 1, 'metadata': 1, 'uploadedAt': 1}});
      }
      return this.ready();
 });

 // publish all media with a specific tag
 Meteor.publish("tagMedia", function(tagSlug, options) {
    options = !! options ? options : {};
    options['reactive'] = false;
    return Media.find({'metadata.tags.slug': tagSlug}, options, { fields: {'copies.default': 0}});
 });

 // condensed version of media for tags list
 Meteor.publish("mediaTags", function(options) {
    this.unblock(); // don't wait for this publication to finish to proceed
    options = !! options ? options : {};
    options['reactive'] = false;
    return Media.find({}, options, { fields: {"metadata.tags": 1, 'metadata.title': 1, 'original.name': 1, "copies.thumb": 1}});
 });
