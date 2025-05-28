module.exports = {
  jest: function (config) {
    config.collectCoverage = true;
    config.coverageDirectory = 'coverage';
    config.testEnvironment = 'jsdom';
    return config;
  },
};