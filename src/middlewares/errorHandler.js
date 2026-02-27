const logger = require("../utils/logger");

const errorHandler = (err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  logger.error("request_error", {
    message: err.message,
    statusCode,
    method: req.method,
    path: req.originalUrl,
  });
  res.status(statusCode);
  res.json({
    status: "error",
    message: err.message,
    stack: process.env.NODE_ENV === "production" ? null : err.stack,
  });
};

module.exports = errorHandler;
