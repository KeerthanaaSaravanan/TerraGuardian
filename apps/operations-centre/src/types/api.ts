/**
 * API response wrapper types.
 */

export interface ApiResponse<T> {
  data: T;
  meta?: ApiMeta;
}

export interface ApiMeta {
  timestamp: string;
  requestId?: string;
}

export interface ApiError {
  status: number;
  message: string;
  detail?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface HealthResponse {
  status: string;
  service: string;
  version: string;
}
