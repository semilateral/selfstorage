const path = require('path');

module.exports = env => ({
  devServer: {
    disableHostCheck: true,
    publicPath: '/dist'
  },
  entry: {
    demo: './demo/index.js',
    testpage: './tests/testpage.js'
  },
  mode: env.production ? 'production' : 'development',
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist')
  }
});
