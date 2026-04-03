/**
 * Standard success response payload.
 * Usage: res.json(successResponse(data, 'Fetched records'))
 */
export const successResponse = <T>(data: T, message = 'Success') => ({
  success: true as const,
  message,
  data,
});

/**
 * Standard paginated success response payload.
 * Usage: res.json(paginatedResponse(rows, { page, limit, total }))
 */
export const paginatedResponse = <T>(data: T[], pagination: object, message = 'Success') => ({
  success: true as const,
  message,
  data,
  pagination,
});

/**
 * Standard error payload helper.
 * Usage: res.status(400).json(errorResponse('Bad request', 400))
 */
export const errorResponse = (message: string, code = 400) => ({
  success: false as const,
  error: message,
  code,
});
