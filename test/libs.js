'use strict';

const fs = require('fs');
const _ = require('lodash');
const path = require('path');
const assert = require('yeoman-generator').assert;

// Files that are expected to exist in certain conditions.
const FILES = {

  'common': [
    'scripts/banner.ejs',
    'scripts/build-test.js',
    'scripts/server.js',
    'test/karma.conf.js',
    'src/plugin.js',
    'test/index.html',
    'test/plugin.test.js',
    '.editorconfig',
    '.gitignore',
    '.npmignore',
    'jsdoc.json',
    '.babelrc',
    'CHANGELOG.md',
    'CONTRIBUTING.md',
    'index.html',
    'package.json',
    'README.md'
  ],

  'oss': [
    '.travis.yml',
    'LICENSE'
  ],

  'sass': [
    'src/plugin.scss'
  ],

  // limit-to options
  'dotfiles': [
    '.editorconfig',
    '.gitignore',
    '.npmignore'
  ],

  'dotfiles:oss': [
    '.travis.yml'
  ],

  'pkg': [
    'package.json'
  ],

  'scripts': [
    'scripts/banner.ejs',
    'scripts/build-test.js',
    'scripts/server.js'
  ]
};

const GENERATOR_PATH = path.join(__dirname, '../generators/app');

/**
 * Gets a joined array of filenames from the FILES object.
 *
 * @function fileList
 * @param  {...String} Keys from FILES
 * @return {Array}
 */
const fileList = function() {
  return _.union.apply(_, _.toArray(arguments).map(str => FILES[str]));
};

/**
 * Set up options to always skip installation.
 *
 * @function options
 * @param  {...Object} Same as Object.assign
 * @return {Object}
 */
const options = function() {
  return _.assign.apply(_, [{skipInstall: true}].concat(_.toArray(arguments)));
};

/**
 * Function to call when `before` setup is complete.
 *
 * This function expects to be bound to a RunContext: `onEnd.bind(this)`;
 *
 * @function onEnd
 * @param    {Function} [done]
 */
const onEnd = function(done) {

  // There are cases where a package.json will not be created.
  try {
    this.pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  } catch (x) {
    this.pkg = null;
  }

  if (typeof done === 'function') {
    done();
  }
};

/**
 * Assert that all keys listed in an array match non-empty values
 * in an object.
 *
 * @param  {Object} obj
 * @param  {Array}  checks
 * @return {Boolean}
 */
const allAreNonEmpty = function(obj, checks) {
  checks.forEach(key => {
    const s = obj[key];

    assert.ok(
      typeof s === 'string' && (/\S/).test(s),
      `"${key}" was a non-empty string`
    );
  });
};

module.exports = {
  GENERATOR_PATH,
  fileList,
  options,
  onEnd,
  allAreNonEmpty
};