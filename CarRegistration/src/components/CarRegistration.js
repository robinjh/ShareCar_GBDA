import React, { useState, useContext } from 'react';
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
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { collection, setDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { UserContext } from '../UserContext';
import '../styles/CarRegistration.css';

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

function CarRegistration() {
  const { user } = useContext(UserContext);
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
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

      // 현재 로그인된 사용자 정보 확인
      if (!user) {
        throw new Error('로그인이 필요합니다.');
      }

      // Firestore에 데이터 저장
      const carData = {
        carNumber: formData.carNumber,
        carType: formData.carType,
        carName: formData.carName,
        carBrand: formData.carBrand === '기타' ? `기타(${formData.otherBrand})` : formData.carBrand,
        rentalFee: formData.rentalFee,
        tags: formData.tags,
        hostID: user.uid,
        hostName: formData.hostName
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
      console.error('차량 등록 실패:', err);
      setError(err.message);
    }
  };

  return (
    <Container maxWidth="md" className="registration-container">
      <Paper elevation={3} className="registration-paper">
        <Typography variant="h4" component="h1" className="registration-title">
          차량 등록
        </Typography>

        {!user && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            차량을 등록하려면 로그인이 필요합니다. 현재 로그인되어 있지 않습니다.
          </Alert>
        )}

        {error && <Alert severity="error" className="alert">{error}</Alert>}
        {success && <Alert severity="success" className="alert">{success}</Alert>}

        <form onSubmit={handleSubmit} className="form-container">
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="등록자 이름"
                name="hostName"
                value={formData.hostName}
                onChange={handleChange}
                required
                sx={{ mb: 3 }}
                placeholder="차량 등록자의 이름을 입력해주세요"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="차량번호"
                name="carNumber"
                value={formData.carNumber}
                onChange={handleChange}
                required
                sx={{ mb: 3 }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth required sx={{ mb: 3 }}>
                <InputLabel>차량 분류</InputLabel>
                <Select
                  name="carType"
                  value={formData.carType}
                  onChange={handleChange}
                  label="차량 분류"
                  sx={{
                    '& .MuiSelect-select': {
                      textAlign: 'left'
                    }
                  }}
                  MenuProps={{
                    PaperProps: {
                      sx: {
                        '& .MuiMenuItem-root': {
                          justifyContent: 'flex-start'
                        }
                      }
                    }
                  }}
                >
                  {carTypes.map((type) => (
                    <MenuItem key={type} value={type} sx={{ justifyContent: 'flex-start' }}>
                      {type}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth required sx={{ mb: 3 }}>
                <InputLabel>제조사</InputLabel>
                <Select
                  name="carBrand"
                  value={formData.carBrand}
                  onChange={handleChange}
                  label="제조사"
                  sx={{
                    '& .MuiSelect-select': {
                      textAlign: 'left'
                    }
                  }}
                  MenuProps={{
                    PaperProps: {
                      sx: {
                        '& .MuiMenuItem-root': {
                          justifyContent: 'flex-start'
                        }
                      }
                    }
                  }}
                >
                  {carBrands.map((brand) => (
                    <MenuItem key={brand} value={brand} sx={{ justifyContent: 'flex-start' }}>
                      {brand}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {formData.carBrand === '기타' && (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="기타 제조사명"
                  name="otherBrand"
                  value={formData.otherBrand}
                  onChange={handleChange}
                  required
                  sx={{ mb: 3 }}
                  placeholder="예: 제네시스, 포르쉐 등"
                />
              </Grid>
            )}

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="차량 이름"
                name="carName"
                value={formData.carName}
                onChange={handleChange}
                required
                sx={{ mb: 3 }}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="대여료(1일)"
                name="rentalFee"
                type="number"
                value={formData.rentalFee}
                onChange={handleChange}
                required
                sx={{ mb: 3 }}
                InputProps={{
                  endAdornment: <span>원</span>
                }}
              />
            </Grid>

            <Grid item xs={12} className="tag-section">
              <Typography variant="subtitle1" gutterBottom sx={{ mb: 2 }}>
                태그 선택
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap className="tag-stack">
                {tags.map((tag) => (
                  <Chip
                    key={tag}
                    label={tag}
                    onClick={() => handleTagClick(tag)}
                    color={formData.tags.includes(tag) ? "primary" : "default"}
                    className="tag-chip"
                  />
                ))}
              </Stack>
            </Grid>

            <Grid item xs={12}>
              <Box className="submit-button-container">
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  size="large"
                  className="submit-button"
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

export default CarRegistration; 