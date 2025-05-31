import React, { useState, useEffect, useContext } from 'react';
import { 
  Container, 
  Grid, 
  Card, 
  CardContent, 
  Typography, 
  Button, 
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Box,
  Chip,
  Stack,
  CircularProgress,
  Paper,
  InputAdornment,
  Pagination,
  MenuItem,
  Slider,
  FormControl,
  Select,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { collection, getDocs, addDoc, query, where, doc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { UserContext } from '../../UserContext';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebase';
import '../../styles/Rental.css';
import FilterListIcon from '@mui/icons-material/FilterList';
import PlaceRecommendation from "../recommendation/PlaceRecommendation";
import { DatePicker, TimePicker } from '@mui/x-date-pickers';
import { useNavigate } from 'react-router-dom';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import { Link } from 'react-router-dom';

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

function CarCard({ car, onRent, onCancel, onReturn, onExtend, onReview, onReport, onDelete, onEdit, onTagClick, isDarkMode }) {
  return (
    <Card className={`car-card ${isDarkMode ? 'dark' : 'light'}`}>
      <CardContent className={isDarkMode ? 'dark' : 'light'}>
        <Box className="car-info">
          <Box className="car-header">
            <Box className="car-title-section">
              <Typography variant="h5" component="h2" className="car-name">
                {car.carName}
              </Typography>
              <Typography variant="subtitle1" color="primary" className="car-fee">
                {car.rentalFee}원/일
              </Typography>
            </Box>
            <Box className="car-details">
              <Box className="car-detail-item">
                <Typography variant="body2" color="textSecondary" className="detail-label">
                  차량번호
                </Typography>
                <Typography variant="body1" className="detail-value">
                  {car.carNumber}
                </Typography>
              </Box>
              <Box className="car-detail-item">
                <Typography variant="body2" color="textSecondary" className="detail-label">
                  제조사
                </Typography>
                <Typography variant="body1" className="detail-value">
                  {car.carBrand}
                </Typography>
              </Box>
              <Box className="car-detail-item">
                <Typography variant="body2" color="textSecondary" className="detail-label">
                  분류
                </Typography>
                <Typography variant="body1" className="detail-value">
                  {car.carType}
                </Typography>
              </Box>
            </Box>
          </Box>
          <Box className="car-tags">
            <Stack 
              direction="row" 
              spacing={1} 
              flexWrap="wrap" 
              useFlexGap 
              className="tag-stack"
            >
              {car.tags && car.tags.map((tag, index) => (
                <Chip 
                  key={index} 
                  label={tag} 
                  size="small" 
                  className="tag-chip" 
                  onClick={() => onTagClick(tag)}
                  variant="outlined"
                />
              ))}
            </Stack>
          </Box>
        </Box>
        <Box className="car-actions">
          <Button
            variant="contained"
            color="primary"
            onClick={() => onRent(car)}
            className="rent-button"
            disabled={!onRent}
            size="large"
          >
            대여하기
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
}

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

  // 도심 드라이브 태그를 완전히 제거하고 정렬
  const filteredTags = React.useMemo(() => {
    return allTags
      .filter(tag => tag !== '도심 드라이브' && tag.trim() !== '')
      .sort((a, b) => a.localeCompare(b, 'ko'));
  }, [allTags]);

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
    <Dialog 
      open={open} 
      onClose={onClose}
      className={`filter-dialog ${isDarkMode ? 'dark' : ''}`}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>필터</DialogTitle>
      <DialogContent>
        <Box className="filter-section">
          <Typography className="filter-section-title">차량 분류</Typography>
          <Box className="tag-group">
            {carTypes.map((type) => {
              const isSelected = tempFilters.carTypes.includes(type);
              return (
                <Chip
                  key={type}
                  label={type}
                  size="small"
                  onClick={() => handleCategoryClick(type)}
                  className="tag-chip"
                  variant={isSelected ? "filled" : "outlined"}
                  color={isSelected ? "primary" : "default"}
                  sx={{
                    '&:hover': {
                      backgroundColor: isSelected ? 'primary.dark' : 'action.hover',
                    }
                  }}
                />
              );
            })}
          </Box>
        </Box>

        <Box className="filter-section">
          <Typography className="filter-section-title">제조사</Typography>
          <Box className="tag-group">
            {carBrands.map((brand) => {
              const isSelected = tempFilters.carBrands.includes(brand);
              return (
                <Chip
                  key={brand}
                  label={brand}
                  size="small"
                  onClick={() => handleBrandClick(brand)}
                  className="tag-chip"
                  variant={isSelected ? "filled" : "outlined"}
                  color={isSelected ? "primary" : "default"}
                  sx={{
                    '&:hover': {
                      backgroundColor: isSelected ? 'primary.dark' : 'action.hover',
                    }
                  }}
                />
              );
            })}
          </Box>
        </Box>

        <Box className="filter-section">
          <Typography className="filter-section-title">대여료</Typography>
          <Box sx={{ 
            px: 2, 
            mb: 2,
            width: '90%',
            mx: 'auto'
          }}>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', width: '90%', mx: 'auto' }}>
              <TextField
                className="rental-fee-input"
                label="최소 금액"
                type="number"
                value={tempRentalFeeRange[0]}
                onChange={(e) => {
                  const value = Math.max(0, Math.min(1000000, Number(e.target.value)));
                  setTempRentalFeeRange([value, tempRentalFeeRange[1]]);
                }}
                InputProps={{
                  endAdornment: <InputAdornment position="end" sx={{ mr: 1, mt: 2 }}>원</InputAdornment>,
                  inputProps: { 
                    style: { textAlign: 'right', paddingRight: '8px' }
                  }
                }}
                sx={{
                  '& .MuiInputBase-root': {
                    height: '48px'
                  },
                  '& .MuiOutlinedInput-root:hover': {
                    backgroundColor: 'transparent'
                  },
                  '& .MuiOutlinedInput-root.Mui-focused': {
                    boxShadow: 'none',
                    backgroundColor: 'transparent'
                  },
                  '& .MuiInputLabel-root.Mui-focused': {
                    color: 'inherit'
                  }
                }}
              />
              <Typography>-</Typography>
              <TextField
                className="rental-fee-input"
                label="최대 금액"
                type="number"
                value={tempRentalFeeRange[1]}
                onChange={(e) => {
                  const value = Math.max(0, Math.min(1000000, Number(e.target.value)));
                  setTempRentalFeeRange([tempRentalFeeRange[0], value]);
                }}
                InputProps={{
                  endAdornment: <InputAdornment position="end" sx={{ mr: 1, mt: 2 }}>원</InputAdornment>,
                  inputProps: { 
                    style: { textAlign: 'right', paddingRight: '8px' }
                  }
                }}
                sx={{
                  '& .MuiInputBase-root': {
                    height: '48px'
                  },
                  '& .MuiOutlinedInput-root:hover': {
                    backgroundColor: 'transparent'
                  },
                  '& .MuiOutlinedInput-root.Mui-focused': {
                    boxShadow: 'none',
                    backgroundColor: 'transparent'
                  },
                  '& .MuiInputLabel-root.Mui-focused': {
                    color: 'inherit'
                  }
                }}
              />
            </Box>
            <Slider
              value={tempRentalFeeRange}
              onChange={(_, newValue) => setTempRentalFeeRange(newValue)}
              valueLabelDisplay="auto"
              min={0}
              max={1000000}
              step={10000}
              defaultValue={[0, 1000000]}
              valueLabelFormat={(value) => `${value.toLocaleString()}원`}
              marks={[
                { value: 0, label: '0원' },
                { value: 1000000, label: '100만원' }
              ]}
              sx={{
                '& .MuiSlider-thumb': {
                  width: 20,
                  height: 20,
                },
                '& .MuiSlider-track': {
                  height: 4,
                },
                '& .MuiSlider-rail': {
                  height: 4,
                },
                '& .MuiSlider-mark': {
                  height: 8,
                  width: 2,
                  '&.MuiSlider-markActive': {
                    opacity: 1,
                    backgroundColor: 'currentColor',
                  },
                },
                '& .MuiSlider-markLabel': {
                  fontSize: '0.75rem',
                },
              }}
            />
          </Box>
        </Box>

        <Box className="filter-section">
          <Typography className="filter-section-title">태그</Typography>
          <Box className="tag-group">
            {filteredTags.map((tag) => {
              const isSelected = tempFilters.selectedTags.includes(tag);
              return (
                <Chip
                  key={tag}
                  label={tag}
                  size="small"
                  onClick={() => handleTagClick(tag)}
                  className="tag-chip"
                  variant={isSelected ? "filled" : "outlined"}
                  color={isSelected ? "primary" : "default"}
                  sx={{
                    '&:hover': {
                      backgroundColor: isSelected ? 'primary.dark' : 'action.hover',
                    }
                  }}
                />
              );
            })}
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>취소</Button>
        <Button 
          onClick={() => {
            setFilters({
              ...tempFilters,
              selectedTags: [...tempFilters.selectedTags]
            });
            setRentalFeeRange([...tempRentalFeeRange]);
            onApply();
          }} 
          variant="contained"
        >
          적용
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function Rental({ isDarkMode }) {
  const { user } = useContext(UserContext);
  const [cars, setCars] = useState([]);
  const [filteredCars, setFilteredCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedCar, setSelectedCar] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [rentalData, setRentalData] = useState({
    startTime: new Date(),
    endTime: new Date(new Date().setDate(new Date().getDate() + 1)),
    guestName: '',
    address: '',
    tags: []
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  const [recommendationData, setRecommendationData] = useState({
    tags: [],
    address: ''
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
  const navigate = useNavigate();
  const [sortOrder, setSortOrder] = useState('nameAsc');

  // 모든 차량의 태그를 수집하고 '도심 드라이브' 제외 (정렬 추가)
  const allTags = React.useMemo(() => {
    return [...new Set(cars.flatMap(car => 
      (car.tags || [])
        .filter(tag => tag !== '도심 드라이브' && tag.trim() !== '')
    ))].sort((a, b) => a.localeCompare(b, 'ko'));
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
      const carsList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
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
    return filteredCars.slice(startIndex, endIndex);
  };

  const getPageInfo = () => {
    const totalPages = Math.ceil(filteredCars.length / itemsPerPage);
    return `${page} / ${totalPages} 페이지`;
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
      
      handleCloseDialog();
      setSuccess('대여 요청이 성공적으로 등록되었습니다.');
      
      // 장소 추천을 위한 데이터 설정 및 다이얼로그 열기
      console.log('대여 주소:', rentalData.address);
      setRecommendationData({
        tags: rentalData.tags,
        address: rentalData.address
      });
      setOpenRecommendationDialog(true);
    } catch (err) {
      console.error('대여 요청 실패:', err);
      setError('대여 요청 등록에 실패했습니다.');
    }
  };

  // 정렬 옵션 핸들러 수정
  const handleSortChange = (event) => {
    setSortOrder(event.target.value);
    let sortedCars = [...cars];
    
    switch (event.target.value) {
      case 'numberAsc':
        sortedCars.sort((a, b) => (a.carNumber || '').localeCompare(b.carNumber || ''));
        break;
      case 'numberDesc':
        sortedCars.sort((a, b) => (b.carNumber || '').localeCompare(a.carNumber || ''));
        break;
      case 'nameAsc':
        sortedCars.sort((a, b) => koreanFirstSort(a.carName, b.carName));
        break;
      case 'nameDesc':
        sortedCars.sort((a, b) => koreanFirstSort(b.carName, a.carName));
        break;
      case 'priceAsc':
        sortedCars.sort((a, b) => (parseInt(a.rentalFee) || 0) - (parseInt(b.rentalFee) || 0));
        break;
      case 'priceDesc':
        sortedCars.sort((a, b) => (parseInt(b.rentalFee) || 0) - (parseInt(a.rentalFee) || 0));
        break;
      default:
        // 기본 정렬 (차량 이름 오름차순)
        sortedCars.sort((a, b) => koreanFirstSort(a.carName, b.carName));
    }
    setCars(sortedCars);
  };

  // 컴포넌트 마운트 시 초기 정렬 적용
  useEffect(() => {
    if (cars.length > 0) {
      const sortedCars = [...cars].sort((a, b) => koreanFirstSort(a.carName, b.carName));
      setCars(sortedCars);
    }
  }, []); // 컴포넌트 마운트 시 한 번만 실행

  return (
    <Container className={`rental-container ${isDarkMode ? 'dark' : ''}`}>
      <Paper className={`rental-paper ${isDarkMode ? 'dark' : ''}`}>
        <Box className={`rental-header ${isDarkMode ? 'dark' : ''}`}>
          <Typography variant="h4" className={`rental-title ${isDarkMode ? 'dark' : ''}`}>
            차량 대여
          </Typography>
          <Button
            component={Link}
            to="/registration"
            variant="contained"
            color="primary"
            className={`registration-link-button ${isDarkMode ? 'dark' : ''}`}
          >
            차량 등록
          </Button>
        </Box>

        {/* 검색 및 필터 영역 */}
        <div className="search-filter-container">
          <div className="search-group">
            <TextField
              className={`search-field ${isDarkMode ? 'dark' : ''}`}
              placeholder="차량 검색"
              value={searchQuery}
              onChange={handleSearchChange}
              onKeyPress={handleKeyPress}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
            <Button
              variant="contained"
              color="primary"
              onClick={handleSearch}
              className="search-button"
            >
              검색
            </Button>
          </div>
        </div>

        {/* 정렬 및 필터 영역 */}
        <div className="sort-filter-row">
          <FormControl className="sort-select" sx={{ minWidth: 'auto', width: 'auto' }}>
            <Select
              value={sortOrder}
              onChange={handleSortChange}
              displayEmpty
              className={isDarkMode ? 'dark' : ''}
              sx={{ 
                '& .MuiSelect-select': {
                  paddingRight: '32px !important'
                }
              }}
            >
              <MenuItem value="numberAsc" sx={{ whiteSpace: 'nowrap' }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Typography>차량 번호</Typography>
                  <Typography sx={{ ml: 0.5 }}>(</Typography>
                  <Typography sx={{ ml: 0.5 }}>오름차순</Typography>
                  <ArrowUpwardIcon fontSize="small" sx={{ mx: 0.5 }} />
                  <Typography>)</Typography>
                </Box>
              </MenuItem>
              <MenuItem value="numberDesc" sx={{ whiteSpace: 'nowrap' }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Typography>차량 번호</Typography>
                  <Typography sx={{ ml: 0.5 }}>(</Typography>
                  <Typography sx={{ ml: 0.5 }}>내림차순</Typography>
                  <ArrowDownwardIcon fontSize="small" sx={{ mx: 0.5 }} />
                  <Typography>)</Typography>
                </Box>
              </MenuItem>
              <MenuItem value="nameAsc" sx={{ whiteSpace: 'nowrap' }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Typography>차량 이름</Typography>
                  <Typography sx={{ ml: 0.5 }}>(</Typography>
                  <Typography sx={{ ml: 0.5 }}>오름차순</Typography>
                  <ArrowUpwardIcon fontSize="small" sx={{ mx: 0.5 }} />
                  <Typography>)</Typography>
                </Box>
              </MenuItem>
              <MenuItem value="nameDesc" sx={{ whiteSpace: 'nowrap' }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Typography>차량 이름</Typography>
                  <Typography sx={{ ml: 0.5 }}>(</Typography>
                  <Typography sx={{ ml: 0.5 }}>내림차순</Typography>
                  <ArrowDownwardIcon fontSize="small" sx={{ mx: 0.5 }} />
                  <Typography>)</Typography>
                </Box>
              </MenuItem>
              <MenuItem value="priceAsc" sx={{ whiteSpace: 'nowrap' }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Typography>1일 가격</Typography>
                  <Typography sx={{ ml: 0.5 }}>(</Typography>
                  <Typography sx={{ ml: 0.5 }}>오름차순</Typography>
                  <ArrowUpwardIcon fontSize="small" sx={{ mx: 0.5 }} />
                  <Typography>)</Typography>
                </Box>
              </MenuItem>
              <MenuItem value="priceDesc" sx={{ whiteSpace: 'nowrap' }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Typography>1일 가격</Typography>
                  <Typography sx={{ ml: 0.5 }}>(</Typography>
                  <Typography sx={{ ml: 0.5 }}>내림차순</Typography>
                  <ArrowDownwardIcon fontSize="small" sx={{ mx: 0.5 }} />
                  <Typography>)</Typography>
                </Box>
              </MenuItem>
            </Select>
          </FormControl>
          <Button
            variant="outlined"
            onClick={handleOpenFilterDialog}
            className="filter-button"
          >
            필터
          </Button>
        </div>

        {/* 필터 다이얼로그 */}
        <FilterDialog
          open={filterDialogOpen}
          onClose={() => setFilterDialogOpen(false)}
          onApply={() => setFilterDialogOpen(false)}
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

        {/* 차량 목록 */}
        {loading ? (
          <Box className={`loading-container ${isDarkMode ? 'dark' : 'light'}`}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error" className={`alert ${isDarkMode ? 'dark' : 'light'}`}>{error}</Alert>
        ) : (
          <Box className={`car-list-container ${isDarkMode ? 'dark' : 'light'}`}>
            <Grid container spacing={3}>
              {getCurrentPageCars().map((car) => (
                <Grid item xs={12} key={car.id}>
                  <CarCard
                    car={{
                      ...car,
                      tags: (car.tags || []).filter(tag => tag !== '도심 드라이브')  // 차량 카드에서도 도심 드라이브 태그 제거
                    }}
                    onRent={handleRentClick}
                    onTagClick={handleTagClick}
                    isDarkMode={isDarkMode}
                  />
                </Grid>
              ))}
            </Grid>
            {filteredCars.length === 0 && (
              <Alert severity="info" className={`alert ${isDarkMode ? 'dark' : 'light'}`}>
                검색 결과가 없습니다.
              </Alert>
            )}
            {filteredCars.length > 0 && (
              <Box className={`pagination-container ${isDarkMode ? 'dark' : 'light'}`}>
                <Box className="pagination-wrapper">
                  <Pagination
                    count={Math.ceil(filteredCars.length / itemsPerPage)}
                    page={page}
                    onChange={handlePageChange}
                    color="primary"
                    size="large"
                    showFirstButton
                    showLastButton
                    siblingCount={1}
                    boundaryCount={1}
                  />
                  <Typography className="pagination-info">
                    {getPageInfo()}
                  </Typography>
                </Box>
              </Box>
            )}
          </Box>
        )}

        {/* 대여 다이얼로그 */}
        <Dialog
          open={openDialog}
          onClose={handleCloseDialog}
          className={`rental-dialog ${isDarkMode ? 'dark' : ''}`}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: {
              backgroundColor: isDarkMode ? 'var(--dark-background-color)' : 'var(--background-color)',
              color: isDarkMode ? 'var(--dark-text-color)' : 'var(--text-color)'
            }
          }}
        >
          <DialogTitle className="filter-section-title" sx={{ 
            color: isDarkMode ? 'var(--dark-text-color)' : 'var(--text-color)',
            borderBottom: `1px solid ${isDarkMode ? 'var(--dark-border-color)' : 'var(--border-color)'}`
          }}>
            차량 대여
          </DialogTitle>
          <DialogContent>
            {error && <Alert severity="error" className="alert">{error}</Alert>}
            <Box className="filter-section" sx={{ 
              borderBottom: `1px solid ${isDarkMode ? 'var(--dark-border-color)' : 'var(--border-color)'}`
            }}>
              <Typography className="filter-section-title" sx={{ 
                color: isDarkMode ? 'var(--dark-text-color)' : 'var(--text-color)'
              }}>
                차량 정보
              </Typography>
              <Box sx={{ 
                backgroundColor: isDarkMode ? 'var(--dark-background-color-light)' : 'var(--background-color-light)',
                padding: '1rem',
                borderRadius: '8px',
                mb: 2
              }}>
                <Typography variant="h6" gutterBottom sx={{ 
                  color: isDarkMode ? 'var(--dark-text-color)' : 'var(--text-color)'
                }}>
                  {selectedCar?.carName}
                </Typography>
                <Typography sx={{ 
                  color: isDarkMode ? 'var(--dark-text-secondary)' : 'var(--text-secondary)',
                  mb: 1
                }}>
                  차량번호: {selectedCar?.carNumber}
                </Typography>
                <Typography sx={{ 
                  color: isDarkMode ? 'var(--dark-text-secondary)' : 'var(--text-secondary)',
                  mb: 1
                }}>
                  대여료: {selectedCar?.rentalFee}원/일
                </Typography>
                {rentalData.startTime && rentalData.endTime && (
                  <Typography 
                    sx={{ 
                      mt: 1, 
                      fontWeight: 600,
                      fontSize: '1.1rem',
                      color: isDarkMode ? 'var(--color-accent)' : 'var(--color-primary)'
                    }}
                  >
                    총 대여료: {(() => {
                      const startDate = new Date(rentalData.startTime);
                      const endDate = new Date(rentalData.endTime);
                      const rentalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
                      const totalFee = parseInt(selectedCar?.rentalFee) * rentalDays;
                      return `${totalFee.toLocaleString()}원`;
                    })()}
                  </Typography>
                )}
              </Box>
            </Box>

            <Box className="filter-section" sx={{ 
              borderBottom: `1px solid ${isDarkMode ? 'var(--dark-border-color)' : 'var(--border-color)'}`
            }}>
              <Typography className="filter-section-title" sx={{ 
                color: isDarkMode ? 'var(--dark-text-color)' : 'var(--text-color)'
              }}>
                대여자 정보
              </Typography>
              <TextField
                fullWidth
                label="대여자 이름"
                name="guestName"
                value={rentalData.guestName}
                onChange={handleInputChange}
                required
                sx={{
                  '& .MuiOutlinedInput-root': {
                    height: '48px !important',
                    backgroundColor: isDarkMode ? 'var(--dark-input-background)' : 'var(--input-background)',
                    border: `1px solid ${isDarkMode ? 'var(--dark-border-color)' : 'var(--border-color)'}`,
                    borderRadius: 'var(--radius)',
                    '&:hover': {
                      backgroundColor: isDarkMode ? 'var(--color-surface-dark)' : 'var(--color-surface)',
                    },
                    '&.Mui-focused': {
                      backgroundColor: isDarkMode ? 'var(--color-surface-dark)' : 'var(--color-surface)',
                      borderColor: 'var(--color-primary)',
                    }
                  },
                  '& .MuiOutlinedInput-notchedOutline': {
                    display: 'none !important'
                  },
                  '& .MuiInputBase-input': {
                    height: '48px !important',
                    padding: '0 14px !important',
                    color: isDarkMode ? 'var(--dark-text-color)' : 'var(--text-color)'
                  },
                  '& .MuiInputLabel-root': {
                    color: isDarkMode ? 'var(--dark-text-secondary)' : 'var(--text-secondary)',
                    '&.Mui-focused': {
                      color: 'var(--color-primary)'
                    }
                  }
                }}
              />
            </Box>

            <Box className="filter-section" sx={{ 
              borderBottom: `1px solid ${isDarkMode ? 'var(--dark-border-color)' : 'var(--border-color)'}`
            }}>
              <Typography className="filter-section-title" sx={{ 
                color: isDarkMode ? 'var(--dark-text-color)' : 'var(--text-color)'
              }}>
                대여 기간
              </Typography>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <Box sx={{ 
                  display: 'flex', 
                  flexDirection: { xs: 'column', sm: 'row' },
                  gap: 2,
                  mb: 2
                }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography gutterBottom sx={{ 
                      mb: 1,
                      color: isDarkMode ? 'var(--dark-text-color)' : 'var(--text-color)'
                    }}>
                      대여 시작 시간
                    </Typography>
                    <DateTimePicker
                      value={rentalData.startTime}
                      onChange={handleDateChange('startTime')}
                      renderInput={(params) => (
                        <TextField 
                          {...params} 
                          fullWidth
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              height: '48px !important',
                              backgroundColor: isDarkMode ? 'var(--dark-input-background)' : 'var(--input-background)',
                              border: `1px solid ${isDarkMode ? 'var(--dark-border-color)' : 'var(--border-color)'}`,
                              borderRadius: 'var(--radius)',
                              '&:hover': {
                                backgroundColor: isDarkMode ? 'var(--color-surface-dark)' : 'var(--color-surface)',
                              },
                              '&.Mui-focused': {
                                backgroundColor: isDarkMode ? 'var(--color-surface-dark)' : 'var(--color-surface)',
                                borderColor: 'var(--color-primary)',
                              }
                            },
                            '& .MuiOutlinedInput-notchedOutline': {
                              display: 'none !important'
                            },
                            '& .MuiInputBase-input': {
                              height: '48px !important',
                              padding: '0 14px !important',
                              color: isDarkMode ? 'var(--dark-text-color)' : 'var(--text-color)'
                            },
                            '& .MuiInputAdornment-root': {
                              marginRight: '8px',
                              color: isDarkMode ? 'var(--dark-text-secondary)' : 'var(--text-secondary)'
                            },
                            '& .MuiInputLabel-root': {
                              color: isDarkMode ? 'var(--dark-text-secondary)' : 'var(--text-secondary)',
                              '&.Mui-focused': {
                                color: 'var(--color-primary)'
                              }
                            }
                          }}
                        />
                      )}
                    />
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography gutterBottom sx={{ 
                      mb: 1,
                      color: isDarkMode ? 'var(--dark-text-color)' : 'var(--text-color)'
                    }}>
                      대여 종료 시간
                    </Typography>
                    <DateTimePicker
                      value={rentalData.endTime}
                      onChange={handleDateChange('endTime')}
                      minDateTime={rentalData.startTime}
                      renderInput={(params) => (
                        <TextField 
                          {...params} 
                          fullWidth
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              height: '48px !important',
                              backgroundColor: isDarkMode ? 'var(--dark-input-background)' : 'var(--input-background)',
                              border: `1px solid ${isDarkMode ? 'var(--dark-border-color)' : 'var(--border-color)'}`,
                              borderRadius: 'var(--radius)',
                              '&:hover': {
                                backgroundColor: isDarkMode ? 'var(--color-surface-dark)' : 'var(--color-surface)',
                              },
                              '&.Mui-focused': {
                                backgroundColor: isDarkMode ? 'var(--color-surface-dark)' : 'var(--color-surface)',
                                borderColor: 'var(--color-primary)',
                              }
                            },
                            '& .MuiOutlinedInput-notchedOutline': {
                              display: 'none !important'
                            },
                            '& .MuiInputBase-input': {
                              height: '48px !important',
                              padding: '0 14px !important',
                              color: isDarkMode ? 'var(--dark-text-color)' : 'var(--text-color)'
                            },
                            '& .MuiInputAdornment-root': {
                              marginRight: '8px',
                              color: isDarkMode ? 'var(--dark-text-secondary)' : 'var(--text-secondary)'
                            },
                            '& .MuiInputLabel-root': {
                              color: isDarkMode ? 'var(--dark-text-secondary)' : 'var(--text-secondary)',
                              '&.Mui-focused': {
                                color: 'var(--color-primary)'
                              }
                            }
                          }}
                        />
                      )}
                    />
                  </Box>
                </Box>
              </LocalizationProvider>
            </Box>

            <Box className="filter-section" sx={{ 
              borderBottom: `1px solid ${isDarkMode ? 'var(--dark-border-color)' : 'var(--border-color)'}`
            }}>
              <Typography className="filter-section-title" sx={{ 
                color: isDarkMode ? 'var(--dark-text-color)' : 'var(--text-color)'
              }}>
                주소
              </Typography>
              <TextField
                fullWidth
                label="주소"
                name="address"
                value={rentalData.address}
                onChange={handleInputChange}
                required
                sx={{
                  '& .MuiOutlinedInput-root': {
                    height: '48px !important',
                    backgroundColor: isDarkMode ? 'var(--dark-input-background)' : 'var(--input-background)',
                    border: `1px solid ${isDarkMode ? 'var(--dark-border-color)' : 'var(--border-color)'}`,
                    borderRadius: 'var(--radius)',
                    '&:hover': {
                      backgroundColor: isDarkMode ? 'var(--color-surface-dark)' : 'var(--color-surface)',
                    },
                    '&.Mui-focused': {
                      backgroundColor: isDarkMode ? 'var(--color-surface-dark)' : 'var(--color-surface)',
                      borderColor: 'var(--color-primary)',
                    }
                  },
                  '& .MuiOutlinedInput-notchedOutline': {
                    display: 'none !important'
                  },
                  '& .MuiInputBase-input': {
                    height: '48px !important',
                    padding: '0 14px !important',
                    color: isDarkMode ? 'var(--dark-text-color)' : 'var(--text-color)'
                  },
                  '& .MuiInputLabel-root': {
                    color: isDarkMode ? 'var(--dark-text-secondary)' : 'var(--text-secondary)',
                    '&.Mui-focused': {
                      color: 'var(--color-primary)'
                    }
                  }
                }}
              />
            </Box>

            <Box className="filter-section">
              <Typography className="filter-section-title" sx={{ 
                color: isDarkMode ? 'var(--dark-text-color)' : 'var(--text-color)'
              }}>
                태그
              </Typography>
              <Box className="tag-group" sx={{ gap: '0.75rem' }}>
                {selectedCar?.tags?.filter(tag => tag !== '도심 드라이브').map((tag) => (
                  <Chip
                    key={tag}
                    label={tag}
                    onClick={() => handleTagClick(tag)}
                    color={rentalData.tags.includes(tag) ? "primary" : "default"}
                    size="small"
                    className="tag-chip"
                    variant={rentalData.tags.includes(tag) ? "filled" : "outlined"}
                    sx={{
                      '&:hover': {
                        backgroundColor: rentalData.tags.includes(tag) ? 'primary.dark' : 'action.hover',
                      },
                      margin: '0.25rem',
                      backgroundColor: isDarkMode ? 'var(--dark-background-color-light)' : 'var(--background-color-light)',
                      color: isDarkMode ? 'var(--dark-text-color)' : 'var(--text-color)',
                      borderColor: isDarkMode ? 'var(--dark-border-color)' : 'var(--border-color)',
                      '&.MuiChip-colorPrimary': {
                        backgroundColor: 'var(--color-primary)',
                        color: 'white'
                      }
                    }}
                  />
                ))}
              </Box>
            </Box>
          </DialogContent>
          <DialogActions sx={{ 
            padding: '1rem 1.5rem',
            borderTop: `1px solid ${isDarkMode ? 'var(--dark-border-color)' : 'var(--border-color)'}`,
            backgroundColor: isDarkMode ? 'var(--dark-background-color)' : 'var(--background-color)'
          }}>
            <Button 
              onClick={handleCloseDialog}
              sx={{ 
                minWidth: '100px',
                padding: '0.5rem 1.5rem',
                borderRadius: 'var(--radius)',
                fontWeight: 500,
                color: isDarkMode ? 'var(--dark-text-color)' : 'var(--text-color)',
                borderColor: isDarkMode ? 'var(--dark-border-color)' : 'var(--border-color)',
                '&:hover': {
                  backgroundColor: isDarkMode ? 'var(--color-surface-dark)' : 'var(--color-surface)',
                  borderColor: isDarkMode ? 'var(--dark-border-color)' : 'var(--border-color)'
                }
              }}
            >
              취소
            </Button>
            <Button 
              onClick={handleRentalSubmit} 
              variant="contained" 
              color="primary"
              sx={{ 
                minWidth: '100px',
                padding: '0.5rem 1.5rem',
                borderRadius: 'var(--radius)',
                fontWeight: 500,
                backgroundColor: 'var(--color-primary)',
                '&:hover': {
                  backgroundColor: 'var(--color-accent)'
                }
              }}
            >
              대여 신청
            </Button>
          </DialogActions>
        </Dialog>

        {/* 장소 추천 다이얼로그 */}
        <Dialog
          open={openRecommendationDialog}
          onClose={() => setOpenRecommendationDialog(false)}
          maxWidth="md"
          fullWidth
        >
          <PlaceRecommendation
            isDarkMode={isDarkMode}
            address={recommendationData.address}
            tags={recommendationData.tags}
            onClose={() => setOpenRecommendationDialog(false)}
          />
        </Dialog>
      </Paper>
    </Container>
  );
}

export default Rental;