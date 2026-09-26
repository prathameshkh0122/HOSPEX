function notFound(req, res) {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
}

function errorHandler(error, _req, res, _next) {
  let status = error.status || 500;
  let message = status >= 500 ? 'Something went wrong.' : (error.message || 'Something went wrong.');
  if (error instanceof SyntaxError && error.status === 400 && Object.prototype.hasOwnProperty.call(error, 'body')) {
    status = 400;
    message = 'Request body must contain valid JSON.';
  }
  if (error.message === 'This website origin is not allowed by CORS.') { status = 403; message = error.message; }
  if (error.code === 11000) { status = 409; message = 'An account with this email already exists.'; }
  if (error.name === 'ValidationError') { status = 400; message = Object.values(error.errors).map((item) => item.message).join(' '); }
  if (error.name === 'CastError') { status = 400; message = 'Invalid resource or request ID.'; }
  if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') { status = 401; message = 'Invalid or expired session.'; }
  if (status >= 500) console.error(error);
  res.status(status).json({ success: false, message });
}

module.exports = { notFound, errorHandler };
