const errorHandler = (err, req, res, _next) => {
  console.error(`[ERROR] ${err.message}`, err.stack);

  if (req.trace) {
    req.trace.event({
      name: 'error',
      metadata: { message: err.message, stack: err.stack },
    });
  }

  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    traceId: req.traceId || null,
  });
};

module.exports = { errorHandler };
