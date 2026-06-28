import { Router } from 'express';
import * as controller from './controller';
import { requireAuth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import {
  createTrainerProfileSchema,
  updateTrainerProfileSchema,
  createCourseSchema,
  updateCourseSchema,
  courseIdParamSchema,
  searchCoursesSchema,
  createEnrollmentSchema,
  updateEnrollmentStatusSchema,
  createCourseReviewSchema,
} from './schema';

const router = Router();

// GET /courses?subject=&mode=&radius= — public browse, no auth required.
router.get('/courses', validate(searchCoursesSchema), controller.searchCourses);

// GET /courses/:id — public course detail page. Not explicitly listed in
// doc §4's endpoint list, but required by the /courses/:id frontend page —
// same gap pattern as hire/rent/market's category endpoints.
router.get('/courses/:id', validate(courseIdParamSchema), controller.getCourse);

// Everything below requires authentication.
router.use(requireAuth);

// Trainer profile — create (upsert) vs patch (selective update) split,
// mirroring hire module's worker-profile precedent.
router.post('/trainer-profile', validate(createTrainerProfileSchema), controller.createTrainerProfile);
router.patch('/trainer-profile', validate(updateTrainerProfileSchema), controller.patchTrainerProfile);
router.get('/trainer-profile/me', controller.getMyTrainerProfile);

// POST /courses, PATCH /courses/:id
router.post('/courses', validate(createCourseSchema), controller.createCourse);
router.patch('/courses/:id', validate([...courseIdParamSchema, ...updateCourseSchema]), controller.updateCourse);

// Trainer's own courses — mirrors hire/rent/market's /mine precedent.
router.get('/courses-mine', controller.listMyCourses);

// POST /enrollments, PATCH /enrollments/:id/status, GET /enrollments/mine, GET /enrollments/trainer
router.post('/enrollments', validate(createEnrollmentSchema), controller.createEnrollment);
router.get('/enrollments/mine', controller.listMyEnrollments);
router.get('/enrollments/trainer', controller.listTrainerEnrollments);
router.patch('/enrollments/:id/status', validate(updateEnrollmentStatusSchema), controller.updateEnrollmentStatus);

// Course reviews — a distinct endpoint from Phase 2/3's reviews, since the
// request shape and completion-check differ (courseId+rating vs
// workerId+requestId, enrollment-based eligibility rather than
// service_requests/rental_bookings).
router.post('/course-reviews', validate(createCourseReviewSchema), controller.createReview);

export default router;
