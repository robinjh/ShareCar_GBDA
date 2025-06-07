import React, { useState, useContext, useEffect } from 'react';
import { collection, setDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { UserContext } from '../../UserContext';
import '../../styles/Registration.css';

const carTypes = ['소형', '중형', '대형', 'SUV', '승합차'];
const carBrands = ['현대', '기아', '르노', '쌍용', '쉐보레', 'BMW', '벤츠', '아우디', '폭스바겐', '기타'];

const tags = [
  '#가족과 함께',
  '#비즈니스',
  '#커플 데이트',
  '#여행',
  '#반려동물 동반',
  '#혼자 힐링',
  '#친구들과 함께',
  '#출퇴근용',
  '#캠핑/차박',
  '#자연 감상'
];

function Registration({ onNavigate, onClose }) {
  const { user } = useContext(UserContext);
  const [isDarkMode, setIsDarkMode] = useState(window.matchMedia('(prefers-color-scheme: dark)').matches);
  const [formData, setFormData] = useState({
    carNumber: '',
    carType: '',
    carName: '',
    carBrand: '',
    otherBrand: '',
    rentalFee: '',
    tags: [],
    hostName: '',
    hostID: user?.uid || ''
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleDarkModeChange = (e) => setIsDarkMode(e.matches);
    
    mediaQuery.addEventListener('change', handleDarkModeChange);
    return () => mediaQuery.removeEventListener('change', handleDarkModeChange);
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'rentalFee') {
      const numericValue = value.replace(/[^0-9]/g, '');
      setFormData(prev => ({
        ...prev,
        [name]: numericValue
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleTagClick = (tag) => {
    setFormData(prev => {
      const currentTags = prev.tags;
      if (currentTags.includes(tag)) {
        return {
          ...prev,
          tags: currentTags.filter(t => t !== tag)
        };
      } else {
        return {
          ...prev,
          tags: [...currentTags, tag]
        };
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      if (!formData.carNumber || !formData.carType || !formData.carName || 
          !formData.carBrand || !formData.rentalFee) {
        throw new Error('모든 필수 항목을 입력해주세요.');
      }

      if (formData.carBrand === '기타' && !formData.otherBrand) {
        throw new Error('기타 제조사를 선택한 경우 제조사명을 입력해주세요.');
      }

      if (!user) {
        throw new Error('로그인이 필요합니다.');
      }

      const carData = {
        carBrand: formData.carBrand === '기타' ? `기타(${formData.otherBrand})` : formData.carBrand,
        carName: formData.carName,
        carNumber: formData.carNumber,
        carType: formData.carType,
        hostID: user.uid,
        hostName: formData.hostName,
        rentalFee: formData.rentalFee,
        tags: formData.tags
      };

      await setDoc(doc(db, 'registrations', formData.carNumber), carData);

      setSuccess('차량이 성공적으로 등록되었습니다!');
      setFormData({
        carNumber: '',
        carType: '',
        carName: '',
        carBrand: '',
        otherBrand: '',
        rentalFee: '',
        tags: [],
        hostName: '',
        hostID: user.uid
      });
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    
    <div className={`registration-container ${isDarkMode ? 'dark' : ''}`}>
      <div className={`registration-paper ${isDarkMode ? 'dark' : ''}`}>
        <button className="close-btn" onClick={onClose}> X </button>
        <div className={`registration-header ${isDarkMode ? 'dark' : ''}`}>
          <h1 className={`registration-title ${isDarkMode ? 'dark' : ''}`}>
            차량 등록  
          </h1>
        </div>

        

        {!user && (
          <div className={`alert warning ${isDarkMode ? 'dark' : ''}`}>
            차량을 등록하려면 로그인이 필요합니다. 현재 로그인되어 있지 않습니다.
          </div>
        )}

        {error && <div className={`alert error ${isDarkMode ? 'dark' : ''}`}>{error}</div>}
        {success && <div className={`alert success ${isDarkMode ? 'dark' : ''}`}>{success}</div>}

        <form onSubmit={handleSubmit} className="registration-form">
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="hostName">등록자 이름</label>
              <input
                id="hostName"
                type="text"
                name="hostName"
                value={formData.hostName}
                onChange={handleChange}
                required
                placeholder="차량 등록자의 이름을 입력해주세요"
                className={isDarkMode ? 'dark' : ''}
              />
            </div>

            <div className="form-group">
              <label htmlFor="carNumber">차량번호</label>
              <input
                id="carNumber"
                type="text"
                name="carNumber"
                value={formData.carNumber}
                onChange={handleChange}
                required
                placeholder="차량번호를 입력해주세요"
                className={isDarkMode ? 'dark' : ''}
              />
            </div>

            <div className="form-group">
              <label htmlFor="carType">차량 종류</label>
              <select
                id="carType"
                name="carType"
                value={formData.carType}
                onChange={handleChange}
                required
                className={isDarkMode ? 'dark' : ''}
              >
                <option value="">전체</option>
                {carTypes.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="carBrand">제조사</label>
              <select
                id="carBrand"
                name="carBrand"
                value={formData.carBrand}
                onChange={handleChange}
                required
                className={isDarkMode ? 'dark' : ''}
              >
                <option value="">전체</option>
                {carBrands.map((brand) => (
                  <option key={brand} value={brand}>{brand}</option>
                ))}
              </select>
            </div>

            {formData.carBrand === '기타' && (
              <div className="form-group">
                <label htmlFor="otherBrand">기타 제조사명</label>
                <input
                  id="otherBrand"
                  type="text"
                  name="otherBrand"
                  value={formData.otherBrand}
                  onChange={handleChange}
                  required
                  placeholder="예: 제네시스, 포르쉐 등"
                  className={isDarkMode ? 'dark' : ''}
                />
                <span className="helper-text">기타 제조사를 선택한 경우 제조사명을 입력해주세요</span>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="carName">차량 이름</label>
              <input
                id="carName"
                type="text"
                name="carName"
                value={formData.carName}
                onChange={handleChange}
                required
                placeholder="차량명을 입력하세요"
                className={isDarkMode ? 'dark' : ''}
              />
            </div>

            <div className="form-group">
              <label htmlFor="rentalFee">대여료(1일)</label>
              <div className="input-with-suffix">
                <input
                  id="rentalFee"
                  type="text"
                  name="rentalFee"
                  value={formData.rentalFee}
                  onChange={handleChange}
                  required
                  placeholder="대여료를 입력하세요"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  className={isDarkMode ? 'dark' : ''}
                />
                <span className={`suffix ${isDarkMode ? 'dark' : ''}`}>원</span>
              </div>
            </div>

            <div className={`form-group tag-section ${isDarkMode ? 'dark' : ''}`}>
              <label>태그 선택</label>
              <div className={`tag-stack ${isDarkMode ? 'dark' : ''}`}>
                {tags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    className={`tag-chip ${formData.tags.includes(tag) ? 'selected' : ''} ${isDarkMode ? 'dark' : ''}`}
                    onClick={() => handleTagClick(tag)}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group submit-group">
              <button
                type="submit"
                className={`submit-button ${isDarkMode ? 'dark' : ''}`}
                disabled={!user}
              >
                차량 등록
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Registration; 
