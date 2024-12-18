const database = require('../database/database');

// ==========================admin페이지의 도서 목록==========================
exports.getAdminBookList = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1; // 기본 페이지는 1
    const limit = parseInt(req.query.limit, 10) || 10; // 기본 페이지 크기는 20
    const category = req.query.category; // 카테고리 필터 추가

    const offset = (page - 1) * limit;

    // 기본 쿼리와 조건 설정
    let query = `
      SELECT 
        b.book_id,
        b.book_title,
        b.book_cover,
        b.book_author,
        b.book_publisher,
        b.genre_tag_name,
        b.isbn,
        b.book_description,
        b.book_price,
        b.publish_date,
        b.genre_tag_id,
        b.is_book_best,
        b.book_status,
        TO_CHAR(b.book_create_date, 'YYYY-MM-DD') AS book_create_date, -- 날짜 형식 변경
        CASE 
        WHEN AVG(CASE WHEN br.review_status = 'active' THEN br.rating END) IS NULL THEN 0 
        ELSE ROUND(AVG(CASE WHEN br.review_status = 'active' THEN br.rating END), 1) 
        END AS average_rating, -- NULL일 때는 0, 아닐 때는 소수점 1자리로 반올림
        COUNT(CASE WHEN br.review_status = 'active' THEN br.rating END) AS review_count   -- 리뷰 개수
      FROM book AS b
      LEFT JOIN book_review AS br ON b.book_id = br.book_id -- book_review 테이블과 조인
    `;

    // 카테고리 필터가 있을 경우 WHERE 조건 추가
    if (category) {
      query += ` AND genre_tag_name = $3`; // SQL 인젝션 방지를 위해 $3를 사용해 파라미터 바인딩
    }

    // 정렬 및 페이징 추가
    query += `
    GROUP BY b.book_id
    ORDER BY
      CASE WHEN b.is_book_best = true THEN 1 ELSE 0 END DESC,           -- 베스트셀러인 책 우선 출력
      CASE WHEN b.book_status = true THEN 1 ELSE 0 END DESC,            -- book_status가 true인 책 우선 출력
      b.book_create_date DESC,                                          -- 최신 등록 날짜 우선 출력
      publish_date DESC,                                                -- 최신 출판일 우선 출력
       b.genre_tag_id ASC
    LIMIT $1 OFFSET $2
  `;

    // 총 책 개수를 세는 쿼리
    let countQuery = `SELECT COUNT(*) FROM book WHERE book_status IS NOT false`;
    if (category) {
      countQuery += ` AND genre_tag_name = $1`;
    }

    // 파라미터 설정
    const queryParams = category ? [category, limit, offset] : [limit, offset];
    const countParams = category ? [category] : [];

    // 총 책 개수를 가져오기 위한 쿼리 실행
    const totalBooksResult = await database.query(countQuery, countParams);
    const totalBooks = parseInt(totalBooksResult.rows[0].count, 10);

    // 현재 페이지의 책 목록을 가져오기 위한 쿼리 실행
    const allBooks = await database.query(query, queryParams);

    if (!allBooks.rows.length) {
      return res.status(404).json({ message: 'No books found' });
    }

    return res.status(200).json({
      data: allBooks.rows,
      currentPage: page,
      totalBooks: totalBooks, // 전체 책 개수 전달
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
