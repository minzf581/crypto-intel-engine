import { Response } from 'express';
import logger from './logger';

// Success response
export const successResponse = (res: Response, data: any = {}, message: string = 'Success', statusCode: number = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data
  });
};

// Error response
export const errorResponse = (res: Response, message: string = 'An error occurred', statusCode: number = 500, error: any = {}) => {
  // Log error for server errors
  if (statusCode >= 500) {
    logger.error(`API Error: ${message}`, { error });
  }
  
  return res.status(statusCode).json({
    success: false,
    message,
    error: process.env.NODE_ENV === 'production' ? undefined : error
  });
};

// Validation error response
export const validationErrorResponse = (res: Response, errors: any) => {
  return res.status(400).json({
    success: false,
    message: 'Validation Error',
    errors
  });
}; 