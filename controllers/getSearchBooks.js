const database = require('../database/database');

// 검색 API 로직
exports.getSearchBooks = async (req, res) => {
  const { keyword, page = 1, limit = 10 } = req.query; // 페이지, 검색어, 페이지 당 결과 수 가져오기
  const offset = (page - 1) * limit; // 페이지 오프셋 계산
  const searchTerm = `%${keyword}%`; // PostgreSQL에서 LIKE 쿼리를 위해 '%' 추가

  try {
    // 1. 제목과 저자에서 검색어와 일치하는 도서 찾기
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
        TO_CHAR(b.book_create_date, 'YYYY-MM-DD') AS book_create_date, -- 날짜 형식 변경,
        CASE 
            WHEN AVG(CASE WHEN br.review_status = 'active' THEN br.rating END) IS NULL THEN 0 
            ELSE ROUND(AVG(CASE WHEN br.review_status = 'active' THEN br.rating END), 1) 
        END AS average_rating, -- 'active' 상태인 리뷰만 평점 계산
        COUNT(CASE WHEN br.review_status = 'active' THEN br.rating END) AS review_count, -- 'active' 상태인 리뷰만 개수 계산
        CASE WHEN b.is_book_best = true THEN 1 ELSE 0 END DESC,  -- 베스트셀러 우선 출력
        CASE WHEN b.book_author = '한강' THEN 1 ELSE 0 END DESC,  -- '한강' 작가의 책 우선 출력
        (LENGTH(b.book_title) - LENGTH(REPLACE(b.book_title, $1, ''))) +
        (LENGTH(b.book_author) - LENGTH(REPLACE(b.book_author, $1, ''))) DESC
    FROM book AS b
    LEFT JOIN book_review AS br ON b.book_id = br.book_id -- book_review 테이블과 조인
    WHERE (b.book_title ILIKE $1 OR b.book_author ILIKE $1) 
    AND b.book_status IS NOT false  -- book_status가 false인 책을 제외
    GROUP BY b.book_id
    ORDER BY 
        CASE WHEN b.is_book_best = true THEN 1 ELSE 0 END DESC,  -- 베스트셀러 우선 출력
        CASE WHEN b.book_author = '한강' THEN 1 ELSE 0 END DESC,  -- '한강' 작가의 책 우선 출력
        (LENGTH(b.book_title) - LENGTH(REPLACE(b.book_title, $1, ''))) +
        (LENGTH(b.book_author) - LENGTH(REPLACE(b.book_author, $1, ''))) DESC
    LIMIT $2 OFFSET $3
    `;

    // 쿼리 실행
    const { rows: books } = await database.query(query, [
      searchTerm,
      limit,
      offset,
    ]);

    // 2. 총 책 개수 확인
    const countQuery = `
      SELECT COUNT(*) FROM book
      WHERE book_title ILIKE $1 OR book_author ILIKE $1
    `;
    const { rows: countResult } = await database.query(countQuery, [
      searchTerm,
    ]);
    const totalBooks = parseInt(countResult[0].count, 10);

    // 결과 반환
    res.status(200).json({
      data: books,
      totalBooks,
      totalPages: Math.ceil(totalBooks / limit),
      currentPage: page,
    });
  } catch (error) {
    console.error('Error fetching search results:', error);
    res.status(500).json({ error: 'Error fetching search results' });
  }
};
