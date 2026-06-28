import { Router } from 'express';
import * as controller from './controller';
import { requireAuth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import {
  updateProfileSchema,
  updateLocationSchema,
  updateLanguageSchema,
  addRoleSchema,
  removeRoleParamSchema,
  emergencyContactSchema,
} from './schema';
import { param } from 'express-validator';

const router = Router();

// Every route in this module requires a valid access token.
router.use(requireAuth);

router.get('/me', controller.getMe);
router.patch('/me', validate(updateProfileSchema), controller.updateMe);
router.patch('/me/location', validate(updateLocationSchema), controller.updateLocation);
router.patch('/me/language', validate(updateLanguageSchema), controller.updateLanguage);

router.post('/me/roles', validate(addRoleSchema), controller.addRole);
router.delete('/me/roles/:role', validate(removeRoleParamSchema), controller.removeRole);

router.post('/me/photo', controller.getPhotoUploadSignature);

router.get('/me/emergency-contacts', controller.listEmergencyContacts);
router.post('/me/emergency-contacts', validate(emergencyContactSchema), controller.addEmergencyContact);
router.delete(
  '/me/emergency-contacts/:contactId',
  validate([param('contactId').isUUID()]),
  controller.deleteEmergencyContact
);

export default router;
