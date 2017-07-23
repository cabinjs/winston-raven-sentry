
# winston-raven-sentry

[![node](https://img.shields.io/badge/node-4.8.4+-brightgreen.svg)][node-url]
[![raven](https://img.shields.io/badge/raven-1.x+-brightgreen.svg)][raven-url]
[![winston](https://img.shields.io/badge/winston-2.x+-brightgreen.svg)][winston-url]
[![koa](https://img.shields.io/badge/koa-2.x+-brightgreen.svg)][koa]
[![express](https://img.shields.io/badge/express-4.x+-brightgreen.svg)][express]
[![license](https://img.shields.io/github/license/niftylettuce/winston-raven-sentry.svg)][license-url]

The **maintained** and **well-documented** [Raven](https://github.com/getsentry/raven-node)/[Sentry](https://sentry.io) transport for the [winston](https://github.com/winstonjs/winston) logger with support for [Koa][koa]/[Express][express]/[Passport][passport].

> This was designed as a **complete** and **feature-packed** drop-in replacement for 15+ unmaintained and poorly documented packages on NPM for [sentry][npm-sentry] and [raven][npm-raven] winston loggers... such as `winston-sentry`, `winston-raven`, `sentry-logger`, etc.


## Index

* [Install](#install)
* [Usage](#usage)
* [How to use with Koa/Express/Passport?](#how-to-use-with-koa-express-passport-)
  - [Koa Example](#koa-example)
  - [Express Example](#express-example)
* [Options](#options-options)
  - [Default Raven Options](#default-raven-options-optionsconfig)
  - [Default Error Handler](#default-error-handler-options-errorhandler-)
  - [Uncaught Exceptions](#uncaught-exceptions)
  - [Unhandled Promise Rejections](#unhandled-promise-rejections)
  - [Log Level Mapping](#log-level-mapping)
  - [Custom Attributes](#custom-attributes)
* [Automatic Extra Error Object](#automatic-extra-error-object)
* [Recommended Logging Approach](#recommended-logging-approach)
* [License](#license)


## Install

```bash
npm install --save winston winston-raven-sentry
```


## Usage

You can configure `winston-raven-sentry` in two different ways.

With `new winston.Logger`:

```js
const winston = require('winston');
const Sentry = require('winston-raven-sentry');

const options = {
  dsn: 'https://******@sentry.io/12345',
  level: 'info'
};

const logger = new winston.Logger({
  transports: [
    new Sentry(options)
  ]
});
```

Or with winston's `add` method:

```js
const winston = require('winston');
const Sentry = require('winston-raven-sentry');

const logger = new winston.Logger();

logger.add(Sentry, options);
```

See [Options](#options-options) below for custom configuration.


## How to use with Koa/Express/Passport?

**Do you want to log your user objects along with every log automatically?**

If so, we can simply use custom middleware to bind a `logger` method on the `ctx` object in Koa, or the `req` object in Express.

This example implementation assumes that you're using the standard Passport implementation and that the logged-in `user` object is set to `ctx.state.user` for Koa or `req.user` for Express. This is the standard usage, so you should have nothing to worry about!

If you need to whitelist only certain fields from `ctx.state.user` or `req.user` (e.g. don't send your passwords to it) then you need to specify the option `parseUser` through `options.config.parseUser` as documented here <https://docs.sentry.io/clients/node/config/>.  The default fields whitelisted are `[ 'id', 'username', 'email' ]`.  If you specify `options.config.parseUser: true` then all keys will be collected.  If you specify `false` then none will be collected.

### Koa Example

```js
const winston = require('winston');
const Sentry = require('winston-raven-sentry');
const Koa = require('koa');
const passport = require('koa-passport');
const _ = require('lodash');

const app = new Koa();
const logger = new winston.Logger();

logger.add(Sentry, {
  // ...
});

app.use(passport.initialize());

app.use(logger.transports.sentry.raven.requestHandler(true));

app.on('error', function(err, ctx) {
  logger.error(err);
});
```

> Log an error or info message with `req.logger`:

```js
app.use(async function(ctx, next) {
  try {
    const post = await Post.create({ message: 'hello world' });
    logger.info('post created', { extra: post });
    ctx.body = post;
  } catch (err) {
    ctx.throw(err);
    // or you could also do `logger.error(err);`,
    // but it's redundant since `app.emit('error')`
    // will get invoked when `ctx.throw` occurs in the app
  }
});
```

### Express Example

```js
const winston = require('winston');
const Sentry = require('winston-raven-sentry');
const express = require('express');
const passport = require('passport');
const _ = require('lodash');

const app = new express();
const logger = new winston.Logger();

logger.add(Sentry, {
  // ...
});

app.use(passport.initialize());

app.use(logger.transports.sentry.raven.requestHandler());
```

> Log an error or info message with `req.logger`:

```js
app.use(async function(req, res, next) {
  try {
    const post = await Post.create({ message: 'hello world' });
    logger.info('post created', { extra: post });
    res.send(post);
  } catch (err) {
    logger.error(err);
    next(err);
  }
});
```


## Options (`options`)

Per `options` variable above, here are the default options provided:

Default Sentry options:

* `dsn` (String) - your Sentry DSN or Data Source Name (defaults to `process.env.SENTRY_DSN`)
* `config` (Object) - a Raven configuration object (see [Default Raven Options](#default-raven-options-optionsconfig) below)
* `install` (Boolean) - automatically catches uncaught exceptions through `Raven.install` if set to true (defaults to `false`)
* `errorHandler` (Function) - a callback function to use for logging Raven errors (e.g. an invalid DSN key).  This defaults to logging the `err.message`, see [Default Error Handler](#default-error-handler-options-errorhandler-) below... but if you wish to disable this just pass `errorHandler: false`. If there is already an `error` listener then this function will not get bound.
* `raven` (Object) - an optional instance of `Raven` that is already configured via `Raven.config` (if provided this will be used instead of the `config` option

Transport related options:

* `name` (String) - transport's name (defaults to `sentry`)
* `silent` (Boolean) - suppress logging (defaults to `false`)
* `level` (String) - transport's level of messages to log (defaults to `info`)
* `levelsMap` (Object) - log level mapping to Sentry (see [Log Level Mapping](#log-level-mapping) below)

### Default Raven Options (`options.config`)

* `logger` (String) - defaults to `winston-raven-sentry`
* `captureUnhandledRejections` (Boolean) - defaults to `false`
* `culprit` (String) - defaults to the module or function name
* `server_name` (String) - defaults to `process.env.SENTRY_NAME` or `os.hostname()`
* `release` (String) - defaults to `process.env.SENTRY_RELEASE` (see [#343][issue-343] if you'd like to have the git hash or package version as the default)
* `tags` (Array or Object) - no default value
* `environment` (String) - defaults to `process.env.SENTRY_ENVIRONMENT` (see [#345][issue-345] if you'd like to have this default to `process.env.NODE_ENV` instead)
* `modules` (Object) - defaults to `package.json` dependencies
* `extra` (Object) - no default value
* `fingerprint` (Array) - no default value

For a full list of Raven options, please visit <https://docs.sentry.io/clients/node/config/>.

### Default Error Handler (`options.errorHandler`)

The default error handler is a function that is simply:

```js
function errorHandler(err) {
  console.error(err.message);
}
```

... and it is binded to the event emitter:

```js
Raven.on('error', this.options.errorHandler);
```

Therefore if you have specified an invalid DSN key, then you will see its output on the command line.

For example:

```log
raven@2.1.0 alert: failed to send exception to sentry: HTTP Error (401): Invalid api key
HTTP Error (401): Invalid api key
```

If you pass `options.errorHandler: false` then no error handler will be binded.

### Uncaught Exceptions

If you want to log uncaught exceptions with Sentry, then specify `install: true` in options:

```js
new Sentry({
  install: true
});
```

### Unhandled Promise Rejections

If you want to log unhandled promise rejections with Sentry, then specify `captureUnhandledRejections: true` in `options.config`:

```js
new Sentry({
  config: {
    captureUnhandledRejections: true
  }
});
```

### Log Level Mapping

Winston logging levels are mapped by default to Sentry's acceptable levels.

These defaults are set as `options.levelsMap' and are:

```js
{
  silly: 'debug',
  verbose: 'debug',
  info: 'info',
  debug: 'debug',
  warn: 'warning',
  error: 'error'
}
```

You can customize how log levels are mapped using the `levelsMap` option:

```js
new Sentry({
  levelsMap: {
    verbose: 'info'
  }
});
```

If no log level mapping was found for the given `level` passed, then it will not log anything.

### Custom Attributes

If you need to log custom attributes, such as `extra`, `user`, or `tags` attributes, specify them in the `meta` object.

For example:

```js
logger.info('Something happened', {
  user: {
    id: '123'
  },
  extra: {
    foo: 'bar'
  },
  tags: {
    git_commit: 'c0deb10c4'
  }
});
```


## Automatic Extra Error Object

By default, if you provide an `Error` instance to either the `msg` or `meta` arguments to `logger[level](msg, meta)`, then this package will automatically set `meta.extra.err` for you as follows:

```js
meta.extra.err = {
  stack: err.stack,
  message: err.message
}
```

This ensures that your stack trace and error message are visible and saved to Sentry.

Furthermore, if `msg` was an Error object, then we will automatically set `msg = msg.message`.

This will prevent you from receiving the following message in Sentry:

![example-error](https://i.imgur.com/Bzpk3hr.png)


## Recommended Logging Approach

Compared to packages such as `winston-sentry` and `winston-raven`, we log messages to Sentry more accurately using `captureMessage` and `captureException` (and take into consideration `Error` instances).  There was a core bug in all other similar packages on NPM that did not pass along the log level properly, therefore it was refactored and also built to the standards of `raven` itself (e.g. we utilize the defaults that they also do, see above options).

Here are a few examples provided below for how we recommend logging:

> Log an error with stack trace (uses `Raven.captureException`):

```js
logger.error(new Error('something happened'));
```

_Note that this will automatically set `extra.err.message = "something happened"` and provide the stack trace as `extra.err.stack`._

> Log an error message (uses `Raven.captureException` - don't worry as this method automatically turns the message below into an `Error` instance for us):

```js
logger.error('something happened');
```

_Note that this will automatically set `extra.err.message = "something happened"` and provide the stack trace as `extra.err.stack`._

> Log an error with stack trace and extra data (uses `Raven.captureException`):

```js
logger.error(new Error('something happened'), {
  extra: {
    foo: 'bar'
  }
});
```

_Note that this will automatically set `extra.err.message = "something happened"` and provide the stack trace as `extra.err.stack`._

> Log an error with stack trace, extra data, and the user that it occurred to (uses `Raven.captureException`):

```js
logger.error(new Error('something happened'), {
  user: {
    id: '123',
    email: 'niftylettuce@gmail.com',
    username: 'niftylettuce'
  },
  extra: {
    foo: 'bar'
  }
});
```

_Note that this will automatically set `extra.err.message = "something happened"` and provide the stack trace as `extra.err.stack`._

> Log a message (uses `Raven.captureMessage`):

```js
logger.info('hello world');
```

> Log a message and extra data (uses `Raven.captureMessage`):

```js
logger.info('hello world', {
  extra: {
    foo: 'bar'
  }
});
```

> Log a message and tags (uses `Raven.captureMessage`):

```js
logger.info('hello world', {
  tags: {
    component: 'api'
  }
});
```


## License

[MIT License][license-url]


[license-url]: LICENSE
[npm-sentry]: https://www.npmjs.com/search?q=sentry+winston
[npm-raven]: https://www.npmjs.com/search?q=raven+winston
[koa]: http://koajs.com/
[express]: https://expressjs.com
[passport]: http://passportjs.org
[issue-343]: https://github.com/getsentry/raven-node/issues/343
[issue-345]: https://github.com/getsentry/raven-node/issues/345
[node-url]: https://nodejs.org
[raven-url]: https://github.com/getsentry/raven-node
[winston-url]: https://github.com/winstonjs/winston
