import { Request, Response, NextFunction } from 'express';
import * as service from './service';
import { isValidRadius } from '../../lib/geo';
import { createNotification } from '../notifications/service';
import { logger } from '../../lib/logger';

export async function createTrainerProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const profile = await service.createOrUpdateTrainerProfile(req.user!.id, req.body);
    res.status(201).json({ success: true, profile });
  } catch (err) {
    next(err);
  }
}

export async function getMyTrainerProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const profile = await service.getTrainerByUserId(req.user!.id);
    res.json({ success: true, profile });
  } catch (err) {
    next(err);
  }
}

export async function patchTrainerProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const profile = await service.patchTrainerProfile(req.user!.id, req.body);
    res.json({ success: true, profile });
  } catch (err) {
    next(err);
  }
}

export async function createCourse(req: Request, res: Response, next: NextFunction) {
  try {
    const course = await service.createCourse(req.user!.id, req.body);
    res.status(201).json({ success: true, course });
  } catch (err) {
    next(err);
  }
}

export async function updateCourse(req: Request, res: Response, next: NextFunction) {
  try {
    const course = await service.updateCourse(req.user!.id, req.params.id, req.body);
    res.json({ success: true, course });
  } catch (err) {
    next(err);
  }
}

export async function getCourse(req: Request, res: Response, next: NextFunction) {
  try {
    const course = await service.getCourseById(req.params.id);
    const reviews = await service.listCourseReviews(req.params.id);
    res.json({ success: true, course, reviews });
  } catch (err) {
    next(err);
  }
}

export async function searchCourses(req: Request, res: Response, next: NextFunction) {
  try {
    const radius = req.query.radius ? parseInt(req.query.radius as string, 10) : undefined;
    const courses = await service.searchCourses({
      subject: req.query.subject as string | undefined,
      mode: req.query.mode as string | undefined,
      lat: req.query.lat ? parseFloat(req.query.lat as string) : undefined,
      lng: req.query.lng ? parseFloat(req.query.lng as string) : undefined,
      radiusKm: radius && isValidRadius(radius) ? radius : undefined,
      page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
    });
    res.json({ success: true, courses });
  } catch (err) {
    next(err);
  }
}

export async function listMyCourses(req: Request, res: Response, next: NextFunction) {
  try {
    const courses = await service.listMyCourses(req.user!.id);
    res.json({ success: true, courses });
  } catch (err) {
    next(err);
  }
}

export async function createEnrollment(req: Request, res: Response, next: NextFunction) {
  try {
    const enrollment = await service.createEnrollment(req.user!.id, req.body.courseId);

    // Per doc notification trigger: "enrollment update" (a new enrollment
    // is the first such update; status changes below are the rest).
    try {
      await createNotification({
        userId: enrollment.trainerId,
        type: 'enrollment_new',
        payload: { enrollmentId: enrollment.id, courseId: req.body.courseId, studentId: req.user!.id },
      });
    } catch (notifErr: any) {
      logger.warn('Failed to create new-enrollment notification', { error: notifErr.message });
    }

    res.status(201).json({ success: true, enrollment });
  } catch (err) {
    next(err);
  }
}

export async function listMyEnrollments(req: Request, res: Response, next: NextFunction) {
  try {
    const enrollments = await service.listMyEnrollments(req.user!.id);
    res.json({ success: true, enrollments });
  } catch (err) {
    next(err);
  }
}

export async function listTrainerEnrollments(req: Request, res: Response, next: NextFunction) {
  try {
    const enrollments = await service.listEnrollmentsForTrainer(req.user!.id);
    res.json({ success: true, enrollments });
  } catch (err) {
    next(err);
  }
}

export async function updateEnrollmentStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const enrollment = await service.updateEnrollmentStatus(req.params.id, req.user!.id, req.body.status);

    // Per doc notification trigger: "enrollment update" — notify the student.
    try {
      await createNotification({
        userId: enrollment.student_id,
        type: 'enrollment_status',
        payload: { enrollmentId: enrollment.id, status: enrollment.status },
      });
    } catch (notifErr: any) {
      logger.warn('Failed to create enrollment status-change notification', { error: notifErr.message });
    }

    res.json({ success: true, enrollment });
  } catch (err) {
    next(err);
  }
}

export async function createReview(req: Request, res: Response, next: NextFunction) {
  try {
    const { courseId, rating, comment } = req.body;
    const review = await service.createCourseReview(req.user!.id, courseId, rating, comment);

    // Per doc notification trigger: "new review".
    try {
      const course = await service.getCourseById(courseId);
      await createNotification({
        userId: course.trainer_id,
        type: 'review_new',
        payload: { reviewId: review.id, courseId, rating, reviewerId: req.user!.id },
      });
    } catch (notifErr: any) {
      logger.warn('Failed to create new-review notification', { error: notifErr.message });
    }

    res.status(201).json({ success: true, review });
  } catch (err) {
    next(err);
  }
}
