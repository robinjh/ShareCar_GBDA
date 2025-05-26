import React, { useState } from 'react';
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
  Stack
} from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { collection, setDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import './CarRegistration.css';

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
  const getTomorrow = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow;
  };

  const [formData, setFormData] = useState({
    name: '',
    carNumber: '',
    rentalStartTime: new Date(),
    rentalEndTime: getTomorrow(),
    rentalFee: '',
    tags: [],
    hostID: '',
    guestID: '',
    status: '대기중'
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

  const handleDateChange = (name) => (date) => {
    setFormData(prev => ({
      ...prev,
      [name]: date
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
      if (!formData.name || !formData.carNumber || !formData.rentalFee) {
        throw new Error('모든 필수 항목을 입력해주세요.');
      }

      if (formData.rentalStartTime >= formData.rentalEndTime) {
        throw new Error('대여 종료 시간은 시작 시간보다 이후여야 합니다.');
      }

      // Firestore에 데이터 저장 (커스텀 객체 구조 사용)
      const carData = {
        // 기본 정보
        "1_basicInfo": {
          name: formData.name,
          carNumber: formData.carNumber,
          rentalFee: formData.rentalFee
        },
        // 시간 정보
        "2_timeInfo": {
          "1_startTime": formData.rentalStartTime.toISOString(),
          "2_endTime": formData.rentalEndTime.toISOString()
        },
        // 태그 정보
        "3_tags": formData.tags,
        // 상태 및 사용자 정보
        "4_statusInfo": {
          status: formData.status,
          hostID: formData.hostID,
          guestID: formData.guestID
        }
      };

      await setDoc(doc(db, 'registrations', formData.carNumber), carData);

      setSuccess('차량이 성공적으로 등록되었습니다!');
      setFormData({
        name: '',
        carNumber: '',
        rentalStartTime: new Date(),
        rentalEndTime: getTomorrow(),
        rentalFee: '',
        tags: [],
        hostID: '',
        guestID: '',
        status: '대기중'
      });
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <Container maxWidth="md" className="registration-container">
      <Paper elevation={3} className="registration-paper">
        <Typography variant="h4" component="h1" className="registration-title">
          차량 등록
        </Typography>

        {error && <Alert severity="error" className="alert">{error}</Alert>}
        {success && <Alert severity="success" className="alert">{success}</Alert>}

        <form onSubmit={handleSubmit} className="form-container">
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="이름"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
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
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DateTimePicker
                  label="대여 시작 시간"
                  value={formData.rentalStartTime}
                  onChange={handleDateChange('rentalStartTime')}
                  renderInput={(params) => <TextField {...params} fullWidth />}
                />
              </LocalizationProvider>
            </Grid>

            <Grid item xs={12} md={6}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DateTimePicker
                  label="대여 종료 시간"
                  value={formData.rentalEndTime}
                  onChange={handleDateChange('rentalEndTime')}
                  renderInput={(params) => <TextField {...params} fullWidth />}
                />
              </LocalizationProvider>
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
              />
            </Grid>

            <Grid item xs={12} className="tag-section">
              <Typography variant="subtitle1" gutterBottom>
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