Package.describe({
  summary: "ElMar search package",
  version: '0.1.0',
  name: 'elmar-search'
});

Package.onUse(function (api) {

  api.use([
    'templating'
  ], 'client');


  api.add_files([
    'lib/client/searchForm.html',
    'lib/client/searchForm.js',
    'lib/client/searchForm.css'
    ], ['client']);

 
   api.export(['GetSearch', 'SetSearch']);
});