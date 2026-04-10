import express from 'express';
import { protectRoutes } from '../middleware/auth.middleware.js';
import { acceptFriendRequest, getFriendRequests, getMyFriends, getOutGoingFriendRequests, getRecommendedUsers, sendFriendRequest, updateProfile } from '../controllers/user.controller.js';

const router = express.Router();

// apply the protectRoutes middlware to all routes in this route file
router.use(protectRoutes);

router.get("/", getRecommendedUsers);
router.get("/friends", getMyFriends);
router.put("/profile", updateProfile);

router.post("/friend-request/:id", sendFriendRequest);
router.put("/friend-request/:id/accept", acceptFriendRequest);

router.get("/friend-requests", getFriendRequests);
router.get("/outgoing-friend-requests", getOutGoingFriendRequests);

export default router;