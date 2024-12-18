const express = require('express');
const router = express.Router();
const communityController = require('../controllers/communityController');
const { updateMemberInfo } = require('../controllers/memberInfoController');
const { patchBooksInfo } = require('../controllers/patchBooksInfo');

router.patch('/community/:postId', communityController.updateCommunityPost);
router.patch('/members/:member_num', updateMemberInfo);
router.patch('/books/:book_id', patchBooksInfo);

module.exports = router;
