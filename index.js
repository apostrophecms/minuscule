"use strict";

class WebError extends Error {
  constructor(status, message) {
    super(`${status}: ${message}`);
    this.status = status;
    return this;
  }
}

function minuscule(app) {

  const prodLike = process.env.ENV === 'production';

  const self = {

    use(fn) {
      app.use(async (req, res, next) => {
        try {
          await fn(req);
          return next();
        } catch (e) {
          return self.handleError(req, e);
        }
      });
    },

    route(method, path, ...fns) {
      if (((typeof method) !== 'string') || ((typeof path) !== 'string') || ((typeof fns[0]) !== 'function')) {
        throw new Error(`route() must be called with (method, path, [...optionalMiddlewareFns], fn)`);
      }
      app[method](path, async req => {
        let result;
        for (const fn of fns) {
          try {
            result = await fn(req);
          } catch (e) {
            return self.handleError(req, e);
          }
        }
        return req.res.send(result);
      });
    },

    get(path, ...fns) {
      if (((typeof path) !== 'string') || ((typeof fns[0]) !== 'function')) {
        throw new Error(`get() must be called with (path, [...optionalMiddlewareFns], fn)`);
      }
      return self.route('get', path, ...fns);
    },

    post(path, ...fns) {
      if (((typeof path) !== 'string') || ((typeof fns[0]) !== 'function')) {
        throw new Error(`post() must be called with (path, [...optionalMiddlewareFns], fn)`);
      }
      return self.route('post', path, ...fns);
    },

    patch(path, ...fns) {
      if (((typeof path) !== 'string') || ((typeof fns[0]) !== 'function')) {
        throw new Error(`patch() must be called with (path, [...optionalMiddlewareFns], fn)`);
      }
      return self.route('patch', path, ...fns);
    },

    put(path, ...fns) {
      if (((typeof path) !== 'string') || ((typeof fns[0]) !== 'function')) {
        throw new Error(`put() must be called with (path, [...optionalMiddlewareFns], fn)`);
      }
      return self.route('put', path, ...fns);
    },

    del(path, ...fns) {
      if (((typeof path) !== 'string') || ((typeof fns[0]) !== 'function')) {
        throw new Error(`del() must be called with (path, [...optionalMiddlewareFns], fn)`);
      }
      return self.route('delete', path, ...fns);
    },

    handleError(req, e) {
      if (e.name === 'ValidationError') {
        // Expected status code when using the yup library for validation
        e.status = 400;
      }
      if (!req.res) {
        // Don't create a chicken and egg problem by calling self.error here
        throw new Error('First argument to handleError must be req');
      }
      if (!e) {
        throw new Error('Second argument to handleError must be error');
      }
      if (!prodLike) {
        console.error(e.stack);
      }
      console.error(JSON.stringify({
        url: req.url,
        method: req.method,
        ip: req.ip,
        at: Date.now(),
        status: e.status,
        message: e.message,
        ...prodLike ? { stack: e.stack } : {},
      }, null, prodLike ? '' : '  '));
      const res = req.res;
      if (e.status) {
        res.status(e.status);
        return res.send(e.message);
      } else {
        res.status(500);
        return res.send('error');
      }
    }

  };

  return self;

};

module.exports = {
  WebError,
  minuscule
};
