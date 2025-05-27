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
import { collection, getDocs, addDoc, query, where, doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { UserContext } from '../UserContext';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import './CarList.css';
import FilterListIcon from '@mui/icons-material/FilterList';
import PlaceRecommendation from "./PlaceRecommendation";

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

function CarList() {
  const { user } = useContext(UserContext);
  const [cars, setCars] = useState([]);
  const [filteredCars, setFilteredCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCar, setSelectedCar] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [openRecommendationDialog, setOpenRecommendationDialog] = useState(false);
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  const [selectedTags, setSelectedTags] = useState([]);
  const [rentalData, setRentalData] = useState({
    startTime: new Date(),
    endTime: new Date(new Date().setDate(new Date().getDate() + 1)),
    guestName: '',
    tags: [],
    address: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
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

  // 모든 차량의 태그를 수집
  const allTags = [...new Set(cars.flatMap(car => car.tags || []))];

  // 로그 스케일 변환 함수
  const logScale = (value) => {
    if (value === 0) return 0;
    // 0-100 범위를 0-1000000 범위로 변환
    // 30% -> 10000원, 50% -> 40000원, 70% -> 100000원
    return Math.round(1000 * Math.pow(10, (value / 100) * 2.5));
  };

  // 로그 스케일 역변환 함수
  const inverseLogScale = (value) => {
    if (value === 0) return 0;
    // 0-1000000 범위를 0-100 범위로 변환
    return Math.round((Math.log10(value / 1000) / 2.5) * 100);
  };

  // 초기값 설정을 위한 useEffect
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

    // 분류 필터링
    if (filters.carType) {
      filtered = filtered.filter(car => car.carType === filters.carType);
    }

    // 제조사 필터링
    if (filters.carBrand) {
      filtered = filtered.filter(car => car.carBrand === filters.carBrand);
    }

    // 대여료 범위 필터링
    if (filters.minRentalFee) {
      filtered = filtered.filter(car => car.rentalFee >= parseInt(filters.minRentalFee));
    }
    if (filters.maxRentalFee) {
      filtered = filtered.filter(car => car.rentalFee <= parseInt(filters.maxRentalFee));
    }

    // 태그 필터링
    if (filters.selectedTags.length > 0) {
      filtered = filtered.filter(car => 
        filters.selectedTags.every(tag => car.tags?.includes(tag))
      );
    }

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
      tags: [],
      address: ''
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
    setRentalData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleTagClick = (tag) => {
    setRentalData(prev => ({
      ...prev,
      tags: prev.tags.includes(tag) 
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag]
    }));
  };

  const handleTagFilterClick = (tag) => {
    setFilters(prev => {
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

  const handleSubmit = async () => {
    try {
      if (!user) {
        throw new Error('로그인이 필요합니다.');
      }

      if (!rentalData.guestName) {
        throw new Error('이름을 입력해주세요.');
      }

      if (!rentalData.address) {
        throw new Error('주소를 입력해주세요.');
      }

      if (rentalData.startTime >= rentalData.endTime) {
        throw new Error('대여 종료 시간은 시작 시간보다 이후여야 합니다.');
      }

      // 해당 차량의 기존 대여 요청 확인
      const requestsRef = collection(db, 'requests');
      const q = query(
        requestsRef,
        where('carNumber', '==', selectedCar.carNumber),
        where('status', 'in', ['대기중', '승인됨'])
      );
      
      const querySnapshot = await getDocs(q);
      const existingRequests = querySnapshot.docs.map(doc => doc.data());

      // 시간이 겹치는지 확인
      const hasOverlap = existingRequests.some(request => {
        const requestStart = new Date(request.startTime);
        const requestEnd = new Date(request.endTime);
        const newStart = new Date(rentalData.startTime);
        const newEnd = new Date(rentalData.endTime);

        // 시간이 겹치는 경우:
        // 1. 새로운 시작 시간이 기존 대여 기간 내에 있는 경우
        // 2. 새로운 종료 시간이 기존 대여 기간 내에 있는 경우
        // 3. 새로운 대여 기간이 기존 대여 기간을 완전히 포함하는 경우
        return (
          (newStart >= requestStart && newStart < requestEnd) ||
          (newEnd > requestStart && newEnd <= requestEnd) ||
          (newStart <= requestStart && newEnd >= requestEnd)
        );
      });

      if (hasOverlap) {
        const overlappingRequest = existingRequests.find(request => {
          const requestStart = new Date(request.startTime);
          const requestEnd = new Date(request.endTime);
          const newStart = new Date(rentalData.startTime);
          const newEnd = new Date(rentalData.endTime);
          
          return (
            (newStart >= requestStart && newStart < requestEnd) ||
            (newEnd > requestStart && newEnd <= requestEnd) ||
            (newStart <= requestStart && newEnd >= requestEnd)
          );
        });

        const formatDate = (date) => {
          return new Date(date).toLocaleString('ko-KR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
          });
        };

        setError(
          `해당 기간에는 대여가 불가능합니다.\n` +
          `대여 불가능 시간: ${formatDate(overlappingRequest.startTime)} ~ ${formatDate(overlappingRequest.endTime)}\n` +
          `다른 시간을 선택해주세요.`
        );
        return;
      }

      // 대여 기간 계산 (날짜 기준)
      const startDate = new Date(rentalData.startTime);
      const endDate = new Date(rentalData.endTime);
      
      // 한국 시간으로 변환
      const koreaTimeOffset = 9 * 60; // 한국은 UTC+9
      const startDateKST = new Date(startDate.getTime() + (koreaTimeOffset * 60000));
      const endDateKST = new Date(endDate.getTime() + (koreaTimeOffset * 60000));
      
      // 시작 날짜와 종료 날짜의 일수 차이 계산
      const startDay = new Date(startDateKST.getFullYear(), startDateKST.getMonth(), startDateKST.getDate());
      const endDay = new Date(endDateKST.getFullYear(), endDateKST.getMonth(), endDateKST.getDate());
      const diffTime = Math.abs(endDay - startDay);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // 시작일과 종료일 포함
      
      // 총 대여료 계산
      const totalFee = selectedCar.rentalFee * diffDays;

      const requestData = {
        carBrand: selectedCar.carBrand,
        carName: selectedCar.carName,
        carNumber: selectedCar.carNumber,
        carType: selectedCar.carType,
        endTime: endDateKST.toISOString(),
        guestID: user.uid,
        guestName: rentalData.guestName,
        hostID: selectedCar.hostID,
        rentalFee: selectedCar.rentalFee.toString(),
        startTime: startDateKST.toISOString(),
        status: '대기중',
        tags: rentalData.tags,
        totalFee: totalFee,
        address: rentalData.address
      };

      const now = new Date();
      const requestDateTime = now.toISOString().replace(/[:.]/g, '-');
      const docId = `${user.uid}.${selectedCar.carNumber}.${requestDateTime}`;
      const docRef = await setDoc(doc(requestsRef, docId), requestData);
      
      setSuccess('대여 요청이 성공적으로 등록되었습니다!');
      setTimeout(() => {
        setSuccess('');
      }, 5000);
      handleCloseDialog();
      setOpenRecommendationDialog(true);
    } catch (err) {
      console.error('대여 요청 실패:', err);
      setError(err.message);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('로그아웃 에러:', err);
      setError('로그아웃에 실패했습니다.');
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleOpenFilterDialog = () => {
    setTempFilters(filters);
    setTempRentalFeeRange(rentalFeeRange);
    setFilterDialogOpen(true);
  };

  const handleCloseFilterDialog = () => {
    setFilterDialogOpen(false);
  };

  const handleTempFilterChange = (e) => {
    const { name, value } = e.target;
    setTempFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleTempRentalFeeChange = (event, newValue) => {
    setTempRentalFeeRange(newValue);
    setTempFilters(prev => ({
      ...prev,
      minRentalFee: logScale(newValue[0]).toString(),
      maxRentalFee: logScale(newValue[1]).toString()
    }));
  };

  const handleTempRentalFeeInputChange = (e) => {
    const { name, value } = e.target;
    const numValue = value === '' ? 0 : parseInt(value);
    
    if (name === 'minRentalFee') {
      setTempRentalFeeRange([inverseLogScale(numValue), tempRentalFeeRange[1]]);
    } else {
      setTempRentalFeeRange([tempRentalFeeRange[0], inverseLogScale(numValue)]);
    }
    
    setTempFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleTempTagFilterClick = (tag) => {
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

  const handleApplyFilters = () => {
    setFilters(tempFilters);
    setRentalFeeRange(tempRentalFeeRange);
    setFilterDialogOpen(false);
  };

  const handleCloseRecommendationDialog = () => {
    setOpenRecommendationDialog(false);
  };

  if (loading) {
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" className="car-list-container" sx={{ pt: 4 }}>
      <Paper elevation={3} sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 2 }}>
          <Typography variant="h4" component="h1" sx={{ mb: 1 }}>
            차량 대여
          </Typography>
          <Button
            variant="outlined"
            color="secondary"
            onClick={handleLogout}
            sx={{ alignSelf: 'flex-end' }}
          >
            로그아웃
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ p: 2, mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs>
              <TextField
                fullWidth
                label="차량명, 차량번호, 제조사, 차종, 태그로 검색"
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
            </Grid>
            <Grid item>
              <Button
                variant="outlined"
                onClick={handleOpenFilterDialog}
                startIcon={<FilterListIcon />}
              >
                필터
              </Button>
            </Grid>
          </Grid>
        </Box>

        <Grid container spacing={3}>
          {filteredCars.map((car) => (
            <Grid item xs={12} sm={6} md={4} key={car.id}>
              <CarCard
                car={car}
                onRent={handleRentClick}
                onCancel={handleCloseDialog}
                onReturn={handleSubmit}
                onExtend={handleCloseDialog}
                onReview={handleCloseDialog}
                onReport={handleCloseDialog}
                onDelete={handleCloseDialog}
                onEdit={handleCloseDialog}
                onTagClick={handleTagClick}
              />
            </Grid>
          ))}
        </Grid>
      </Paper>

      <Dialog
        open={filterDialogOpen}
        onClose={handleCloseFilterDialog}
        maxWidth="sm"
        fullWidth
      >
        {/* Filter dialog content */}
      </Dialog>

      <Dialog 
        open={openDialog} 
        onClose={handleCloseDialog} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          sx: {
            minHeight: '600px'
          }
        }}
      >
        <DialogTitle sx={{ textAlign: 'center' }}>차량 대여</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
          
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle1" gutterBottom>이름</Typography>
            <TextField
              fullWidth
              value={rentalData.guestName}
              onChange={handleInputChange}
              name="guestName"
              placeholder="이름을 입력하세요"
            />
          </Box>

          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle1" gutterBottom>주소</Typography>
            <TextField
              fullWidth
              value={rentalData.address}
              onChange={handleInputChange}
              name="address"
              placeholder="주소를 입력하세요"
            />
          </Box>

          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle1" gutterBottom>대여 기간</Typography>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                <DateTimePicker
                  label="시작 시간"
                  value={rentalData.startTime}
                  onChange={handleDateChange('startTime')}
                  renderInput={(params) => <TextField {...params} fullWidth />}
                />
                <DateTimePicker
                  label="종료 시간"
                  value={rentalData.endTime}
                  onChange={handleDateChange('endTime')}
                  renderInput={(params) => <TextField {...params} fullWidth />}
                />
              </Box>
            </LocalizationProvider>
          </Box>

          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle1" gutterBottom>태그 선택</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1 }}>
              {selectedCar?.tags?.map((tag) => (
                <Chip
                  key={tag}
                  label={tag}
                  onClick={() => handleTagClick(tag)}
                  color={rentalData.tags.includes(tag) ? "primary" : "default"}
                  sx={{
                    transition: 'all 0.3s ease',
                    transform: rentalData.tags.includes(tag) ? 'scale(1.05)' : 'scale(1)',
                    backgroundColor: rentalData.tags.includes(tag) ? '#1976d2' : '#e0e0e0',
                    color: rentalData.tags.includes(tag) ? 'white' : 'black',
                    '&:hover': {
                      backgroundColor: rentalData.tags.includes(tag) ? '#1565c0' : '#d5d5d5',
                    }
                  }}
                />
              ))}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={handleSubmit} 
            variant="contained" 
            color="primary"
            disabled={!rentalData.tags.length}
          >
            대여 요청
          </Button>
          <Button onClick={handleCloseDialog}>취소</Button>
        </DialogActions>
      </Dialog>

      <Dialog 
        open={openRecommendationDialog} 
        onClose={handleCloseRecommendationDialog}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            minHeight: '600px'
          }
        }}
      >
        <DialogTitle sx={{ textAlign: 'center' }}>추천 장소</DialogTitle>
        <DialogContent>
          {console.log("장소 추천 다이얼로그 태그:", rentalData.tags)}
          <PlaceRecommendation 
            tags={rentalData.tags}
            address={rentalData.address}
            isDarkMode={false}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseRecommendationDialog} color="primary">
            닫기
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default CarList; 