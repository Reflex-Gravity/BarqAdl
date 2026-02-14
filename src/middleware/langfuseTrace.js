const { getLangfuse } = require('../config/langfuse');
const { generateId } = require('../utils/helpers');

const langfuseTrace = (req, res, next) => {
  const langfuse = getLangfuse();
  const traceId = generateId();

  req.trace = langfuse.trace({
    id: traceId,
    name: 'barqadl-query',
    userId: req.body?.userId || 'anonymous',
    metadata: {
      endpoint: req.path,
      method: req.method,
    },
  });

  req.traceId = traceId;

  // Flush langfuse on response finish
  res.on('finish', () => {
    langfuse.flushAsync().catch(() => {});
  });

  next();
};

module.exports = { langfuseTrace };
