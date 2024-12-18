const express = require('express');
const router = express.Router();
const {
  joinUser,
  loginUser,
  logoutUser,
  saveAgreement,
} = require('../controllers/authController'); // authController를 사용
const communityController = require('../controllers/communityController');
const { registerBestSeller } = require('../controllers/postBestBook');
const {
  postBookReview,
  verifyToken,
} = require('../controllers/BookDetailController');
const { createThread } = require('../controllers/threadController');
const {
  createThreadComment,
  createThreadReply,
} = require('../controllers/threadDetailController');

const { postNewBooks } = require('../controllers/autoEmailing');

// 약관 저장 라우트 설정
router.post('/terms/agreement', saveAgreement);
// 회원가입 라우트 설정
router.post('/join', joinUser);
// 로그인 라우트 설정
router.post('/login', loginUser);
// 로그아웃 라우트 설정
router.post('/logout', logoutUser); // 추가된 부분
// 커뮤니티 생성 라우트 설정
router.post('/community', communityController.createCommunityPost);
// 커뮤니티 댓글 생성 라우트 설정
router.post('/community/comment', communityController.createComment);
// 베스트셀러 등록
router.post('/register-best', registerBestSeller);
// 책 리뷰 작성
router.post('/book-list/:bookId/reviews', verifyToken, postBookReview);
// 스레드 생성
router.post('/threads', createThread);
// 스레드 댓글 등록
router.post('/threads/:thread_num/comment', createThreadComment);
// 스레드 대댓글 등록
router.post(
  '/threads/:thread_num/comment/:thread_content_num/reply',
  createThreadReply
);

// ===================================admin===================================
// 신간 도서 등록
router.post('/new-books', postNewBooks);

module.exports = router;
