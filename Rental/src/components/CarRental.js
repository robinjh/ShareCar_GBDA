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
  Slider
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { collection, getDocs, addDoc, query, where, doc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { UserContext } from '../UserContext';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import '../styles/CarRental.css';
import FilterListIcon from '@mui/icons-material/FilterList';
import PlaceRecommendation from "./PlaceRecommendation.jsx";
import { DatePicker, TimePicker } from '@mui/x-date-pickers';

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

function CarCard({ car, onRent, onCancel, onReturn, onExtend, onReview, onReport, onDelete, onEdit, onTagClick }) {
  return (
    <Card className="car-card" sx={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      minHeight: '400px'
    }}>
      <CardContent sx={{ 
        flexGrow: 1, 
        display: 'flex', 
        flexDirection: 'column',
        height: '100%'
      }}>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h5" component="h2" gutterBottom>
            {car.carName}
          </Typography>
          <Typography color="textSecondary" gutterBottom>
            차량번호: {car.carNumber}
          </Typography>
          <Typography color="textSecondary" gutterBottom>
            분류: {car.carType}
          </Typography>
          <Typography color="textSecondary" gutterBottom>
            제조사: {car.carBrand}
          </Typography>
          <Typography variant="h6" color="primary" gutterBottom>
            대여료: {car.rentalFee}원/일
          </Typography>
          <Stack 
            direction="row" 
            spacing={1} 
            flexWrap="wrap" 
            useFlexGap 
            className="tag-stack" 
            sx={{ 
              mb: 2,
              minHeight: '60px',
              alignItems: 'flex-start'
            }}
          >
            {car.tags && car.tags.map((tag, index) => (
              <Chip key={index} label={tag} size="small" className="tag-chip" onClick={() => onTagClick(tag)} />
            ))}
          </Stack>
        </Box>
        <Button
          variant="contained"
          color="primary"
          fullWidth
          onClick={() => onRent(car)}
          className="rent-button"
          disabled={!onRent}
        >
          대여하기
        </Button>
      </CardContent>
    </Card>
  );
}

function CarRental() {
  const { user } = useContext(UserContext);
  const [cars, setCars] = useState([]);
  const [filteredCars, setFilteredCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCar, setSelectedCar] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [rentalData, setRentalData] = useState({
    startTime: new Date(),
    endTime: new Date(new Date().setDate(new Date().getDate() + 1)),
    guestName: '',
    address: '',
    tags: []
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  const [recommendationData, setRecommendationData] = useState({
    tags: [],
    address: ''
  });
  const [openRecommendationDialog, setOpenRecommendationDialog] = useState(false);
  const [page, setPage] = useState(1);
  const itemsPerPage = 6;
  const [filters, setFilters] = useState({
    carType: '',
    carBrand: '',
    minRentalFee: '',
    maxRentalFee: '',
    selectedTags: []
  });
  const [rentalFeeRange, setRentalFeeRange] = useState([0, 100]);
  const [tempFilters, setTempFilters] = useState({
    carType: '',
    carBrand: '',
    minRentalFee: '',
    maxRentalFee: '',
    selectedTags: []
  });
  const [tempRentalFeeRange, setTempRentalFeeRange] = useState([0, 100]);
  const requestsRef = collection(db, 'requests');

  // 모든 차량의 태그를 수집
  const allTags = [...new Set(cars.flatMap(car => car.tags || []))];

  // 로그 스케일 변환 함수
  const logScale = (value) => {
    if (value === 0) return 0;
    // 0-75 범위를 0-200,000 범위로 변환
    if (value <= 75) {
      // 0-50 범위를 0-50,000 범위로 변환 (50 지점에서 5만원)
      if (value <= 50) {
        return Math.round((value / 50) * 50000);
      }
      // 50-75 범위를 50,000-200,000 범위로 변환
      return Math.round(50000 + ((value - 50) / 25) * 150000);
    }
    // 75-100 범위를 200,000-1,000,000 범위로 변환
    return Math.round(200000 + ((value - 75) / 25) * 800000);
  };

  // 로그 스케일 역변환 함수
  const inverseLogScale = (value) => {
    if (value === 0) return 0;
    // 0-50,000 범위를 0-50 범위로 변환
    if (value <= 50000) {
      return Math.round((value / 50000) * 50);
    }
    // 50,000-200,000 범위를 50-75 범위로 변환
    if (value <= 200000) {
      return Math.round(50 + ((value - 50000) / 150000) * 25);
    }
    // 200,000-1,000,000 범위를 75-100 범위로 변환
    return Math.round(75 + ((value - 200000) / 800000) * 25);
  };

  // 직접 입력값 처리 함수
  const handleRentalFeeInputChange = (type) => (event) => {
    const value = parseInt(event.target.value) || 0;
    const maxValue = 1000000;
    const clampedValue = Math.min(Math.max(0, value), maxValue);
    
    if (type === 'min') {
      const newMin = inverseLogScale(clampedValue);
      const newMax = Math.max(newMin, tempRentalFeeRange[1]);
      setTempRentalFeeRange([newMin, newMax]);
    } else {
      const newMax = inverseLogScale(clampedValue);
      const newMin = Math.min(newMax, tempRentalFeeRange[0]);
      setTempRentalFeeRange([newMin, newMax]);
    }
  };

  useEffect(() => {
    setRentalFeeRange([0, 100]);
    setTempRentalFeeRange([0, 100]);
    setFilters(prev => ({
      ...prev,
      minRentalFee: '0',
      maxRentalFee: '1000000'
    }));
    setTempFilters(prev => ({
      ...prev,
      minRentalFee: '0',
      maxRentalFee: '1000000'
    }));
  }, []);

  useEffect(() => {
    fetchCars();
  }, []);

  useEffect(() => {
    filterCars();
  }, [searchTerm, cars, filters]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, filters]);

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

    // 검색어 필터링
    if (searchTerm) {
      const searchTermLower = searchTerm.toLowerCase();
      filtered = filtered.filter(car => {
        return (
          (car.carName?.toLowerCase() || '').includes(searchTermLower) ||
          (car.carNumber?.toLowerCase() || '').includes(searchTermLower) ||
          (car.carBrand?.toLowerCase() || '').includes(searchTermLower) ||
          (car.carType?.toLowerCase() || '').includes(searchTermLower) ||
          (car.tags?.some(tag => tag.toLowerCase().includes(searchTermLower)) || false)
        );
      });
    }

    // 차종 필터링
    if (filters.carType) {
      filtered = filtered.filter(car => car.carType === filters.carType);
    }

    // 제조사 필터링
    if (filters.carBrand) {
      filtered = filtered.filter(car => car.carBrand === filters.carBrand);
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

    // 태그 필터링
    if (filters.selectedTags.length > 0) {
      filtered = filtered.filter(car => 
        filters.selectedTags.every(tag => car.tags?.includes(tag))
      );
    }

    console.log('필터링 결과:', {
      검색어: searchTerm,
      차종: filters.carType,
      제조사: filters.carBrand,
      대여료범위: `${filters.minRentalFee}원 ~ ${filters.maxRentalFee}원`,
      선택된태그: filters.selectedTags,
      필터링된차량수: filtered.length
    });

    setFilteredCars(filtered);
  };

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
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
    setTempFilters(filters);
    setTempRentalFeeRange(rentalFeeRange);
    setFilterDialogOpen(true);
  };

  const handleCloseFilterDialog = () => {
    setFilterDialogOpen(false);
  };

  const handleApplyFilters = () => {
    // 대여료 범위를 실제 금액으로 변환
    const minRentalFee = logScale(tempRentalFeeRange[0]);
    const maxRentalFee = logScale(tempRentalFeeRange[1]);
    
    setFilters({
      ...tempFilters,
      minRentalFee: minRentalFee.toString(),
      maxRentalFee: maxRentalFee.toString()
    });
    setRentalFeeRange(tempRentalFeeRange);
    setFilterDialogOpen(false);
  };

  const handleSubmit = async () => {
    if (!selectedCar) {
      setError('차량을 선택해주세요.');
      return;
    }

    if (!rentalData.guestName) {
      setError('대여자 이름을 입력해주세요.');
      return;
    }

    if (!rentalData.address) {
      setError('주소를 입력해주세요.');
      return;
    }

    if (!rentalData.tags || rentalData.tags.length === 0) {
      setError('최소 하나 이상의 태그를 선택해주세요.');
      return;
    }

    try {
      // 대여일수 계산 (날짜 단위)
      const startDate = new Date(rentalData.startTime);
      const endDate = new Date(rentalData.endTime);
      const startDay = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
      const endDay = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
      const days = Math.round((endDay - startDay) / (1000 * 60 * 60 * 24)) + 1;
      const rentalFee = Number(selectedCar.rentalFee);
      const totalFee = days * rentalFee;

      // 1. 대여 시간 겹침 체크
      const overlapQuery = query(
        requestsRef,
        where('carNumber', '==', selectedCar.carNumber),
        where('status', 'in', ['pending', 'approved'])
      );
      const overlapSnapshot = await getDocs(overlapQuery);
      let overlap = false;
      overlapSnapshot.forEach(doc => {
        const data = doc.data();
        const existStart = new Date(data.startTime);
        const existEnd = new Date(data.endTime);
        // 겹치는지 체크
        if (existEnd > startDate && existStart < endDate) {
          overlap = true;
        }
      });
      if (overlap) {
        setError('이미 해당 시간에 대여된 차량입니다. 다른 시간을 선택해 주세요.');
        return;
      }

      // 대여요청한 시간 (KST)
      const requestDate = new Date();
      const toKSTISOString = (date) => {
        const tzOffset = 9 * 60; // 9시간
        const kst = new Date(date.getTime() + tzOffset * 60 * 1000);
        return kst.toISOString().replace('Z', '+09:00');
      };
      const requestTimeKST = toKSTISOString(requestDate);
      const docId = `${user.uid}.${selectedCar.carNumber}.${requestTimeKST}`;

      const rentalRequest = {
        carNumber: selectedCar.carNumber,
        carBrand: selectedCar.carBrand,
        carName: selectedCar.carName,
        carType: selectedCar.carType,
        guestName: rentalData.guestName,
        guestId: user.uid,
        startTime: toKSTISOString(rentalData.startTime),
        endTime: toKSTISOString(rentalData.endTime),
        tags: rentalData.tags,
        address: rentalData.address,
        status: 'pending',
        rentalFee: rentalFee,
        totalFee: totalFee
      };

      await setDoc(doc(requestsRef, docId), removeFunctions(rentalRequest));
      console.log('대여 요청 성공:', docId);

      if (selectedCar.tags?.length > 0) {
        setRecommendationData({
          tags: selectedCar.tags,
          address: rentalData.address
        });
        console.log('[장소 추천 전달값] tags:', rentalData.tags, 'address:', rentalData.address);
        setOpenRecommendationDialog(true);
      }

      handleCloseDialog();
    } catch (err) {
      console.error('대여 요청 실패:', err);
      setError('대여 요청에 실패했습니다.');
    }
  };

  return (
    <div className="rental-container">
      <Container maxWidth="lg">
        {/* 검색 및 필터 영역 */}
        <Box className="search-container">
          <TextField
            fullWidth
            variant="outlined"
            placeholder="차량명, 차량번호, 제조사로 검색"
            value={searchTerm}
            onChange={handleSearchChange}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
          <Button
            variant="outlined"
            className="filter-button"
            onClick={handleOpenFilterDialog}
            startIcon={<FilterListIcon />}
          >
            필터
          </Button>
        </Box>

        {/* 필터 다이얼로그 */}
        <Dialog
          open={filterDialogOpen}
          onClose={handleCloseFilterDialog}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            className: "filter-paper"
          }}
        >
          <DialogTitle className="filter-title">필터 설정</DialogTitle>
          <DialogContent>
            <Box className="filter-section">
              <Typography variant="subtitle1" gutterBottom>차량 종류</Typography>
              <Box className="filter-box">
                <TextField
                  select
                  fullWidth
                  value={tempFilters.carType}
                  onChange={(e) => setTempFilters(prev => ({ ...prev, carType: e.target.value }))}
                  variant="outlined"
                  displayEmpty
                  SelectProps={{
                    displayEmpty: true,
                    renderValue: (value) => value || "전체",
                    MenuProps: {
                      PaperProps: {
                        sx: {
                          '& .MuiMenuItem-root': {
                            paddingLeft: '8px'
                          }
                        }
                      }
                    }
                  }}
                >
                  <MenuItem value="">전체</MenuItem>
                  <MenuItem value="소형">소형</MenuItem>
                  <MenuItem value="중형">중형</MenuItem>
                  <MenuItem value="대형">대형</MenuItem>
                  <MenuItem value="SUV">SUV</MenuItem>
                  <MenuItem value="승합차">승합차</MenuItem>
                </TextField>
              </Box>
            </Box>

            <Box className="filter-section">
              <Typography variant="subtitle1" gutterBottom>제조사</Typography>
              <Box className="filter-box">
                <TextField
                  select
                  fullWidth
                  value={tempFilters.carBrand}
                  onChange={(e) => setTempFilters(prev => ({ ...prev, carBrand: e.target.value }))}
                  variant="outlined"
                  displayEmpty
                  SelectProps={{
                    displayEmpty: true,
                    renderValue: (value) => value || "전체",
                    MenuProps: {
                      PaperProps: {
                        sx: {
                          '& .MuiMenuItem-root': {
                            paddingLeft: '8px'
                          }
                        }
                      }
                    }
                  }}
                >
                  <MenuItem value="">전체</MenuItem>
                  <MenuItem value="현대">현대</MenuItem>
                  <MenuItem value="기아">기아</MenuItem>
                  <MenuItem value="쌍용">쌍용</MenuItem>
                  <MenuItem value="제네시스">제네시스</MenuItem>
                  <MenuItem value="BMW">BMW</MenuItem>
                  <MenuItem value="벤츠">벤츠</MenuItem>
                  <MenuItem value="아우디">아우디</MenuItem>
                </TextField>
              </Box>
            </Box>

            <Box className="filter-section">
              <Typography variant="subtitle1" gutterBottom>대여료 범위</Typography>
              <Box className="filter-box price-filter-box">
                <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                  <TextField
                    type="number"
                    label="최소 대여료"
                    value={logScale(tempRentalFeeRange[0])}
                    onChange={handleRentalFeeInputChange('min')}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">원</InputAdornment>,
                      inputProps: { min: 0, max: 1000000 }
                    }}
                    fullWidth
                    size="small"
                  />
                  <TextField
                    type="number"
                    label="최대 대여료"
                    value={logScale(tempRentalFeeRange[1])}
                    onChange={handleRentalFeeInputChange('max')}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">원</InputAdornment>,
                      inputProps: { min: 0, max: 1000000 }
                    }}
                    fullWidth
                    size="small"
                  />
                </Box>
                <Slider
                  value={tempRentalFeeRange}
                  onChange={(e, newValue) => setTempRentalFeeRange(newValue)}
                  valueLabelDisplay="auto"
                  min={0}
                  max={100}
                  valueLabelFormat={(value) => `${logScale(value).toLocaleString()}원`}
                />
              </Box>
            </Box>

            <Box className="filter-section">
              <Typography variant="subtitle1" gutterBottom>태그</Typography>
              <Box className="filter-box tag-filter-box">
                {allTags.map((tag) => (
                  <Chip
                    key={tag}
                    label={tag}
                    onClick={() => handleTagFilterClick(tag)}
                    color={tempFilters.selectedTags.includes(tag) ? "primary" : "default"}
                    className="tag-chip"
                  />
                ))}
              </Box>
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={handleCloseFilterDialog} color="inherit">
              취소
            </Button>
            <Button
              onClick={handleApplyFilters}
              variant="contained"
              color="primary"
              className="submit-button"
            >
              적용
            </Button>
          </DialogActions>
        </Dialog>

        {/* 차량 목록 */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>
        ) : (
          <>
            <Grid container spacing={3}>
              {getCurrentPageCars().map((car) => (
                <Grid item xs={12} sm={6} md={4} key={car.id}>
                  <CarCard
                    car={car}
                    onRent={handleRentClick}
                    onTagClick={handleTagClick}
                  />
                </Grid>
              ))}
            </Grid>
            {filteredCars.length === 0 && (
              <Alert severity="info" sx={{ mt: 2 }}>
                검색 결과가 없습니다.
              </Alert>
            )}
            <Box className="pagination-container">
              <Pagination
                count={Math.ceil(filteredCars.length / itemsPerPage)}
                page={page}
                onChange={handlePageChange}
                color="primary"
                size="large"
              />
            </Box>
          </>
        )}

        {/* 대여 다이얼로그 */}
        <Dialog
          open={openDialog}
          onClose={handleCloseDialog}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            className: "filter-paper"
          }}
        >
          <DialogTitle className="filter-title">
            {selectedCar?.carName} 대여
          </DialogTitle>
          <DialogContent>
            <Box sx={{ mt: 2 }}>
              <Box className="filter-section">
                <Typography variant="subtitle1" gutterBottom>대여자 이름</Typography>
                <Box className="filter-box">
                  <TextField
                    fullWidth
                    name="guestName"
                    value={rentalData.guestName}
                    onChange={handleInputChange}
                    required
                    sx={{ 
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: 'white',
                        '& fieldset': {
                          borderColor: 'rgba(0, 0, 0, 0.23)',
                        },
                        '&:hover fieldset': {
                          borderColor: 'rgba(0, 0, 0, 0.23)',
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: 'primary.main',
                        },
                      },
                    }}
                  />
                </Box>
              </Box>

              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <Box className="filter-section">
                  <Typography variant="subtitle1" gutterBottom>대여 시작 날짜/시간</Typography>
                  <Box className="filter-box date-filter-box">
                    <DateTimePicker
                      value={rentalData.startTime}
                      onChange={handleDateChange('startTime')}
                      slotProps={{
                        textField: { fullWidth: true, variant: 'outlined' }
                      }}
                    />
                  </Box>
                </Box>
                <Box className="filter-section">
                  <Typography variant="subtitle1" gutterBottom>대여 종료 날짜/시간</Typography>
                  <Box className="filter-box date-filter-box">
                    <DateTimePicker
                      value={rentalData.endTime}
                      onChange={handleDateChange('endTime')}
                      slotProps={{
                        textField: { fullWidth: true, variant: 'outlined' }
                      }}
                    />
                  </Box>
                </Box>
              </LocalizationProvider>

              <Box className="filter-section">
                <Typography variant="subtitle1" gutterBottom>대여 주소</Typography>
                <Box className="filter-box">
                  <TextField
                    fullWidth
                    variant="outlined"
                    value={rentalData.address}
                    onChange={(e) => setRentalData(prev => ({ ...prev, address: e.target.value }))}
                    placeholder="대여할 주소를 입력하세요"
                    required
                    sx={{ 
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: 'white',
                        '& fieldset': {
                          borderColor: 'rgba(0, 0, 0, 0.23)',
                        },
                        '&:hover fieldset': {
                          borderColor: 'rgba(0, 0, 0, 0.23)',
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: 'primary.main',
                        },
                      },
                    }}
                  />
                </Box>
              </Box>

              <Box className="filter-section">
                <Typography variant="subtitle1" gutterBottom>태그 선택</Typography>
                <Box className="filter-box tag-filter-box">
                  {selectedCar?.tags?.map((tag) => (
                    <Chip
                      key={tag}
                      label={tag}
                      onClick={() => handleTagClick(tag)}
                      color={rentalData.tags.includes(tag) ? "primary" : "default"}
                      className="tag-chip"
                    />
                  ))}
                </Box>
                <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
                  차량에 등록된 태그 중에서 선택해주세요.
                </Typography>
              </Box>
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={handleCloseDialog} color="inherit">
              취소
            </Button>
            <Button
              onClick={handleSubmit}
              variant="contained"
              color="primary"
              className="submit-button"
            >
              대여 신청
            </Button>
          </DialogActions>
        </Dialog>
      </Container>

      <Dialog
        open={openRecommendationDialog}
        onClose={() => setOpenRecommendationDialog(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            height: '80vh',
            maxHeight: '800px'
          }
        }}
      >
        <DialogTitle>추천 장소</DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          <PlaceRecommendation 
            tags={recommendationData.tags}
            address={recommendationData.address}
            isDarkMode={false}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenRecommendationDialog(false)}>닫기</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

export default CarRental; 