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
                <h2 className="car-name">{car.carName}</h2>
                <p className="car-fee">{car.rentalFee}원/일</p>
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
            <div className="car-details">
              <div className="car-detail-item">
                <span className="detail-label">차량정보: </span>
                <span className="detail-value">{car.carNumber}</span>
              </div>
              <div className="car-detail-item">
                <span className="detail-label">제조사: </span>
                <span className="detail-value">{car.carBrand}</span>
              </div>
              <div className="car-detail-item">
                <span className="detail-label">분류: </span>
                <span className="detail-value">{car.carType}</span>
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

  const handleCategoryClick = (category) => {
    setTempFilters(prev => ({
      ...prev,
      carTypes: prev.carTypes.includes(category)
        ? prev.carTypes.filter(type => type !== category)
        : [...prev.carTypes, category]
    }));
  };

  const handleBrandClick = (brand) => {
    setTempFilters(prev => ({
      ...prev,
      carBrands: prev.carBrands.includes(brand)
        ? prev.carBrands.filter(b => b !== brand)
        : [...prev.carBrands, brand]
    }));
  };

  const handleTagClick = (tag) => {
    setTempFilters(prev => {
      const newSelectedTags = prev.selectedTags.includes(tag)
        ? prev.selectedTags.filter(t => t !== tag)
        : [...prev.selectedTags, tag];
      
      return {
        ...prev,
        selectedTags: newSelectedTags
      };
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
      setTempRentalFeeRange([0, 1000000]);
    }
  }, [open]);

  return (
    <div className={`filter-dialog ${open ? 'open' : ''} ${isDarkMode ? 'dark' : ''}`}>
      <div className="filter-dialog-content">
        <h2 className="filter-dialog-title">필터</h2>
        <div className="filter-dialog-body">
          <div className="filter-section">
            <h3 className="filter-section-title">차량 분류</h3>
            <div className="tag-group">
              {carTypes.map((type) => (
                <button
                  key={type}
                  className={`tag-chip ${tempFilters.carTypes.includes(type) ? 'selected' : ''} ${isDarkMode ? 'dark' : ''}`}
                  onClick={() => handleCategoryClick(type)}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-section">
            <h3 className="filter-section-title">제조사</h3>
            <div className="tag-group">
              {carBrands.map((brand) => (
                <button
                  key={brand}
                  className={`tag-chip ${tempFilters.carBrands.includes(brand) ? 'selected' : ''} ${isDarkMode ? 'dark' : ''}`}
                  onClick={() => handleBrandClick(brand)}
                >
                  {brand}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-section">
            <h3 className="filter-section-title">대여료</h3>
            <div className="rental-fee-range">
              <div className="rental-fee-inputs">
                <div className="rental-fee-input-group">
                  <label>최소 금액</label>
                  <input
                    type="number"
                    value={tempRentalFeeRange[0]}
                    onChange={(e) => {
                      const value = Math.max(0, Math.min(tempRentalFeeRange[1], Number(e.target.value)));
                      setTempRentalFeeRange([value, tempRentalFeeRange[1]]);
                    }}
                  />
                  <span className="unit">원</span>
                </div>
                <span className="separator">-</span>
                <div className="rental-fee-input-group">
                  <label>최대 금액</label>
                  <input
                    type="number"
                    value={tempRentalFeeRange[1]}
                    onChange={(e) => {
                      const value = Math.max(tempRentalFeeRange[0], Math.min(1000000, Number(e.target.value)));
                      setTempRentalFeeRange([tempRentalFeeRange[0], value]);
                    }}
                  />
                  <span className="unit">원</span>
                </div>
              </div>
            </div>
          </div>

          <div className="filter-section">
            <h3 className="filter-section-title">태그</h3>
            <div className="tag-group">
              {allTags
                .filter(tag => !tag.includes('도심 드라이브'))  // '도심 드라이브'가 포함된 모든 태그 제외
                .map((tag) => (
                  <button
                    key={tag}
                    className={`tag-chip ${tempFilters.selectedTags.includes(tag) ? 'selected' : ''} ${isDarkMode ? 'dark' : ''}`}
                    onClick={() => handleTagClick(tag)}
                  >
                    {tag}
                  </button>
                ))}
            </div>
          </div>
        </div>
        <div className="filter-dialog-actions">
          <button className="cancel-button" onClick={onClose}>취소</button>
          <button 
            className="apply-button"
            onClick={() => {
              setFilters({
                ...tempFilters,
                selectedTags: [...tempFilters.selectedTags]
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

function Rental({ isDarkMode }) {
  const { user } = useContext(UserContext);
  const navigate = useNavigate();
  const [sortOrder, setSortOrder] = useState('nameAsc');

  // 유틸리티 함수들을 먼저 선언
  const getCurrentKoreanTime = () => {
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

  const formatDateTimeForInput = (date) => {
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

  // 그 다음에 상태 초기화
  const [cars, setCars] = useState([]);
  const [filteredCars, setFilteredCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedCar, setSelectedCar] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [rentalData, setRentalData] = useState({
    startTime: getCurrentKoreanTime(),
    endTime: new Date(getCurrentKoreanTime().setDate(getCurrentKoreanTime().getDate() + 1)),
    guestName: '',
    address: '',
    tags: []
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  const [recommendationData, setRecommendationData] = useState({
    tags: [],
    address: '',
    startTime: null,
    endTime: null
  });
  const [openRecommendationDialog, setOpenRecommendationDialog] = useState(false);
  const [page, setPage] = useState(1);
  const itemsPerPage = 6;
  const [filters, setFilters] = useState({
    carTypes: [],
    carBrands: [],
    minRentalFee: '0',
    maxRentalFee: '1000000',
    selectedTags: []
  });
  const [tempFilters, setTempFilters] = useState({
    carTypes: [],
    carBrands: [],
    minRentalFee: '0',
    maxRentalFee: '1000000',
    selectedTags: []
  });
  const [rentalFeeRange, setRentalFeeRange] = useState([0, 1000000]);
  const [tempRentalFeeRange, setTempRentalFeeRange] = useState([0, 1000000]);
  const requestsRef = collection(db, 'requests');
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [tempStartDate, setTempStartDate] = useState(new Date());
  const [tempEndDate, setTempEndDate] = useState(new Date(new Date().setDate(new Date().getDate() + 1)));

  // 정렬된 차량 목록을 관리하는 상태 추가
  const [sortedCars, setSortedCars] = useState([]);

  // 모든 차량의 태그를 수집하고 '도심 드라이브' 제외 (정렬 추가)
  const allTags = React.useMemo(() => {
    const tags = cars.flatMap(car => 
      (car.tags || [])
        .filter(tag => tag !== '도심 드라이브' && tag !== '#도심 드라이브' && tag.trim() !== '')
    );
    return [...new Set(tags)].sort((a, b) => a.localeCompare(b, 'ko'));
  }, [cars]);

  useEffect(() => {
    // 초기 필터 상태 설정
    const initialFilters = {
      carTypes: [],
      carBrands: [],
      minRentalFee: '0',
      maxRentalFee: '1000000',
      selectedTags: []
    };
    
    setFilters(initialFilters);
    setTempFilters(initialFilters);
    setRentalFeeRange([0, 1000000]);
    setTempRentalFeeRange([0, 1000000]);
  }, []);

  useEffect(() => {
    fetchCars();
  }, []);

  useEffect(() => {
    filterCars();
  }, [filters]);

  useEffect(() => {
    setPage(1);
  }, [filters]);

  const fetchCars = async () => {
    try {
      setLoading(true);
      const querySnapshot = await getDocs(collection(db, 'registrations'));
      
      // 필수 필드가 있는 데이터만 필터링
      const carsList = querySnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        .filter(car => {
          // 필수 필드 체크
          const requiredFields = {
            carNumber: '차량번호',
            carName: '차량명',
            carBrand: '제조사',
            carType: '차종',
            rentalFee: '대여료',
            hostID: '호스트 ID',
            hostName: '호스트 이름'
          };

          // 모든 필수 필드가 존재하고 비어있지 않은지 확인
          const isValid = Object.entries(requiredFields).every(([field, label]) => {
            const value = car[field];
            if (!value || value.toString().trim() === '') {
              console.warn(`유효하지 않은 차량 데이터: ${label} 누락 (차량번호: ${car.carNumber || '알 수 없음'})`);
              return false;
            }
            return true;
          });

          // 대여료가 숫자인지 확인
          if (isValid && isNaN(Number(car.rentalFee))) {
            console.warn(`유효하지 않은 차량 데이터: 대여료가 숫자가 아님 (차량번호: ${car.carNumber})`);
            return false;
          }

          return isValid;
        });

      setCars(carsList);
      setFilteredCars(carsList);
    } catch (err) {
      console.error('차량 목록 조회 실패:', err);
      setError('차량 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const filterCars = () => {
    let filtered = cars;

    // 검색어 필터링 제거 (검색 버튼 클릭 시에만 동작)

    // 차종 필터링 (여러 개 선택 가능)
    if (filters.carTypes.length > 0) {
      filtered = filtered.filter(car => filters.carTypes.includes(car.carType));
    }

    // 제조사 필터링 (여러 개 선택 가능)
    if (filters.carBrands.length > 0) {
      filtered = filtered.filter(car => filters.carBrands.includes(car.carBrand));
    }

    // 대여료 범위 필터링
    const minFee = parseInt(filters.minRentalFee);
    const maxFee = parseInt(filters.maxRentalFee);
    
    if (!isNaN(minFee)) {
      filtered = filtered.filter(car => {
        const carFee = parseInt(car.rentalFee);
        return !isNaN(carFee) && carFee >= minFee;
      });
    }
    
    if (!isNaN(maxFee)) {
      filtered = filtered.filter(car => {
        const carFee = parseInt(car.rentalFee);
        return !isNaN(carFee) && carFee <= maxFee;
      });
    }

    // 태그 필터링 (도심 드라이브 제외)
    if (filters.selectedTags.length > 0) {
      filtered = filtered.filter(car => {
        const carTags = (car.tags || []).filter(tag => tag !== '도심 드라이브');
        return filters.selectedTags.every(tag => carTags.includes(tag));
      });
    }

    setFilteredCars(filtered);
  };

  const handleSearchChange = (event) => {
    setSearchQuery(event.target.value);
  };

  const handleSearch = () => {
    const searchTerm = searchQuery.toLowerCase().trim();
    if (!searchTerm) {
      setFilteredCars(cars);
      return;
    }

    const searchResults = cars.filter(car => {
      // 각 필드에 대해 안전하게 검색
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

    setFilteredCars(searchResults);
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter') {
      handleSearch();
    }
  };

  const handlePageChange = (event, value) => {
    setPage(value);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getCurrentPageCars = () => {
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return sortedCars.slice(startIndex, endIndex);
  };

  const getPageInfo = () => {
    const totalPages = Math.ceil(sortedCars.length / itemsPerPage);
    return `${page} / ${totalPages} 페이지`;
  };

  const handleRentClick = (car) => {
    setSelectedCar(car);
    setRentalData({
      startTime: getCurrentKoreanTime(),
      endTime: new Date(getCurrentKoreanTime().setDate(getCurrentKoreanTime().getDate() + 1)),
      guestName: '',
      address: '',
      tags: []
    });
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedCar(null);
    setError('');
  };

  const handleDateChange = (name) => (date) => {
    setRentalData(prev => ({
      ...prev,
      [name]: date
    }));
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setRentalData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleTagClick = (tag) => {
    setRentalData(prev => {
      const newTags = prev.tags.includes(tag) 
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag];
      return {
        ...prev,
        tags: newTags
      };
    });
  };

  const handleTagFilterClick = (tag) => {
    setTempFilters(prev => {
      const currentTags = prev.selectedTags;
      if (currentTags.includes(tag)) {
        return {
          ...prev,
          selectedTags: currentTags.filter(t => t !== tag)
        };
      } else {
        return {
          ...prev,
          selectedTags: [...currentTags, tag]
        };
      }
    });
  };

  const handleOpenFilterDialog = () => {
    setTempFilters({
      ...filters,
      selectedTags: [...filters.selectedTags]
    });
    setTempRentalFeeRange([...rentalFeeRange]);
    setFilterDialogOpen(true);
  };

  const handleCloseFilterDialog = () => {
    setFilterDialogOpen(false);
  };

  const handleApplyFilters = () => {
    setFilters(tempFilters);
    setRentalFeeRange(tempRentalFeeRange);
    setFilterDialogOpen(false);
  };

  const handleRentalSubmit = async () => {
    if (!user) {
      setError('로그인이 필요합니다.');
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
      const startDate = new Date(rentalData.startTime);
      const endDate = new Date(rentalData.endTime);
      const rentalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
      
      // 요금 계산 (rentalFee를 숫자로 변환)
      const rentalFee = parseInt(selectedCar.rentalFee); // 문자열을 숫자로 변환
      const totalFee = rentalFee * rentalDays; // 총 대여료

      const rentalRequest = {
        carNumber: selectedCar.carNumber,
        carName: selectedCar.carName,
        carBrand: selectedCar.carBrand,
        carType: selectedCar.carType,
        guestId: user.uid,
        guestName: rentalData.guestName,
        hostId: selectedCar.hostID,
        hostName: selectedCar.hostName,
        startTime: rentalData.startTime,
        endTime: rentalData.endTime,
        address: rentalData.address,
        tags: rentalData.tags,
        status: '대기중',
        rentalFee: rentalFee.toString(),
        totalFee: totalFee
      };

      // 문서 ID 생성: "GuestID.carNumber.YY-MM-DD HH:mm:ss"
      const docId = `${user.uid}.${selectedCar.carNumber}.${formatTime}`;
      
      // setDoc을 사용하여 지정된 ID로 문서 생성
      await setDoc(doc(requestsRef, docId), rentalRequest);
      
      // 대여 다이얼로그 닫기
      handleCloseDialog();
      
      // 장소 추천 데이터 설정 및 표시 (대여 시 입력한 데이터 사용)
      setRecommendationData({
        tags: rentalData.tags || [],  // 선택한 태그
        address: rentalData.address || '',  // 입력한 주소
        startTime: rentalData.startTime,  // 대여 시작 시간
        endTime: rentalData.endTime  // 대여 종료 시간
      });
      
      // 장소 추천 다이얼로그 표시
      setOpenRecommendationDialog(true);
    } catch (err) {
      console.error('대여 요청 실패:', err);
      setError('대여 요청 등록에 실패했습니다.');
    }
  };

  // 정렬 옵션 핸들러 수정
  const handleSortChange = (event) => {
    const newSortOrder = event.target.value;
    setSortOrder(newSortOrder);
    
    let sorted = [...filteredCars];  // filteredCars를 기준으로 정렬
    
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
    
    setSortedCars(sorted);
  };

  // filteredCars가 변경될 때마다 정렬 적용
  useEffect(() => {
    handleSortChange({ target: { value: sortOrder } });
  }, [filteredCars]);

  // 컴포넌트 마운트 시 초기 정렬 적용
  useEffect(() => {
    if (cars.length > 0) {
      const initialSorted = [...cars].sort((a, b) => koreanFirstSort(a.carName, b.carName));
      setSortedCars(initialSorted);
      setFilteredCars(initialSorted);
    }
  }, [cars]);

  const formatDateTime = (date) => {
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

  const calculateTotalFee = () => {
    if (!selectedCar || !rentalData.startTime || !rentalData.endTime) return 0;
    
    const startDate = new Date(rentalData.startTime);
    const endDate = new Date(rentalData.endTime);
    
    // 날짜만 추출 (시간 제외)
    const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
    
    // 날짜 차이 계산 (종료일 - 시작일 + 1)
    const rentalDays = Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;
    const rentalFee = parseInt(selectedCar.rentalFee);
    
    return rentalFee * rentalDays;
  };

  return (
    <div className={`rental-container ${isDarkMode ? 'dark' : ''}`}>
      <Link
        to="/registration"
        className={`registration-link-button ${isDarkMode ? 'dark' : ''}`}
      >
        차량 등록
      </Link>
      <div className={`rental-paper ${isDarkMode ? 'dark' : ''}`}>
        <div className="rental-header">
          <h1 className="rental-title">차량 대여</h1>
        </div>
        <div className="search-filter-container">
          <div className="search-group">
            <div className="search-field-wrapper">
              <input
                type="text"
                className="search-field"
                placeholder="차량명, 차량번호, 제조사, 차종, 태그 검색"
                value={searchQuery}
                onChange={handleSearchChange}
                onKeyPress={handleKeyPress}
              />
              <button className={`search-button ${isDarkMode ? 'dark' : ''}`} onClick={handleSearch}>
                검색
              </button>
            </div>
          </div>
        </div>
        <div className="sort-filter-row">
          <select
            className={`sort-select ${isDarkMode ? 'dark' : ''}`}
            value={sortOrder}
            onChange={handleSortChange}
          >
            <option value="nameAsc">차량명 (오름차순)</option>
            <option value="nameDesc">차량명 (내림차순)</option>
            <option value="numberAsc">차량번호 (오름차순)</option>
            <option value="numberDesc">차량번호 (내림차순)</option>
            <option value="priceAsc">대여료 (낮은순)</option>
            <option value="priceDesc">대여료 (높은순)</option>
          </select>
          <button
            className={`filter-button ${isDarkMode ? 'dark' : ''}`}
            onClick={handleOpenFilterDialog}
          >
            필터
          </button>
        </div>
        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner" />
          </div>
        ) : error ? (
          <div className={`alert error ${isDarkMode ? 'dark' : ''}`}>{error}</div>
        ) : (
          <>
            <div className="car-grid">
              {getCurrentPageCars().map((car) => (
                <CarCard
                  key={car.id}
                  car={car}
                  onRent={handleRentClick}
                  onTagClick={handleTagFilterClick}
                  isDarkMode={isDarkMode}
                />
              ))}
            </div>
            {filteredCars.length > 0 && (
              <div className="pagination-wrapper">
                <div className="pagination">
                  <button
                    className="page-button"
                    onClick={() => handlePageChange(null, Math.max(1, page - 1))}
                    disabled={page === 1}
                  >
                    이전
                  </button>
                  <button
                    className="page-button"
                    onClick={() => handlePageChange(null, Math.min(Math.ceil(filteredCars.length / itemsPerPage), page + 1))}
                    disabled={page === Math.ceil(filteredCars.length / itemsPerPage)}
                  >
                    다음
                  </button>
                </div>
                <div className="pagination-info">{getPageInfo()}</div>
              </div>
            )}
          </>
        )}
      </div>
      {filterDialogOpen && (
        <FilterDialog
          open={filterDialogOpen}
          onClose={handleCloseFilterDialog}
          onApply={handleApplyFilters}
          filters={filters}
          setFilters={setFilters}
          tempFilters={tempFilters}
          setTempFilters={setTempFilters}
          rentalFeeRange={rentalFeeRange}
          tempRentalFeeRange={tempRentalFeeRange}
          setTempRentalFeeRange={setTempRentalFeeRange}
          setRentalFeeRange={setRentalFeeRange}
          allTags={allTags}
          isDarkMode={isDarkMode}
        />
      )}
      {openDialog && selectedCar && (
        <div className="rental-dialog-overlay">
          <div className={`rental-dialog ${isDarkMode ? 'dark' : ''}`}>
            <div className="rental-dialog-header">
              <h2>차량 대여</h2>
              <button className="close-button" onClick={handleCloseDialog}>×</button>
            </div>
            <div className="rental-dialog-content">
              <div className="car-info-box">
                <h4>차량 정보</h4>
                <p data-label="차량명: " data-value={selectedCar.carName}></p>
                <p data-label="차량번호: " data-value={selectedCar.carNumber}></p>
                <p data-label="제조사: " data-value={selectedCar.carBrand}></p>
                <p data-label="차종: " data-value={selectedCar.carType}></p>
                <p data-label="대여료: " data-value={`${selectedCar.rentalFee}원/일`}></p>
                {rentalData.startTime && rentalData.endTime && (
                  <p data-label="총 대여료: " data-value={`${calculateTotalFee().toLocaleString()}원`}></p>
                )}
              </div>
              <div className="input-group">
                <label>대여자 이름</label>
                <input
                  type="text"
                  name="guestName"
                  value={rentalData.guestName}
                  onChange={handleInputChange}
                  placeholder="대여자 이름을 입력하세요"
                />
              </div>
              <div className="input-group">
                <label>목적지</label>
                <input
                  type="text"
                  name="address"
                  value={rentalData.address}
                  onChange={handleInputChange}
                  placeholder="목적지를 입력하세요"
                />
              </div>
              <div className="date-time-inputs">
                <div className="input-group">
                  <label>대여 시작 시간</label>
                  <input
                    type="datetime-local"
                    name="startTime"
                    value={formatDateTimeForInput(rentalData.startTime)}
                    onChange={(e) => {
                      const date = new Date(e.target.value + 'Z');
                      setRentalData(prev => ({
                        ...prev,
                        startTime: date
                      }));
                    }}
                    min={formatDateTimeForInput(getCurrentKoreanTime())}
                  />
                </div>
                <div className="input-group">
                  <label>대여 종료 시간</label>
                  <input
                    type="datetime-local"
                    name="endTime"
                    value={formatDateTimeForInput(rentalData.endTime)}
                    onChange={(e) => {
                      const date = new Date(e.target.value + 'Z');
                      setRentalData(prev => ({
                        ...prev,
                        endTime: date
                      }));
                    }}
                    min={formatDateTimeForInput(rentalData.startTime)}
                  />
                </div>
              </div>
              <div className="input-group">
                <label>태그</label>
                <div className="tag-group">
                  {(selectedCar.tags || [])
                    .filter(tag => tag !== '도심 드라이브' && tag.trim() !== '')
                    .map((tag) => (
                      <button
                        key={tag}
                        className={`tag-chip ${rentalData.tags.includes(tag) ? 'selected' : ''} ${isDarkMode ? 'dark' : ''}`}
                        onClick={() => handleTagClick(tag)}
                      >
                        {tag}
                      </button>
                    ))}
                </div>
              </div>
            </div>
            <div className="rental-dialog-actions">
              <button className="cancel-button" onClick={handleCloseDialog}>취소</button>
              <button className="apply-button" onClick={handleRentalSubmit}>대여하기</button>
            </div>
          </div>
        </div>
      )}
      {success && (
        <div className={`alert info ${isDarkMode ? 'dark' : ''}`}>
          {success}
        </div>
      )}
      {error && (
        <div className={`alert error ${isDarkMode ? 'dark' : ''}`}>
          {error}
        </div>
      )}

      {/* 장소 추천 다이얼로그 */}
      {openRecommendationDialog && (
        <div className="recommendation-dialog-overlay">
          <div className={`recommendation-dialog ${isDarkMode ? 'dark' : ''}`}>
            <div className="recommendation-dialog-header">
              <h2>장소 추천</h2>
              <button className="close-button" onClick={() => setOpenRecommendationDialog(false)}>×</button>
            </div>
            <div className="recommendation-dialog-content">
              <div className="recommendation-info">
                <p>선택한 태그: {recommendationData.tags.join(', ') || '없음'}</p>
                <p>목적지: {recommendationData.address || '입력되지 않음'}</p>
                <p>대여 기간: {formatDateTime(recommendationData.startTime)} ~ {formatDateTime(recommendationData.endTime)}</p>
              </div>
              <PlaceRecommendation
                isDarkMode={isDarkMode}
                address={recommendationData.address}
                tags={recommendationData.tags}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Rental;