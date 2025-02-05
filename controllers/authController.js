const database = require('../database/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// 회원가입
exports.joinUser = async (req, res) => {
  try {
    const {
      member_id,
      member_password,
      member_nickname,
      member_email,
      member_phone,
      member_gender,
      member_birth_date,
      marketing_consent,
    } = req.body;

    // 아이디, 닉네임, 이메일 중복 체크
    const idCheck = await database.query(
      'SELECT member_num FROM member WHERE member_id = $1',
      [member_id]
    );
    if (idCheck.rows.length > 0)
      return res.status(409).json({ message: '이미 존재하는 아이디입니다.' });

    const nicknameCheck = await database.query(
      'SELECT member_num FROM member WHERE member_nickname = $1',
      [member_nickname]
    );
    if (nicknameCheck.rows.length > 0)
      return res.status(409).json({ message: '이미 존재하는 닉네임입니다.' });

    const emailCheck = await database.query(
      'SELECT member_num FROM member WHERE member_email = $1',
      [member_email]
    );
    if (emailCheck.rows.length > 0)
      return res.status(409).json({ message: '이미 존재하는 이메일입니다.' });

    // 비밀번호 암호화 및 회원 정보 저장
    const hashedPassword = await bcrypt.hash(member_password, 10);
    const result = await database.query(
      `INSERT INTO member (member_id, member_password, member_nickname, member_email, member_phone, member_join_date, member_gender, member_birth_date, member_status, marketing_consent) 
   VALUES ($1, $2, $3, $4, $5, CURRENT_DATE, $6, $7, 'active', $8) RETURNING member_num`,
      [
        member_id,
        hashedPassword,
        member_nickname,
        member_email,
        member_phone,
        member_gender,
        member_birth_date,
        marketing_consent,
      ]
    );

    res.status(201).json({
      message: '회원가입이 완료되었습니다.',
      userId: result.rows[0].member_num,
    });
  } catch (error) {
    console.error('회원가입 오류:', error.message);
    res.status(500).json({ error: error.message });
  }
};

// 약관 조회
exports.getTerms = async (req, res) => {
  try {
    const result = await database.query(
      'SELECT * FROM term WHERE terms_deleted_at IS NULL ORDER BY terms_id'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('약관 조회 오류:', error.message);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
};

// 약관 동의 내역 저장
exports.saveAgreement = async (req, res) => {
  const { agreements } = req.body;

  try {
    const queryText = `
      INSERT INTO term_link (member_num, terms_id, agreement_status, agreed_at)
      VALUES ($1, $2, $3, NOW())
      ON CONFLICT (member_num, terms_id) 
      DO UPDATE SET agreement_status = $3, agreed_at = NOW();
    `;

    for (const agreement of agreements) {
      await database.query(queryText, [
        agreement.member_num,
        agreement.terms_id,
        agreement.agreement_status,
      ]);
    }
    res.status(200).json({ message: '약관 동의 내역이 저장되었습니다.' });
  } catch (error) {
    console.error('약관 동의 저장 오류:', error.message);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
};

// 로그인
exports.loginUser = async (req, res) => {
  try {
    const { member_id, member_password } = req.body;
    const { rows } = await database.query(
      'SELECT * FROM member WHERE member_id = $1',
      [member_id]
    );

    if (!rows.length)
      return res
        .status(404)
        .json({ message: '아이디/비밀번호를 확인해주세요' });

    const isValidPassword = await bcrypt.compare(
      member_password,
      rows[0].member_password
    );
    if (!isValidPassword)
      return res
        .status(401)
        .json({ message: '아이디/비밀번호를 확인해주세요' });

    // 회원 상태 확인
    const member_status = rows[0].member_status;
    if (member_status === 'inactive') {
      return res.status(403).json({ message: '이미 탈퇴한 계정입니다.' });
    }

    // JWT 토큰 생성
    const user = {
      memberNum: rows[0].member_num,
      nickname: rows[0].member_nickname,
      email: rows[0].member_email,
      memberId: rows[0].member_id,
    };
    const token = jwt.sign(user, process.env.SECRET_KEY, { expiresIn: '1d' });

    // 쿠키에 토큰 설정
    res.cookie('token', token, {
      httpOnly: true,
      sameSite: 'Strict',
      secure: process.env.NODE_ENV === 'production',
    });
    res.status(200).json({ message: 'Login successful', user });
  } catch (error) {
    console.error('로그인 오류:', error.message);
    res.status(500).json({ error: error.message });
  }
};

// 토큰 검증
exports.verifyToken = (req, res) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ message: 'Unauthorized' });

  jwt.verify(token, process.env.SECRET_KEY, (err, decoded) => {
    if (err)
      return res.status(401).json({ message: 'Token is invalid or expired' });
    res.status(200).json({ user: decoded });
  });
};

// 로그아웃
exports.logoutUser = (req, res) => {
  // 쿠키에서 토큰 삭제
  res.clearCookie('token', {
    httpOnly: true,
    sameSite: 'Strict',
    secure: process.env.NODE_ENV === 'production',
  });
  res.status(200).json({ message: 'Logout successful' });
};
