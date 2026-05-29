'use strict';

module.exports = {
  ROLES: { ADMIN: 'admin', MENTOR: 'mentor', RESEARCHER: 'researcher', STUDENT: 'student' },
  PROJECT_STATUS: {
    DRAFT: 'draft', SUBMITTED: 'submitted', UNDER_REVIEW: 'under_review',
    APPROVED: 'approved', IN_PROGRESS: 'in_progress', COMPLETED: 'completed', REJECTED: 'rejected'
  },
  STARTUP_STATUS: { DRAFT: 'draft', ACTIVE: 'active', PAUSED: 'paused', GRADUATED: 'graduated', REJECTED: 'rejected' },
  EXECUTION_STATUS: { QUEUED: 'queued', RUNNING: 'running', COMPLETED: 'completed', FAILED: 'failed', TIMEOUT: 'timeout' },
  PAGINATION: { DEFAULT_PAGE: 1, DEFAULT_LIMIT: 10, MAX_LIMIT: 100 }
};
