const express = require('express');
const router = express.Router();

// 컨트롤러 선언
const {
  getBookList,
  getBookByCategory,
  getAllCategories,
  getTopBooks,
} = require('../controllers/getBookList');
const {
  getBookDetail,
  getBookReviews,
  getReviewDistribution,
} = require('../controllers/BookDetailController');
const { getSearchBooks } = require('../controllers/getSearchBooks');
const { getNewBook } = require('../controllers/getNewBook');
const { getBestBook } = require('../controllers/getBestBook');

const { verifyToken } = require('../controllers/authController');
const {
  verifyInfoToken,
  getMemberInfo,
  getMemberNicknames,
} = require('../controllers/memberInfoController'); //회원정보 get

const {
  getCommunityPosts,
  getCommunityPostById,
  getCommentsByPostId,
  getHotTopics,
  getTopUsers,
} = require('../controllers/communityController');
const { getUserStats } = require('../controllers/communityController');
const {
  getThreads,
  checkThreadExistence,
  searchThreads,
  getThreadBookList,
} = require('../controllers/threadController');
const {
  getThreadDetail,
  getThreadComment,
  getCommentReply,
} = require('../controllers/threadDetailController');

const getTerms = require('../controllers/authController').getTerms;

const { getAdminBookList } = require('../controllers/adminBooklistContorller');

// get Url
router.get('/book-list', getBookList);
router.get('/book-list/:bookId', getBookDetail);
router.get('/book-list/:bookId/reviews', getBookReviews);
router.get('/top-books', getTopBooks);

router.get('/community', getCommunityPosts);
router.get('/community/:postId', getCommunityPostById);
router.get('/community/:postId/comments', getCommentsByPostId);
router.get('/user/stats', getUserStats);
router.get('/hot-topics', getHotTopics);
router.get('/top-users', getTopUsers);
router.get('/search-books', getSearchBooks);
router.get('/search-category', getBookByCategory);
router.get('/all-categories', getAllCategories);
router.get('/new-book', getNewBook);
router.get('/best-book', getBestBook);
router.get('/threads', getThreads);
router.get('/threads/exists/:book_id', checkThreadExistence);
router.get('/search-threads', searchThreads);
router.get('/threads/:thread_num', getThreadDetail);
router.get('/threads/:thread_num/comments', getThreadComment); // 스레드 부모 댓글 조회
router.get('/comments/:thread_content_num2/replies', getCommentReply); // 스레드 대댓글 조회
router.get('/terms', getTerms); // 약관 조회 라우트
router.get('/members/:member_num', verifyInfoToken, getMemberInfo); // id로 회원 정보 조회
router.get(
  '/members/:member_num/nicknames',

  getMemberNicknames
);
router.get('/book-list/:bookId/review-distribution', getReviewDistribution);
router.get('/new_thread', getThreadBookList);

// 토큰 검증 라우트
router.get('/verify', verifyToken);

// ===============admin ================
router.get('/admin/books', getAdminBookList);

module.exports = router;
