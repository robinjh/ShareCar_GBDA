import React, { useState, useContext, useEffect } from 'react';
import { 
  Container, 
  Paper, 
  Typography, 
  TextField, 
  Button, 
  Grid,
  Box,
  Alert,
  Chip,
  Stack,
  FormControl,
  Select,
  MenuItem
} from '@mui/material';
import { collection, setDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { UserContext } from '../../UserContext';
import '../../styles/Registration.css';
import { useNavigate } from 'react-router-dom';

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

function Registration() {
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
  const navigate = useNavigate();

  // 다크모드 변경 감지
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleDarkModeChange = (e) => setIsDarkMode(e.matches);
    
    mediaQuery.addEventListener('change', handleDarkModeChange);
    return () => mediaQuery.removeEventListener('change', handleDarkModeChange);
  }, []);

  // 폼 입력값 변경 처리
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
      // 입력값 검증
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

      // 데이터 구조 정의
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

      // Firestore에 데이터 저장
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
    <Container maxWidth="md" className={`registration-container ${isDarkMode ? 'dark-mode' : ''}`}>
      <Paper elevation={3} className={`registration-paper ${isDarkMode ? 'dark-mode' : ''}`}>
        <Box className={`registration-header ${isDarkMode ? 'dark-mode' : ''}`}>
          <Typography variant="h4" component="h1" className={`registration-title ${isDarkMode ? 'dark-mode' : ''}`}>
            차량 등록
          </Typography>
          <Button
            variant="contained"
            color="primary"
            onClick={() => navigate('/rental')}
            className={`rental-link-button ${isDarkMode ? 'dark-mode' : ''}`}
          >
            차량 대여
          </Button>
        </Box>

        {!user && (
          <Alert severity="warning" className={`alert ${isDarkMode ? 'dark-mode' : ''}`}>
            차량을 등록하려면 로그인이 필요합니다. 현재 로그인되어 있지 않습니다.
          </Alert>
        )}

        {error && <Alert severity="error" className={`alert ${isDarkMode ? 'dark-mode' : ''}`}>{error}</Alert>}
        {success && <Alert severity="success" className={`alert ${isDarkMode ? 'dark-mode' : ''}`}>{success}</Alert>}

        <form onSubmit={handleSubmit} className={isDarkMode ? 'dark-mode' : ''} noValidate>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom>등록자 이름</Typography>
              <TextField
                fullWidth
                name="hostName"
                value={formData.hostName}
                onChange={handleChange}
                required
                placeholder="차량 등록자의 이름을 입력해주세요"
              />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom>차량번호</Typography>
              <TextField
                fullWidth
                name="carNumber"
                value={formData.carNumber}
                onChange={handleChange}
                required
                placeholder="차량번호를 입력해주세요"
              />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom>차량 종류</Typography>
              <FormControl fullWidth required>
                <Select
                  name="carType"
                  value={formData.carType}
                  onChange={handleChange}
                  displayEmpty
                >
                  <MenuItem value="">전체</MenuItem>
                  {carTypes.map((type) => (
                    <MenuItem key={type} value={type}>{type}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom>제조사</Typography>
              <FormControl fullWidth required>
                <Select
                  name="carBrand"
                  value={formData.carBrand}
                  onChange={handleChange}
                  displayEmpty
                >
                  <MenuItem value="">전체</MenuItem>
                  {carBrands.map((brand) => (
                    <MenuItem key={brand} value={brand}>{brand}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {formData.carBrand === '기타' && (
              <Grid item xs={12}>
                <Typography variant="subtitle1" gutterBottom>기타 제조사명</Typography>
                <TextField
                  fullWidth
                  name="otherBrand"
                  value={formData.otherBrand}
                  onChange={handleChange}
                  required
                  placeholder="예: 제네시스, 포르쉐 등"
                  helperText="기타 제조사를 선택한 경우 제조사명을 입력해주세요"
                />
              </Grid>
            )}

            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom>차량 이름</Typography>
              <TextField
                fullWidth
                name="carName"
                value={formData.carName}
                onChange={handleChange}
                required
                placeholder="차량명을 입력하세요"
              />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom>대여료(1일)</Typography>
              <TextField
                fullWidth
                name="rentalFee"
                value={formData.rentalFee}
                onChange={handleChange}
                required
                placeholder="대여료를 입력하세요"
                InputProps={{ 
                  endAdornment: <span>원</span>,
                  inputProps: { 
                    inputMode: 'numeric',
                    pattern: '[0-9]*'
                  }
                }}
              />
            </Grid>

            <Grid item xs={12} className={`tag-section ${isDarkMode ? 'dark-mode' : ''}`}>
              <Typography variant="subtitle1" gutterBottom className={isDarkMode ? 'dark-mode' : ''}>
                태그 선택
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap className={`tag-stack ${isDarkMode ? 'dark-mode' : ''}`}>
                {tags.map((tag) => (
                  <Chip
                    key={tag}
                    label={tag}
                    onClick={() => handleTagClick(tag)}
                    color={formData.tags.includes(tag) ? "primary" : "default"}
                    className={`tag-chip ${isDarkMode ? 'dark-mode' : ''}`}
                  />
                ))}
              </Stack>
            </Grid>

            <Grid item xs={12}>
              <Box className={`submit-button-container ${isDarkMode ? 'dark-mode' : ''}`}>
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  size="large"
                  className={`submit-button ${isDarkMode ? 'dark-mode' : ''}`}
                  disabled={!user}
                >
                  차량 등록
                </Button>
              </Box>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Container>
  );
}

export default Registration; 