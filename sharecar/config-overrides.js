module.exports = {
  jest: function (config) {
    config.collectCoverage = true;
    config.coverageDirectory = 'coverage';
    config.testEnvironment = 'jsdom';
    config.collectCoverageFrom = [
      "src/**/*.{js,jsx,ts,tsx}",
      "!src/index.js",
      "!**/node_modules/**"
    ];
    return config;
  },
};