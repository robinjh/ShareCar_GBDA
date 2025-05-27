import React, { useState, useContext } from 'react';
import { 
  Card, 
  CardContent, 
  Typography, 
  Chip, 
  Box,
  Button,
  Stack,
  Alert,
  CircularProgress
} from '@mui/material';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { UserContext } from '../UserContext';
import './CarCard.css';

function CarCard({ car, onStatusUpdate }) {
  const { user } = useContext(UserContext);
  const [isLoading, setIsLoading] = useState(false);
  const [localStatus, setLocalStatus] = useState(car["4_statusInfo"].status);

  // Timestamp를 Date 객체로 변환하는 함수
  const formatDate = (timestamp) => {
    if (!timestamp) return '날짜 정보 없음';
    
    // Firestore Timestamp인 경우
    if (timestamp.toDate) {
      return timestamp.toDate().toLocaleString();
    }
    
    // 일반 timestamp인 경우
    if (typeof timestamp === 'number') {
      return new Date(timestamp).toLocaleString();
    }
    
    // ISO 문자열인 경우
    if (typeof timestamp === 'string') {
      return new Date(timestamp).toLocaleString();
    }
    
    return '날짜 정보 없음';
  };

  const handleSelect = async () => {
    try {
      setIsLoading(true);
      setLocalStatus('확정');
      
      const carRef = doc(db, 'registrations', car.id);
      await updateDoc(carRef, {
        "4_statusInfo": {
          ...car["4_statusInfo"],
          status: '확정',
          guestID: user?.uid || ''
        }
      });
      
      if (onStatusUpdate) {
        onStatusUpdate(car.id, '확정');
      }
    } catch (error) {
      console.error('차량 상태 업데이트 실패:', error);
      alert('차량 선택에 실패했습니다.');
      setLocalStatus('대기중');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = async () => {
    try {
      setIsLoading(true);
      setLocalStatus('대기중');
      
      const carRef = doc(db, 'registrations', car.id);
      await updateDoc(carRef, {
        "4_statusInfo": {
          ...car["4_statusInfo"],
          status: '대기중'
        }
      });
      
      if (onStatusUpdate) {
        onStatusUpdate(car.id, '대기중');
      }
    } catch (error) {
      console.error('차량 상태 업데이트 실패:', error);
      alert('차량 선택 취소에 실패했습니다.');
      setLocalStatus('확정');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="car-card">
      <CardContent>
        {localStatus === '확정' && (
          <Alert severity="success" sx={{ mb: 2 }}>
            이 차량은 이미 확정되었습니다.
          </Alert>
        )}

        <Typography variant="h4" className="car-number">
          {car["1_basicInfo"].carNumber}
        </Typography>

        <Box className="car-info">
          <Typography variant="body2">
            대여 가능 시간: {formatDate(car["2_timeInfo"]["1_startTime"])} ~ {formatDate(car["2_timeInfo"]["2_endTime"])}
          </Typography>
        </Box>

        <Box className="car-price">
          <Typography variant="h6" color="primary">
            {Number(car["1_basicInfo"].rentalFee).toLocaleString()}원/일
          </Typography>
        </Box>

        <Box className="tag-container">
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {car["3_tags"].map((tag) => (
              <Chip 
                key={tag}
                label={tag} 
                color="primary" 
                variant="outlined" 
                size="small"
                className="tag-chip"
              />
            ))}
          </Stack>
          <Chip 
            label={localStatus} 
            color={localStatus === '대기중' ? 'success' : 'error'} 
            className="status-chip"
          />
        </Box>

        <Stack className="button-container">
          {localStatus === '대기중' && (
            <Button 
              variant="contained" 
              color="primary" 
              className="action-button"
              onClick={handleSelect}
              disabled={isLoading}
              startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : null}
            >
              {isLoading ? '처리 중...' : '차량 선택'}
            </Button>
          )}
          {localStatus === '확정' && (
            <Button 
              variant="outlined" 
              color="error" 
              className="action-button"
              onClick={handleCancel}
              disabled={isLoading}
              startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : null}
            >
              {isLoading ? '처리 중...' : '선택 취소'}
            </Button>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}

export default CarCard; 