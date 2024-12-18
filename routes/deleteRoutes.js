const express = require('express');
const router = express.Router();
const communityController = require('../controllers/communityController');
const {
  deleteBookReview,
  verifyToken,
} = require('../controllers/BookDetailController');
const {
  verifyInfoToken,
  deleteMembership,
} = require('../controllers/memberInfoController');
const {
  deleteThreadComment,
} = require('../controllers/threadDetailController');

router.delete('/community/:postId', communityController.deleteCommunityPost);
router.delete(
  '/community/comment/:commentId',
  communityController.deleteComment
);

router.delete(
  '/book-list/:bookId/reviews/:reviewId',
  verifyToken,
  deleteBookReview
);

router.delete('/members/:member_num', verifyInfoToken, deleteMembership);

// 스레드 댓글 및 대댓글 삭제
router.delete('/threads/comment/:thread_content_num', deleteThreadComment);

module.exports = router;
