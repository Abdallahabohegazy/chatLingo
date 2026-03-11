import express from 'express';
import { protectRoutes } from '../middleware/auth.middleware.js';
import { getStreamToken } from '../controllers/chat.controller.js';

const router = express.Router();

router.get("/token",protectRoutes , getStreamToken)

export default router;