const database = require('../database/database');

// =================도서 정보 수정=======================
exports.patchBooksInfo = async (req, res) => {
  const {
    book_id, // 수정할 도서의 ID
    book_cover,
    book_publisher,
    publish_date,
    isbn,
    book_description,
    book_price,
    is_book_best,
    book_status,
    book_title,
    book_author,
    genre_tag_name,
  } = req.body;

  // 장르 태그와 ID 매핑
  const genreMapping = {
    역사: 1,
    판타지: 2,
    '과학(SF)': 3,
    '추리/미스터리': 4,
    한국소설: 5,
    일본소설: 6,
    '시/희곡': 7,
    '인문/교양': 8,
    '독서/비평': 9,
    서양철학: 10,
    동양철학: 11,
    '미학/예술철학': 12,
    '심리학/정신분석학': 13,
    경제: 14,
    경영일반: 15,
    '트렌드/미래예측': 16,
    '마케팅/브랜드': 17,
    '투자/재테크': 18,
    인터넷비즈니스: 19,
    '기업/경영자스토리': 20,
  };

  const genre_tag_id = genreMapping[genre_tag_name];

  // 필수 필드 확인
  if (!book_id) {
    return res.status(400).json({ message: 'book_id is required.' });
  }

  try {
    const query = `
      UPDATE book
      SET 
        book_cover = COALESCE($1, book_cover), 
        book_publisher = COALESCE($2, book_publisher),
        publish_date = COALESCE($3, publish_date),
        isbn = COALESCE($4, isbn),
        book_description = COALESCE($5, book_description),
        book_price = COALESCE($6, book_price),
        is_book_best = COALESCE($7, is_book_best),
        book_status = COALESCE($8, book_status),
        book_title = COALESCE($9, book_title),
        book_author = COALESCE($10, book_author),
        genre_tag_name = COALESCE($11, genre_tag_name),
        genre_tag_id = COALESCE($12, genre_tag_id)
      WHERE book_id = $13
      RETURNING *
    `;

    const values = [
      book_cover,
      book_publisher,
      publish_date,
      isbn,
      book_description,
      book_price,
      is_book_best,
      book_status,
      book_title,
      book_author,
      genre_tag_name,
      genre_tag_id,
      book_id,
    ];

    const { rows } = await database.query(query, values);
    const updatedBook = rows[0];

    if (!updatedBook) {
      return res.status(404).json({ message: 'Book not found' });
    }

    res.status(200).json({ message: 'Book updated successfully', updatedBook });
  } catch (error) {
    console.error('Error updating book:', error);
    res.status(500).json({ message: 'Failed to update book', error });
  }
};
