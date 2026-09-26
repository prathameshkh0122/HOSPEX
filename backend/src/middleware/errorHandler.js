function notFound(req, res) {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
}

function errorHandler(error, _req, res, _next) {
  let status = error.status || 500;
  let message = error.message || 'Something went wrong.';
  if (error.code === 11000) { status = 409; message = 'An account with this email already exists.'; }
  if (error.name === 'ValidationError') { status = 400; message = Object.values(error.errors).map((item) => item.message).join(' '); }
  if (error.name === 'CastError') { status = 400; message = 'Invalid resource or request ID.'; }
  if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') { status = 401; message = 'Invalid or expired session.'; }
  if (status >= 500) console.error(error);
  res.status(status).json({ success: false, message });
}

module.exports = { notFound, errorHandler };
