const express = require('express');
const router = express.Router()
const rateLimit = require('express-rate-limit');
const ChatController = require('../controllers/chat')
const auth = require('../middleware/authenticate')

const messageRateLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1-minute window
    max: process.env.QUERY_RATE_LIMIT || 3, // Limit each user to 50 requests per windowMs
    keyGenerator: (req) => req.decoded.userId, // Use user ID from verified token
    message: {
      status: 429,
      error: 'Too many requests, please wait and try again later.',
    },
    standardHeaders: true, // Include rate limit headers in responses
    legacyHeaders: false,  // Disable the deprecated X-RateLimit-* headers
    handler: (req, res) => {
      // Custom handler for rate limit exceeded
      return res.status(429).json({
        success: false,
        error: "rate_limit",
        message: `Too many requests, please try again later.`
      });
    },
  });

router.route('/teams/:teamId/chats')
    .post(auth.verifyToken, auth.teamExists, auth.isMemberOfTeamOrSharedMember, ChatController.createNewChat)

router.route('/chat/get-histories')
    .post(auth.verifyToken, auth.userExists, auth.isSenderOwner, auth.teamExists, auth.isMemberOfTeamOrSharedMember, ChatController.getChatHistoriesForUserByTeam)

router.route('/teams/:teamId/chats/:chatId')
    .patch(auth.verifyToken, auth.teamExists, auth.isMemberOfTeamOrSharedMember, auth.isChatIdExist, auth.isChatIdBelongsToTeam, auth.isChatCreator, ChatController.renameChatHistory)

router.route('/teams/:teamId/chats/:chatId')
    .delete(auth.verifyToken, auth.teamExists, auth.isMemberOfTeamOrSharedMember, auth.isChatIdExist, auth.isChatIdBelongsToTeam, auth.isChatCreator, ChatController.deleteChatHistory)

router.route('/teams/:teamId/chats/:chatId/messages')
    .get(auth.verifyToken, auth.isChatIdExist, auth.isChatCreator, ChatController.retrieveChatMessages)

router.route('/teams/:teamId/chats/:chatId/messages')
    .post(auth.verifyToken, 
        messageRateLimiter, 
        auth.teamExists, auth.isMemberOfTeamOrSharedMember, auth.isChatIdExist, auth.isChatIdBelongsToTeam, auth.isChatCreator, ChatController.addMessageToConversation)

router.route('/teams/:teamId/chats')
    .get(auth.verifyToken, auth.userExists, auth.teamExists, auth.isMemberOfTeamOrSharedMember, ChatController.getChatHistoriesForUserBySpecificScope)

module.exports = () => router;

