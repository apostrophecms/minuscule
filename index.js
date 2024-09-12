"use strict";

const { resolve } = require("url");

module.exports = app => {

  const prodLike = process.env.ENV === 'production';

  const self = {

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

    delete(path, ...fns) {
      if (((typeof path) !== 'string') || ((typeof fns[0]) !== 'function')) {
        throw new Error(`delete() must be called with (path, [...optionalMiddlewareFns], fn)`);
      }
      return self.route('delete', path, ...fns);
    },

    handleError(req, e) {
      if (!req.res) {
        throw error(500, 'First argument to handleError must be req');
      }
      if (!e) {
        throw error(500, 'Second argument to handleError must be error');
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
    },

    error(status, message = 'error') {
      const e = new Error(message);
      e.status = status;
      return e;
    },

    validate(input, rules) {
      if ((typeof input) !== 'object') {
        throw error(400, 'object expected');
      }
      if ((typeof rules) !== 'object') {
        throw error(500, 'second argument to validate should be a rules object');
      }
      const result = {};
      for (let [ name, details ] of Object.entries(rules)) {
        if (!Object.hasOwn(input, name)) {
          if (details.required) {
            throw error(400, `${name} is required`);
          }
          if (details.default !== undefined) {
            result[name] = details.default;
          }
          continue;
        }
        if ((typeof details) === 'function') {
          details = {
            validator: details
          };
        }
        const keys = Object.keys(input);
        if (details.requires) {
          if (!isStrings(details.requires)) {
            throw self.error(500, `${name}: "requires" property of a validation rule must be an array of strings`);
          }
        }
        const missing = details.requires && details.requires.find(key => !keys.includes(key));
        if (missing) {
          throw self.error(400, `${name} requires ${missing}`);
        }
        if (!((input[name] instanceof details.validator) || details.validator(input[name]))) {
          if (!details.error) {
            throw self.error(400, `${name} must be a ${details.validator.name}`);
          } else {
            throw self.error(400, `${name}: ${details.error}`);
          }
        }
        result[name] = input[name];
      }
      return result;
    }
  };

  return self;

};

function isStrings(v) {
  return Array.isArray(v) && !v.some(value => (typeof value) !== 'string');
}
