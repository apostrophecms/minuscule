class WebError extends Error {
  constructor(status, message) {
    super(`${status}: ${message}`);
    this.status = status;
    return this;
  }
}

function minuscule(express) {
  const isProduction = process.env.ENV === 'production';

  const handleError = async (err, req, res, next) => {
    // "ValidationError": Expected status code when using the yup library for validation
    const status = err.status ||
      (err.name === 'ValidationError' && 400) ||
      500;

    console.error(
      JSON.stringify(
        {
          url: req.url,
          method: req.method,
          ip: req.ip,
          at: Date.now(),
          status,
          message: err.message,
          stack: err.stack,
        },
        null,
        isProduction ? '' : '  '
      )
    );

    return res.status(status).send(status === 500 ? 'error' : err.message);
  };

  const listen = (...args) => {
    // Default error handler, must come last
    express.use(handleError);

    return express.listen(...args);
  }

  return {
    ...express,
    listen
  };
};

export {
  WebError,
  minuscule
};
