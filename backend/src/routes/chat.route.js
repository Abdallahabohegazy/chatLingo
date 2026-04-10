import express from 'express';
import { protectRoutes } from '../middleware/auth.middleware.js';
import { getStreamToken, sendTranslatedMessage } from '../controllers/chat.controller.js';

const router = express.Router();

router.get("/token",protectRoutes , getStreamToken)
router.post("/send", protectRoutes, sendTranslatedMessage);

export default router;