// 반드시 import문보다 위에 선언!
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import Registration from './Registration';
import { UserContext } from '../../UserContext';
import { setDoc } from 'firebase/firestore';

// jest 환경에서 window.matchMedia mock
beforeAll(() => {
  window.matchMedia = window.matchMedia || function () {
    return {
      matches: false,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      addListener: jest.fn(),
      removeListener: jest.fn(),
      onchange: null,
      dispatchEvent: jest.fn(),
    };
  };
});

jest.mock('../../firebase', () => ({
  db: {},
}));
jest.mock('firebase/firestore', () => ({
  setDoc: jest.fn(),
  doc: jest.fn(),
}));

const mockUser = { uid: 'testuser', displayName: '테스트유저' };

const renderRegistration = (user = mockUser) =>
  render(
    <UserContext.Provider value={{ user }}>
      <Registration onNavigate={jest.fn()} onClose={jest.fn()} />
    </UserContext.Provider>
  );

// carBrands 상수 추가
const carBrands = ['현대', '기아', '르노', '쌍용', '쉐보레', 'BMW', '벤츠', '아우디', '폭스바겐', '기타'];

describe('Registration 컴포넌트', () => {
  let darkModeListener;
  
  beforeEach(() => {
    setDoc.mockReset();
    darkModeListener = null;
    
    // matchMedia 모킹 리셋
    window.matchMedia.mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn((event, callback) => {
        if (event === 'change') {
          darkModeListener = callback;
        }
      }),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));
  });

  it('렌더링 및 기본 UI 요소 표시', () => {
    renderRegistration();
    expect(screen.getByRole('heading', { name: '차량 등록' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '차량 등록' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('차량 등록자의 이름을 입력해주세요')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('차량번호를 입력해주세요')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('차량명을 입력하세요')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('대여료를 입력하세요')).toBeInTheDocument();
  });

  it('필수 입력값 없이 제출 시 에러 메시지 표시', async () => {
    renderRegistration();
    fireEvent.click(screen.getByRole('button', { name: '차량 등록' }));
    await waitFor(() => {
      expect(screen.getByText(/모든 필수 항목을 입력해주세요/)).toBeInTheDocument();
    });
  });

  it('기타 제조사 선택 시 기타 입력 필드가 나타난다', () => {
    renderRegistration();
    fireEvent.change(screen.getByLabelText('제조사'), { target: { value: '기타' } });
    expect(screen.getByPlaceholderText('예: 제네시스, 포르쉐 등')).toBeInTheDocument();
  });

  it('태그를 선택/해제할 수 있다', () => {
    renderRegistration();
    const tagBtn = screen.getByRole('button', { name: '#가족과 함께' });
    fireEvent.click(tagBtn);
    expect(tagBtn).toHaveClass('selected');
    fireEvent.click(tagBtn);
    expect(tagBtn).not.toHaveClass('selected');
  });

  it('로그인하지 않은 경우 경고 메시지와 버튼 비활성화', () => {
    renderRegistration(null);
    expect(screen.getByText(/로그인이 필요합니다/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '차량 등록' })).toBeDisabled();
  });

  it('정상적으로 차량 등록 시 성공 메시지 표시', async () => {
    setDoc.mockResolvedValueOnce();
    renderRegistration();
    fireEvent.change(screen.getByPlaceholderText('차량 등록자의 이름을 입력해주세요'), { target: { value: '홍길동' } });
    fireEvent.change(screen.getByPlaceholderText('차량번호를 입력해주세요'), { target: { value: '12가3456' } });
    fireEvent.change(screen.getByLabelText('차량 종류'), { target: { value: '소형' } });
    fireEvent.change(screen.getByLabelText('제조사'), { target: { value: '현대' } });
    fireEvent.change(screen.getByPlaceholderText('차량명을 입력하세요'), { target: { value: '아반떼' } });
    fireEvent.change(screen.getByPlaceholderText('대여료를 입력하세요'), { target: { value: '10000' } });
    fireEvent.click(screen.getByRole('button', { name: '차량 등록' }));
    await waitFor(() => {
      expect(screen.getByText('차량이 성공적으로 등록되었습니다!')).toBeInTheDocument();
    });
  });

  it('기타 제조사 선택 후 정상 등록', async () => {
    setDoc.mockResolvedValueOnce();
    renderRegistration();
    fireEvent.change(screen.getByPlaceholderText('차량 등록자의 이름을 입력해주세요'), { target: { value: '홍길동' } });
    fireEvent.change(screen.getByPlaceholderText('차량번호를 입력해주세요'), { target: { value: '12가3456' } });
    fireEvent.change(screen.getByLabelText('차량 종류'), { target: { value: '소형' } });
    fireEvent.change(screen.getByLabelText('제조사'), { target: { value: '기타' } });
    fireEvent.change(screen.getByPlaceholderText('예: 제네시스, 포르쉐 등'), { target: { value: '제네시스' } });
    fireEvent.change(screen.getByPlaceholderText('차량명을 입력하세요'), { target: { value: 'G80' } });
    fireEvent.change(screen.getByPlaceholderText('대여료를 입력하세요'), { target: { value: '20000' } });
    fireEvent.click(screen.getByRole('button', { name: '차량 등록' }));
    await waitFor(() => {
      expect(screen.getByText('차량이 성공적으로 등록되었습니다!')).toBeInTheDocument();
    });
  });

  it('등록 실패 시 에러 메시지 표시', async () => {
    setDoc.mockRejectedValueOnce(new Error('파이어베이스 에러'));
    renderRegistration();
    fireEvent.change(screen.getByPlaceholderText('차량 등록자의 이름을 입력해주세요'), { target: { value: '홍길동' } });
    fireEvent.change(screen.getByPlaceholderText('차량번호를 입력해주세요'), { target: { value: '12가3456' } });
    fireEvent.change(screen.getByLabelText('차량 종류'), { target: { value: '소형' } });
    fireEvent.change(screen.getByLabelText('제조사'), { target: { value: '현대' } });
    fireEvent.change(screen.getByPlaceholderText('차량명을 입력하세요'), { target: { value: '아반떼' } });
    fireEvent.change(screen.getByPlaceholderText('대여료를 입력하세요'), { target: { value: '10000' } });
    fireEvent.click(screen.getByRole('button', { name: '차량 등록' }));
    await waitFor(() => {
      expect(screen.getByText('파이어베이스 에러')).toBeInTheDocument();
    });
  });

  it('태그를 선택하지 않고 등록해도 정상 등록된다', async () => {
    setDoc.mockResolvedValueOnce();
    renderRegistration();
    fireEvent.change(screen.getByPlaceholderText('차량 등록자의 이름을 입력해주세요'), { target: { value: '홍길동' } });
    fireEvent.change(screen.getByPlaceholderText('차량번호를 입력해주세요'), { target: { value: '12가3456' } });
    fireEvent.change(screen.getByLabelText('차량 종류'), { target: { value: '소형' } });
    fireEvent.change(screen.getByLabelText('제조사'), { target: { value: '현대' } });
    fireEvent.change(screen.getByPlaceholderText('차량명을 입력하세요'), { target: { value: '아반떼' } });
    fireEvent.change(screen.getByPlaceholderText('대여료를 입력하세요'), { target: { value: '10000' } });
    fireEvent.click(screen.getByRole('button', { name: '차량 등록' }));
    await waitFor(() => {
      expect(screen.getByText('차량이 성공적으로 등록되었습니다!')).toBeInTheDocument();
    });
  });

  describe('추가 기능 테스트', () => {
    it('차량 등록 시 필수 입력값이 누락되면 에러 메시지가 표시된다', async () => {
      renderRegistration();
      
      // 등록 버튼 클릭
      fireEvent.click(screen.getByRole('button', { name: '차량 등록' }));
      
      // 필수 입력값 에러 메시지 확인
      expect(screen.getByText('모든 필수 항목을 입력해주세요.')).toBeInTheDocument();
    });

    it('차량 등록 시 잘못된 입력값에 대해 적절한 에러 메시지가 표시된다', async () => {
      renderRegistration();
      
      // 모든 필수 입력값 입력
      fireEvent.change(screen.getByPlaceholderText('차량 등록자의 이름을 입력해주세요'), 
        { target: { value: '홍길동' } });
      fireEvent.change(screen.getByLabelText('차량 종류'), 
        { target: { value: '소형' } });
      fireEvent.change(screen.getByLabelText('제조사'), 
        { target: { value: '기타' } });
      fireEvent.change(screen.getByPlaceholderText('차량명을 입력하세요'), 
        { target: { value: '아반떼' } });
      fireEvent.change(screen.getByPlaceholderText('대여료를 입력하세요'), 
        { target: { value: '10000' } });
      
      // 기타 제조사명 입력 필드가 나타나는지 확인
      const otherBrandInput = screen.getByPlaceholderText('예: 제네시스, 포르쉐 등');
      expect(otherBrandInput).toBeInTheDocument();
      expect(screen.getByText(/기타 제조사를 선택한 경우 제조사명을 입력해주세요/)).toBeInTheDocument();
      
      // 기타 제조사명 입력
      fireEvent.change(otherBrandInput, { target: { value: '제네시스' } });
      
      // 차량번호 누락 시 에러 메시지 확인
      fireEvent.click(screen.getByRole('button', { name: '차량 등록' }));
      expect(screen.getByText('모든 필수 항목을 입력해주세요.')).toBeInTheDocument();
      
      // 차량번호 입력
      fireEvent.change(screen.getByPlaceholderText('차량번호를 입력해주세요'),
        { target: { value: '12가3456' } });
      
      // 정상 등록 시도
      fireEvent.click(screen.getByRole('button', { name: '차량 등록' }));
      await waitFor(() => {
        expect(screen.getByText('차량이 성공적으로 등록되었습니다!')).toBeInTheDocument();
      });
    });

    it('차량 등록 성공 시 적절한 피드백이 표시된다', async () => {
      setDoc.mockResolvedValueOnce();
      renderRegistration();
      
      // 유효한 입력값 입력
      fireEvent.change(screen.getByPlaceholderText('차량명을 입력하세요'),
        { target: { value: '테스트 차량' } });
      fireEvent.change(screen.getByPlaceholderText('차량번호를 입력해주세요'),
        { target: { value: '12가3456' } });
      fireEvent.change(screen.getByLabelText('제조사'),
        { target: { value: '현대' } });
      fireEvent.change(screen.getByLabelText('차량 종류'),
        { target: { value: '소형' } });
      fireEvent.change(screen.getByPlaceholderText('대여료를 입력하세요'),
        { target: { value: '10000' } });
      fireEvent.change(screen.getByPlaceholderText('차량 등록자의 이름을 입력해주세요'),
        { target: { value: '홍길동' } });
      
      // 등록 버튼 클릭
      fireEvent.click(screen.getByRole('button', { name: '차량 등록' }));
      
      // 성공 메시지 확인
      await waitFor(() => {
        expect(screen.getByText('차량이 성공적으로 등록되었습니다!')).toBeInTheDocument();
      });
      
      // 입력 필드 초기화 확인
      expect(screen.getByPlaceholderText('차량명을 입력하세요')).toHaveValue('');
      expect(screen.getByPlaceholderText('차량번호를 입력해주세요')).toHaveValue('');
      expect(screen.getByLabelText('제조사')).toHaveValue('');
      expect(screen.getByLabelText('차량 종류')).toHaveValue('');
      expect(screen.getByPlaceholderText('대여료를 입력하세요')).toHaveValue('');
      expect(screen.getByPlaceholderText('차량 등록자의 이름을 입력해주세요')).toHaveValue('');
    });

    it('기타 제조사 선택 시 제조사명을 입력하지 않으면 에러 메시지가 표시된다', async () => {
      renderRegistration();
      
      // 필수 입력값 입력
      fireEvent.change(screen.getByPlaceholderText('차량 등록자의 이름을 입력해주세요'), 
        { target: { value: '홍길동' } });
      fireEvent.change(screen.getByLabelText('차량 종류'), 
        { target: { value: '소형' } });
      fireEvent.change(screen.getByLabelText('제조사'), 
        { target: { value: '기타' } });
      fireEvent.change(screen.getByPlaceholderText('차량명을 입력하세요'), 
        { target: { value: '아반떼' } });
      fireEvent.change(screen.getByPlaceholderText('대여료를 입력하세요'), 
        { target: { value: '10000' } });
      fireEvent.change(screen.getByPlaceholderText('차량번호를 입력해주세요'),
        { target: { value: '12가3456' } });
      
      // 제조사명 입력하지 않고 등록 시도
      fireEvent.click(screen.getByRole('button', { name: '차량 등록' }));
      
      // 에러 메시지 확인
      await waitFor(() => {
        expect(screen.getByText('기타 제조사를 선택한 경우 제조사명을 입력해주세요.')).toBeInTheDocument();
      });
    });

    it('로그인하지 않은 상태에서 폼 제출 시도 시 에러 메시지가 표시된다', async () => {
      // 로그인하지 않은 상태로 컴포넌트 렌더링
      const { container } = renderRegistration(null);
      
      // 필수 입력값 입력
      fireEvent.change(screen.getByPlaceholderText('차량 등록자의 이름을 입력해주세요'), 
        { target: { value: '홍길동' } });
      fireEvent.change(screen.getByLabelText('차량 종류'), 
        { target: { value: '소형' } });
      fireEvent.change(screen.getByLabelText('제조사'), 
        { target: { value: '현대' } });
      fireEvent.change(screen.getByPlaceholderText('차량명을 입력하세요'), 
        { target: { value: '아반떼' } });
      fireEvent.change(screen.getByPlaceholderText('대여료를 입력하세요'), 
        { target: { value: '10000' } });
      fireEvent.change(screen.getByPlaceholderText('차량번호를 입력해주세요'),
        { target: { value: '12가3456' } });
      
      // 폼 제출 시도 (disabled 속성을 일시적으로 제거)
      const submitButton = screen.getByRole('button', { name: '차량 등록' });
      submitButton.disabled = false;
      fireEvent.click(submitButton);
      
      // 에러 메시지 확인
      await waitFor(() => {
        expect(screen.getByText('로그인이 필요합니다.')).toBeInTheDocument();
      });
    });

    it('차량 등록 성공 시 폼 데이터가 정확히 초기화된다', async () => {
      setDoc.mockResolvedValueOnce();
      const { container } = renderRegistration();
      
      // 폼 데이터 입력
      const formData = {
        hostName: '홍길동',
        carNumber: '12가3456',
        carType: '소형',
        carBrand: '현대',
        carName: '아반떼',
        rentalFee: '10000',
        tags: ['#가족과 함께']
      };
      
      // 입력 필드에 데이터 입력
      fireEvent.change(screen.getByPlaceholderText('차량 등록자의 이름을 입력해주세요'), 
        { target: { value: formData.hostName } });
      fireEvent.change(screen.getByPlaceholderText('차량번호를 입력해주세요'), 
        { target: { value: formData.carNumber } });
      fireEvent.change(screen.getByLabelText('차량 종류'), 
        { target: { value: formData.carType } });
      fireEvent.change(screen.getByLabelText('제조사'),
        { target: { value: formData.carBrand } });
      fireEvent.change(screen.getByPlaceholderText('차량명을 입력하세요'),
        { target: { value: formData.carName } });
      fireEvent.change(screen.getByPlaceholderText('대여료를 입력하세요'),
        { target: { value: formData.rentalFee } });
      
      // 태그 선택
      fireEvent.click(screen.getByRole('button', { name: '#가족과 함께' }));
      
      // 등록 버튼 클릭
      fireEvent.click(screen.getByRole('button', { name: '차량 등록' }));
      
      // 성공 메시지 확인
      await waitFor(() => {
        expect(screen.getByText('차량이 성공적으로 등록되었습니다!')).toBeInTheDocument();
      });
      
      // 모든 입력 필드가 초기화되었는지 확인
      expect(screen.getByPlaceholderText('차량 등록자의 이름을 입력해주세요')).toHaveValue('');
      expect(screen.getByPlaceholderText('차량번호를 입력해주세요')).toHaveValue('');
      expect(screen.getByLabelText('차량 종류')).toHaveValue('');
      expect(screen.getByLabelText('제조사')).toHaveValue('');
      expect(screen.getByPlaceholderText('차량명을 입력하세요')).toHaveValue('');
      expect(screen.getByPlaceholderText('대여료를 입력하세요')).toHaveValue('');
      expect(screen.getByRole('button', { name: '#가족과 함께' })).not.toHaveClass('selected');
    });

    it('기타 제조사 선택 시 carData에 올바른 형식으로 저장된다', async () => {
      setDoc.mockImplementation((docRef, data) => {
        expect(data.carBrand).toBe('기타(제네시스)');
        return Promise.resolve();
      });
      
      renderRegistration();
      
      // 모든 필수 입력값 입력
      fireEvent.change(screen.getByPlaceholderText('차량 등록자의 이름을 입력해주세요'), 
        { target: { value: '홍길동' } });
      fireEvent.change(screen.getByPlaceholderText('차량번호를 입력해주세요'),
        { target: { value: '12가3456' } });
      fireEvent.change(screen.getByLabelText('차량 종류'),
        { target: { value: '소형' } });
      fireEvent.change(screen.getByLabelText('제조사'),
        { target: { value: '기타' } });
      fireEvent.change(screen.getByPlaceholderText('예: 제네시스, 포르쉐 등'),
        { target: { value: '제네시스' } });
      fireEvent.change(screen.getByPlaceholderText('차량명을 입력하세요'),
        { target: { value: 'G80' } });
      fireEvent.change(screen.getByPlaceholderText('대여료를 입력하세요'),
        { target: { value: '20000' } });
      
      // 등록 버튼 클릭
      fireEvent.click(screen.getByRole('button', { name: '차량 등록' }));
      
      // 성공 메시지 확인
      await waitFor(() => {
        expect(screen.getByText('차량이 성공적으로 등록되었습니다!')).toBeInTheDocument();
      });
    });

    it('차량 등록 시 carData의 모든 필드가 올바르게 저장된다', async () => {
      const mockUser = { uid: 'testuser123', displayName: '테스트유저' };
      let savedData = null;
      
      setDoc.mockImplementation((docRef, data) => {
        savedData = data;
        return Promise.resolve();
      });
      
      renderRegistration(mockUser);
      
      // 모든 필수 입력값 입력
      fireEvent.change(screen.getByPlaceholderText('차량 등록자의 이름을 입력해주세요'), 
        { target: { value: '홍길동' } });
      fireEvent.change(screen.getByPlaceholderText('차량번호를 입력해주세요'),
        { target: { value: '12가3456' } });
      fireEvent.change(screen.getByLabelText('차량 종류'),
        { target: { value: '소형' } });
      fireEvent.change(screen.getByLabelText('제조사'),
        { target: { value: '현대' } });
      fireEvent.change(screen.getByPlaceholderText('차량명을 입력하세요'),
        { target: { value: '아반떼' } });
      fireEvent.change(screen.getByPlaceholderText('대여료를 입력하세요'),
        { target: { value: '10000' } });
      
      // 태그 선택
      fireEvent.click(screen.getByRole('button', { name: '#가족과 함께' }));
      fireEvent.click(screen.getByRole('button', { name: '#비즈니스' }));
      
      // 등록 버튼 클릭
      fireEvent.click(screen.getByRole('button', { name: '차량 등록' }));
      
      // 성공 메시지 확인
      await waitFor(() => {
        expect(screen.getByText('차량이 성공적으로 등록되었습니다!')).toBeInTheDocument();
      });
      
      // carData 객체의 모든 필드가 올바르게 저장되었는지 확인
      expect(savedData).toEqual({
        carBrand: '현대',
        carName: '아반떼',
        carNumber: '12가3456',
        carType: '소형',
        hostID: 'testuser123',
        hostName: '홍길동',
        rentalFee: '10000',
        tags: ['#가족과 함께', '#비즈니스']
      });
    });

    it('태그를 선택하지 않고 등록 시 carData의 tags 필드가 빈 배열로 저장된다', async () => {
      const mockUser = { uid: 'testuser123', displayName: '테스트유저' };
      let savedData = null;
      
      setDoc.mockImplementation((docRef, data) => {
        savedData = data;
        return Promise.resolve();
      });
      
      renderRegistration(mockUser);
      
      // 모든 필수 입력값 입력 (태그 제외)
      fireEvent.change(screen.getByPlaceholderText('차량 등록자의 이름을 입력해주세요'), 
        { target: { value: '홍길동' } });
      fireEvent.change(screen.getByPlaceholderText('차량번호를 입력해주세요'),
        { target: { value: '12가3456' } });
      fireEvent.change(screen.getByLabelText('차량 종류'),
        { target: { value: '소형' } });
      fireEvent.change(screen.getByLabelText('제조사'),
        { target: { value: '현대' } });
      fireEvent.change(screen.getByPlaceholderText('차량명을 입력하세요'),
        { target: { value: '아반떼' } });
      fireEvent.change(screen.getByPlaceholderText('대여료를 입력하세요'),
        { target: { value: '10000' } });
      
      // 등록 버튼 클릭
      fireEvent.click(screen.getByRole('button', { name: '차량 등록' }));
      
      // 성공 메시지 확인
      await waitFor(() => {
        expect(screen.getByText('차량이 성공적으로 등록되었습니다!')).toBeInTheDocument();
      });
      
      // carData 객체의 tags 필드가 빈 배열인지 확인
      expect(savedData.tags).toEqual([]);
    });

    describe('carData 객체 생성 테스트', () => {
      it('일반 제조사 선택 시 carBrand가 그대로 저장된다', async () => {
        let savedData = null;
        setDoc.mockImplementation((docRef, data) => {
          savedData = data;
          return Promise.resolve();
        });
        
        renderRegistration();
        
        // 모든 필수 입력값 입력
        fireEvent.change(screen.getByPlaceholderText('차량 등록자의 이름을 입력해주세요'), 
          { target: { value: '홍길동' } });
        fireEvent.change(screen.getByPlaceholderText('차량번호를 입력해주세요'),
          { target: { value: '12가3456' } });
        fireEvent.change(screen.getByLabelText('차량 종류'),
          { target: { value: '소형' } });
        fireEvent.change(screen.getByLabelText('제조사'),
          { target: { value: '현대' } });
        fireEvent.change(screen.getByPlaceholderText('차량명을 입력하세요'),
          { target: { value: '아반떼' } });
        fireEvent.change(screen.getByPlaceholderText('대여료를 입력하세요'),
          { target: { value: '10000' } });
        
        // 등록 버튼 클릭
        fireEvent.click(screen.getByRole('button', { name: '차량 등록' }));
        
        // 성공 메시지 확인
        await waitFor(() => {
          expect(screen.getByText('차량이 성공적으로 등록되었습니다!')).toBeInTheDocument();
        });
        
        // carBrand가 그대로 저장되었는지 확인
        expect(savedData.carBrand).toBe('현대');
        expect(savedData.carBrand).not.toContain('기타');
        expect(savedData.carBrand).not.toContain('(');
        expect(savedData.carBrand).not.toContain(')');
      });

      it('기타 제조사 선택 시 carBrand가 기타(제조사명) 형식으로 저장된다', async () => {
        let savedData = null;
        setDoc.mockImplementation((docRef, data) => {
          savedData = data;
          return Promise.resolve();
        });
        
        renderRegistration();
        
        // 모든 필수 입력값 입력
        fireEvent.change(screen.getByPlaceholderText('차량 등록자의 이름을 입력해주세요'), 
          { target: { value: '홍길동' } });
        fireEvent.change(screen.getByPlaceholderText('차량번호를 입력해주세요'),
          { target: { value: '12가3456' } });
        fireEvent.change(screen.getByLabelText('차량 종류'),
          { target: { value: '소형' } });
        fireEvent.change(screen.getByLabelText('제조사'),
          { target: { value: '기타' } });
        fireEvent.change(screen.getByPlaceholderText('예: 제네시스, 포르쉐 등'),
          { target: { value: '제네시스' } });
        fireEvent.change(screen.getByPlaceholderText('차량명을 입력하세요'),
          { target: { value: 'G80' } });
        fireEvent.change(screen.getByPlaceholderText('대여료를 입력하세요'),
          { target: { value: '20000' } });
        
        // 등록 버튼 클릭
        fireEvent.click(screen.getByRole('button', { name: '차량 등록' }));
        
        // 성공 메시지 확인
        await waitFor(() => {
          expect(screen.getByText('차량이 성공적으로 등록되었습니다!')).toBeInTheDocument();
        });
        
        // carBrand가 기타(제조사명) 형식으로 저장되었는지 확인
        expect(savedData.carBrand).toBe('기타(제네시스)');
        expect(savedData.carBrand).toContain('기타');
        expect(savedData.carBrand).toContain('제네시스');
        expect(savedData.carBrand).toContain('(');
        expect(savedData.carBrand).toContain(')');
      });

      it('기타 제조사 선택 시 제조사명이 비어있으면 에러가 발생한다', async () => {
        renderRegistration();
        
        // 기타 제조사 선택 후 제조사명 입력하지 않음
        fireEvent.change(screen.getByPlaceholderText('차량 등록자의 이름을 입력해주세요'), 
          { target: { value: '홍길동' } });
        fireEvent.change(screen.getByPlaceholderText('차량번호를 입력해주세요'),
          { target: { value: '12가3456' } });
        fireEvent.change(screen.getByLabelText('차량 종류'),
          { target: { value: '소형' } });
        fireEvent.change(screen.getByLabelText('제조사'),
          { target: { value: '기타' } });
        fireEvent.change(screen.getByPlaceholderText('차량명을 입력하세요'),
          { target: { value: 'G80' } });
        fireEvent.change(screen.getByPlaceholderText('대여료를 입력하세요'),
          { target: { value: '20000' } });
        
        // 등록 버튼 클릭
        fireEvent.click(screen.getByRole('button', { name: '차량 등록' }));
        
        // 에러 메시지 확인
        await waitFor(() => {
          expect(screen.getByText('기타 제조사를 선택한 경우 제조사명을 입력해주세요.')).toBeInTheDocument();
        });
        
        // carData가 생성되지 않았는지 확인
        expect(setDoc).not.toHaveBeenCalled();
      });

      it('기타 제조사 선택 시 제조사명이 공백이면 에러가 발생한다', async () => {
        renderRegistration();
        
        // 기타 제조사 선택 후 제조사명에 공백만 입력
        fireEvent.change(screen.getByPlaceholderText('차량 등록자의 이름을 입력해주세요'), 
          { target: { value: '홍길동' } });
        fireEvent.change(screen.getByPlaceholderText('차량번호를 입력해주세요'),
          { target: { value: '12가3456' } });
        fireEvent.change(screen.getByLabelText('차량 종류'),
          { target: { value: '소형' } });
        fireEvent.change(screen.getByLabelText('제조사'),
          { target: { value: '기타' } });
        
        // 기타 제조사명 입력 필드가 나타나는지 확인
        const otherBrandInput = screen.getByPlaceholderText('예: 제네시스, 포르쉐 등');
        expect(otherBrandInput).toBeInTheDocument();
        
        // 공백만 입력
        fireEvent.change(otherBrandInput, { target: { value: '   ' } });
        fireEvent.change(screen.getByPlaceholderText('차량명을 입력하세요'),
          { target: { value: 'G80' } });
        fireEvent.change(screen.getByPlaceholderText('대여료를 입력하세요'),
          { target: { value: '20000' } });
        
        // 등록 버튼 클릭
        fireEvent.click(screen.getByRole('button', { name: '차량 등록' }));
        
        // 에러 메시지 확인
        await waitFor(() => {
          const errorAlert = screen.getByRole('alert');
          expect(errorAlert).toHaveClass('error');
          expect(errorAlert).toHaveTextContent('기타 제조사를 선택한 경우 제조사명을 입력해주세요');
        });
        
        // carData가 생성되지 않았는지 확인
        expect(setDoc).not.toHaveBeenCalled();
        
        // 성공 메시지가 표시되지 않는지 확인
        expect(screen.queryByText('차량이 성공적으로 등록되었습니다!')).not.toBeInTheDocument();
        
        // 폼 데이터가 유지되는지 확인
        expect(screen.getByPlaceholderText('차량 등록자의 이름을 입력해주세요')).toHaveValue('홍길동');
        expect(screen.getByPlaceholderText('차량번호를 입력해주세요')).toHaveValue('12가3456');
        expect(screen.getByLabelText('차량 종류')).toHaveValue('소형');
        expect(screen.getByLabelText('제조사')).toHaveValue('기타');
        expect(otherBrandInput).toHaveValue('   ');
        expect(screen.getByPlaceholderText('차량명을 입력하세요')).toHaveValue('G80');
        expect(screen.getByPlaceholderText('대여료를 입력하세요')).toHaveValue('20000');
      });
    });

    describe('다크모드 메시지 테스트', () => {
      let mockSetSuccess;
      let mockSetFormData;
      let mockSetError;
      let mockSetIsDarkMode;
      let successState;
      let formDataState;
      let errorState;
      let isDarkModeState;
      
      beforeEach(() => {
        // 상태 초기화
        successState = '';
        formDataState = {
          carNumber: '',
          carType: '',
          carName: '',
          carBrand: '',
          otherBrand: '',
          rentalFee: '',
          tags: [],
          hostName: '',
          hostID: mockUser.uid
        };
        errorState = null;
        isDarkModeState = false;

        // 모의 함수 설정
        mockSetSuccess = jest.fn().mockImplementation((value) => {
          successState = value;
        });
        mockSetFormData = jest.fn().mockImplementation((value) => {
          if (typeof value === 'function') {
            formDataState = value(formDataState);
          } else {
            formDataState = value;
          }
        });
        mockSetError = jest.fn().mockImplementation((value) => {
          errorState = value;
        });
        mockSetIsDarkMode = jest.fn().mockImplementation((value) => {
          isDarkModeState = value;
        });
        
        // useState 모킹 개선
        jest.spyOn(React, 'useState').mockImplementation((initial) => {
          if (initial === '') {
            return [successState, mockSetSuccess];
          } else if (Array.isArray(initial)) {
            return [formDataState.tags, mockSetFormData];
          } else if (typeof initial === 'object' && initial !== null) {
            return [formDataState, mockSetFormData];
          } else if (initial === null) {
            return [errorState, mockSetError];
          } else if (typeof initial === 'boolean') {
            return [isDarkModeState, mockSetIsDarkMode];
          }
          return [initial, jest.fn()];
        });

        // setDoc 모킹 리셋 및 설정
        setDoc.mockReset();
        setDoc.mockImplementation(() => Promise.resolve());
      });

      afterEach(() => {
        jest.restoreAllMocks();
        successState = '';
        formDataState = {
          carNumber: '',
          carType: '',
          carName: '',
          carBrand: '',
          otherBrand: '',
          rentalFee: '',
          tags: [],
          hostName: '',
          hostID: mockUser.uid
        };
        errorState = null;
        isDarkModeState = false;
      });

      it('다크모드에서 차량 등록 성공 시 모든 상태 변경이 올바르게 이루어진다', async () => {
        // 다크모드 활성화
        window.matchMedia.mockImplementation(query => ({
          matches: true,
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn((event, callback) => {
            if (event === 'change') {
              darkModeListener = callback;
            }
          }),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        }));

        // 초기 상태 설정
        const initialFormData = {
          hostName: '홍길동',
          carNumber: '12가3456',
          carType: '소형',
          carBrand: '현대',
          carName: '아반떼',
          rentalFee: '10000',
          tags: ['#가족과 함께'],
          hostID: mockUser.uid
        };

        // 컴포넌트 렌더링
        const { container, rerender } = renderRegistration();

        // 다크모드 상태 변경 시뮬레이션
        await act(async () => {
          if (darkModeListener) {
            darkModeListener({ matches: true });
          }
        });

        // 모든 필수 입력값 입력
        await act(async () => {
          fireEvent.change(screen.getByPlaceholderText('차량 등록자의 이름을 입력해주세요'), 
            { target: { value: initialFormData.hostName } });
          fireEvent.change(screen.getByPlaceholderText('차량번호를 입력해주세요'),
            { target: { value: initialFormData.carNumber } });
          fireEvent.change(screen.getByLabelText('차량 종류'),
            { target: { value: initialFormData.carType } });
          fireEvent.change(screen.getByLabelText('제조사'),
            { target: { value: initialFormData.carBrand } });
          fireEvent.change(screen.getByPlaceholderText('차량명을 입력하세요'),
            { target: { value: initialFormData.carName } });
          fireEvent.change(screen.getByPlaceholderText('대여료를 입력하세요'),
            { target: { value: initialFormData.rentalFee } });
          fireEvent.click(screen.getByRole('button', { name: '#가족과 함께' }));
        });

        // 폼 제출
        await act(async () => {
          const form = screen.getByRole('form');
          const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
          form.dispatchEvent(submitEvent);
        });

        // setDoc 호출 확인
        await waitFor(() => {
          expect(setDoc).toHaveBeenCalled();
        });

        // 상태 업데이트 확인
        await waitFor(() => {
          expect(mockSetSuccess).toHaveBeenCalledWith('차량이 성공적으로 등록되었습니다!');
          expect(successState).toBe('차량이 성공적으로 등록되었습니다!');
        }, { timeout: 3000 });

        // setFormData 호출 확인
        const expectedFormData = {
          carNumber: '',
          carType: '',
          carName: '',
          carBrand: '',
          otherBrand: '',
          rentalFee: '',
          tags: [],
          hostName: '',
          hostID: mockUser.uid
        };

        await waitFor(() => {
          expect(mockSetFormData).toHaveBeenCalled();
          expect(formDataState).toEqual(expectedFormData);
        }, { timeout: 3000 });

        // 호출 순서 확인
        const setDocCallOrder = setDoc.mock.invocationCallOrder[0];
        const setSuccessCallOrder = mockSetSuccess.mock.invocationCallOrder[0];
        const setFormDataCallOrder = mockSetFormData.mock.invocationCallOrder[0];
        
        expect(setSuccessCallOrder).toBeGreaterThan(setDocCallOrder);
        expect(setFormDataCallOrder).toBeGreaterThan(setSuccessCallOrder);

        // 컴포넌트 리렌더링
        await act(async () => {
          rerender(
            <UserContext.Provider value={{ user: mockUser }}>
              <Registration onNavigate={jest.fn()} onClose={jest.fn()} />
            </UserContext.Provider>
          );
        });

        // 성공 메시지가 다크모드 스타일로 표시되는지 확인
        await waitFor(() => {
          const successMessage = screen.getByText('차량이 성공적으로 등록되었습니다!');
          const alertElement = successMessage.closest('.alert');
          expect(alertElement).toHaveClass('dark');
          expect(alertElement).toHaveClass('success');
        });

        // 폼이 초기화되었는지 확인
        await waitFor(() => {
          expect(screen.getByPlaceholderText('차량 등록자의 이름을 입력해주세요')).toHaveValue('');
          expect(screen.getByPlaceholderText('차량번호를 입력해주세요')).toHaveValue('');
          expect(screen.getByLabelText('차량 종류')).toHaveValue('');
          expect(screen.getByLabelText('제조사')).toHaveValue('');
          expect(screen.getByPlaceholderText('차량명을 입력하세요')).toHaveValue('');
          expect(screen.getByPlaceholderText('대여료를 입력하세요')).toHaveValue('');
          expect(screen.getByRole('button', { name: '#가족과 함께' })).not.toHaveClass('selected');
        });

        // 다크모드 상태가 유지되는지 확인
        await waitFor(() => {
          expect(container.querySelector('.registration-container')).toHaveClass('dark');
          expect(container.querySelector('.registration-paper')).toHaveClass('dark');
          expect(container.querySelector('.registration-header')).toHaveClass('dark');
          expect(container.querySelector('.registration-title')).toHaveClass('dark');
        });
      });

      it('다크모드에서 차량 등록 실패 시 상태 변경이 올바르게 이루어진다', async () => {
        // 다크모드 활성화
        window.matchMedia.mockImplementation(query => ({
          matches: true,
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn((event, callback) => {
            if (event === 'change') {
              darkModeListener = callback;
            }
          }),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        }));

        const errorMessage = '데이터베이스 오류';
        setDoc.mockRejectedValueOnce(new Error(errorMessage));
        const { container, rerender } = renderRegistration();

        // 다크모드 상태 변경 시뮬레이션
        await act(async () => {
          if (darkModeListener) {
            darkModeListener({ matches: true });
          }
        });

        // 모든 필수 입력값 입력
        const formData = {
          hostName: '홍길동',
          carNumber: '12가3456',
          carType: '소형',
          carBrand: '현대',
          carName: '아반떼',
          rentalFee: '10000'
        };

        fireEvent.change(screen.getByPlaceholderText('차량 등록자의 이름을 입력해주세요'), 
          { target: { value: formData.hostName } });
        fireEvent.change(screen.getByPlaceholderText('차량번호를 입력해주세요'),
          { target: { value: formData.carNumber } });
        fireEvent.change(screen.getByLabelText('차량 종류'),
          { target: { value: formData.carType } });
        fireEvent.change(screen.getByLabelText('제조사'),
          { target: { value: formData.carBrand } });
        fireEvent.change(screen.getByPlaceholderText('차량명을 입력하세요'),
          { target: { value: formData.carName } });
        fireEvent.change(screen.getByPlaceholderText('대여료를 입력하세요'),
          { target: { value: formData.rentalFee } });

        // 등록 버튼 클릭
        fireEvent.click(screen.getByRole('button', { name: '차량 등록' }));

        // setDoc 호출 확인
        await waitFor(() => {
          expect(setDoc).toHaveBeenCalled();
        });

        // setSuccess가 호출되지 않았는지 확인 (146번 라인)
        expect(mockSetSuccess).not.toHaveBeenCalled();

        // setFormData가 호출되지 않았는지 확인 (152번 라인)
        expect(mockSetFormData).not.toHaveBeenCalledWith(expect.objectContaining({
          carNumber: '',
          carType: '',
          carName: '',
          carBrand: '',
          otherBrand: '',
          rentalFee: '',
          tags: []
        }));

        // 컴포넌트 리렌더링
        rerender(
          <UserContext.Provider value={{ user: mockUser }}>
            <Registration onNavigate={jest.fn()} onClose={jest.fn()} />
          </UserContext.Provider>
        );

        // 에러 메시지가 다크모드 스타일로 표시되는지 확인
        const errorAlert = screen.getByText(errorMessage);
        expect(errorAlert.closest('.alert')).toHaveClass('dark');
        expect(errorAlert.closest('.alert')).toHaveClass('error');

        // 폼 데이터가 유지되는지 확인
        expect(screen.getByPlaceholderText('차량 등록자의 이름을 입력해주세요')).toHaveValue(formData.hostName);
        expect(screen.getByPlaceholderText('차량번호를 입력해주세요')).toHaveValue(formData.carNumber);
        expect(screen.getByLabelText('차량 종류')).toHaveValue(formData.carType);
        expect(screen.getByLabelText('제조사')).toHaveValue(formData.carBrand);
        expect(screen.getByPlaceholderText('차량명을 입력하세요')).toHaveValue(formData.carName);
        expect(screen.getByPlaceholderText('대여료를 입력하세요')).toHaveValue(formData.rentalFee);

        // 다크모드 상태가 유지되는지 확인
        expect(container.querySelector('.registration-container')).toHaveClass('dark');
        expect(container.querySelector('.registration-paper')).toHaveClass('dark');
        expect(container.querySelector('.registration-header')).toHaveClass('dark');
        expect(container.querySelector('.registration-title')).toHaveClass('dark');
      });
    });

    describe('에러 처리 및 폼 초기화 테스트', () => {
      it('setDoc 에러 발생 시 적절한 에러 메시지가 표시되고 폼이 초기화되지 않는다', async () => {
        const errorMessage = '데이터베이스 연결 오류';
        setDoc.mockRejectedValueOnce(new Error(errorMessage));
        
        const { container } = renderRegistration();
        
        // 폼 데이터 입력
        const formData = {
          hostName: '홍길동',
          carNumber: '12가3456',
          carType: '소형',
          carBrand: '현대',
          carName: '아반떼',
          rentalFee: '10000',
          tags: ['#가족과 함께']
        };
        
        // 입력 필드에 데이터 입력
        fireEvent.change(screen.getByPlaceholderText('차량 등록자의 이름을 입력해주세요'), 
          { target: { value: formData.hostName } });
        fireEvent.change(screen.getByPlaceholderText('차량번호를 입력해주세요'), 
          { target: { value: formData.carNumber } });
        fireEvent.change(screen.getByLabelText('차량 종류'), 
          { target: { value: formData.carType } });
        fireEvent.change(screen.getByLabelText('제조사'), 
          { target: { value: formData.carBrand } });
        fireEvent.change(screen.getByPlaceholderText('차량명을 입력하세요'), 
          { target: { value: formData.carName } });
        fireEvent.change(screen.getByPlaceholderText('대여료를 입력하세요'), 
          { target: { value: formData.rentalFee } });
        fireEvent.click(screen.getByRole('button', { name: '#가족과 함께' }));
        
        // 폼 제출
        fireEvent.click(screen.getByRole('button', { name: '차량 등록' }));
        
        // 에러 메시지 확인
        await waitFor(() => {
          expect(screen.getByText(errorMessage)).toBeInTheDocument();
        });
        
        // 폼 데이터가 초기화되지 않았는지 확인
        expect(screen.getByPlaceholderText('차량 등록자의 이름을 입력해주세요')).toHaveValue(formData.hostName);
        expect(screen.getByPlaceholderText('차량번호를 입력해주세요')).toHaveValue(formData.carNumber);
        expect(screen.getByLabelText('차량 종류')).toHaveValue(formData.carType);
        expect(screen.getByLabelText('제조사')).toHaveValue(formData.carBrand);
        expect(screen.getByPlaceholderText('차량명을 입력하세요')).toHaveValue(formData.carName);
        expect(screen.getByPlaceholderText('대여료를 입력하세요')).toHaveValue(formData.rentalFee);
        expect(screen.getByRole('button', { name: '#가족과 함께' })).toHaveClass('selected');
      });

      it('등록 성공 시 폼이 완전히 초기화된다', async () => {
        setDoc.mockResolvedValueOnce();
        const { container } = renderRegistration();
        
        // 폼 데이터 입력
        const formData = {
          hostName: '홍길동',
          carNumber: '12가3456',
          carType: '소형',
          carBrand: '기타',
          otherBrand: '제네시스',
          carName: 'G80',
          rentalFee: '20000',
          tags: ['#가족과 함께', '#비즈니스']
        };
        
        // 입력 필드에 데이터 입력
        fireEvent.change(screen.getByPlaceholderText('차량 등록자의 이름을 입력해주세요'), 
          { target: { value: formData.hostName } });
        fireEvent.change(screen.getByPlaceholderText('차량번호를 입력해주세요'), 
          { target: { value: formData.carNumber } });
        fireEvent.change(screen.getByLabelText('차량 종류'), 
          { target: { value: formData.carType } });
        fireEvent.change(screen.getByLabelText('제조사'),
          { target: { value: formData.carBrand } });
        fireEvent.change(screen.getByPlaceholderText('예: 제네시스, 포르쉐 등'), 
          { target: { value: formData.otherBrand } });
        fireEvent.change(screen.getByPlaceholderText('차량명을 입력하세요'), 
          { target: { value: formData.carName } });
        fireEvent.change(screen.getByPlaceholderText('대여료를 입력하세요'), 
          { target: { value: formData.rentalFee } });
        
        // 태그 선택
        formData.tags.forEach(tag => {
          fireEvent.click(screen.getByRole('button', { name: tag }));
        });
        
        // 폼 제출
        fireEvent.click(screen.getByRole('button', { name: '차량 등록' }));
        
        // 성공 메시지 확인
        await waitFor(() => {
          expect(screen.getByText('차량이 성공적으로 등록되었습니다!')).toBeInTheDocument();
        });
        
        // 모든 입력 필드가 초기화되었는지 확인
        expect(screen.getByPlaceholderText('차량 등록자의 이름을 입력해주세요')).toHaveValue('');
        expect(screen.getByPlaceholderText('차량번호를 입력해주세요')).toHaveValue('');
        expect(screen.getByLabelText('차량 종류')).toHaveValue('');
        expect(screen.getByLabelText('제조사')).toHaveValue('');
        expect(screen.getByPlaceholderText('차량명을 입력하세요')).toHaveValue('');
        expect(screen.getByPlaceholderText('대여료를 입력하세요')).toHaveValue('');
        
        // 기타 제조사 입력 필드가 사라졌는지 확인
        expect(screen.queryByPlaceholderText('예: 제네시스, 포르쉐 등')).not.toBeInTheDocument();
        
        // 선택된 태그가 모두 해제되었는지 확인
        formData.tags.forEach(tag => {
          expect(screen.getByRole('button', { name: tag })).not.toHaveClass('selected');
        });
      });

      it('폼 제출 시 setDoc이 정확한 데이터로 호출된다', async () => {
        const mockUser = { uid: 'testuser123', displayName: '테스트유저' };
        let savedData = null;
        
        setDoc.mockImplementation((docRef, data) => {
          savedData = data;
          return Promise.resolve();
        });
        
        renderRegistration(mockUser);
        
        // 폼 데이터 입력
        const formData = {
          hostName: '홍길동',
          carNumber: '12가3456',
          carType: '소형',
          carBrand: '기타',
          otherBrand: '제네시스',
          carName: 'G80',
          rentalFee: '20000',
          tags: ['#가족과 함께', '#비즈니스']
        };
        
        // 입력 필드에 데이터 입력
        fireEvent.change(screen.getByPlaceholderText('차량 등록자의 이름을 입력해주세요'), 
          { target: { value: formData.hostName } });
        fireEvent.change(screen.getByPlaceholderText('차량번호를 입력해주세요'), 
          { target: { value: formData.carNumber } });
        fireEvent.change(screen.getByLabelText('차량 종류'), 
          { target: { value: formData.carType } });
        fireEvent.change(screen.getByLabelText('제조사'), 
          { target: { value: formData.carBrand } });
        fireEvent.change(screen.getByPlaceholderText('예: 제네시스, 포르쉐 등'), 
          { target: { value: formData.otherBrand } });
        fireEvent.change(screen.getByPlaceholderText('차량명을 입력하세요'), 
          { target: { value: formData.carName } });
        fireEvent.change(screen.getByPlaceholderText('대여료를 입력하세요'), 
          { target: { value: formData.rentalFee } });
        
        // 태그 선택
        formData.tags.forEach(tag => {
          fireEvent.click(screen.getByRole('button', { name: tag }));
        });
        
        // 폼 제출
        fireEvent.click(screen.getByRole('button', { name: '차량 등록' }));
        
        // setDoc이 호출되었는지 확인
        await waitFor(() => {
          expect(setDoc).toHaveBeenCalled();
        });
        
        // 저장된 데이터가 올바른지 확인
        expect(savedData).toEqual({
          hostID: mockUser.uid,
          hostName: formData.hostName,
          carNumber: formData.carNumber,
          carType: formData.carType,
          carBrand: '기타(제네시스)',
          carName: formData.carName,
          rentalFee: formData.rentalFee,
          tags: formData.tags
        });
      });
    });
  });
}); 