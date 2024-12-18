const database = require("../database/database");

// 스레드 상세 조회
exports.getThreadDetail = async (req, res) => {
  const { thread_num } = req.params;

  try {
    const query = `
      SELECT 
        thread.thread_num,
        book.book_cover,
        book.book_title,
        thread.thread_created_at,
        thread.thread_status,
        COUNT(DISTINCT CASE WHEN thread_main.thread_status = true THEN thread_main.member_num END) AS participant_count,
        COUNT(CASE WHEN thread_main.thread_status = true THEN thread_main.thread_content END) AS total_comments
      FROM thread
      JOIN book ON thread.book_id = book.book_id
      LEFT JOIN thread_main ON thread.thread_num = thread_main.thread_num
      WHERE thread.thread_num = $1 AND thread.thread_status = true
      GROUP BY thread.thread_num, book.book_cover, book.book_title, thread.thread_created_at, thread.thread_status
    `;
    const values = [thread_num];
    const result = await database.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "스레드를 찾을 수 없습니다." });
    }

    const threadData = result.rows[0];

    // `thread_created_at` 필드를 원하는 한국어 형식으로 변환
    const createdAt = new Date(threadData.thread_created_at);
    threadData.thread_created_at = createdAt.toLocaleString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "numeric",
      minute: "numeric",
      hour12: true,
    });

    console.log("Formatted Query result:", threadData);
    res.status(200).json(threadData);
  } catch (error) {
    console.error("Error fetching thread details:", error);
    res
      .status(500)
      .json({ message: "스레드 정보를 가져오는 중 오류가 발생했습니다." });
  }
};

// 스레드 댓글 작성
exports.createThreadComment = async (req, res) => {
  try {
    const { member_num, thread_content } = req.body;
    const { thread_num } = req.params;

    console.log("Received member_num:", member_num); // member_num 확인용 로그

    // 로그인 여부 확인
    const userCheckQuery = `
      SELECT * FROM member 
      WHERE member_num = $1 AND member_status = 'active'
    `;
    const userCheckResult = await database.query(userCheckQuery, [member_num]);

    if (userCheckResult.rows.length === 0) {
      return res.status(403).json({ message: "회원 로그인이 필요합니다." });
    }

    // 댓글 길이 제한 확인
    if (!thread_content || thread_content.length < 10) {
      return res
        .status(400)
        .json({ message: "댓글은 최소 10자 이상 작성해야 합니다." });
    }
    if (thread_content.length > 300) {
      return res
        .status(400)
        .json({ message: "댓글은 최대 300자까지 작성할 수 있습니다." });
    }

    // 댓글 삽입
    const insertCommentQuery = `
      INSERT INTO thread_main (thread_num, member_num, thread_content, thread_content_created_at, thread_status) 
      VALUES ($1, $2, $3, NOW(), true) RETURNING thread_content_num
    `;
    const insertCommentValues = [thread_num, member_num, thread_content];
    const insertCommentResult = await database.query(
      insertCommentQuery,
      insertCommentValues
    );

    res.status(201).json({
      message: "댓글이 성공적으로 작성되었습니다.",
      comment_num: insertCommentResult.rows[0].thread_content_num,
    });
  } catch (error) {
    console.error("Error creating comment:", error);
    res.status(500).json({ message: "댓글 작성에 실패했습니다." });
  }
};

// 대댓글 작성
exports.createThreadReply = async (req, res) => {
  const { member_num, thread_content_num2, thread_content } = req.body;

  try {
    // 로그인한 사용자 확인
    const userCheckQuery = `
      SELECT * FROM member WHERE member_num = $1 AND member_status = 'active'
    `;
    const userCheckResult = await database.query(userCheckQuery, [member_num]);

    if (userCheckResult.rows.length === 0) {
      return res.status(403).json({ message: "회원 로그인이 필요합니다." });
    }

    // 대댓글 길이 제한
    if (!thread_content || thread_content.length < 10) {
      return res
        .status(400)
        .json({ message: "대댓글은 최소 10자 이상 작성해야 합니다." });
    }
    if (thread_content.length > 300) {
      return res
        .status(400)
        .json({ message: "대댓글은 최대 300자까지 가능합니다." });
    }

    // 부모 댓글의 thread_num을 가져오기
    const parentThreadNumQuery = `
      SELECT thread_num FROM thread_main WHERE thread_content_num = $1
    `;
    const parentThreadNumResult = await database.query(parentThreadNumQuery, [
      thread_content_num2,
    ]);

    if (parentThreadNumResult.rows.length === 0) {
      return res.status(404).json({ message: "부모 댓글을 찾을 수 없습니다." });
    }

    const thread_num = parentThreadNumResult.rows[0].thread_num;

    // 대댓글 저장 쿼리
    const replyQuery = `
      INSERT INTO thread_main (thread_num, member_num, thread_content, thread_content_num2, thread_content_created_at, thread_status)
      VALUES ($1, $2, $3, $4, NOW(), true)
      RETURNING thread_content_num
    `;
    const replyValues = [
      thread_num,
      member_num,
      thread_content,
      thread_content_num2,
    ];
    const replyResult = await database.query(replyQuery, replyValues);

    res.status(201).json({
      message: "대댓글이 성공적으로 등록되었습니다.",
      reply_id: replyResult.rows[0].thread_content_num,
    });
  } catch (error) {
    console.error("Error creating reply:", error);
    res.status(500).json({ message: "대댓글 등록 중 오류가 발생했습니다." });
  }
};

// 부모 댓글 조회
exports.getThreadComment = async (req, res) => {
  const { thread_num } = req.params;
  const { offset = 0, limit = 5 } = req.query;

  try {
    // 기본 댓글 조회 쿼리
    console.log("Received offset:", offset); // 요청된 오프셋 로그
    console.log("Received limit:", limit); // 요청된 제한 로그

    const parentCommentsQuery = `
      SELECT 
        thread_main.thread_content_num,
        thread_main.member_num,
        member.member_nickname,
        thread_main.thread_content,
        thread_main.thread_content_created_at,
        thread_main.thread_status,
        (SELECT COUNT(*) FROM thread_main AS reply 
         WHERE reply.thread_content_num2 = thread_main.thread_content_num 
           AND reply.thread_status = true) AS reply_count
      FROM thread_main
      JOIN member ON thread_main.member_num = member.member_num
      WHERE thread_main.thread_num = $1 
        AND thread_main.thread_content_num2 IS NULL
        AND thread_main.thread_status = true -- 부모 댓글 상태가 True인 경우만 가져오기
      ORDER BY thread_main.thread_content_created_at DESC
      OFFSET $2 LIMIT $3
    `;

    const parentCommentsValues = [thread_num, offset, limit];
    const parentCommentsResult = await database.query(
      parentCommentsQuery,
      parentCommentsValues
    );

    console.log("Query returned rows:", parentCommentsResult.rows.length); // 쿼리 결과 행 수
    console.log("Query results:", parentCommentsResult.rows); // 쿼리 결과 로그

    const comments = parentCommentsResult.rows.map((comment) => ({
      thread_content_num: comment.thread_content_num,
      member_num: comment.member_num,
      member_nickname: comment.member_nickname,
      thread_content: comment.thread_content,
      created_at: new Date(comment.thread_content_created_at).toLocaleString(
        "ko-KR",
        {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "numeric",
          minute: "numeric",
          hour12: true,
        }
      ),
      is_active: comment.thread_status,
      reply_count: comment.reply_count, // 총 대댓글 개수
    }));

    // 결과와 함께 전체 댓글이 더 있는지 여부 확인
    const hasMoreQuery = `
      SELECT COUNT(*) FROM thread_main
      WHERE thread_num = $1 AND thread_content_num2 IS NULL AND thread_status = true
    `;
    const hasMoreResult = await database.query(hasMoreQuery, [thread_num]);
    const totalCommentsCount = parseInt(hasMoreResult.rows[0].count, 10);
    const hasMore = offset + limit < totalCommentsCount;

    res.status(200).json({ comments, hasMore });
  } catch (error) {
    console.error("Error fetching parent comments:", error);
    res
      .status(500)
      .json({ message: "부모 댓글을 가져오는 중 오류가 발생했습니다." });
  }
};

// 대댓글 조회
exports.getCommentReply = async (req, res) => {
  const { thread_content_num2 } = req.params;

  try {
    const repliesQuery = `
      SELECT 
        thread_main.thread_content_num,
        thread_main.member_num,
        member.member_nickname,
        thread_main.thread_content,
        thread_main.thread_content_created_at,
        thread_main.thread_status
      FROM thread_main
      JOIN member ON thread_main.member_num = member.member_num
      WHERE thread_main.thread_content_num2 = $1 
        AND thread_main.thread_status = true -- 대댓글 상태가 True인 경우만 가져오기
      ORDER BY thread_main.thread_content_created_at ASC
    `;
    const repliesValues = [thread_content_num2];

    const repliesResult = await database.query(repliesQuery, repliesValues);

    const replies = repliesResult.rows.map((reply) => ({
      thread_content_num: reply.thread_content_num,
      member_num: reply.member_num,
      member_nickname: reply.member_nickname,
      thread_content: reply.thread_content,
      created_at: new Date(reply.thread_content_created_at).toLocaleString(
        "ko-KR",
        {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "numeric",
          minute: "numeric",
          hour12: true,
        }
      ),
    }));

    res.status(200).json({ replies });
  } catch (error) {
    console.error("Error fetching comment replies:", error);
    res
      .status(500)
      .json({ message: "대댓글을 가져오는 중 오류가 발생했습니다." });
  }
};

exports.deleteThreadComment = async (req, res) => {
  const { thread_content_num } = req.params; // 댓글의 ID (또는 대댓글의 ID)
  const { member_num } = req.body; // 요청한 사용자 정보

  try {
    // 로그인한 사용자가 댓글 작성자인지 확인
    const authorCheckQuery = `
      SELECT * FROM thread_main WHERE thread_content_num = $1 AND member_num = $2
    `;
    const authorCheckResult = await database.query(authorCheckQuery, [
      thread_content_num,
      member_num,
    ]);

    console.log("Received thread_content_num:", thread_content_num);
    console.log("Received member_num:", member_num);

    console.log("authorCheckResult:", authorCheckResult.rows); // 쿼리 결과를 로그로 출력

    if (authorCheckResult.rows.length === 0) {
      return res
        .status(403)
        .json({ message: "본인이 작성한 댓글만 삭제할 수 있습니다." });
    }

    // 댓글을 소프트 삭제 처리 (상태만 false로 변경)
    const deleteQuery = `
      UPDATE thread_main SET thread_status = false WHERE thread_content_num = $1
    `;
    await database.query(deleteQuery, [thread_content_num]);

    // 부모 댓글인지 확인하고, 부모 댓글이라면 대댓글들도 false 상태로 업데이트
    const checkParentCommentQuery = `
      SELECT thread_content_num2, thread_num FROM thread_main WHERE thread_content_num = $1
    `;
    const checkParentCommentResult = await database.query(
      checkParentCommentQuery,
      [thread_content_num]
    );

    const { thread_content_num2, thread_num } =
      checkParentCommentResult.rows[0];

    if (thread_content_num2 === null) {
      // 부모 댓글인 경우 해당 댓글의 대댓글들 모두 false 상태로 변경
      const updateRepliesStatusQuery = `
        UPDATE thread_main 
        SET thread_status = false 
        WHERE thread_content_num2 = $1
      `;
      await database.query(updateRepliesStatusQuery, [thread_content_num]);

      // 부모 댓글 개수를 확인하여, 부모 댓글이 0개일 경우 스레드 삭제
      const parentCommentCountQuery = `
        SELECT COUNT(*) AS parent_count
        FROM thread_main
        WHERE thread_num = $1 AND thread_content_num2 IS NULL AND thread_status = true
      `;
      const parentCountResult = await database.query(parentCommentCountQuery, [
        thread_num,
      ]);
      const parentCount = parseInt(parentCountResult.rows[0].parent_count, 10);

      if (parentCount === 0) {
        const deleteThreadQuery = `
          DELETE FROM thread WHERE thread_num = $1
        `;
        await database.query(deleteThreadQuery, [thread_num]);
        return res.status(200).json({
          message:
            "댓글이 삭제되었으며 스레드에 더 이상 댓글이 없어 스레드도 삭제되었습니다.",
        });
      }
    }

    res.status(200).json({ message: "댓글이 성공적으로 삭제되었습니다." });
  } catch (error) {
    console.error("Error deleting comment:", error);
    res.status(500).json({ message: "댓글 삭제 중 오류가 발생했습니다." });
  }
};
