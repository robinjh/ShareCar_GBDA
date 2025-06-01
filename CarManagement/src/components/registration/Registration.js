import React, { useState, useContext, useEffect } from 'react';
import { collection, setDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { UserContext } from '../../UserContext';
import '../../styles/Registration.css';
import { useNavigate, Link } from 'react-router-dom';

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

class Registration extends React.Component {
  constructor(props) {
    super(props);
    this.isDarkMode = props.isDarkMode;
    this.user = props.user;
    this.navigate = props.navigate;
    this.state = {
      carData: {
        carNumber: '',
        carName: '',
        carBrand: '',
        carType: '',
        rentalFee: '',
        tags: []
      },
      loading: false,
      error: '',
      success: '',
      openDialog: false,
      selectedTags: [],
      tempTags: [],
      tagDialogOpen: false,
      allTags: []
    };
  }

  componentDidMount() {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleDarkModeChange = (e) => this.setState({ isDarkMode: e.matches });
    
    mediaQuery.addEventListener('change', handleDarkModeChange);
    return () => mediaQuery.removeEventListener('change', handleDarkModeChange);
  }

  componentDidUpdate(prevProps) {
    if (prevProps.isDarkMode !== this.props.isDarkMode) {
      // document.documentElement.setAttribute('data-theme', this.props.isDarkMode ? 'dark' : 'light');
    }
  }

  handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'rentalFee') {
      const numericValue = value.replace(/[^0-9]/g, '');
      this.setState(prev => ({
        carData: {
          ...prev.carData,
          [name]: numericValue
        }
      }));
    } else {
      this.setState(prev => ({
        carData: {
          ...prev.carData,
          [name]: value
        }
      }));
    }
  };

  handleTagClick = (tag) => {
    this.setState(prev => {
      const currentTags = prev.carData.tags;
      if (currentTags.includes(tag)) {
        return {
          carData: {
            ...prev.carData,
            tags: currentTags.filter(t => t !== tag)
          }
        };
      } else {
        return {
          carData: {
            ...prev.carData,
            tags: [...currentTags, tag]
          }
        };
      }
    });
  };

  handleSubmit = async (e) => {
    e.preventDefault();
    this.setState({ error: '', success: '' });

    try {
      if (!this.state.carData.carNumber || !this.state.carData.carType || !this.state.carData.carName || 
          !this.state.carData.carBrand || !this.state.carData.rentalFee) {
        throw new Error('모든 필수 항목을 입력해주세요.');
      }

      if (this.state.carData.carBrand === '기타' && !this.state.carData.otherBrand) {
        throw new Error('기타 제조사를 선택한 경우 제조사명을 입력해주세요.');
      }

      if (!this.user) {
        throw new Error('로그인이 필요합니다.');
      }

      const carData = {
        carBrand: this.state.carData.carBrand === '기타' ? `기타(${this.state.carData.otherBrand})` : this.state.carData.carBrand,
        carName: this.state.carData.carName,
        carNumber: this.state.carData.carNumber,
        carType: this.state.carData.carType,
        hostID: this.user.uid,
        hostName: this.state.carData.hostName,
        rentalFee: this.state.carData.rentalFee,
        tags: this.state.carData.tags
      };

      await setDoc(doc(db, 'registrations', this.state.carData.carNumber), carData);

      this.setState({
        success: '차량이 성공적으로 등록되었습니다!',
        carData: {
          carNumber: '',
          carType: '',
          carName: '',
          carBrand: '',
          otherBrand: '',
          rentalFee: '',
          tags: [],
          hostName: '',
          hostID: this.user.uid
        }
      });
    } catch (err) {
      this.setState({ error: err.message });
    }
  };

  render() {
    const { carData, loading, error, success, openDialog, tagDialogOpen, selectedTags, tempTags } = this.state;
    const { isDarkMode } = this.props;

    return (
      <div className={`registration-container ${isDarkMode ? 'dark' : ''}`}>
        <div className="rental-link-container">
          <Link
            to="/rental"
            className={`rental-link-button ${isDarkMode ? 'dark' : ''}`}
          >
            차량 대여
          </Link>
        </div>
        <div className={`registration-paper ${isDarkMode ? 'dark' : ''}`}>
          <div className={`registration-header ${isDarkMode ? 'dark' : ''}`}>
            <h1 className={`registration-title ${isDarkMode ? 'dark' : ''}`}>차량 등록</h1>
          </div>

          {!this.user && (
            <div className={`alert warning ${isDarkMode ? 'dark' : ''}`}>
              차량을 등록하려면 로그인이 필요합니다. 현재 로그인되어 있지 않습니다.
            </div>
          )}

          {this.state.error && <div className={`alert error ${isDarkMode ? 'dark' : ''}`}>{this.state.error}</div>}
          {this.state.success && <div className={`alert success ${isDarkMode ? 'dark' : ''}`}>{this.state.success}</div>}

          <form onSubmit={this.handleSubmit} className={`registration-form ${isDarkMode ? 'dark' : ''}`}>
            <div className="form-grid">
              <div className="form-group">
                <label>등록자 이름</label>
                <input
                  type="text"
                  name="hostName"
                  value={this.state.carData.hostName}
                  onChange={this.handleChange}
                  required
                  placeholder="차량 등록자의 이름을 입력해주세요"
                  className={isDarkMode ? 'dark' : ''}
                />
              </div>

              <div className="form-group">
                <label>차량번호</label>
                <input
                  type="text"
                  name="carNumber"
                  value={this.state.carData.carNumber}
                  onChange={this.handleChange}
                  required
                  placeholder="차량번호를 입력해주세요"
                  className={isDarkMode ? 'dark' : ''}
                />
              </div>

              <div className="form-group">
                <label>차량 종류</label>
                <select
                  name="carType"
                  value={this.state.carData.carType}
                  onChange={this.handleChange}
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
                <label>제조사</label>
                <select
                  name="carBrand"
                  value={this.state.carData.carBrand}
                  onChange={this.handleChange}
                  required
                  className={isDarkMode ? 'dark' : ''}
                >
                  <option value="">전체</option>
                  {carBrands.map((brand) => (
                    <option key={brand} value={brand}>{brand}</option>
                  ))}
                </select>
              </div>

              {this.state.carData.carBrand === '기타' && (
                <div className="form-group">
                  <label>기타 제조사명</label>
                  <input
                    type="text"
                    name="otherBrand"
                    value={this.state.carData.otherBrand}
                    onChange={this.handleChange}
                    required
                    placeholder="예: 제네시스, 포르쉐 등"
                    className={isDarkMode ? 'dark' : ''}
                  />
                  <span className="helper-text">기타 제조사를 선택한 경우 제조사명을 입력해주세요</span>
                </div>
              )}

              <div className="form-group">
                <label>차량 이름</label>
                <input
                  type="text"
                  name="carName"
                  value={this.state.carData.carName}
                  onChange={this.handleChange}
                  required
                  placeholder="차량명을 입력하세요"
                  className={isDarkMode ? 'dark' : ''}
                />
              </div>

              <div className="form-group">
                <label>대여료(1일)</label>
                <div className="input-with-suffix">
                  <input
                    type="text"
                    name="rentalFee"
                    value={this.state.carData.rentalFee}
                    onChange={this.handleChange}
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
                      className={`tag-chip ${this.state.carData.tags.includes(tag) ? 'selected' : ''} ${isDarkMode ? 'dark' : ''}`}
                      onClick={() => this.handleTagClick(tag)}
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
                  disabled={!this.user}
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
}

function RegistrationWrapper({ isDarkMode }) {
  const { user } = useContext(UserContext);
  const navigate = useNavigate();
  return <Registration isDarkMode={isDarkMode} user={user} navigate={navigate} />;
}

export default RegistrationWrapper; 