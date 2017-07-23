
const _ = require('lodash');
const Raven = require('raven');
const winston = require('winston');
const util = require('util');

function errorHandler(err) {
  console.error(err.message);
}

function Sentry(options) {

  options = options || {};
  options = _.defaultsDeep(options, {
    dsn: process.env.SENTRY_DSN || '',
    config: {
      logger: 'winston-raven-sentry',
      captureUnhandledRejections: false
    },
    errorHandler,
    install: false,
    name: 'sentry',
    silent: false,
    level: 'info',
    levelsMap: {
      silly: 'debug',
      verbose: 'debug',
      info: 'info',
      debug: 'debug',
      warn: 'warning',
      error: 'error'
    }
  });

  winston.Transport.call(this, _.omit(options, [
    'levelsMap',
    'install',
    'dsn',
    'config',
    'tags',
    'globalTags',
    'extra',
    'errorHandler',
    'raven'
  ]));

  this._levelsMap = options.levelsMap;

  if (options.tags)
    options.config.tags = options.tags;
  else if (options.globalTags)
    options.config.tags = options.globalTags;

  if (options.extra) {
    options.config.extra = options.config.extra || {};
    options.config.extra = _.defaults(
      options.config.extra,
      options.extra
    );
  }

  // expose the instance on the transport
  this.raven = options.raven || Raven.config(options.dsn, options.config);

  if (_.isFunction(options.errorHandler) && this.raven.listeners('error').length === 0)
    this.raven.on('error', options.errorHandler);

  // it automatically will detect if it's already installed
  if (options.install || options.patchGlobal)
    this.raven.install();


};

// Inherit from `winston.Transport`
util.inherits(Sentry, winston.Transport);

// Define a getter so that `winston.transports.Sentry`
// is available and thus backwards compatible
winston.transports.Sentry = Sentry;

Sentry.prototype.log = function(level, msg, meta, fn) {

  if (this.silent) return fn(null, true);
  if (!(level in this._levelsMap)) return fn(null, true);

  meta = meta || {};
  meta.level = this._levelsMap[level];
  meta.extra = meta.extra || {};

  if (_.isError(msg) && !_.isObject(meta.extra.err)) {
    meta.extra.err = { stack: msg.stack, message: msg.message };
    msg = msg.message;
  }

  if (_.isError(meta) && !_.isObject(meta.extra.err)) {
    meta.extra.err = { stack: meta.stack, message: meta.message };
    if (!_.isString(msg))
      msg = meta.message;
  }

  if (meta.level === 'error' || meta.level === 'fatal')
    return this.raven.captureException(msg, meta, function() {
      fn(null, true);
    });

  this.raven.captureMessage(msg, meta, function() {
    fn(null, true);
  });

}

module.exports = Sentry;
