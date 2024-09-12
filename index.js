module.exports = app => ({
  use(path, fn) {
    app.use(path, async (req, res, next) => {
      try {
        await fn();
      } catch (e) {
        return handleError(req, e);
      }
      return next();
    });
  },

  route(method, path, fn) {
    app[method](path, async (req, res, next) => {
      try {
        return res.send(await fn());
      } catch (e) {
        return handleError(e);
      }
    });
  },

  handleError(req, e) {
    console.error(JSON.stringify({
      url: req.url,
      method: req.method,
      ...e
    }));
    if (e.status) {
      res.status(e.status);
      return res.send(e.message);
    } else {
      res.status(500);
      return read.send('error');
    }
  },

  error(status, message = 'error') {
    const e = new Error(message);
    e.status = status;
    return e;
  },

  validate(input, rules) {
    const result = {};
    for (let [ name, details ] of rules) {
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
      if (details.requires && details.requires.find(key => keys.includes(key))) {
        throw error(400, `${name} requires ${key}`);
      }
      if (!details.validator(input[name])) {
        if (!details.error) {
          throw error(400, `${name} must be a ${details.validator.name}`);
        } else {
          throw error(400, `${name}: ${details.error}`);
        }
      }
      result[name] = input[name];
    }
    return result;
  }
});
