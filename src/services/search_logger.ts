import { Request } from 'express';
import SearchLog from '../models/search_model';
import { ISearchLog } from '../types/search_type';
import mongoose from 'mongoose';

interface LogSearchParams {
  userId?: string;
  searchType: ISearchLog['searchType'];
  query: any;
  resultCount: number;
  req?: Request;
}

export const logSearch = async ({
  userId,
  searchType,
  query,
  resultCount,
  req
}: LogSearchParams): Promise<void> => {
  try {
    const logEntry = new SearchLog({
      userId: userId ? new mongoose.Types.ObjectId(userId) : undefined,
      searchType,
      query,
      resultCount,
      ipAddress: req?.ip || req?.socket?.remoteAddress,
      userAgent: req?.headers['user-agent']
    });

    await logEntry.save();
  } catch (error) {
    console.error('Failed to log search:', error);
    // Don't throw error to avoid breaking the main functionality
  }
};