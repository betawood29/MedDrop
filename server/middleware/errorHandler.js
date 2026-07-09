// Global error handler middleware
// Catches all errors thrown in routes/controllers and sends a clean JSON response

const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    const messages = Object.values(err.errors).map((e) => e.message);
    message = messages.join(', ');
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    statusCode = 400;
    const field = Object.keys(err.keyValue)[0];
    message = `${field} already exists`;
  }

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid ID format';
  }

  // Multer upload errors (file too large, too many files, etc.) — otherwise these
  // surface as an uncoded 500 since MulterError has no statusCode of its own.
  if (err.name === 'MulterError') {
    statusCode = 400;
    if (err.code === 'LIMIT_FILE_SIZE') message = 'File is too large. Please upload a smaller file.';
    else if (err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE') message = 'Too many files uploaded.';
    else message = err.message;
  }

  console.error(`[ERROR] ${statusCode} - ${message}`, err.stack ? `\n${err.stack}` : '');

  res.status(statusCode).json({
    success: false,
    message,
    ...(err.errorCode && { errorCode: err.errorCode }),
    ...(err.rxStatus  && { rxStatus:   err.rxStatus  }),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = errorHandler;
