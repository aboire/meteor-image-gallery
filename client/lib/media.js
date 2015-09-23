
thumbStore = new FS.Store.S3("thumb");
imageStore = new FS.Store.S3("default");
largeStore = new FS.Store.S3("image_lg");
mediumStore = new FS.Store.S3("image_md");

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
