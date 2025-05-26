const express = require('express');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// CORS 설정
app.use(cors());

// 정적 파일 서빙
app.use(express.static(path.join(__dirname, '../build')));

// API 라우트
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// React 앱을 위한 모든 요청을 index.html로 리다이렉트
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../build', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
}); 