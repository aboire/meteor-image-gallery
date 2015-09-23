Package.describe({
	summary: "Photoswipe Plugin",
	version: '0.1.0',
	name: "elmar-photoswipe"
});


Package.on_use(function (api) {
	api.use([
    'templating'
  	], 'client');
		api.addFiles([
			'photoswipe.min.js',
			'photoswipe-ui-default.min.js',
			'photoswipe.html',
			'photoswipe.css',
			'default-skin/default-skin.css'
		], 'client');
	api.addAssets([
		'default-skin/default-skin.png',
		'default-skin/default-skin.svg',
		'default-skin/preloader.gif'
	], 'client');


});
