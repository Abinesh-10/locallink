import { Router } from 'express';
import * as controller from './controller';
import { requireAuth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { startChatSchema, roomIdParamSchema, listMessagesSchema, sendMessageSchema } from './schema';

const router = Router();

router.use(requireAuth);

// Starting a chat isn't explicitly named in doc §4's endpoint list (which
// jumps straight to GET /chats), but the doc's feature description says
// chat is "initiated from worker profile, listing, or order page" — there
// must be some endpoint that creates/finds the room before messages can be
// listed. This fills that gap, same pattern as every prior phase's
// implied-but-unlisted endpoints.
router.post('/chats/start', validate(startChatSchema), controller.startChat);

router.get('/chats', controller.listRooms);
router.get('/chats/:roomId/messages', validate(listMessagesSchema), controller.listMessages);
router.post('/chats/:roomId/messages', validate(sendMessageSchema), controller.sendMessage);
router.patch('/chats/:roomId/read', validate(roomIdParamSchema), controller.markRead);

export default router;
