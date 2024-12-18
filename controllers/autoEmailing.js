const database = require('../database/database');
const nodemailer = require('nodemailer');

// ===============이메일 전송 설정========================
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER, // 이메일 계정
    pass: process.env.EMAIL_PASS, // 이메일 비밀번호 또는 앱 비밀번호
  },
});

// =================신간 도서 등록=======================
exports.postNewBooks = async (req, res) => {
  const {
    book_cover,
    book_publisher,
    publish_date,
    isbn,
    book_description,
    book_price,
    is_book_best = false, // 기본값 false
    book_status = true, // 기본값 true
    book_title,
    book_author,
    genre_tag_name,
    sent_email = false, // 이메일 발송 여부를 결정하는 필드
  } = req.body;

  // book_price에 "원" 자동 추가
  const formattedBookPrice = typeof book_price === 'number' ? `${book_price}원` : book_price;

  // genre_tag_name과 genre_tag_id 매칭
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
  if (
    !book_cover ||
    !book_publisher ||
    !publish_date ||
    !isbn ||
    !book_description ||
    !formattedBookPrice ||
    !book_title ||
    !book_author ||
    !genre_tag_name ||
    !genre_tag_id
  ) {
    return res.status(400).json({ message: 'All fields are required or invalid genre_tag_name.' });
  }

  try {
    const query = `
      INSERT INTO book (
        book_cover, 
        book_publisher, 
        publish_date, 
        isbn, 
        book_description, 
        book_price, 
        book_create_date, 
        is_book_best, 
        book_status, 
        book_title, 
        book_author, 
        genre_tag_name, 
        genre_tag_id,
        sent_email
      ) VALUES (
        $1, $2, $3, $4, $5, $6, NOW(), $7, $8, $9, $10, $11, $12, $13
      ) RETURNING *
    `;

    const values = [
      book_cover,
      book_publisher,
      publish_date,
      isbn,
      book_description,
      formattedBookPrice,
      is_book_best,
      book_status,
      book_title,
      book_author,
      genre_tag_name,
      genre_tag_id,
      sent_email,
    ];

    const { rows } = await database.query(query, values);
    const newBook = rows[0];

    // ==============이메일 발송 여부 확인==================
    if (sent_email) {
      // sent_email이 true인 경우에만 이메일 발송
      // 마케팅 동의한 사용자 이메일 목록 가져오기
      const userQuery = `
        SELECT member_email
        FROM member
        WHERE marketing_consent = TRUE
      `;

      const { rows: users } = await database.query(userQuery);

      // ===============이메일 보내기==================
      const mailOptions = {
        from: process.env.EMAIL_USER,
        subject: `라보엠(LaPoem)에서 신간 도서 알림이 도착했습니다. -  "${book_title}" 도서가 등록되었습니다.`,
        html: `
    <div style="font-family: 'Arial', sans-serif; padding: 20px; background-color: #f4f4f9; color: #333;">
      <header style="text-align: center; margin-bottom: 20px;">
        <img src="https://9seebird.site/logo.png" alt="LaPoem Logo" style="width: 150px;">
        <h1 style="font-size: 24px; color: #2c3e50;">신간 도서가 등록되었습니다!</h1>
      </header>

      <section style="display: flex; flex-wrap: wrap; justify-content: space-around; margin-top: 30px;">
        <div style="flex: 1; max-width: 350px; padding: 10px;">
          <img src="${book_cover}" alt="Book Cover" style="width: 100%; height: auto; border-radius: 8px;">
        </div>

        <div style="flex: 1; max-width: 500px; padding: 10px; line-height: 1.6;">
          <p style="font-size: 18px; margin-bottom: 10px;"><strong>제목:</strong> ${book_title}</p>
          <p style="font-size: 16px; margin-bottom: 10px;"><strong>저자:</strong> ${book_author}</p>
          <p style="font-size: 16px; margin-bottom: 10px;"><strong>출판사:</strong> ${book_publisher}</p>
          <p style="font-size: 16px; margin-bottom: 20px;"><strong>책 소개:</strong> ${book_description}</p>
        </div>
      </section>

      <footer style="text-align: center; margin-top: 40px; font-size: 16px;">
        <p>더 자세한 정보는 라보엠에 접속하셔서 확인해보세요.</p>
        <p><a href="http://222.112.27.120:3002" style="color: #3498db; text-decoration: none; font-weight: bold;">라보엠 사이트 방문하기</a></p>
      </footer>
    </div>
  `,
      };

      // 마케팅 동의를 한 사용자들에게 이메일 발송
      for (const user of users) {
        mailOptions.to = user.member_email;
        await transporter.sendMail(mailOptions);
      }
    }

    return res.status(201).json({
      message: 'New book added successfully.',
      newBook,
    });
  } catch (error) {
    console.error('Error adding new book:', error);
    return res.status(500).json({ message: 'Failed to add new book.', error: error.message });
  }
};
