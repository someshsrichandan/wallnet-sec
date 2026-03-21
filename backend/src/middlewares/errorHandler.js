module.exports = (err, req, res, next) => {
  const status = err.statusCode || err.status || 500;
  const message = err.message || 'Something went wrong';
  const isProduction = process.env.NODE_ENV === 'production';

  console.error(`[${req.requestId || 'no-request-id'}]`, err);

  const payload = {
    message,
    requestId: req.requestId,
  };

  if (err.details) {
    payload.details = err.details;
  }

  if (!isProduction && err.stack) {
    payload.stack = err.stack;
  }

  res.status(status).json(payload);
};
