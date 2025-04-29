// html 웹 페이지 서버 오픈 파일
const express = require('express');
const app = express();
const port = 3000; // 원하는 포트번호 설정

app.use(express.static('public')); // html 서빙 폴더이름

app.listen(port, () => {
  console.log(`서버가 http://localhost:${port} 에서 돌아가는 중...`);
});