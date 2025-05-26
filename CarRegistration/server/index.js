const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const serviceAccount = require('./sharecar-gbda-firebase-adminsdk-fbsvc-e244f6d788.json');

const app = express();

// 미들웨어 설정
app.use(cors());
app.use(express.json());

// Firebase Admin 초기화
console.log('Firebase Admin 초기화 시작...');
try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'sharecar-gbda'
  });
  console.log('Firebase Admin 초기화 성공');
} catch (error) {
  console.error('Firebase Admin 초기화 실패:', error);
  process.exit(1);
}

const db = admin.firestore();
console.log('Firestore 인스턴스 생성 완료');

// 차량 등록 API
app.post('/api/registrations', async (req, res) => {
  try {
    console.log('=== 차량 등록 요청 시작 ===');
    console.log('받은 데이터:', JSON.stringify(req.body, null, 2));

    // 입력값 검증
    if (!req.body.name || !req.body.carNumber || !req.body.rentalStartTime || 
        !req.body.rentalEndTime || !req.body.rentalFee || !req.body.tag) {
      throw new Error('모든 필드를 입력해주세요.');
    }

    // 날짜 검증
    const startTime = new Date(req.body.rentalStartTime);
    const endTime = new Date(req.body.rentalEndTime);
    if (startTime >= endTime) {
      throw new Error('대여 종료 시간은 시작 시간보다 이후여야 합니다.');
    }

    const registrationData = {
      name: req.body.name,
      carNumber: req.body.carNumber,
      rentalStartTime: startTime,
      rentalEndTime: endTime,
      rentalFee: Number(req.body.rentalFee),
      tag: req.body.tag,
      status: '대기중',
      hostID: req.body.hostID || 'temp_host_id',
      guestID: req.body.guestID || null
    };

    console.log('=== Firebase에 저장할 데이터 ===');
    console.log('hostID:', registrationData.hostID);
    console.log('guestID:', registrationData.guestID);
    console.log('전체 데이터:', JSON.stringify(registrationData, null, 2));

    const docRef = await db.collection('registrations').add(registrationData);
    const savedRegistration = { id: docRef.id, ...registrationData };
    
    console.log('=== Firebase에 저장된 데이터 ===');
    console.log('문서 ID:', docRef.id);
    console.log('hostID:', savedRegistration.hostID);
    console.log('guestID:', savedRegistration.guestID);
    console.log('전체 데이터:', JSON.stringify(savedRegistration, null, 2));
    console.log('=== 차량 등록 완료 ===\n');

    res.status(201).json(savedRegistration);
  } catch (error) {
    console.error('차량 등록 실패:', error);
    res.status(400).json({ 
      message: error.message || '차량 등록에 실패했습니다.',
      details: error.stack
    });
  }
});

// 차량 목록 조회 API
app.get('/api/registrations', async (req, res) => {
  try {
    const snapshot = await db.collection('registrations')
      .orderBy('rentalStartTime', 'desc')
      .get();
    
    const registrations = [];
    snapshot.forEach(doc => {
      registrations.push({
        id: doc.id,
        ...doc.data()
      });
    });

    res.json(registrations);
  } catch (error) {
    console.error('차량 목록 조회 실패:', error);
    res.status(500).json({
      message: '차량 목록 조회에 실패했습니다.',
      details: error.stack
    });
  }
});

const PORT = process.env.PORT || 5000;
console.log('서버 실행 준비 중...');
app.listen(PORT, () => {
  console.log(`서버가 포트 ${PORT}에서 실행 중입니다.`);
}); 