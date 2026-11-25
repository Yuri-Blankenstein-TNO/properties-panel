// configures browsers to run test against
// any of [ 'ChromeHeadless', 'Chrome', 'Firefox' ]
const browsers = (process.env.TEST_BROWSERS || 'ChromeHeadless').split(',');

module.exports = function(karma) {
  karma.set({
    basePath: '.',

    frameworks: [
      'webpack',
      'mocha'
    ],

    files: [ '*.spec.js' ],

    preprocessors: {
      '*.spec.js': [ 'webpack' ]
    },

    reporters: [ 'tldr' ],

    browsers,

    customLaunchers: {
      ChromeHeadlessNoSandbox: {
        base: 'ChromeHeadless',
        flags: [ '--no-sandbox' ]
      }
    },

    singleRun: true,
    autoWatch: false,

    webpack: {
      mode: 'development',
      target: [ 'web', 'es2020' ]
    }
  });
};
