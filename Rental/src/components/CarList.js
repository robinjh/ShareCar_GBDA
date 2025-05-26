import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Grid, 
  Typography,
  CircularProgress,
  Alert,
  TextField,
  Box,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  Chip,
  Stack,
  Paper,
  IconButton,
  Collapse,
  Pagination
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import CarCard from './CarCard';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import './CarList.css';

// 태그 목록
const availableTags = [
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

function CarList() {
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const itemsPerPage = 9; // 한 페이지에 표시할 차량 수
  
  // 필터 상태
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [priceRange, setPriceRange] = useState([0, 1000000]);
  const [selectedTags, setSelectedTags] = useState([]);

  // 로그 스케일 변환 함수들
  const priceToSliderValue = (price) => {
    if (price === 0) return 0;
    return (Math.log10(price) / Math.log10(1000000)) * 100;
  };

  const sliderValueToPrice = (value) => {
    if (value === 0) return 0;
    return Math.pow(10, (value / 100) * Math.log10(1000000));
  };

  const fetchCars = async () => {
    try {
      setLoading(true);
      console.log('Firebase 연결 시작...');
      const carsCollection = collection(db, 'registrations');
      console.log('컬렉션 참조:', carsCollection);
      
      const carsSnapshot = await getDocs(carsCollection);
      console.log('스냅샷 데이터:', carsSnapshot.docs.map(doc => doc.data()));
      
      const carsList = carsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      console.log('최종 차량 목록:', carsList);
      
      setCars(carsList);
      setError(null);
    } catch (err) {
      console.error('Firebase 에러 상세:', err);
      setError('차량 정보를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = (carId, newStatus) => {
    setCars(prevCars => 
      prevCars.map(car => 
        car.id === carId ? { ...car, status: newStatus } : car
      )
    );
  };

  useEffect(() => {
    console.log('컴포넌트 마운트됨');
    fetchCars();
  }, []);

  // 태그 선택 핸들러
  const handleTagClick = (tag) => {
    setSelectedTags(prev => 
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  // 페이지네이션을 위한 필터링된 차량 목록
  const filteredCars = cars.filter(car => {
    const searchLower = searchTerm.toLowerCase();
    const carStartTime = new Date(car["2_timeInfo"]["1_startTime"]);
    const carEndTime = new Date(car["2_timeInfo"]["2_endTime"]);
    const carPrice = Number(car["1_basicInfo"].rentalFee);

    // 검색어 필터링
    const searchMatch = 
      car["1_basicInfo"].name.toLowerCase().includes(searchLower) ||
      car["1_basicInfo"].carNumber.toLowerCase().includes(searchLower) ||
      car["3_tags"].some(tag => tag.toLowerCase().includes(searchLower));

    // 날짜 필터링
    const dateMatch = 
      (!startDate || carStartTime >= startDate) &&
      (!endDate || carEndTime <= endDate);

    // 가격 필터링
    const priceMatch = 
      carPrice >= priceRange[0] && carPrice <= priceRange[1];

    // 태그 필터링
    const tagMatch = 
      selectedTags.length === 0 ||
      selectedTags.every(tag => car["3_tags"].includes(tag));

    return searchMatch && dateMatch && priceMatch && tagMatch;
  });

  // 현재 페이지의 차량 목록
  const currentCars = filteredCars.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  // 페이지 변경 핸들러
  const handlePageChange = (event, value) => {
    setPage(value);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 필터가 변경될 때 페이지를 1로 리셋
  useEffect(() => {
    setPage(1);
  }, [searchTerm, startDate, endDate, priceRange, selectedTags]);

  if (loading) {
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom align="center">
        차량 대여
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* 검색 필드 */}
      <Box className="search-container">
        <TextField
          fullWidth
          variant="outlined"
          placeholder="검색"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
        <IconButton 
          onClick={() => setShowFilters(!showFilters)}
          color={showFilters ? "primary" : "default"}
          className="filter-button"
        >
          <FilterListIcon />
        </IconButton>
      </Box>

      <Collapse in={showFilters}>
        <Paper className="filter-paper">
          {/* 날짜 필터 */}
          <Grid container spacing={3} justifyContent="center">
            <Grid item xs={12}>
              <Typography variant="subtitle1" className="filter-title">대여 기간</Typography>
              <Box className="filter-box date-filter-box">
                <Grid container spacing={2} alignItems="center" justifyContent="center">
                  <Grid item xs={12} md={4}>
                    <LocalizationProvider dateAdapter={AdapterDateFns}>
                      <DatePicker
                        label="시작 날짜"
                        value={startDate}
                        onChange={setStartDate}
                        renderInput={(params) => (
                          <TextField 
                            {...params} 
                            fullWidth 
                            size="small"
                            sx={{ 
                              '& .MuiInputBase-root': {
                                height: '40px'
                              }
                            }}
                          />
                        )}
                      />
                    </LocalizationProvider>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <LocalizationProvider dateAdapter={AdapterDateFns}>
                      <DatePicker
                        label="종료 날짜"
                        value={endDate}
                        onChange={setEndDate}
                        renderInput={(params) => (
                          <TextField 
                            {...params} 
                            fullWidth 
                            size="small"
                            sx={{ 
                              '& .MuiInputBase-root': {
                                height: '40px'
                              }
                            }}
                          />
                        )}
                      />
                    </LocalizationProvider>
                  </Grid>
                </Grid>
                <IconButton 
                  onClick={() => {
                    setStartDate(null);
                    setEndDate(null);
                  }}
                  size="small"
                  sx={{ 
                    border: 1, 
                    borderColor: 'divider',
                    borderRadius: 1,
                    height: 40,
                    '&:hover': {
                      backgroundColor: 'action.hover'
                    }
                  }}
                >
                  <Typography variant="caption" color="text.secondary">
                    날짜 설정하지 않음
                  </Typography>
                </IconButton>
              </Box>
            </Grid>
          </Grid>

          {/* 구분선 */}
          <Box className="divider" />

          {/* 가격 범위 필터 */}
          <Grid container spacing={3} justifyContent="center">
            <Grid item xs={12}>
              <Typography variant="subtitle1" className="filter-title">
                대여료 범위
              </Typography>
              <Box className="filter-box price-filter-box">
                <Grid container spacing={2} alignItems="center" justifyContent="center">
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="최소 금액"
                      type="number"
                      value={priceRange[0]}
                      onChange={(e) => {
                        const value = Math.max(0, Math.min(priceRange[1], Number(e.target.value)));
                        setPriceRange([value, priceRange[1]]);
                      }}
                      InputProps={{
                        endAdornment: <InputAdornment position="end">원</InputAdornment>,
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="최대 금액"
                      type="number"
                      value={priceRange[1]}
                      onChange={(e) => {
                        const value = Math.max(priceRange[0], Math.min(1000000, Number(e.target.value)));
                        setPriceRange([priceRange[0], value]);
                      }}
                      InputProps={{
                        endAdornment: <InputAdornment position="end">원</InputAdornment>,
                      }}
                    />
                  </Grid>
                </Grid>
                <Box sx={{ mt: 2, px: 2 }}>
                  <Slider
                    value={[priceToSliderValue(priceRange[0]), priceToSliderValue(priceRange[1])]}
                    onChange={(e, newValue) => {
                      setPriceRange([
                        Math.round(sliderValueToPrice(newValue[0])),
                        Math.round(sliderValueToPrice(newValue[1]))
                      ]);
                    }}
                    valueLabelDisplay="auto"
                    valueLabelFormat={(value) => `${Math.round(sliderValueToPrice(value)).toLocaleString()}원`}
                    min={0}
                    max={100}
                    step={1}
                  />
                </Box>
              </Box>
            </Grid>
          </Grid>

          {/* 구분선 */}
          <Box className="divider" />

          {/* 태그 필터 */}
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="subtitle1" className="filter-title">태그 선택</Typography>
              <Box className="tag-filter-box">
                {availableTags.map((tag) => (
                  <Chip
                    key={tag}
                    label={tag}
                    onClick={() => handleTagClick(tag)}
                    color={selectedTags.includes(tag) ? "primary" : "default"}
                    sx={{ 
                      m: 1,
                      height: '36px',
                      '& .MuiChip-label': {
                        px: 2.5,
                        fontSize: '1rem'
                      }
                    }}
                  />
                ))}
              </Box>
            </Grid>
          </Grid>
        </Paper>
      </Collapse>

      <Grid container spacing={3}>
        {currentCars.map((car) => (
          <Grid item xs={12} key={car.id}>
            <CarCard 
              car={car} 
              onStatusUpdate={handleStatusUpdate}
            />
          </Grid>
        ))}
      </Grid>

      {filteredCars.length === 0 && !loading && (
        <Typography variant="h6" align="center" sx={{ mt: 4 }}>
          {searchTerm || startDate || endDate || priceRange[0] > 0 || priceRange[1] < 1000000 || selectedTags.length > 0
            ? '검색 결과가 없습니다.'
            : '등록된 차량이 없습니다.'}
        </Typography>
      )}

      {filteredCars.length > 0 && (
        <Box className="pagination-container">
          <Pagination 
            count={Math.ceil(filteredCars.length / itemsPerPage)} 
            page={page} 
            onChange={handlePageChange}
            color="primary"
            size="large"
          />
        </Box>
      )}
    </Container>
  );
}

export default CarList; 