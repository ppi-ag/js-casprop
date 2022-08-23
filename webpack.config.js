const path = require('path');
const TerserPlugin = require("terser-webpack-plugin");

var config = {
  entry: {
    "bundle.min": "./src/index.js",
  },
  devtool: "source-map",
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'js-casprop-bundled.min.js',
    library: {
        name: 'jsCasProp',
        type: 'umd'
    },
  },
  optimization: {
    minimize: true,
    minimizer: [new TerserPlugin()],
  },
};

module.exports = (env, argv) => {
    if (argv.mode === 'development') {
        config.optimization.minimize = false;
        config.output.filename = 'js-casprop-bundled.js';
    }
  
    return config;
  };