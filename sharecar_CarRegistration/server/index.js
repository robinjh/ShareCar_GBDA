const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const Registration = require('./models/Registration');

const app = express();

// 미들웨어 설정
app.use(cors());
app.use(express.json());

// MongoDB 연결
mongoose.connect('mongodb://localhost:27017/share-car')
  .then(() => console.log('MongoDB 연결 성공'))
  .catch(err => {
    console.error('MongoDB 연결 실패:', err);
    process.exit(1);
  });

// 차량 등록 API
app.post('/api/registrations', async (req, res) => {
  try {
    console.log('받은 데이터:', req.body);

    const registrationData = {
      name: req.body.name,
      carNumber: req.body.carNumber,
      rentalStartTime: new Date(req.body.rentalStartTime),
      rentalEndTime: new Date(req.body.rentalEndTime),
      rentalFee: Number(req.body.rentalFee),
      tag: req.body.tag
    };

    console.log('생성할 데이터:', registrationData);

    const registration = new Registration(registrationData);
    const savedRegistration = await registration.save();
    
    console.log('저장된 차량 정보:', savedRegistration);
    res.status(201).json(savedRegistration);
  } catch (error) {
    console.error('차량 등록 실패:', error);
    res.status(400).json({ 
      message: error.message,
      details: error.stack
    });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`서버가 포트 ${PORT}에서 실행 중입니다.`);
}); 