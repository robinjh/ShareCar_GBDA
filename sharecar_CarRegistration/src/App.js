import React, { useState } from 'react';
import { 
  Container, 
  Paper, 
  TextField, 
  Button, 
  Typography,
  Box
} from '@mui/material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import koLocale from 'date-fns/locale/ko';

function App() {
  const [carNumber, setCarNumber] = useState('');
  const [unusedTimeStart, setUnusedTimeStart] = useState(null);
  const [unusedTimeEnd, setUnusedTimeEnd] = useState(null);
  const [rentalFee, setRentalFee] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log({
      carNumber,
      unusedTimeStart,
      unusedTimeEnd,
      rentalFee: Number(rentalFee)
    });
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
              label="차량 번호"
              value={carNumber}
              onChange={(e) => setCarNumber(e.target.value)}
              margin="normal"
              required
            />
            <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={koLocale}>
              <DateTimePicker
                label="미사용 시작 시간"
                value={unusedTimeStart}
                onChange={setUnusedTimeStart}
                renderInput={(params) => <TextField {...params} fullWidth margin="normal" required />}
              />
              <DateTimePicker
                label="미사용 종료 시간"
                value={unusedTimeEnd}
                onChange={setUnusedTimeEnd}
                renderInput={(params) => <TextField {...params} fullWidth margin="normal" required />}
              />
            </LocalizationProvider>
            <TextField
              fullWidth
              label="대여 비용"
              type="number"
              value={rentalFee}
              onChange={(e) => setRentalFee(e.target.value)}
              margin="normal"
              required
            />
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
    </Container>
  );
}

export default App; 