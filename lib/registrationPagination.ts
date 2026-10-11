export function registrationPage(total: number, requestedPage: number, pageSize = 50) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.max(1, Math.min(requestedPage, pages));
  const offset = (page - 1) * pageSize;
  return { page, pages, offset, end: Math.min(total, offset + pageSize), total };
}
