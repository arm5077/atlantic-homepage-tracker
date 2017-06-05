var path = require('path');

module.exports = {
  'entry': './public/js/app.js',
  'output': {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'public/dist')
  },
  'module': {
    'rules': [{
      'test': /\.scss$/,
      use: [{
        loader: 'style-loader'
      }, {
        loader: 'css-loader'
      }, {
        loader: 'sass-loader'
      }]
    },
    {
      test: /\.json$/,
      loader: "json-loader"
    }]
  }
}

