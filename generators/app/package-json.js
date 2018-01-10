'use strict';

const _ = require('lodash');
const generatorVersion = require('./generator-version');

const DEFAULTS = {
  dependencies: {
    'global': '^4.3.2',
    'video.js': '^5.19.2 || ^6.6.0'
  },
  devDependencies: {
    'babel-plugin-external-helpers': '^6.22.0',
    'babel-plugin-transform-object-assign': '^6.22.0',
    'babel-preset-es2015': '^6.24.1',
    'bannerize': '^1.1.3',
    'conventional-changelog-cli': '^1.3.5',
    'conventional-changelog-videojs': '^3.0.0',
    'in-publish': '^2.0.0',
    'karma': '^1.7.1',
    'karma-chrome-launcher': '^2.2.0',
    'karma-detect-browsers': '^2.2.6',
    'karma-firefox-launcher': '^1.1.0',
    'karma-ie-launcher': '^1.0.0',
    'karma-qunit': '^1.2.1',
    'karma-safari-launcher': '^1.0.0',
    'mkdirp': '^0.5.1',
    'node-static': '^0.7.10',
    'npm-run-all': '^4.1.2',
    'portscanner': '^2.1.1',
    'qunitjs': '^2.4.1',
    'rimraf': '^2.6.2',
    'rollup': '^0.53.4',
    'rollup-plugin-babel': '^2.7.1',
    'rollup-plugin-commonjs': '^8.2.6',
    'rollup-plugin-json': '^2.3.0',
    'rollup-plugin-multi-entry': '^2.0.2',
    'rollup-plugin-node-resolve': '^3.0.0',
    'rollup-watch': '^3.2.2',
    'semver': '^5.4.1',
    'sinon': '^2.4.1',
    'uglify-js': '^3.3.5',
    'videojs-standard': '^6.0.1'
  }
};

const IE8_DEFAULTS = {
  devDependencies: {
    'babel-preset-es3': '^1.0.1',
    'es5-shim': '^4.5.10',
    'karma': '~1.3.0',
    'qunitjs': '^1.23.1'
  }
};

/**
 * Takes advantage of the way V8 orders object properties - by their
 * assignment order - to "sort" an object in alphabetic order.
 *
 * @param  {Object} source
 *         A plain object to be sorted.
 *
 * @return {Object}
 *         A new ordered object.
 */
const alphabetizeObject = (source) =>
  _.pick(source, Object.keys(source).sort());

/**
 * Identical to `alphabetizeObject`, but there is special handling to
 * preserve the ordering of "pre" and "post" scripts next to their
 * core scripts. For example:
 *
 *    "preversion": "...",
 *    "version": "...",
 *    "postversion": "..."
 *
 * @param  {Object} source
 *         A plain object to be sorted.
 *
 * @return {Object}
 *         A new ordered object.
 */
const alphabetizeScripts = (source) => {
  const keys = Object.keys(source);
  const prePost = keys.filter(
    k => _.startsWith(k, 'pre') || _.startsWith(k, 'post')
  );
  const order = _.difference(keys, prePost).sort();

  // Inject the pre/post scripts into the order where they belong.
  prePost.forEach(pp => {
    const isPre = _.startsWith(pp, 'pre');
    const i = order.indexOf(pp.substr(isPre ? 3 : 4));

    // Insert pre-scripts in place of their related core script and
    // post-scripts after their related core script.
    if (i > -1) {
      order.splice(isPre ? i : i + 1, 0, pp);

    // If this is a pre/post script with no related core script, just
    // stick it on the end. This is an unlikely case, though.
    } else {
      order.push(pp);
    }
  });

  return _.pick(source, order);
};

/**
 * Create a package.json based on options.
 *
 * @param  {Object} current
 *         Representation of current package.json.
 *
 * @param  {Object} context
 *         Generator rendering context.
 *
 * @return {Object}
 *         A new representation package.json.
 */
const packageJSON = (current, context) => {
  current = current || {};

  // Replaces all "%s" tokens with the name of the plugin in a given string.
  const scriptify = (str) => {
    str = Array.isArray(str) ? str.join(' ') : str;
    return str.replace(/%s/g, context.pluginName);
  };

  const result = _.assign({}, current, {
    'name': context.packageName,
    'version': context.version,
    'description': context.description,
    'main': scriptify('dist/%s.cjs.js'),
    'module': scriptify('dist/%s.es.js'),

    'generator-videojs-plugin': {
      version: generatorVersion()
    },

    'scripts': _.assign({}, current.scripts, {
      'prebuild': 'npm run clean',
      'build': 'npm-run-all -p build:*',

      'build:js': scriptify([
        'npm-run-all',
        'build:js:rollup-modules',
        'build:js:rollup-umd',
        'build:js:bannerize',
        'build:js:uglify'
      ]),

      'build:js:rollup-modules': 'rollup -c scripts/modules.rollup.config.js',
      'build:js:rollup-umd': 'rollup -c scripts/umd.rollup.config.js',

      // This could easily be part of the rollup config, but because we need it
      // for the CSS, we might as well keep things consistent.
      'build:js:bannerize': scriptify([
        'bannerize dist/%s.js',
        '--banner=scripts/banner.ejs'
      ]),

      'build:js:uglify': scriptify([
        'uglifyjs dist/%s.js',
        '--comments --mangle --compress',
        context.ie8 ? '--ie8' : '',
        '-o dist/%s.min.js'
      ]),

      'build:test': 'rollup -c scripts/test.rollup.config.js',
      'clean': 'rimraf dist test/dist',
      'postclean': 'mkdirp dist test/dist',
      'lint': 'vjsstandard',
      'prepublish': 'not-in-install && npm run build || in-install',
      'start': 'npm-run-all -p start:server watch',
      'start:server': 'node scripts/server.js',
      'pretest': 'npm-run-all lint build',
      'test': 'karma start test/karma.conf.js',
      'preversion': 'npm test',
      'version': 'node scripts/version.js',
      'watch': 'npm-run-all -p watch:*',
      'watch:js-modules': 'rollup -c scripts/modules.rollup.config.js -w',
      'watch:js-umd': 'rollup -c scripts/umd.rollup.config.js -w',
      'watch:test': 'rollup -c scripts/test.rollup.config.js -w'
    }),

    // Always include the two minimum keywords with whatever exists in the
    // current keywords array.
    'keywords': _.union(['videojs', 'videojs-plugin'], current.keywords).sort(),

    'author': context.author,
    'license': context.licenseName,

    'vjsstandard': {
      ignore: [
        'dist',
        'docs',
        'test/dist',
        'test/karma.conf.js'
      ]
    },

    'files': [
      'CONTRIBUTING.md',
      'dist/',
      'docs/',
      'index.html',
      'scripts/',
      'src/',
      'test/'
    ],

    'dependencies': _.assign({}, current.dependencies, DEFAULTS.dependencies),

    'devDependencies': _.assign(
      {},
      current.devDependencies,
      DEFAULTS.devDependencies,
      context.ie8 ? IE8_DEFAULTS.devDependencies : {}
    )
  });

  // In case husky was previously installed, but is now "none", we can
  // remove it from the package.json entirely.
  if (context.husky === 'none') {
    delete result.devDependencies.husky;
    delete result.scripts.prepush;
  } else {
    result.devDependencies.husky = '^0.13.4';
    result.scripts.prepush = `npm run ${context.husky}`;
  }

  // Support the Sass option.
  if (context.sass) {
    _.assign(result.scripts, {
      'build:css': 'npm-run-all build:css:sass build:css:bannerize',

      'build:css:sass': scriptify([
        'node-sass',
        'src/plugin.scss',
        'dist/%s.css',
        '--output-style=compressed',
        '--linefeed=lf'
      ]),

      'build:css:bannerize': scriptify([
        'bannerize dist/%s.css --banner=scripts/banner.ejs'
      ]),

      'watch:css': scriptify([
        'npm-run-all',
        'build:css:sass',
        'watch:css:sass'
      ]),
      'watch:css:sass': scriptify([
        'node-sass',
        'src/plugin.scss',
        'dist/%s.css',
        '--output-style=compressed',
        '--linefeed=lf',
        '--watch src/**/*.scss'
      ])
    });

    result.devDependencies['node-sass'] = '4.5.3';
  }

  // Support the documentation tooling option.
  if (context.docs) {

    _.assign(result.scripts, {
      'docs': 'npm-run-all docs:*',
      'docs:api': 'jsdoc src -r -c jsdoc.json -d docs/api',
      'docs:toc': 'doctoc README.md'
    });

    if (context.husky !== 'none') {
      result.scripts.precommit = 'npm run docs:toc && git add README.md';
    }

    _.assign(result.devDependencies, {
      doctoc: '^1.3.0',
      jsdoc: '^3.4.3'
    });
  }

  // Include language support. Note that `mkdirs` does not need to change
  // here because the videojs-languages package will create the destination
  // directory if needed.
  if (context.lang) {
    result.scripts['build:lang'] = 'vjslang --dir dist/lang';
    result.devDependencies['videojs-languages'] = '^1.0.0';
  }

  result.files.sort();
  result.scripts = alphabetizeScripts(result.scripts);
  result.dependencies = alphabetizeObject(result.dependencies);
  result.devDependencies = alphabetizeObject(result.devDependencies);

  return result;
};

module.exports = packageJSON;
