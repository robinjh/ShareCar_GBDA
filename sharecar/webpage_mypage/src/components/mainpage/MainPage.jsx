import React from 'react';
import './MainPage.css'; 

// AppContent에서 넘겨준 onShowLoginClick 함수를 받아서
function MainPage({ onShowLoginClick }) {

  // ✨ 로그인 버튼 클릭했을 때 AppContent에 신호를 보냄
  const handleLoginButtonClick = () => {
    console.log("로그인 확인!"); // 로그인 정상적으로 됬는지 확인 
    if (onShowLoginClick) {
      onShowLoginClick(); 
    }
  };

  return (
    <div className="main-page"> 

      <header className="main-page-header">
        <h1>ShareCar 프로젝트</h1>
        <p>자율 주행을 언제 어디서나 쉽고 빠르게!</p>

        <button onClick={handleLoginButtonClick} className="login-button">
          로그인
        </button>
      </header>

      <section className="features-section">
        <h2>핵심 기능</h2>
        <div className="features-list">
          {/* 기능 1 */}
          <div className="feature-item">
            <h3>빠른 속도</h3>
            <p>LTE보다 빠른 속도로 서비스를 이용해보세요!</p>
          </div>
          {/* 기능 2 */}
          <div className="feature-item">
            <h3>편리한 사용법</h3>
            <p>누구나 쉽게 사용할 수 있어요!</p>
          </div>
          {/* 기능 3 */}
          <div className="feature-item">
            <h3>강력한 보안</h3>
            <p>안심하고 데이터를 맡기세요!</p>
          </div>
        </div>
      </section>

      <section className="about-section">
        <h2>서비스 소개</h2>
        <p>우리 서비스는 이런저런 곳에 유용합니다 블라블라...</p>
      </section>

      {/* 푸터는 보통 App.js에서 Header처럼 고정으로 넣거나 */}
      {/* MainPage 하단에 넣을 수도 있고... 이건 구조 나름! */}
      {/* <footer className="main-page-footer">
        <p>&copy; 2023 우리 서비스. All rights reserved.</p>
      </footer> */}

      {/* --- 내용 끝 --- */}

    </div>
  );
}

export default MainPage;