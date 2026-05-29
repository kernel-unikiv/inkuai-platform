'use strict';

class ApiResponse {
  static success(res, data = {}, statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      timestamp: new Date().toISOString(),
      ...data
    });
  }

  static error(res, message, statusCode = 500, errors = null) {
    const response = { success: false, timestamp: new Date().toISOString(), message };
    if (errors) response.errors = errors;
    return res.status(statusCode).json(response);
  }

  static paginated(res, data, pagination) {
    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      data,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total: pagination.total,
        pages: Math.ceil(pagination.total / pagination.limit)
      }
    });
  }
}

class AppError extends Error {
  constructor(message, statusCode = 500, errors = null) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = { ApiResponse, AppError };
