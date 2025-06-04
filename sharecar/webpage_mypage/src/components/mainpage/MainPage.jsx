import React from 'react';
import './MainPage.css'; 

// AppContent에서 넘겨준 onShowLoginClick 함수를 받아서
function MainPage({ onPageChange }) {

const handleGoToRegistration = () => {
  if (onPageChange) {
      onPageChange('registration');
    }
};

const handleGoToRental = () => {
  if (onPageChange) {
    onPageChange('rental');
  }
};

  return (
    <div className="main-page"> 
      <header className="main-page-header">
        <h1>ShareCar 프로젝트</h1>
        <p>자율 주행을 언제 어디서나 쉽고 빠르게!</p>
         <button
          onClick={handleGoToRegistration}
        >
          내 차량 등록하기
        </button>

         <button
          onClick={handleGoToRental}
        >
          차량 대여하기
        </button>
      </header>

      <section className="features-section">
        <h2>핵심 기능</h2>
        <div className="features-list">
          {/* 기능 1 */}
          <div className="feature-item">
            <h3>왜 ShareCar 인가?</h3>
            <p>우리는 4세대 자율주행 차량 서비스를 개발해, 사람들이 자신의 차를 더 효율적으로 이용할 수 있도록 돕습니다.</p>
          </div>
          {/* 기능 2 */}
          <div className="feature-item">
            <h3>왜 ShareCar를 써야 하는가?</h3>
            <p>우리 서비스는 여러 차량 공유 및 대여 서비스의 장점을 한데 모아, 이용할 차량에 대한 계획 수립까지 한큐에 지원합니다.</p>
          </div>
          {/* 기능 3 */}
          <div className="feature-item">
            <h3>왜 ShareCar여야만 하는가?</h3>
            <p>차량 대여와 공유, 그리고 계획 수립을 웹으로 통합 처리해, 사람들이 더 편리하고 효율적으로 차량을 이용할 수 있게 합니다. 이를 통해 내수 시장 활성화에도 기여하고자 합니다.</p>
          </div>
        </div>
      </section>

      <section className="about-section">
        <h2>서비스 소개</h2>
        <p>우리 Sharecar는 여러 유용한 서비스를 지원합니다. 가장 중요한 기능은 물론 차량 공유 서비스이죠, 저희 서비스는 Men to men 차량 공유로 개인이 자신의 차량을 이용하지 않을 떄, 
           등록해놓은 차량정보를 이용해 차량을 빌리고 빌려줄 수 있습니다. 개인간의 거래인데 사고나 서비스 수준 미달에 대해선 어떻게 관리할 계획이냐고요? 저희는 평판 시스템을 도입해 각자의 서비스 제공 수준에 대해 평가하고 그에 따른 거래상의 베네핏을 부여할 예정입니다. 
           그리고 가장 놀라운 점은 저희 Sharecar는 고작 차량 공유 서비스만을 제공하진 않습니다. Sharecar는 공유한 차종에 따라 차량 사용 계획을 추천 및 설계해 줍니다. 그것도 자동으로 말이죠. 
           예를들어 사용자가 대형 SUV를 이용하려 한다면, 마이 페이지에 동록된 사용자 정보와 비슷한 차종이 공유된 목적에 대해 분석하여 여러분에게 환상적인 경험을 제공할 스케줄을 설계해줍니다. 
           멋지지않나요? 이처럼 차량 공유 부터 계획 설계까지 한큐에 해결해주는 Sharcar와 함께 아름다운 추억을 만들어보세요!</p>
      </section>
    </div>
  );
}

export default MainPage;