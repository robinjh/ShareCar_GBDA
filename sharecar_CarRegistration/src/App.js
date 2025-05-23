import React, { useState } from 'react';
import { 
  Container, 
  Paper, 
  TextField, 
  Button, 
  Typography,
  Box,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  Snackbar
} from '@mui/material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import koLocale from 'date-fns/locale/ko';

function App() {
  const [name, setName] = useState('');
  const [carNumber, setCarNumber] = useState('');
  const [rentalStartTime, setRentalStartTime] = useState(null);
  const [rentalEndTime, setRentalEndTime] = useState(null);
  const [rentalFee, setRentalFee] = useState('');
  const [tag, setTag] = useState('');
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const requestData = {
        name,
        carNumber,
        rentalStartTime,
        rentalEndTime,
        rentalFee: Number(rentalFee),
        tag
      };
      console.log('전송할 데이터:', requestData);

      const response = await fetch('http://localhost:5000/api/registrations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        throw new Error('차량 등록에 실패했습니다.');
      }

      // 폼 초기화
      setName('');
      setCarNumber('');
      setRentalStartTime(null);
      setRentalEndTime(null);
      setRentalFee('');
      setTag('');

      setSnackbar({
        open: true,
        message: '차량이 성공적으로 등록되었습니다.',
        severity: 'success'
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: error.message,
        severity: 'error'
      });
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 4 }}>
        <Paper elevation={3} sx={{ p: 3 }}>
          <Typography variant="h4" component="h1" gutterBottom align="center">
            차량 등록
          </Typography>
          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="차량 소유자 이름"
              value={name}
              onChange={(e) => setName(e.target.value)}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="차량 번호"
              value={carNumber}
              onChange={(e) => setCarNumber(e.target.value)}
              margin="normal"
              required
            />
            <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={koLocale}>
              <DateTimePicker
                label="대여 시작 시간"
                value={rentalStartTime}
                onChange={setRentalStartTime}
                renderInput={(params) => <TextField {...params} fullWidth margin="normal" required />}
              />
              <DateTimePicker
                label="대여 종료 시간"
                value={rentalEndTime}
                onChange={setRentalEndTime}
                renderInput={(params) => <TextField {...params} fullWidth margin="normal" required />}
              />
            </LocalizationProvider>
            <TextField
              fullWidth
              label="대여 희망 가격"
              type="number"
              value={rentalFee}
              onChange={(e) => setRentalFee(e.target.value)}
              margin="normal"
              required
            />
            <FormControl fullWidth margin="normal" required>
              <InputLabel>차량 사용 목적</InputLabel>
              <Select
                value={tag}
                label="차량 사용 목적"
                onChange={(e) => setTag(e.target.value)}
              >
                {tags.map((tag) => (
                  <MenuItem key={tag} value={tag}>
                    {tag}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              fullWidth
              sx={{ mt: 2 }}
            >
              등록하기
            </Button>
          </form>
        </Paper>
      </Box>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}

export default App; 