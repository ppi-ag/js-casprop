module.exports = function (grunt) {
  grunt.initConfig({
      browserify: {
          development: {
              src: [
                  "./src/explorer-css.js"
              ],
              dest: './dist/explorer-css-bundled.js',
              options: {
                  browserifyOptions: { debug: true, standalone: 'ExpCSS', watch: true, keepAlive: true}
              }
          },
          production:{
            src: [
              "./src/explorer-css.js"
            ],
            dest: './dist/explorer-css-bundled.min.js',
            options: {
                browserifyOptions: { debug: false, standalone: 'ExpCSS'}
            },
            plugin: [["minifyify", { map: false }]]

          }
      }
  });
  grunt.loadNpmTasks('grunt-browserify');
};
