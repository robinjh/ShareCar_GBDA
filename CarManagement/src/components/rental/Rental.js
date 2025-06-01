import React, { useState, useEffect, useContext } from 'react';
import { collection, getDocs, addDoc, query, where, doc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { UserContext } from '../../UserContext';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebase';
import '../../styles/Rental.css';
import { useNavigate, Link } from 'react-router-dom';
import PlaceRecommendation from "../recommendation/PlaceRecommendation";

// 유틸리티 함수
function removeFunctions(obj) {
  if (Array.isArray(obj)) {
    return obj.map(removeFunctions);
  } else if (obj && typeof obj === 'object') {
    const newObj = {};
    for (const key in obj) {
      if (typeof obj[key] !== 'function') {
        newObj[key] = removeFunctions(obj[key]);
      }
    }
    return newObj;
  }
  return obj;
}

// 한국어, 영어, 숫자 순으로 정렬하기 위한 함수
const koreanFirstSort = (a, b) => {
  // null이나 undefined인 경우 빈 문자열로 처리
  const strA = (a || '').toString();
  const strB = (b || '').toString();

  const isKoreanA = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(strA);
  const isKoreanB = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(strB);
  const isEnglishA = /[a-zA-Z]/.test(strA);
  const isEnglishB = /[a-zA-Z]/.test(strB);
  const isNumberA = /[0-9]/.test(strA);
  const isNumberB = /[0-9]/.test(strB);

  // 한국어 우선
  if (isKoreanA && !isKoreanB) return -1;
  if (!isKoreanA && isKoreanB) return 1;
  // 영어 다음
  if (isEnglishA && !isEnglishB) return -1;
  if (!isEnglishA && isEnglishB) return 1;
  // 숫자 마지막
  if (isNumberA && !isNumberB) return -1;
  if (!isNumberA && isNumberB) return 1;
  
  return strA.localeCompare(strB, 'ko');
};

// 차량 카드 컴포넌트
function CarCard({ car, onRent, onTagClick, isDarkMode }) {
  return (
    <div className={`car-card ${isDarkMode ? 'dark' : 'light'}`}>
      <div className="car-content">
        <div className="car-info">
          <div className="car-header">
            <div className="car-title-section">
              <div className="car-title-left">
                <h2 className={`car-name ${isDarkMode ? 'dark' : ''}`}>{car.carName}</h2>
                <p className={`car-fee ${isDarkMode ? 'dark' : ''}`}>{car.rentalFee}원/일</p>
              </div>
              <div className="car-actions">
                <button
                  className={`rent-button ${isDarkMode ? 'dark' : ''}`}
                  onClick={() => onRent(car)}
                  disabled={!onRent}
                >
                  대여하기
                </button>
              </div>
            </div>
            <div className={`car-details ${isDarkMode ? 'dark' : ''}`}>
              <div className="car-detail-item">
                <span className={`detail-label ${isDarkMode ? 'dark' : ''}`}>차량정보: </span>
                <span className={`detail-value ${isDarkMode ? 'dark' : ''}`}>{car.carNumber}</span>
              </div>
              <div className="car-detail-item">
                <span className={`detail-label ${isDarkMode ? 'dark' : ''}`}>제조사: </span>
                <span className={`detail-value ${isDarkMode ? 'dark' : ''}`}>{car.carBrand}</span>
              </div>
              <div className="car-detail-item">
                <span className={`detail-label ${isDarkMode ? 'dark' : ''}`}>분류: </span>
                <span className={`detail-value ${isDarkMode ? 'dark' : ''}`}>{car.carType}</span>
              </div>
            </div>
          </div>
          <div className="car-tags">
            <div className="tag-stack">
              {car.tags && car.tags.map((tag, index) => (
                <button
                  key={index} 
                  className={`tag-chip ${isDarkMode ? 'dark' : ''}`}
                  onClick={() => onTagClick(tag)}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// 필터 다이얼로그 컴포넌트
function FilterDialog({ 
  open, 
  onClose, 
  onApply, 
  filters, 
  setFilters, 
  tempFilters, 
  setTempFilters, 
  rentalFeeRange, 
  tempRentalFeeRange, 
  setTempRentalFeeRange,
  setRentalFeeRange,
  allTags, 
  isDarkMode 
}) {
  const carTypes = ['소형', '중형', '대형', 'SUV', '승합차'];
  const carBrands = ['현대', '기아', '쌍용', '제네시스', 'BMW', '벤츠', '아우디', '폭스바겐', '기타'];

  // 방어 코드 추가
  const selectedCarTypes = tempFilters.carTypes || [];
  const selectedCarBrands = tempFilters.carBrands || [];
  const selectedTags = tempFilters.selectedTags || [];

  const handleCategoryClick = (category) => {
    setTempFilters({
      ...tempFilters,
      carTypes: selectedCarTypes.includes(category)
        ? selectedCarTypes.filter(type => type !== category)
        : [...selectedCarTypes, category]
    });
  };

  const handleBrandClick = (brand) => {
    setTempFilters({
      ...tempFilters,
      carBrands: selectedCarBrands.includes(brand)
        ? selectedCarBrands.filter(b => b !== brand)
        : [...selectedCarBrands, brand]
    });
  };

  const handleTagClick = (tag) => {
    const newSelectedTags = selectedTags.includes(tag)
      ? selectedTags.filter(t => t !== tag)
      : [...selectedTags, tag];
    setTempFilters({
      ...tempFilters,
        selectedTags: newSelectedTags
    });
  };

  // 대여료 직접 입력 핸들러 추가
  const handleRentalFeeInputChange = (index) => (event) => {
    const value = parseInt(event.target.value.replace(/[^0-9]/g, '')) || 0;
    const newRange = [...tempRentalFeeRange];
    newRange[index] = Math.min(Math.max(value, 0), 1000000);
    
    // 최소값이 최대값보다 크지 않도록 보정
    if (index === 0 && newRange[0] > newRange[1]) {
      newRange[0] = newRange[1];
    } else if (index === 1 && newRange[1] < newRange[0]) {
      newRange[1] = newRange[0];
    }
    
    setTempRentalFeeRange(newRange);
  };

  // 필터 다이얼로그가 열릴 때 초기값 설정
  React.useEffect(() => {
    if (open) {
      setTempRentalFeeRange([...rentalFeeRange]);
      setTempFilters({ ...filters });
    }
  }, [open]);

  return (
    <div className={`filter-dialog ${open ? 'open' : ''} ${isDarkMode ? 'dark' : ''}`}>
      <div className={`filter-dialog-content ${isDarkMode ? 'dark' : ''}`}>
        <h2 className={`filter-dialog-title ${isDarkMode ? 'dark' : ''}`}>필터</h2>
        <div className={`filter-dialog-body ${isDarkMode ? 'dark' : ''}`}>
          <div className={`filter-section ${isDarkMode ? 'dark' : ''}`}>
            <h3 className={`filter-section-title ${isDarkMode ? 'dark' : ''}`}>차량 분류</h3>
            <div className="tag-group">
              {carTypes.map((type) => (
                <button
                  key={type}
                  className={`tag-chip ${selectedCarTypes.includes(type) ? 'selected' : ''} ${isDarkMode ? 'dark' : ''}`}
                  onClick={() => handleCategoryClick(type)}
                >
                  {selectedCarTypes.includes(type) && (
                    <span className="tag-check" aria-label="선택됨" style={{marginRight: '4px'}}>✔️</span>
                  )}
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div className={`filter-section ${isDarkMode ? 'dark' : ''}`}>
            <h3 className={`filter-section-title ${isDarkMode ? 'dark' : ''}`}>제조사</h3>
            <div className="tag-group">
              {carBrands.map((brand) => (
                <button
                  key={brand}
                  className={`tag-chip ${selectedCarBrands.includes(brand) ? 'selected' : ''} ${isDarkMode ? 'dark' : ''}`}
                  onClick={() => handleBrandClick(brand)}
                >
                  {selectedCarBrands.includes(brand) && (
                    <span className="tag-check" aria-label="선택됨" style={{marginRight: '4px'}}>✔️</span>
                  )}
                  {brand}
                </button>
              ))}
            </div>
          </div>

          <div className={`filter-section ${isDarkMode ? 'dark' : ''}`}>
            <h3 className={`filter-section-title ${isDarkMode ? 'dark' : ''}`}>대여료</h3>
            <div className={`rental-fee-range ${isDarkMode ? 'dark' : ''}`} style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
              <div className="rental-fee-input-wrap">
                <input
                  type="text"
                  className={isDarkMode ? 'dark' : ''}
                value={tempRentalFeeRange[0]}
                  min={0}
                  max={tempRentalFeeRange[1]}
                  onChange={e => {
                    const value = e.target.value.replace(/[^0-9]/g, '');
                    setTempRentalFeeRange([value ? parseInt(value) : 0, tempRentalFeeRange[1]]);
                  }}
                />
                <span className={`unit ${isDarkMode ? 'dark' : ''}`}>원</span>
              </div>
              <span className={`separator ${isDarkMode ? 'dark' : ''}`}>-</span>
              <div className="rental-fee-input-wrap">
                <input
                  type="text"
                  className={isDarkMode ? 'dark' : ''}
                value={tempRentalFeeRange[1]}
                  min={tempRentalFeeRange[0]}
              max={1000000}
                  onChange={e => {
                    const value = e.target.value.replace(/[^0-9]/g, '');
                    setTempRentalFeeRange([tempRentalFeeRange[0], value ? parseInt(value) : 0]);
                  }}
                />
                <span className={`unit ${isDarkMode ? 'dark' : ''}`}>원</span>
              </div>
            </div>
          </div>

          <div className={`filter-section ${isDarkMode ? 'dark' : ''}`}>
            <h3 className={`filter-section-title ${isDarkMode ? 'dark' : ''}`}>태그</h3>
            <div className="tag-group">
              {allTags
                .filter(tag => !tag.includes('도심 드라이브'))
                .map((tag) => (
                  <button
                  key={tag}
                    className={`tag-chip ${selectedTags.includes(tag) ? 'selected' : ''} ${isDarkMode ? 'dark' : ''}`}
                  onClick={() => handleTagClick(tag)}
                  >
                    {selectedTags.includes(tag) && (
                      <span className="tag-check" aria-label="선택됨" style={{marginRight: '4px'}}>✔️</span>
                    )}
                    {tag}
                  </button>
                ))}
            </div>
          </div>
        </div>
        <div className={`filter-dialog-actions ${isDarkMode ? 'dark' : ''}`}>
          <button className={`reset-button ${isDarkMode ? 'dark' : ''}`}
            onClick={() => {
              setTempFilters({ carTypes: [], carBrands: [], selectedTags: [] });
              setTempRentalFeeRange([0, 1000000]);
            }}>
            초기화
          </button>
          <button className={`cancel-button ${isDarkMode ? 'dark' : ''}`} onClick={onClose}>취소</button>
          <button 
            className={`apply-button ${isDarkMode ? 'dark' : ''}`}
          onClick={() => {
            setFilters({
              ...tempFilters,
                selectedTags: [...selectedTags]
            });
            setRentalFeeRange([...tempRentalFeeRange]);
            onApply();
          }} 
        >
          적용
          </button>
        </div>
      </div>
    </div>
  );
}

// Rental 컴포넌트를 클래스로 변환
class Rental extends React.Component {
  constructor(props) {
    super(props);
    this.isDarkMode = props.isDarkMode;
    this.user = props.user;
    this.navigate = props.navigate;
    this.itemsPerPage = 10;
    this.state = {
      sortOrder: 'nameAsc',
      cars: [],
      filteredCars: [],
      loading: true,
      error: '',
      success: '',
      selectedCar: null,
      openDialog: false,
      rentalData: {
        startTime: this.getCurrentKoreanTime(),
        endTime: new Date(this.getCurrentKoreanTime().setDate(this.getCurrentKoreanTime().getDate() + 1)),
    guestName: '',
    address: '',
    tags: []
      },
      searchQuery: '',
      filterDialogOpen: false,
      page: 1,
      filters: {
    carTypes: [],
    carBrands: [],
    minRentalFee: '0',
    maxRentalFee: '1000000',
    selectedTags: []
      },
      tempFilters: {
    carTypes: [],
    carBrands: [],
    minRentalFee: '0',
    maxRentalFee: '1000000',
    selectedTags: []
      },
      rentalFeeRange: [0, 1000000],
      tempRentalFeeRange: [0, 1000000],
      recommendationDialogOpen: false,
    };
  }

  // 유틸리티 메서드들
  getCurrentKoreanTime = () => {
    try {
      const now = new Date();
      const koreanTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
      if (isNaN(koreanTime.getTime())) {
        return new Date(); // 기본값으로 현재 시간 반환
      }
      return koreanTime;
    } catch (error) {
      console.error('한국 시간 변환 오류:', error);
      return new Date(); // 오류 시 기본값으로 현재 시간 반환
    }
  };

  formatDateTimeForInput = (date) => {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
      return '';
    }

    try {
      const koreanDate = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
      if (isNaN(koreanDate.getTime())) {
        return '';
      }
      return koreanDate.toISOString().slice(0, 16);
    } catch (error) {
      console.error('날짜 변환 오류:', error);
      return '';
    }
  };

  formatDateTime = (date) => {
    if (!date) return '';
    const koreanDate = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
    return koreanDate.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Asia/Seoul'
    }).replace(/\. /g, '-').replace('.', '');
  };

  // 이벤트 핸들러 메서드들
  handleSearchChange = (event) => {
    this.setState({ searchQuery: event.target.value });
  };

  handleSearch = () => {
    const searchTerm = this.state.searchQuery.toLowerCase().trim();
    if (!searchTerm) {
      this.setState({ filteredCars: this.state.cars });
      return;
    }

    const searchResults = this.state.cars.filter(car => {
      const carName = (car.carName || '').toLowerCase();
      const carNumber = (car.carNumber || '').toLowerCase();
      const carBrand = (car.carBrand || '').toLowerCase();
      const carType = (car.carType || '').toLowerCase();
      const carTags = (car.tags || []).map(tag => (tag || '').toLowerCase());

      return (
        carName.includes(searchTerm) ||
        carNumber.includes(searchTerm) ||
        carBrand.includes(searchTerm) ||
        carType.includes(searchTerm) ||
        carTags.some(tag => tag.includes(searchTerm))
      );
    });

    this.setState({ filteredCars: searchResults });
  };

  handleKeyPress = (event) => {
    if (event.key === 'Enter') {
      this.handleSearch();
    }
  };

  handlePageChange = (event, value) => {
    this.setState({ page: value });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  getCurrentPageCars = () => {
    const startIndex = (this.state.page - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    return this.state.filteredCars.slice(startIndex, endIndex);
  };

  getPageInfo = () => {
    const totalPages = Math.ceil(this.state.filteredCars.length / this.itemsPerPage);
    return `${this.state.page} / ${totalPages} 페이지`;
  };

  handleRentClick = (car) => {
    this.setState({
      selectedCar: car,
      rentalData: {
        startTime: this.getCurrentKoreanTime(),
        endTime: new Date(this.getCurrentKoreanTime().setDate(this.getCurrentKoreanTime().getDate() + 1)),
      guestName: '',
      address: '',
      tags: []
      },
      openDialog: true
    });
  };

  handleCloseDialog = () => {
    this.setState({
      openDialog: false,
      selectedCar: null,
      error: ''
    });
  };

  handleInputChange = (e) => {
    const { name, value } = e.target;
    this.setState(prev => ({
      rentalData: {
        ...prev.rentalData,
        [name]: value
      }
    }));
  };

  handleTagClick = (tag) => {
    this.setState(prev => {
      const newTags = prev.rentalData.tags.includes(tag)
        ? prev.rentalData.tags.filter(t => t !== tag)
        : [...prev.rentalData.tags, tag];
      return {
        rentalData: {
          ...prev.rentalData,
        tags: newTags
        }
      };
    });
  };

  handleTagFilterClick = (tag) => {
    this.setState(prev => {
      const currentTags = prev.tempFilters.selectedTags;
      if (currentTags.includes(tag)) {
        return {
          tempFilters: {
            ...prev.tempFilters,
          selectedTags: currentTags.filter(t => t !== tag)
          }
        };
      } else {
        return {
          tempFilters: {
            ...prev.tempFilters,
          selectedTags: [...currentTags, tag]
          }
        };
      }
    });
  };

  handleOpenFilterDialog = () => {
    this.setState({
      tempFilters: {
        ...this.state.filters,
        selectedTags: [...this.state.filters.selectedTags]
      },
      tempRentalFeeRange: [...this.state.rentalFeeRange],
      filterDialogOpen: true
    });
  };

  handleCloseFilterDialog = () => {
    this.setState({ filterDialogOpen: false });
  };

  handleApplyFilters = () => {
    // 필터 조건에 따라 차량 리스트를 다시 필터링
    const { cars, tempFilters, tempRentalFeeRange } = this.state;
    const { carTypes, carBrands, selectedTags } = tempFilters;
    const [minFee, maxFee] = tempRentalFeeRange;

    const filtered = cars.filter(car => {
      // 차량 분류
      if (carTypes.length > 0 && !carTypes.includes(car.carType)) return false;
      // 제조사
      if (carBrands.length > 0 && !carBrands.includes(car.carBrand)) return false;
      // 대여료
      const fee = parseInt(car.rentalFee, 10) || 0;
      if (fee < minFee || fee > maxFee) return false;
      // 태그
      if (selectedTags.length > 0) {
        const carTags = car.tags || [];
        if (!selectedTags.every(tag => carTags.includes(tag))) return false;
      }
      return true;
    });

    this.setState({
      filters: tempFilters,
      rentalFeeRange: tempRentalFeeRange,
      filteredCars: filtered,
      filterDialogOpen: false
    });
  };

  handleSortChange = (event) => {
    const newSortOrder = event.target.value;
    this.setState({ sortOrder: newSortOrder });
    
    let sorted = [...this.state.filteredCars];
    
    switch (newSortOrder) {
      case 'numberAsc':
        sorted.sort((a, b) => (a.carNumber || '').localeCompare(b.carNumber || ''));
        break;
      case 'numberDesc':
        sorted.sort((a, b) => (b.carNumber || '').localeCompare(a.carNumber || ''));
        break;
      case 'nameAsc':
        sorted.sort((a, b) => koreanFirstSort(a.carName, b.carName));
        break;
      case 'nameDesc':
        sorted.sort((a, b) => koreanFirstSort(b.carName, a.carName));
        break;
      case 'priceAsc':
        sorted.sort((a, b) => (parseInt(a.rentalFee) || 0) - (parseInt(b.rentalFee) || 0));
        break;
      case 'priceDesc':
        sorted.sort((a, b) => (parseInt(b.rentalFee) || 0) - (parseInt(a.rentalFee) || 0));
        break;
      default:
        sorted.sort((a, b) => koreanFirstSort(a.carName, b.carName));
    }
    
    this.setState({ filteredCars: sorted });
  };

  calculateTotalFee = () => {
    if (!this.state.selectedCar || !this.state.rentalData.startTime || !this.state.rentalData.endTime) {
      return 0;
    }
    
    const startDate = new Date(this.state.rentalData.startTime);
    const endDate = new Date(this.state.rentalData.endTime);
    
    // 날짜만 추출 (시간 제외)
    const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
    
    // 날짜 차이 계산 (종료일 - 시작일 + 1)
    const rentalDays = Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;
    const rentalFee = parseInt(this.state.selectedCar.rentalFee);
    
    return rentalFee * rentalDays;
  };

  handleRentalSubmit = async () => {
    if (!this.user) {
      this.setState({ error: '로그인이 필요합니다.' });
      return;
    }

    try {
      // 현재 시간을 한국 시간으로 정확하게 설정
      const now = new Date();
      const koreanTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
      
      // 시간을 YY-MM-DD HH:mm:ss 형식으로 변환
      const formatTime = 
        String(koreanTime.getFullYear()).slice(-2) + '-' +
        String(koreanTime.getMonth() + 1).padStart(2, '0') + '-' +
        String(koreanTime.getDate()).padStart(2, '0') + ' ' +
        String(koreanTime.getHours()).padStart(2, '0') + ':' +
        String(koreanTime.getMinutes()).padStart(2, '0') + ':' +
        String(koreanTime.getSeconds()).padStart(2, '0');
      
      // 대여 기간 계산 (종료일 - 시작일 + 1)
      const startDate = new Date(this.state.rentalData.startTime);
      const endDate = new Date(this.state.rentalData.endTime);
      const rentalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
      
      // 요금 계산 (rentalFee를 숫자로 변환)
      const rentalFee = parseInt(this.state.selectedCar.rentalFee);
      const totalFee = rentalFee * rentalDays;

      const rentalRequest = {
        carNumber: this.state.selectedCar.carNumber,
        carName: this.state.selectedCar.carName,
        carBrand: this.state.selectedCar.carBrand,
        carType: this.state.selectedCar.carType,
        guestId: this.user.uid,
        guestName: this.state.rentalData.guestName,
        hostId: this.state.selectedCar.hostID,
        hostName: this.state.selectedCar.hostName,
        startTime: this.state.rentalData.startTime,
        endTime: this.state.rentalData.endTime,
        address: this.state.rentalData.address,
        tags: this.state.rentalData.tags,
        status: '대기중',
        rentalFee: rentalFee.toString(),
        totalFee: totalFee
      };

      // 문서 ID 생성: "GuestID.carNumber.YY-MM-DD HH:mm:ss"
      const docId = `${this.user.uid}.${this.state.selectedCar.carNumber}.${formatTime}`;
      
      // setDoc을 사용하여 지정된 ID로 문서 생성
      await setDoc(doc(db, 'requests', docId), rentalRequest);
      
      // 대여 다이얼로그 닫기
      this.handleCloseDialog();
      
      // 성공 메시지 표시
      this.setState({ success: '대여 요청이 성공적으로 등록되었습니다.', recommendationDialogOpen: true });
    } catch (err) {
      console.error('대여 요청 실패:', err);
      this.setState({ error: '대여 요청 등록에 실패했습니다.' });
    }
  };

  componentDidMount() {
    this.fetchCars();
  }

  async fetchCars() {
    try {
      console.log('차량 데이터 로딩 시작...');
      const registrationsCollection = collection(db, 'registrations');
      const registrationsSnapshot = await getDocs(registrationsCollection);
      
      // 필수 정보가 있는 차량만 필터링
      const carsList = registrationsSnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        .filter(car => {
          // 필수 정보 체크
          const hasRequiredInfo = 
            car.carName && 
            car.carNumber && 
            car.carBrand && 
            car.carType && 
            car.rentalFee;
          
          if (!hasRequiredInfo) {
            console.log('필수 정보가 누락된 차량 제외:', {
              id: car.id,
              carName: car.carName,
              carNumber: car.carNumber,
              carBrand: car.carBrand,
              carType: car.carType,
              rentalFee: car.rentalFee
            });
          }
          
          return hasRequiredInfo;
        });

      console.log('로드된 차량 데이터:', carsList);

      if (carsList.length === 0) {
        console.log('등록된 차량이 없습니다.');
        this.setState({
          cars: [],
          filteredCars: [],
          loading: false,
          error: '등록된 차량이 없습니다.'
        });
        return;
      }

      // 모든 태그 수집 (필수 정보가 있는 차량의 태그만)
      this.allTags = [...new Set(carsList.flatMap(car => car.tags || []))];

      // 초기 정렬 적용
      const sortedCars = this.sortCars(carsList, this.state.sortOrder);
      
      this.setState({
        cars: sortedCars,
        filteredCars: sortedCars,
        loading: false
      }, () => {
        console.log('상태 업데이트 완료:', this.state);
      });
    } catch (error) {
      console.error('차량 데이터 로딩 오류:', error);
      this.setState({
        error: '차량 데이터를 불러오는 중 오류가 발생했습니다.',
        loading: false
      });
    }
  }

  sortCars = (cars, sortOrder) => {
    let sorted = [...cars];
    switch (sortOrder) {
      case 'numberAsc':
        sorted.sort((a, b) => (a.carNumber || '').localeCompare(b.carNumber || ''));
        break;
      case 'numberDesc':
        sorted.sort((a, b) => (b.carNumber || '').localeCompare(a.carNumber || ''));
        break;
      case 'nameAsc':
        sorted.sort((a, b) => koreanFirstSort(a.carName, b.carName));
        break;
      case 'nameDesc':
        sorted.sort((a, b) => koreanFirstSort(b.carName, a.carName));
        break;
      case 'priceAsc':
        sorted.sort((a, b) => (parseInt(a.rentalFee) || 0) - (parseInt(b.rentalFee) || 0));
        break;
      case 'priceDesc':
        sorted.sort((a, b) => (parseInt(b.rentalFee) || 0) - (parseInt(a.rentalFee) || 0));
        break;
      default:
        sorted.sort((a, b) => koreanFirstSort(a.carName, b.carName));
    }
    return sorted;
  };

  setTempRentalFeeRange = (newRange) => {
    this.setState(prev => ({
      tempRentalFeeRange: newRange
    }));
  };

  setFilters = (newFilters) => {
    this.setState(prev => ({
      filters: { ...prev.filters, ...newFilters }
    }));
  };

  setTempFilters = (newTempFilters) => {
    this.setState(prev => ({
      tempFilters: { ...prev.tempFilters, ...newTempFilters }
    }));
  };

  setRentalFeeRange = (newRange) => {
    this.setState(prev => ({
      rentalFeeRange: newRange
    }));
  };

  componentDidUpdate(prevProps) {
    // 다크모드 상태가 변경되었을 때만 실행
    // document.documentElement.setAttribute('data-theme', this.props.isDarkMode ? 'dark' : 'light');
  }

  render() {
    const { 
      loading, 
      error, 
      success, 
      selectedCar, 
      openDialog, 
      rentalData, 
      searchQuery, 
      filterDialogOpen, 
      page, 
      filters, 
      tempFilters, 
      rentalFeeRange, 
      tempRentalFeeRange,
      filteredCars,
      sortOrder,
      recommendationDialogOpen
    } = this.state;

  return (
      <div className={`rental-container ${this.props.isDarkMode ? 'dark' : ''}`}>
        <div className="registration-link-container">
          <Link
            to="/registration"
            className={`registration-link-button ${this.props.isDarkMode ? 'dark' : ''}`}
          >
            차량 등록
          </Link>
        </div>
        <div className={`rental-paper ${this.props.isDarkMode ? 'dark' : ''}`}>
          <div className={`rental-header ${this.props.isDarkMode ? 'dark' : ''}`}>
            <h1 className={`rental-title ${this.props.isDarkMode ? 'dark' : ''}`}>차량 대여</h1>
          </div>
          <div className={`search-filter-container ${this.props.isDarkMode ? 'dark' : ''}`}>
            <div className={`search-group ${this.props.isDarkMode ? 'dark' : ''}`}>
              <div className={`search-field-wrapper ${this.props.isDarkMode ? 'dark' : ''}`}>
                <input
                  type="text"
                  autoComplete="off"
                  className={`search-field ${this.props.isDarkMode ? 'dark' : ''}`}
                  placeholder="차량명, 차량번호, 제조사, 차종, 태그 검색"
              value={searchQuery}
                  onChange={this.handleSearchChange}
                  onKeyPress={this.handleKeyPress}
                />
                <button className={`search-button ${this.props.isDarkMode ? 'dark' : ''}`} onClick={this.handleSearch}>
              검색
                </button>
          </div>
        </div>
          </div>
          <div className={`sort-filter-row ${this.props.isDarkMode ? 'dark' : ''}`}>
            <select
              className={`sort-select ${this.props.isDarkMode ? 'dark' : ''}`}
              value={sortOrder}
              onChange={this.handleSortChange}
            >
              <option value="nameAsc">차량명 (오름차순)</option>
              <option value="nameDesc">차량명 (내림차순)</option>
              <option value="numberAsc">차량번호 (오름차순)</option>
              <option value="numberDesc">차량번호 (내림차순)</option>
              <option value="priceAsc">대여료 (낮은순)</option>
              <option value="priceDesc">대여료 (높은순)</option>
            </select>
            <button
              className={`filter-button ${this.props.isDarkMode ? 'dark' : ''}`}
              onClick={this.handleOpenFilterDialog}
          >
            필터
            </button>
        </div>
        {loading ? (
            <div className={`loading-container ${this.props.isDarkMode ? 'dark' : ''}`}>
              <div className={`loading-spinner ${this.props.isDarkMode ? 'dark' : ''}`} />
            </div>
        ) : error ? (
            <div className={`alert error ${this.props.isDarkMode ? 'dark' : ''}`}>{error}</div>
        ) : (
            <>
              <div className={`car-grid ${this.props.isDarkMode ? 'dark' : ''}`}>
                {this.getCurrentPageCars().map((car) => (
                  <CarCard
                    key={car.id}
                    car={car}
                    onRent={this.handleRentClick}
                    onTagClick={this.handleTagFilterClick}
                    isDarkMode={this.props.isDarkMode}
                  />
              ))}
              </div>
            {filteredCars.length > 0 && (
                <div className={`pagination-wrapper ${this.props.isDarkMode ? 'dark' : ''}`}>
                  <div className={`pagination ${this.props.isDarkMode ? 'dark' : ''}`}>
                    <button
                      className={`page-button ${this.props.isDarkMode ? 'dark' : ''}`}
                      onClick={() => this.handlePageChange(null, Math.max(1, page - 1))}
                      disabled={page === 1}
                    >
                      이전
                    </button>
                    <button
                      className={`page-button ${this.props.isDarkMode ? 'dark' : ''}`}
                      onClick={() => this.handlePageChange(null, Math.min(Math.ceil(filteredCars.length / this.itemsPerPage), page + 1))}
                      disabled={page === Math.ceil(filteredCars.length / this.itemsPerPage)}
                    >
                      다음
                    </button>
                  </div>
                  <div className={`pagination-info ${this.props.isDarkMode ? 'dark' : ''}`}>{this.getPageInfo()}</div>
                </div>
              )}
            </>
            )}
        </div>
        {filterDialogOpen && (
          <FilterDialog
            open={filterDialogOpen}
            onClose={this.handleCloseFilterDialog}
            onApply={this.handleApplyFilters}
            filters={filters}
            setFilters={this.setFilters}
            tempFilters={tempFilters}
            setTempFilters={this.setTempFilters}
            rentalFeeRange={rentalFeeRange}
            tempRentalFeeRange={tempRentalFeeRange}
            setTempRentalFeeRange={this.setTempRentalFeeRange}
            setRentalFeeRange={this.setRentalFeeRange}
            allTags={this.allTags}
            isDarkMode={this.props.isDarkMode}
          />
        )}
        {openDialog && selectedCar && (
          <div className={`rental-dialog-overlay ${this.props.isDarkMode ? 'dark' : ''}`}>
            <div className={`rental-dialog ${this.props.isDarkMode ? 'dark' : ''}`}>
              <div className={`rental-dialog-header ${this.props.isDarkMode ? 'dark' : ''}`}>
                <h2 className={this.props.isDarkMode ? 'dark' : ''}>차량 대여</h2>
              </div>
              <div className={`rental-dialog-content ${this.props.isDarkMode ? 'dark' : ''}`}>
                <div className={`car-info-box ${this.props.isDarkMode ? 'dark' : ''}`}>
                  <h4 className={this.props.isDarkMode ? 'dark' : ''}>차량 정보</h4>
                  <p className={this.props.isDarkMode ? 'dark' : ''} data-label="차량명: " data-value={selectedCar.carName}></p>
                  <p className={this.props.isDarkMode ? 'dark' : ''} data-label="차량번호: " data-value={selectedCar.carNumber}></p>
                  <p className={this.props.isDarkMode ? 'dark' : ''} data-label="제조사: " data-value={selectedCar.carBrand}></p>
                  <p className={this.props.isDarkMode ? 'dark' : ''} data-label="차종: " data-value={selectedCar.carType}></p>
                  <p className={this.props.isDarkMode ? 'dark' : ''} data-label="대여료: " data-value={`${selectedCar.rentalFee}원/일`}></p>
                {rentalData.startTime && rentalData.endTime && (
                    <p className={this.props.isDarkMode ? 'dark' : ''} data-label="총 대여료: " data-value={`${this.calculateTotalFee().toLocaleString()}원`}></p>
                )}
                </div>
                <div className={`input-group ${this.props.isDarkMode ? 'dark' : ''}`}>
                  <label className={this.props.isDarkMode ? 'dark' : ''}>대여자 이름</label>
                  <input
                    type="text"
                    className={this.props.isDarkMode ? 'dark' : ''}
                name="guestName"
                value={rentalData.guestName}
                    onChange={this.handleInputChange}
                    placeholder="대여자 이름을 입력하세요"
                  />
                </div>
                <div className={`input-group ${this.props.isDarkMode ? 'dark' : ''}`}>
                  <label className={this.props.isDarkMode ? 'dark' : ''}>목적지</label>
                  <input
                    type="text"
                    className={this.props.isDarkMode ? 'dark' : ''}
                name="address"
                value={rentalData.address}
                    onChange={this.handleInputChange}
                    placeholder="목적지를 입력하세요"
                  />
                </div>
                <div className={`date-time-inputs ${this.isDarkMode ? 'dark' : ''}`}>
                  <div className={`input-group ${this.isDarkMode ? 'dark' : ''}`}>
                    <label className={this.isDarkMode ? 'dark' : ''}>대여 시작 시간</label>
                    <input
                      type="datetime-local"
                      className={this.isDarkMode ? 'dark' : ''}
                      name="startTime"
                      value={this.formatDateTimeForInput(rentalData.startTime)}
                      onChange={(e) => {
                        const date = new Date(e.target.value + 'Z');
                        this.setState(prev => ({
                          rentalData: {
                            ...prev.rentalData,
                            startTime: date
                          }
                        }));
                      }}
                      min={this.formatDateTimeForInput(this.getCurrentKoreanTime())}
                    />
                  </div>
                  <div className={`input-group ${this.isDarkMode ? 'dark' : ''}`}>
                    <label className={this.isDarkMode ? 'dark' : ''}>대여 종료 시간</label>
                    <input
                      type="datetime-local"
                      className={this.isDarkMode ? 'dark' : ''}
                      name="endTime"
                      value={this.formatDateTimeForInput(rentalData.endTime)}
                      onChange={(e) => {
                        const date = new Date(e.target.value + 'Z');
                        this.setState(prev => ({
                          rentalData: {
                            ...prev.rentalData,
                            endTime: date
                    }
                        }));
                }}
                      min={this.formatDateTimeForInput(rentalData.startTime)}
              />
                  </div>
                </div>
                <div className={`input-group ${this.isDarkMode ? 'dark' : ''}`}>
                  <label className={this.isDarkMode ? 'dark' : ''}>태그</label>
                  <div className="tag-group">
                    {(selectedCar.tags || [])
                      .filter(tag => tag !== '도심 드라이브' && tag.trim() !== '')
                      .map((tag) => (
                        <button
                    key={tag}
                          className={`tag-chip ${rentalData.tags.includes(tag) ? 'selected' : ''} ${this.isDarkMode ? 'dark' : ''}`}
                          onClick={() => this.handleTagClick(tag)}
                        >
                          {rentalData.tags.includes(tag) && (
                            <span className="tag-check" aria-label="선택됨" style={{marginRight: '4px'}}>✔️</span>
                          )}
                          {tag}
                        </button>
                ))}
                  </div>
                </div>
              </div>
              <div className={`rental-dialog-actions ${this.isDarkMode ? 'dark' : ''}`}>
                <button className={`cancel-button ${this.isDarkMode ? 'dark' : ''}`} onClick={this.handleCloseDialog}>취소</button>
                <button className={`apply-button ${this.isDarkMode ? 'dark' : ''}`} onClick={this.handleRentalSubmit}>대여하기</button>
              </div>
            </div>
          </div>
        )}
        {success && (
          <div className={`alert info ${this.isDarkMode ? 'dark' : ''}`}>
            {success}
          </div>
        )}
        {error && (
          <div className={`alert error ${this.isDarkMode ? 'dark' : ''}`}>
            {error}
          </div>
        )}
        {recommendationDialogOpen && (
          <div className="filter-dialog-overlay" style={{zIndex: 2000}}>
            <div className="filter-dialog-content" style={{zIndex: 2001, maxWidth: 1200, width: '90vw', margin: 'auto'}}>
              <div className="filter-dialog-header">
                <h2>장소 추천</h2>
                <button className="close-button" onClick={() => this.setState({ recommendationDialogOpen: false })}>×</button>
              </div>
              <div className="filter-dialog-body">
                <PlaceRecommendation
                  isDarkMode={this.props.isDarkMode}
                  address={this.state.rentalData.address}
                  tags={this.state.rentalData.tags}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
}

// Rental 컴포넌트를 감싸는 함수형 컴포넌트
function RentalWrapper({ isDarkMode }) {
  const { user } = useContext(UserContext);
  const navigate = useNavigate();
  return <Rental isDarkMode={isDarkMode} user={user} navigate={navigate} />;
}

export default RentalWrapper;