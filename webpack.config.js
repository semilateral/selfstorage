const path = require('path');

module.exports = env => ({
  devServer: {
    disableHostCheck: true,
    publicPath: '/pages'
  },
  entry: {
    demo: './src/js/demo/index.js'
  },
  mode: env.production ? 'production' : 'development',
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'pages/assets')
  }
});
