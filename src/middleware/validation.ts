import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import mongoose from 'mongoose';

export const validateRequest = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          error: 'Validation Error',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        });
        return;
      }
      next(error);
    }
  };
};

export const validateObjectId = (req: Request, res: Response, next: NextFunction): void => {
  const { id } = req.params;
  
  if (!id) {
    res.status(400).json({
      error: 'Missing ID',
      message: 'ID parameter is required'
    });
    return;
  }
  
  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400).json({
      error: 'Invalid ID format',
      message: 'The provided ID is not a valid MongoDB ObjectId'
    });
    return;
  }
  
  next();
};