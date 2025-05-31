import React, { useState, useContext } from 'react';
import { Container, Paper, Typography, TextField, FormControl, InputLabel, Select, MenuItem, Stack, Chip, Button, Alert } from '@mui/material';
import { carTypes, carBrands, tags } from '../constants/carData';
import { UserContext } from '../UserContext';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase';

const CarRegistration = () => {
  const { user } = useContext(UserContext);
  const [formData, setFormData] = useState({
    carNumber: '',
    carType: '',
    carName: '',
    carBrand: '',
    otherBrand: '',
    rentalFee: '',
    tags: [],
    hostName: ''
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleInputChange = (e) => {
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
      if (!user) {
        throw new Error('로그인이 필요합니다.');
      }

      if (!formData.carNumber || !formData.carType || !formData.carName || !formData.carBrand || !formData.rentalFee || !formData.hostName) {
        throw new Error('모든 필수 항목을 입력해주세요.');
      }

      if (formData.carBrand === '기타' && !formData.otherBrand) {
        throw new Error('기타 제조사를 선택한 경우 제조사명을 입력해주세요.');
      }

      const carData = {
        carNumber: formData.carNumber,
        carType: formData.carType,
        carName: formData.carName,
        carBrand: formData.carBrand === '기타' ? `기타(${formData.otherBrand})` : formData.carBrand,
        rentalFee: parseInt(formData.rentalFee),
        tags: formData.tags,
        hostID: user.uid,
        hostName: formData.hostName,
        registeredAt: new Date()
      };

      const docRef = await addDoc(collection(db, 'registrations'), carData);
      console.log('차량이 등록되었습니다. 문서 ID:', docRef.id);
      
      setSuccess('차량이 성공적으로 등록되었습니다!');
      setFormData({
        carNumber: '',
        carType: '',
        carName: '',
        carBrand: '',
        otherBrand: '',
        rentalFee: '',
        tags: [],
        hostName: ''
      });
    } catch (error) {
      console.error('차량 등록 실패:', error);
      setError(error.message);
    }
  };

  return (
    <Container maxWidth="sm" className="registration-container">
      <Paper elevation={3} sx={{ p: 4, mt: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          차량 등록
        </Typography>

        {error && <Alert severity="error" className="alert">{error}</Alert>}
        {success && <Alert severity="success" className="alert">{success}</Alert>}

        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="차량번호"
            name="carNumber"
            value={formData.carNumber}
            onChange={handleInputChange}
            margin="normal"
            required
          />

          <TextField
            fullWidth
            label="등록자 이름"
            name="hostName"
            value={formData.hostName}
            onChange={handleInputChange}
            margin="normal"
            required
          />

          <FormControl fullWidth margin="normal" required>
            <InputLabel>차량 분류</InputLabel>
            <Select
              name="carType"
              value={formData.carType}
              onChange={handleInputChange}
              label="차량 분류"
              sx={{ textAlign: 'left' }}
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

          <TextField
            fullWidth
            label="차량명"
            name="carName"
            value={formData.carName}
            onChange={handleInputChange}
            margin="normal"
            required
          />

          <FormControl fullWidth margin="normal" required>
            <InputLabel>제조사</InputLabel>
            <Select
              name="carBrand"
              value={formData.carBrand}
              onChange={handleInputChange}
              label="제조사"
              sx={{ textAlign: 'left' }}
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

          {formData.carBrand === '기타' && (
            <TextField
              fullWidth
              label="기타 제조사명"
              name="otherBrand"
              value={formData.otherBrand}
              onChange={handleInputChange}
              margin="normal"
              required
            />
          )}

          <TextField
            fullWidth
            label="대여료 (원/일)"
            name="rentalFee"
            type="number"
            value={formData.rentalFee}
            onChange={handleInputChange}
            margin="normal"
            required
          />

          <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>
            태그 선택
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
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

          <Button
            type="submit"
            variant="contained"
            color="primary"
            fullWidth
            size="large"
            sx={{ mt: 3 }}
          >
            차량 등록
          </Button>
        </form>
      </Paper>
    </Container>
  );
};

export default CarRegistration; 