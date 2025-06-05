import React, { useState, useEffect, useContext } from 'react';
import { collection, getDocs, addDoc, query, where, doc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { UserContext } from '../../UserContext';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebase';
import '../../styles/Rental.css';
import PlaceRecommendation from "../recommendation/PlaceRecommendation";
import "../../styles/Common.css";

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
  const strA = (a || '').toString();
  const strB = (b || '').toString();

  const isKoreanA = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(strA);
  const isKoreanB = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(strB);
  const isEnglishA = /[a-zA-Z]/.test(strA);
  const isEnglishB = /[a-zA-Z]/.test(strB);
  const isNumberA = /[0-9]/.test(strA);
  const isNumberB = /[0-9]/.test(strB);

  if (isKoreanA && !isKoreanB) return -1;
  if (!isKoreanA && isKoreanB) return 1;
  if (isEnglishA && !isEnglishB) return -1;
  if (!isEnglishA && isEnglishB) return 1;
  if (isNumberA && !isNumberB) return -1;
  if (!isNumberA && isNumberB) return 1;
  
  return strA.localeCompare(strB, 'ko');
};

// 차량 카드 컴포넌트
function CarCard({ car, onRent, onTagClick, isDarkMode }) {
  return (
    <div className={`car-card ${isDarkMode ? 'dark' : 'light'}`} data-testid="car-card">
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
                  data-testid="rent-button"
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
                console.log("isDarkMode:", isDarkMode),
                <button
                  key={index}
                  className={`tag-chip ${isDarkMode ? 'dark' : ''}`}
                  onClick={() => onTagClick(tag)}
                  data-testid="tag-button"
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

  // 대여료 직접 입력 핸들러
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
                    onChange={handleRentalFeeInputChange(0)}
                  />
                  <span className="unit">원</span>
                </div>
                <span className="separator">-</span>
                <div className="rental-fee-input-group">
                  <label>최대 금액</label>
                  <input
                    type="number"
                    value={tempRentalFeeRange[1]}
                    onChange={handleRentalFeeInputChange(1)}
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
                .filter(tag => !tag.includes('도심 드라이브'))
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

function Rental({ onNavigate, onClose  }) {
  const { user } = useContext(UserContext);
  const [isDarkMode, setIsDarkMode] = useState(window.matchMedia('(prefers-color-scheme: dark)').matches);
  const [cars, setCars] = useState([]);
  const [filteredCars, setFilteredCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('nameAsc');
  const [page, setPage] = useState(1);
  const [itemsPerPage] = useState(6);
  const [selectedCar, setSelectedCar] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  const [openRecommendationDialog, setOpenRecommendationDialog] = useState(false);
  const [filters, setFilters] = useState({
    carTypes: [],
    carBrands: [],
    minRentalFee: '0',
    maxRentalFee: '1000000',
    selectedTags: []
  });
  const [tempFilters, setTempFilters] = useState(filters);
  const [rentalFeeRange, setRentalFeeRange] = useState([0, 1000000]);
  const [tempRentalFeeRange, setTempRentalFeeRange] = useState([0, 1000000]);
  const [rentalData, setRentalData] = useState({
    startTime: new Date(),
    endTime: new Date(new Date().setDate(new Date().getDate() + 1)),
    guestName: '',
    address: '',
    tags: []
  });
  const [recommendationData, setRecommendationData] = useState({
    tags: [],
    address: '',
    startTime: null,
    endTime: null
  });

  // 모든 차량의 태그를 수집
  const allTags = React.useMemo(() => {
    const tags = cars.flatMap(car => 
      (car.tags || [])
        .filter(tag => tag !== '도심 드라이브' && tag !== '#도심 드라이브' && tag.trim() !== '')
    );
    return [...new Set(tags)].sort((a, b) => a.localeCompare(b, 'ko'));
  }, [cars]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleDarkModeChange = (e) => setIsDarkMode(e.matches);
    mediaQuery.addEventListener('change', handleDarkModeChange);
    return () => mediaQuery.removeEventListener('change', handleDarkModeChange);
  }, []);

  useEffect(() => {
    fetchCars();
  }, []);

  useEffect(() => {
    filterCars();
  }, [filters, cars]);

  const fetchCars = async () => {
    try {
      setLoading(true);
      const querySnapshot = await getDocs(collection(db, 'registrations'));
      const carsList = querySnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        .filter(car => {
          const requiredFields = {
            carNumber: '차량번호',
            carName: '차량명',
            carBrand: '제조사',
            carType: '차종',
            rentalFee: '대여료',
            hostID: '호스트 ID',
            hostName: '호스트 이름'
          };

          const isValid = Object.entries(requiredFields).every(([field, label]) => {
            const value = car[field];
            if (!value || value.toString().trim() === '') {
              console.warn(`유효하지 않은 차량 데이터: ${label} 누락 (차량번호: ${car.carNumber || '알 수 없음'})`);
              return false;
            }
            return true;
          });

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

    if (filters.carTypes.length > 0) {
      filtered = filtered.filter(car => filters.carTypes.includes(car.carType));
    }

    if (filters.carBrands.length > 0) {
      filtered = filtered.filter(car => filters.carBrands.includes(car.carBrand));
    }

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

    if (filters.selectedTags.length > 0) {
      filtered = filtered.filter(car => {
        const carTags = (car.tags || []).filter(tag => tag !== '도심 드라이브');
        return filters.selectedTags.every(tag => carTags.includes(tag));
      });
    }

    setFilteredCars(filtered);
  };

  const handleSearch = () => {
    const searchTerm = searchQuery.toLowerCase().trim();
    if (!searchTerm) {
      setFilteredCars(cars);
      return;
    }

    const searchResults = cars.filter(car => {
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

  const handleSortChange = (event) => {
    const newSortOrder = event.target.value;
    setSortOrder(newSortOrder);
    
    let sorted = [...filteredCars];
    
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
    
    setFilteredCars(sorted);
  };

  const handleRentClick = (car) => {
    setSelectedCar(car);
    setRentalData({
      startTime: new Date(),
      endTime: new Date(new Date().setDate(new Date().getDate() + 1)),
      guestName: '',
      address: '',
      tags: []
    });
    setOpenDialog(true);
  };

const handleRentalSubmit = async () => {
  if (!user) {
    setError('로그인이 필요합니다.');
    return;
  }

  try {
    const now = new Date();
    const koreanTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));

    const formatTime =
      String(koreanTime.getFullYear()).slice(-2) + '-' +
      String(koreanTime.getMonth() + 1).padStart(2, '0') + '-' +
      String(koreanTime.getDate()).padStart(2, '0') + ' ' +
      String(koreanTime.getHours()).padStart(2, '0') + ':' +
      String(koreanTime.getMinutes()).padStart(2, '0') + ':' +
      String(koreanTime.getSeconds()).padStart(2, '0');

    const startDate = new Date(rentalData.startTime);
    const endDate = new Date(rentalData.endTime);
    const rentalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

    const rentalFee = parseInt(selectedCar.rentalFee);
    const totalFee = rentalFee * rentalDays;

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

    const docId = `${user.uid}.${selectedCar.carNumber}.${formatTime}`;
    await setDoc(doc(db, 'requests', docId), rentalRequest);

    setOpenDialog(false); // 1. 기존 대여 모달 닫기

    setRentalData({
      startTime: new Date(),
      endTime: new Date(new Date().setDate(new Date().getDate() + 1)),
      guestName: '',
      address: '',
      tags: []
    });
    setSelectedCar(null);

    setRecommendationData({
      tags: rentalData.tags || [],
      address: rentalData.address || '',
      startTime: rentalData.startTime,
      endTime: rentalData.endTime
    });

    // 2. 대여 모달이 닫히는 효과를 위해 약간의 딜레이(자연스러움, 0.3초 권장)
    setTimeout(() => {
        setOpenRecommendationDialog(true);
        setSuccess("대여 요청이 성공적으로 등록되었습니다.");
      }, 30);
    } catch (err) {
      setError("대여 요청 등록에 실패했습니다.");
    }
  }

  const getCurrentPageCars = () => {
    const startIndex = (page - 1) * itemsPerPage;
    return filteredCars.slice(startIndex, startIndex + itemsPerPage);
  };

  const getPageInfo = () => {
    const totalPages = Math.ceil(filteredCars.length / itemsPerPage);
    return `${page} / ${totalPages} 페이지`;
  };

  const calculateTotalFee = () => {
    if (!selectedCar || !rentalData.startTime || !rentalData.endTime) return 0;
    
    const startDate = new Date(rentalData.startTime);
    const endDate = new Date(rentalData.endTime);
    
    const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
    
    const rentalDays = Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;
    const rentalFee = parseInt(selectedCar.rentalFee);
    
    return rentalFee * rentalDays;
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

  return (
    <div className={`rental-container ${isDarkMode ? 'dark' : ''}`}
    data-testid="rental-page">
      <button
        className={`modalclose-button ${isDarkMode ? 'dark' : ''}`}
        onClick = {onClose}
      >
        X
      </button>
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
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
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
                  onTagClick={(tag) => {
                    const newTags = filters.selectedTags.includes(tag)
                      ? filters.selectedTags.filter(t => t !== tag)
                      : [...filters.selectedTags, tag];
                    setFilters({ ...filters, selectedTags: newTags });
                  }}
                  isDarkMode={isDarkMode}
                />
              ))}
            </div>
            {filteredCars.length > 0 && (
              <div className="pagination-wrapper">
                <div className="pagination">
                  <button
                    className="page-button"
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                  >
                    이전
                  </button>
                  <button
                    className="page-button"
                    onClick={() => setPage(Math.min(Math.ceil(filteredCars.length / itemsPerPage), page + 1))}
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

      {openDialog && !openRecommendationDialog && selectedCar && (
        <div className="rental-dialog-overlay">
          <div className={`rental-dialog ${isDarkMode ? 'dark' : ''}`}>
            <div className="rental-dialog-header">
              <h2>차량 등록</h2>
              <button className="close-button" onClick={() => setOpenDialog(false)}>×</button>
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
                <label htmlFor="guestName">대여자 이름</label>
                <input
                  id="guestName"
                  type="text"
                  value={rentalData.guestName}
                  onChange={(e) => setRentalData({ ...rentalData, guestName: e.target.value })}
                  placeholder="대여자 이름을 입력하세요"
                />
              </div>
              <div className="input-group">
                <label htmlFor="address">목적지</label>
                <input
                  id="address"
                  type="text"
                  value={rentalData.address}
                  onChange={(e) => setRentalData({ ...rentalData, address: e.target.value })}
                  placeholder="목적지를 입력하세요"
                />
              </div>
              <div className="input-group">
                <label>대여 기간</label>
                <div className="date-inputs">
                  <input
                    type="datetime-local"
                    value={rentalData.startTime.toISOString().slice(0, 16)}
                    onChange={(e) => setRentalData({ ...rentalData, startTime: new Date(e.target.value) })}
                  />
                  <span>~</span>
                  <input
                    type="datetime-local"
                    value={rentalData.endTime.toISOString().slice(0, 16)}
                    onChange={(e) => setRentalData({ ...rentalData, endTime: new Date(e.target.value) })}
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
                        onClick={() => {
                          const newTags = rentalData.tags.includes(tag)
                            ? rentalData.tags.filter(t => t !== tag)
                            : [...rentalData.tags, tag];
                          setRentalData({ ...rentalData, tags: newTags });
                        }}
                      >
                        {tag}
                      </button>
                    ))}
                </div>
              </div>
            </div>
            <div className="rental-dialog-actions">
              <button className="cancel-button" onClick={() => setOpenDialog(false)}>취소</button>
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

{openRecommendationDialog &&
        ((
          <div className="modal-overlay">
            <div
              className="modal"
              style={{
                width: "1200px",
                height: "700px",
                maxWidth: "98vw",
                maxHeight: "95vh",
                minWidth: "750px",
                minHeight: "450px",
                padding: 0,
                display: "flex",
                flexDirection: "column",
                position: "relative",
                boxSizing: "border-box", overflow: "hidden"
              }}
            >
              <button
                className="close-button"
                style={{
                  fontSize: "2.1rem",
                  fontWeight: 800,
                  color: "#fff",
                  background: "rgba(3, 3, 247, 0.18)",
                  position: "absolute",
                  top: 18,
                  right: 26,
                  zIndex: 9999,
                  lineHeight: 1,
                  border: "none",
                  cursor: "pointer",
                }}
                onClick={() => setOpenRecommendationDialog(false)}
                aria-label="장소 추천 모달 닫기"
              >
                ×
              </button>

              <PlaceRecommendation
                isDarkMode={isDarkMode}
                address={recommendationData.address}
                tags={recommendationData.tags}
              />
            </div>
          </div>
        ))}
    </div>
  );
}

export default Rental;