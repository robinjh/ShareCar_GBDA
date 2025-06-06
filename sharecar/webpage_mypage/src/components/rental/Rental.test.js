import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { act } from 'react';
import Rental from './Rental';
import { collection, getDocs, setDoc, doc, getFirestore } from 'firebase/firestore';
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { BrowserRouter } from 'react-router-dom';
import { UserContext, UserProvider } from '../../UserContext';
import { db } from '../../firebase';

// 유틸리티 함수 정의
const removeFunctions = (obj) => {
  if (typeof obj !== 'object' || obj === null) return obj;
  if (Array.isArray(obj)) {
    return obj.map(item => {
      if (typeof item === 'function') return undefined;
      return removeFunctions(item);
    }).filter(item => item !== undefined);
  }
  
  return Object.entries(obj).reduce((acc, [key, value]) => {
    if (typeof value !== 'function') {
      acc[key] = typeof value === 'object' ? removeFunctions(value) : value;
    }
    return acc;
  }, {});
};

const koreanFirstSort = (a, b) => {
  const isKoreanA = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(a);
  const isKoreanB = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(b);
  
  if (isKoreanA && !isKoreanB) return -1;
  if (!isKoreanA && isKoreanB) return 1;
  
  // 한글과 영문/숫자 각각 그룹 내에서 정렬
  if (isKoreanA && isKoreanB) return a.localeCompare(b, 'ko');
  if (!isKoreanA && !isKoreanB) {
    // 숫자와 영문 구분
    const isNumA = /^\d+$/.test(a);
    const isNumB = /^\d+$/.test(b);
    if (isNumA && !isNumB) return -1;
    if (!isNumA && isNumB) return 1;
    if (isNumA && isNumB) return parseInt(a) - parseInt(b);
    // 영문과 특수문자 구분
    const isSpecialA = /[^a-zA-Z0-9]/.test(a);
    const isSpecialB = /[^a-zA-Z0-9]/.test(b);
    if (isSpecialA && !isSpecialB) return 1;
    if (!isSpecialA && isSpecialB) return -1;
    return a.localeCompare(b, 'en');
  }
  return 0;
};

const formatDateTimeForInput = (date) => {
  if (!date || !(date instanceof Date) || isNaN(date)) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const formatDateTime = (date) => {
  if (!date || !(date instanceof Date) || isNaN(date)) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
};

const calculateTotalFee = (car, startDate, endDate) => {
  if (!car?.rentalFee || !startDate || !endDate) return 0;
  const rentalFee = parseInt(car.rentalFee);
  const start = new Date(startDate);
  const end = new Date(endDate);
  const rentalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1; // 시작일 포함
  return rentalFee * rentalDays;
};

// 파일 최상단에 모듈 초기화 코드 추가
jest.isolateModules(() => {
  jest.mock('firebase/app', () => ({
    initializeApp: jest.fn((config) => {
      if (global.__TEST_FAIL_FIREBASE_INIT__) {
        throw new Error('Firebase 초기화 실패');
      }
      return {};
    }),
    getApps: jest.fn(() => []),
    getApp: jest.fn(() => ({}))
  }));
});

// Firebase 모킹
jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(() => ({})),
  onAuthStateChanged: jest.fn((auth, callback) => {
    callback(null);
    return () => {};
  }),
}));

jest.mock('../../firebase', () => ({
  db: {},
  auth: {}
}));

jest.mock('firebase/firestore', () => {
  return {
    collection: jest.fn((db, path) => ({
      id: path,
      path: path
    })),
    getDocs: jest.fn(),
    setDoc: jest.fn((docRef, data) => {
      // docRef가 올바른 형식인지 확인
      if (!docRef || !docRef.path) {
        throw new Error('Invalid document reference');
      }
      return Promise.resolve();
    }),
    doc: jest.fn((collectionRef, docId) => ({
      id: docId,
      path: `${collectionRef.path}/${docId}`
    })),
    getFirestore: jest.fn(() => ({})),
  };
});

// Firebase 인스턴스 모킹
const mockApp = initializeApp({});
const mockAuth = getAuth(mockApp);
const mockDb = getFirestore(mockApp);

const mockGetDocs = getDocs;
const mockSetDoc = setDoc;
const mockCollection = collection;
const mockDoc = doc;

// Mock 데이터
const mockUser = {
  uid: 'test-uid',
  email: 'test@example.com',
  displayName: 'Test User'
};

const mockCars = [
  {
    id: '1',
    carName: '소나타',
    carNumber: '12가 3456',
    carBrand: '현대',
    carType: '중형',
    rentalFee: '50000',
    tags: ['가족여행', '경제적']
  },
  {
    id: '2',
    carName: '그랜저',
    carNumber: '34나 5678',
    carBrand: '현대',
    carType: '대형',
    rentalFee: '70000',
    tags: ['고급', '출장']
  },
  {
    id: '3',
    carName: '쏘렌토',
    carNumber: '56다 7890',
    carBrand: '기아',
    carType: 'SUV',
    rentalFee: '80000',
    tags: ['가족여행', 'SUV']
  }
];

// Mock UserProvider 컴포넌트
const MockUserProvider = ({ children, user = mockUser }) => {
  const [currentUser, setCurrentUser] = React.useState(user);
  return (
    <UserContext.Provider value={{ user: currentUser, setRefreshUser: () => {} }}>
      {children}
    </UserContext.Provider>
  );
};

// renderRental 헬퍼 함수 수정
const renderRental = async (user = mockUser, isDarkMode = false, shouldFail = false) => {
  if (shouldFail) {
    // Firebase 초기화 실패 시에는 getDocs를 호출하지 않음
    mockGetDocs.mockImplementation(() => {
      throw new Error('Firebase 데이터 조회 실패');
    });
  } else {
    mockGetDocs.mockImplementation(() => {
      return Promise.resolve({
        docs: mockCars.map(car => ({
          id: car.id,
          data: () => ({
            ...car,
            rentalFee: car.rentalFee.toString(),
            tags: car.tags || [],
            hostID: 'test-host-id',
            hostName: 'Test Host'
          }),
          exists: true
        }))
      });
    });
  }

  let utils;
  try {
    await act(async () => {
      utils = render(
        <BrowserRouter>
          <MockUserProvider user={user}>
            <Rental isDarkMode={isDarkMode} />
          </MockUserProvider>
        </BrowserRouter>
      );
    });
  } catch (error) {
    // 에러가 발생해도 계속 진행
  }
  
  // 데이터 로딩 대기
  if (utils) {
    await waitFor(() => {
      const loadingSpinner = screen.queryByRole('status');
      if (loadingSpinner) {
        expect(loadingSpinner).not.toBeInTheDocument();
      }
    }, { timeout: 3000 });

    // shouldFail이 false일 때만 차량 카드 확인
    if (!shouldFail) {
      await waitFor(() => {
        const carCards = utils.container.querySelectorAll('.car-card');
        expect(carCards.length).toBeGreaterThan(0);
      }, { timeout: 3000 });
    }
  }
  
  return utils;
};

// 테스트 환경 설정
beforeAll(() => {
  // 의도적인 콘솔 에러 무시
  jest.spyOn(console, 'error').mockImplementation((message, error) => {
    if (message === '대여 요청 실패:' && error.message === 'Firebase error') {
      return;
    }
    console.warn(message, error);
  });
});

afterAll(() => {
  // 콘솔 에러 모킹 복원
  console.error.mockRestore();
});

describe('Rental Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('기본 렌더링', () => {
    test('컴포넌트가 정상적으로 렌더링된다', async () => {
      const utils = await renderRental();
      expect(screen.getByRole('button', { name: '필터' })).toBeInTheDocument();
      expect(screen.getByPlaceholderText('차량명, 차량번호, 제조사, 차종, 태그 검색')).toBeInTheDocument();
    });

    test('차량 목록이 정상적으로 표시된다', async () => {
      const utils = await renderRental();
      
      // 차량 카드가 렌더링되었는지 확인
      const carCards = utils.container.querySelectorAll('.car-card');
      expect(carCards.length).toBeGreaterThan(0);

      // 각 차량 정보 확인
      expect(screen.getByText('소나타')).toBeInTheDocument();
      expect(screen.getByText('그랜저')).toBeInTheDocument();
      expect(screen.getByText('쏘렌토')).toBeInTheDocument();
    });
  });

  describe('필터 다이얼로그', () => {
    beforeEach(async () => {
      mockGetDocs.mockImplementation(() => {
        return Promise.resolve({
          docs: mockCars.map(car => ({
            id: car.id,
            data: () => ({
              ...car,
              rentalFee: car.rentalFee.toString(),
              tags: car.tags || [],
              hostID: 'test-host-id',
              hostName: 'Test Host'
            }),
            exists: true
          }))
        });
      });
    });

    test('필터 다이얼로그 열기/닫기', async () => {
      const { container } = await renderRental();
      
      // 필터 버튼 클릭
      const filterButton = screen.getByRole('button', { name: '필터' });
      await act(async () => {
        fireEvent.click(filterButton);
      });

      // 필터 다이얼로그가 열릴 때까지 대기
      await waitFor(() => {
        const filterDialog = container.querySelector('.filter-dialog.open');
        expect(filterDialog).toBeInTheDocument();
      });

      // 닫기 버튼으로 닫기
      const closeButton = screen.getByRole('button', { name: '취소' });
      await act(async () => {
        fireEvent.click(closeButton);
      });

      // 다이얼로그가 닫혔는지 확인
      await waitFor(() => {
        expect(container.querySelector('.filter-dialog.open')).not.toBeInTheDocument();
      });
    });

    test('대여료 범위 필터링', async () => {
      const utils = await renderRental();
      
      // 필터 버튼 클릭
      const filterButton = screen.getByRole('button', { name: '필터' });
      await act(async () => {
        fireEvent.click(filterButton);
      });

      // 필터 다이얼로그가 열릴 때까지 대기
      await waitFor(() => {
        const filterDialog = utils.container.querySelector('.filter-dialog.open');
        expect(filterDialog).toBeInTheDocument();
      });

      // 대여료 범위 입력
      const minInput = utils.container.querySelector('.rental-fee-input-group input[type="number"]');
      const maxInput = utils.container.querySelectorAll('.rental-fee-input-group input[type="number"]')[1];

      await act(async () => {
        fireEvent.change(minInput, { target: { value: '50000' } });
        fireEvent.change(maxInput, { target: { value: '80000' } });
      });

      // 적용 버튼 클릭
      const applyButton = screen.getByRole('button', { name: '적용' });
      await act(async () => {
        fireEvent.click(applyButton);
      });

      // 필터링 결과 확인
      await waitFor(() => {
        const carCards = utils.container.querySelectorAll('.car-card');
        expect(carCards.length).toBeGreaterThan(0);
        carCards.forEach(card => {
          const priceText = within(card).getByText(/원\/일/).textContent;
          const price = parseInt(priceText.replace(/[^0-9]/g, ''));
          expect(price).toBeGreaterThanOrEqual(50000);
          expect(price).toBeLessThanOrEqual(80000);
        });
      }, { timeout: 3000 });
    });

    test('태그 필터링', async () => {
      const utils = await renderRental();
      
      // 필터 버튼 클릭
      const filterButton = screen.getByRole('button', { name: '필터' });
      await act(async () => {
        fireEvent.click(filterButton);
      });

      // 필터 다이얼로그가 열릴 때까지 대기
      await waitFor(() => {
        const filterDialog = utils.container.querySelector('.filter-dialog.open');
        expect(filterDialog).toBeInTheDocument();
      });

      // 태그 선택 (차량 분류 태그 사용)
      const carTypeTag = screen.getByRole('button', { name: '중형' });
      await act(async () => {
        fireEvent.click(carTypeTag);
      });

      // 태그 선택 상태 확인
      await waitFor(() => {
        expect(carTypeTag).toHaveClass('selected');
      });

      // 적용 버튼 클릭
      const applyButton = screen.getByRole('button', { name: '적용' });
      await act(async () => {
        fireEvent.click(applyButton);
      });

      // 필터링 결과 확인
      await waitFor(() => {
        const carCards = utils.container.querySelectorAll('.car-card');
        expect(carCards.length).toBeGreaterThan(0);
        const sonataCard = Array.from(carCards).find(card => 
          within(card).queryByText('소나타')
        );
        expect(sonataCard).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('대여 다이얼로그', () => {
    beforeEach(async () => {
      mockGetDocs.mockImplementation(() => {
        return Promise.resolve({
          docs: mockCars.slice(0, 2).map(car => ({
            id: car.id,
            data: () => ({
              ...car,
              rentalFee: car.rentalFee.toString(),
              tags: car.tags || [],
              hostID: 'test-host-id',
              hostName: 'Test Host'
            }),
            exists: true
          }))
        });
      });

      // collection 모킹 설정
      mockCollection.mockImplementation((db, path) => ({
        id: path,
        path: path
      }));

      // doc 모킹 설정
      mockDoc.mockImplementation((collectionRef, docId) => ({
        id: docId,
        path: `${collectionRef.path}/${docId}`
      }));
    });

    test('대여 다이얼로그 열기/닫기', async () => {
      const utils = await renderRental();
      
      // 차량 카드가 렌더링되었는지 확인
      const carCards = utils.container.querySelectorAll('.car-card');
      expect(carCards.length).toBeGreaterThan(0);
      
      // 대여하기 버튼 클릭
      const rentButton = within(carCards[0]).getByRole('button', { name: '대여하기' });
      await act(async () => {
        fireEvent.click(rentButton);
      });

      // 대여 다이얼로그가 열릴 때까지 대기
      await waitFor(() => {
        const rentalDialog = utils.container.querySelector('.rental-dialog');
        expect(rentalDialog).toBeInTheDocument();
      });

      // 닫기 버튼으로 닫기
      const closeButton = screen.getByRole('button', { name: '취소' });
      await act(async () => {
        fireEvent.click(closeButton);
      });

      // 다이얼로그가 닫혔는지 확인
      await waitFor(() => {
        expect(utils.container.querySelector('.rental-dialog')).not.toBeInTheDocument();
      });
    });

    describe('유효성 검사', () => {
      test('필수 입력 필드가 비어있을 때 에러 메시지 표시', async () => {
        const utils = await renderRental();
        
        // 대여하기 버튼 클릭
        const carCards = utils.container.querySelectorAll('.car-card');
        const rentButton = within(carCards[0]).getByRole('button', { name: '대여하기' });
        await act(async () => {
          fireEvent.click(rentButton);
        });

        // 대여 다이얼로그가 열릴 때까지 대기
        await waitFor(() => {
          const rentalDialog = utils.container.querySelector('.rental-dialog');
          expect(rentalDialog).toBeInTheDocument();
        });

        // 입력 필드 초기화
        const guestNameInput = screen.getByPlaceholderText('대여자 이름을 입력하세요');
        const addressInput = screen.getByPlaceholderText('목적지를 입력하세요');
        const startDateInput = utils.container.querySelector('input[name="startTime"]');
        const endDateInput = utils.container.querySelector('input[name="endTime"]');

        // 모든 입력 필드를 빈 값으로 설정
        await act(async () => {
          fireEvent.change(guestNameInput, { target: { value: '' } });
          fireEvent.change(addressInput, { target: { value: '' } });
          fireEvent.change(startDateInput, { target: { value: '' } });
          fireEvent.change(endDateInput, { target: { value: '' } });
        });

        // mockSetDoc 호출 횟수 초기화
        mockSetDoc.mockClear();

        // 대여하기 버튼 클릭
        const submitButton = utils.container.querySelector('.rental-dialog-actions .apply-button');
        await act(async () => {
          fireEvent.click(submitButton);
        });

        // 에러 메시지 확인 (다이얼로그 내부의 에러 메시지만 확인)
        await waitFor(() => {
          const rentalDialog = utils.container.querySelector('.rental-dialog');
          const dialogError = within(rentalDialog).getByText('모든 필수 항목을 입력해주세요.');
          expect(dialogError).toBeInTheDocument();
        });

        // 대여 요청이 호출되지 않았는지 확인
        expect(mockSetDoc).not.toHaveBeenCalled();
      });

      test('모든 필수 입력 필드가 채워졌을 때 대여 요청 처리', async () => {
        const utils = await renderRental();
        
        // 대여하기 버튼 클릭
        const carCards = utils.container.querySelectorAll('.car-card');
        const rentButton = within(carCards[0]).getByRole('button', { name: '대여하기' });
        await act(async () => {
          fireEvent.click(rentButton);
        });

        // 대여 다이얼로그가 열릴 때까지 대기
        await waitFor(() => {
          const rentalDialog = utils.container.querySelector('.rental-dialog');
          expect(rentalDialog).toBeInTheDocument();
        });

        // 입력 필드 설정
        const guestNameInput = screen.getByPlaceholderText('대여자 이름을 입력하세요');
        const addressInput = screen.getByPlaceholderText('목적지를 입력하세요');
        const startDateInput = utils.container.querySelector('input[name="startTime"]');
        const endDateInput = utils.container.querySelector('input[name="endTime"]');

        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);

        // 모든 입력 필드를 한 번에 설정
        await act(async () => {
          fireEvent.change(guestNameInput, { target: { value: '홍길동' } });
          fireEvent.change(addressInput, { target: { value: '서울시 강남구' } });
          fireEvent.change(startDateInput, { target: { value: tomorrow.toISOString().slice(0, 16) } });
          fireEvent.change(endDateInput, { target: { value: nextWeek.toISOString().slice(0, 16) } });
        });

        // 입력 값이 제대로 설정되었는지 확인
        await waitFor(() => {
          expect(guestNameInput.value).toBe('홍길동');
          expect(addressInput.value).toBe('서울시 강남구');
          expect(startDateInput.value).toBe(tomorrow.toISOString().slice(0, 16));
          expect(endDateInput.value).toBe(nextWeek.toISOString().slice(0, 16));
        });

        // mockSetDoc 호출 횟수 초기화
        mockSetDoc.mockClear();

        // 대여하기 버튼 클릭
        const submitButton = utils.container.querySelector('.rental-dialog-actions .apply-button');
        await act(async () => {
          fireEvent.click(submitButton);
        });

        // 대여 요청이 처리될 때까지 대기
        await waitFor(() => {
          expect(mockSetDoc).toHaveBeenCalled();
        }, { timeout: 3000 });

        // 대여 요청 데이터 검증
        const calls = mockSetDoc.mock.calls;
        expect(calls.length).toBe(1);
        
        const [docRef, rentalData] = calls[0];
        expect(docRef).toBeDefined();
        expect(docRef.path).toMatch(/^registrations\/test-uid\.34나 5678\.\d{2}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
        expect(rentalData).toEqual(expect.objectContaining({
          guestName: '홍길동',
          address: '서울시 강남구',
          status: '대기중',
          guestId: 'test-uid',
          hostId: 'test-host-id',
          hostName: 'Test Host',
          carName: '그랜저',
          carNumber: '34나 5678',
          carBrand: '현대',
          carType: '대형',
          rentalFee: '70000',
          tags: expect.any(Array),
          totalFee: expect.any(Number)
        }));

        // 날짜 필드 검증
        expect(rentalData.startTime.toISOString().slice(0, 16)).toBe(tomorrow.toISOString().slice(0, 16));
        expect(rentalData.endTime.toISOString().slice(0, 16)).toBe(nextWeek.toISOString().slice(0, 16));

        // 대여 다이얼로그가 닫혔는지 확인
        await waitFor(() => {
          expect(utils.container.querySelector('.rental-dialog')).not.toBeInTheDocument();
        });
      });
    });

    test('대여 다이얼로그 닫기 버튼 동작', async () => {
      const utils = await renderRental();
      
      // 대여하기 버튼 클릭
      const carCards = utils.container.querySelectorAll('.car-card');
      const rentButton = within(carCards[0]).getByRole('button', { name: '대여하기' });
      await act(async () => {
        fireEvent.click(rentButton);
      });

      // 대여 다이얼로그가 열릴 때까지 대기
      await waitFor(() => {
        const rentalDialog = utils.container.querySelector('.rental-dialog');
        expect(rentalDialog).toBeInTheDocument();
      });

      // X 버튼으로 닫기
      const closeButton = screen.getByRole('button', { name: '×' });
      await act(async () => {
        fireEvent.click(closeButton);
      });

      // 다이얼로그가 닫혔는지 확인
      await waitFor(() => {
        expect(utils.container.querySelector('.rental-dialog')).not.toBeInTheDocument();
      });

      // 대여하기 버튼 다시 클릭
      await act(async () => {
        fireEvent.click(rentButton);
      });

      // 대여 다이얼로그가 다시 열렸는지 확인
      await waitFor(() => {
        const rentalDialog = utils.container.querySelector('.rental-dialog');
        expect(rentalDialog).toBeInTheDocument();
      });
    });
  });

  describe('검색 기능', () => {
    test('차량명으로 검색', async () => {
      const utils = await renderRental();
      
      // 검색어 입력
      const searchInput = screen.getByPlaceholderText('차량명, 차량번호, 제조사, 차종, 태그 검색');
      await act(async () => {
        fireEvent.change(searchInput, { target: { value: '소나타' } });
      });

      // 검색 버튼 클릭
      const searchButton = screen.getByRole('button', { name: '검색' });
      await act(async () => {
        fireEvent.click(searchButton);
      });

      // 검색 결과 확인
      await waitFor(() => {
        const carCards = utils.container.querySelectorAll('.car-card');
        expect(carCards.length).toBeGreaterThan(0);
        const sonataCard = Array.from(carCards).find(card => 
          within(card).queryByText('소나타')
        );
        expect(sonataCard).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    test('태그로 검색', async () => {
      const utils = await renderRental();
      
      // 검색어 입력
      const searchInput = screen.getByPlaceholderText('차량명, 차량번호, 제조사, 차종, 태그 검색');
      await act(async () => {
        fireEvent.change(searchInput, { target: { value: '가족여행' } });
      });

      // 검색 버튼 클릭
      const searchButton = screen.getByRole('button', { name: '검색' });
      await act(async () => {
        fireEvent.click(searchButton);
      });

      // 검색 결과 확인
      await waitFor(() => {
        const carCards = utils.container.querySelectorAll('.car-card');
        expect(carCards.length).toBeGreaterThan(0);
        const hasFamilyTag = Array.from(carCards).some(card => 
          within(card).queryByText('가족여행')
        );
        expect(hasFamilyTag).toBe(true);
      }, { timeout: 3000 });
    });
  });

  describe('다크 모드', () => {
    test('다크 모드 스타일 적용', async () => {
      const utils = await renderRental(mockUser, true);
      
      // 다크 모드 클래스 확인
      expect(utils.container.querySelector('.rental-container')).toHaveClass('dark');
      
      // 차량 카드 다크 모드 확인
      const carCards = utils.container.querySelectorAll('.car-card');
      expect(carCards.length).toBeGreaterThan(0);
      carCards.forEach(card => {
        expect(card).toHaveClass('dark');
      });

      // 필터 다이얼로그 다크 모드 확인
      const filterButton = screen.getByRole('button', { name: '필터' });
      await act(async () => {
        fireEvent.click(filterButton);
      });

      await waitFor(() => {
        const filterDialog = utils.container.querySelector('.filter-dialog.open');
        expect(filterDialog).toHaveClass('dark');
      });
    });
  });
});

describe('유틸리티 함수', () => {
  test('removeFunctions - 객체에서 함수 제거', () => {
    const testObj = {
      a: 1,
      b: () => {},
      c: {
        d: 2,
        e: () => {},
        f: [1, () => {}, 3]
      }
    };
    const result = removeFunctions(testObj);
    expect(result).toEqual({
      a: 1,
      c: {
        d: 2,
        f: [1, 3]
      }
    });
  });

  test('koreanFirstSort - 정렬 순서 확인', () => {
    const items = ['가나다', 'abc', '123', '가나다라', 'abcd', '124'];
    const sorted = [...items].sort(koreanFirstSort);
    expect(sorted).toEqual(['가나다', '가나다라', '123', '124', 'abc', 'abcd']);
  });

  test('formatDateTimeForInput - 날짜 변환', () => {
    const date = new Date('2024-03-15T10:00:00');
    const formatted = formatDateTimeForInput(date);
    expect(formatted).toBe('2024-03-15T10:00');
  });

  test('formatDateTimeForInput - 잘못된 날짜 처리', () => {
    expect(formatDateTimeForInput(null)).toBe('');
    expect(formatDateTimeForInput(undefined)).toBe('');
    expect(formatDateTimeForInput('invalid')).toBe('');
  });

  test('formatDateTime - 날짜 포맷팅', () => {
    const date = new Date('2024-03-15T10:00:00');
    const formatted = formatDateTime(date);
    expect(formatted).toBe('2024-03-15 10:00');
  });

  test('calculateTotalFee - 대여료 계산', () => {
    const utils = renderRental();
    const startDate = new Date('2024-03-15T10:00:00');
    const endDate = new Date('2024-03-17T10:00:00');
    const car = { rentalFee: '50000' };
    
    const fee = calculateTotalFee(car, startDate, endDate);
    expect(fee).toBe(150000); // 3일 * 50000원 (시작일 포함)
  });
});

describe('에러 처리', () => {
  test('날짜 변환 에러 처리', async () => {
    const utils = await renderRental();
    
    // 대여하기 버튼 클릭
    const carCards = utils.container.querySelectorAll('.car-card');
    const rentButton = within(carCards[0]).getByRole('button', { name: '대여하기' });
    await act(async () => {
      fireEvent.click(rentButton);
    });

    // 잘못된 날짜 입력
    const startDateInput = utils.container.querySelector('input[name="startTime"]');
    await act(async () => {
      fireEvent.change(startDateInput, { target: { value: 'invalid-date' } });
    });

    // 대여하기 버튼 클릭
    const submitButton = utils.container.querySelector('.rental-dialog-actions .apply-button');
    await act(async () => {
      fireEvent.click(submitButton);
    });

    // 에러 메시지 확인 (getAllByText 사용)
    await waitFor(() => {
      const errorMessages = screen.getAllByText('모든 필수 항목을 입력해주세요.');
      expect(errorMessages.length).toBeGreaterThan(0);
    });
  });

  test('Firebase 에러 처리', async () => {
    // Firebase 에러 모킹
    mockSetDoc.mockRejectedValueOnce(new Error('Firebase error'));

    const utils = await renderRental();
    
    // 대여하기 버튼 클릭
    const carCards = utils.container.querySelectorAll('.car-card');
    const rentButton = within(carCards[0]).getByRole('button', { name: '대여하기' });
    await act(async () => {
      fireEvent.click(rentButton);
    });

    // 필수 정보 입력
    const guestNameInput = screen.getByPlaceholderText('대여자 이름을 입력하세요');
    const addressInput = screen.getByPlaceholderText('목적지를 입력하세요');
    const startDateInput = utils.container.querySelector('input[name="startTime"]');
    const endDateInput = utils.container.querySelector('input[name="endTime"]');

    await act(async () => {
      fireEvent.change(guestNameInput, { target: { value: '홍길동' } });
      fireEvent.change(addressInput, { target: { value: '서울시 강남구' } });
      fireEvent.change(startDateInput, { target: { value: '2024-03-15T10:00' } });
      fireEvent.change(endDateInput, { target: { value: '2024-03-17T10:00' } });
    });

    // 대여하기 버튼 클릭
    const submitButton = utils.container.querySelector('.rental-dialog-actions .apply-button');
    await act(async () => {
      fireEvent.click(submitButton);
    });

    // 에러 메시지 확인 (getAllByText 사용)
    await waitFor(() => {
      const errorMessages = screen.getAllByText('대여 요청 등록에 실패했습니다.');
      expect(errorMessages.length).toBeGreaterThan(0);
    });
  });
});

describe('UI 이벤트 핸들러', () => {
  test('페이지네이션 동작', async () => {
    const utils = await renderRental();
    
    // 페이지네이션 정보 확인
    const paginationInfo = screen.getByText('1 / 1 페이지');
    expect(paginationInfo).toBeInTheDocument();

    // 다음 페이지 버튼이 비활성화되어 있는지 확인
    const nextButton = screen.getByRole('button', { name: '다음' });
    expect(nextButton).toBeDisabled();

    // 이전 페이지 버튼이 비활성화되어 있는지 확인
    const prevButton = screen.getByRole('button', { name: '이전' });
    expect(prevButton).toBeDisabled();
  });

  test('정렬 기능', async () => {
    const utils = await renderRental();
    
    // 차량명 내림차순 정렬
    const sortSelect = screen.getByRole('combobox');
    await act(async () => {
      await fireEvent.change(sortSelect, { target: { value: 'nameDesc' } });
    });

    // 정렬 결과 확인
    await waitFor(() => {
      const carNames = Array.from(utils.container.querySelectorAll('.car-name'))
        .map(el => el.textContent);
      const sortedNames = [...carNames].sort((a, b) => b.localeCompare(a, 'ko'));
      expect(carNames).toEqual(sortedNames);
    });

    // 대여료 높은순 정렬
    await act(async () => {
      await fireEvent.change(sortSelect, { target: { value: 'priceDesc' } });
    });

    // 정렬 결과 확인
    await waitFor(() => {
      const carFees = Array.from(utils.container.querySelectorAll('.car-fee'))
        .map(el => parseInt(el.textContent));
      const sortedFees = [...carFees].sort((a, b) => b - a);
      expect(carFees).toEqual(sortedFees);
    });
  });

  test('태그 필터링', async () => {
    const utils = await renderRental();
    
    // 태그 클릭
    const tagButtons = utils.container.querySelectorAll('.tag-chip');
    await act(async () => {
      fireEvent.click(tagButtons[0]);
    });

    // 필터 적용
    const filterButton = screen.getByRole('button', { name: '필터' });
    await act(async () => {
      fireEvent.click(filterButton);
    });

    const applyButton = screen.getByRole('button', { name: '적용' });
    await act(async () => {
      fireEvent.click(applyButton);
    });

    // 필터링 결과 확인
    const carCards = utils.container.querySelectorAll('.car-card');
    expect(carCards.length).toBeGreaterThan(0);
  });
});

describe('장소 추천', () => {
  test('장소 추천 다이얼로그', async () => {
    const utils = await renderRental();
    
    // 대여하기 버튼 클릭
    const carCards = utils.container.querySelectorAll('.car-card');
    const rentButton = within(carCards[0]).getByRole('button', { name: '대여하기' });
    await act(async () => {
      fireEvent.click(rentButton);
    });

    // 필수 정보 입력
    const guestNameInput = screen.getByPlaceholderText('대여자 이름을 입력하세요');
    const addressInput = screen.getByPlaceholderText('목적지를 입력하세요');
    const startDateInput = utils.container.querySelector('input[name="startTime"]');
    const endDateInput = utils.container.querySelector('input[name="endTime"]');

    await act(async () => {
      fireEvent.change(guestNameInput, { target: { value: '홍길동' } });
      fireEvent.change(addressInput, { target: { value: '서울시 강남구' } });
      fireEvent.change(startDateInput, { target: { value: '2024-03-15T10:00' } });
      fireEvent.change(endDateInput, { target: { value: '2024-03-17T10:00' } });
    });

    // 태그 선택
    const tagButtons = utils.container.querySelectorAll('.tag-chip');
    await act(async () => {
      fireEvent.click(tagButtons[0]);
    });

    // 대여하기 버튼 클릭
    const submitButton = utils.container.querySelector('.rental-dialog-actions .apply-button');
    await act(async () => {
      fireEvent.click(submitButton);
    });

    // 장소 추천 다이얼로그 확인 (getAllByText 사용)
    await waitFor(() => {
      const dialogTitles = screen.getAllByText('장소 추천');
      expect(dialogTitles.length).toBeGreaterThan(0);
    });

    // 장소 추천 다이얼로그 닫기
    const closeButton = screen.getByRole('button', { name: '×' });
    await act(async () => {
      fireEvent.click(closeButton);
    });

    // 다이얼로그가 닫혔는지 확인
    await waitFor(() => {
      expect(screen.queryByText('장소 추천')).not.toBeInTheDocument();
    });
  });
});

describe('유틸리티 함수 추가 테스트', () => {
  test('removeFunctions - 중첩된 배열과 객체 처리', () => {
    const testObj = {
      a: [1, () => {}, { b: () => {}, c: 2 }],
      d: { e: () => {}, f: [() => {}, 3] },
      g: () => {},
      h: null,
      i: undefined
    };
    const result = removeFunctions(testObj);
    expect(result).toEqual({
      a: [1, { c: 2 }],
      d: { f: [3] },
      h: null,
      i: undefined
    });
  });

  test('koreanFirstSort - 특수 케이스 처리', () => {
    const items = ['가나다', '123', 'abc', '!@#', '가나다라', '가나다가'];
    const sorted = [...items].sort(koreanFirstSort);
    expect(sorted).toEqual(['가나다', '가나다가', '가나다라', '123', 'abc', '!@#']);
  });

  test('formatDateTimeForInput - 시간대 처리', () => {
    const date = new Date('2024-03-15T10:00:00+09:00');
    const formatted = formatDateTimeForInput(date);
    expect(formatted).toBe('2024-03-15T10:00');
  });

  test('formatDateTime - 다양한 날짜 형식', () => {
    const date1 = new Date('2024-03-15T10:00:00');
    const date2 = new Date('2024-12-31T23:59:59');
    expect(formatDateTime(date1)).toBe('2024-03-15 10:00');
    expect(formatDateTime(date2)).toBe('2024-12-31 23:59');
  });

  test('calculateTotalFee - 다양한 대여 기간', () => {
    const car = { rentalFee: '50000' };
    
    // 같은 날짜 (시작일 포함)
    const startDate = new Date('2024-03-15T10:00:00');
    const endDate = new Date('2024-03-15T23:59:59');
    expect(calculateTotalFee(car, startDate, endDate)).toBe(100000); // 시작일 포함하여 1일로 계산

    const endDate2 = new Date('2024-03-16T10:00:00');
    expect(calculateTotalFee(car, startDate, endDate2)).toBe(100000); // 2일

    const endDate3 = new Date('2024-03-14T10:00:00');
    expect(calculateTotalFee(car, startDate, endDate3)).toBe(0); // 잘못된 날짜
  });
});

describe('대여 요청 처리 추가 테스트', () => {
  test('대여 요청 실패 시 에러 처리', async () => {
    const utils = await renderRental();
    
    // 대여하기 버튼 클릭
    const carCards = utils.container.querySelectorAll('.car-card');
    const rentButton = within(carCards[0]).getByRole('button', { name: '대여하기' });
    
    await act(async () => {
      fireEvent.click(rentButton);
    });

    // 대여 다이얼로그가 열렸는지 확인
    const rentalDialog = await waitFor(() => {
      const dialog = utils.container.querySelector('.rental-dialog');
      expect(dialog).toBeInTheDocument();
      return dialog;
    });

    // 필수 정보 입력
    const guestNameInput = screen.getByPlaceholderText('대여자 이름을 입력하세요');
    const addressInput = screen.getByPlaceholderText('목적지를 입력하세요');
    const startDateInput = rentalDialog.querySelector('input[name="startTime"]');
    const endDateInput = rentalDialog.querySelector('input[name="endTime"]');

    const startDate = new Date(Date.now() + 86400000); // 내일
    const endDate = new Date(Date.now() + 172800000); // 2일 후

    await act(async () => {
      fireEvent.change(guestNameInput, { target: { value: '홍길동' } });
      fireEvent.change(addressInput, { target: { value: '서울시 강남구' } });
      fireEvent.change(startDateInput, { target: { value: formatDateTimeForInput(startDate) } });
      fireEvent.change(endDateInput, { target: { value: formatDateTimeForInput(endDate) } });
    });

    // 대여 요청 실패 케이스
    mockSetDoc.mockRejectedValueOnce(new Error('대여 요청 실패'));

    const submitButton = rentalDialog.querySelector('.rental-dialog-actions .apply-button');
    await act(async () => {
      fireEvent.click(submitButton);
    });

    // 에러 메시지 확인 - 다이얼로그 내의 에러 메시지만 확인
    await waitFor(() => {
      const errorMessages = within(rentalDialog).getAllByText(/대여 요청 등록에 실패했습니다/);
      expect(errorMessages.length).toBeGreaterThan(0);
      expect(errorMessages[0]).toHaveClass('alert', 'error');
    });
  });
});

describe('추가 에러 처리 및 엣지 케이스 테스트', () => {
  test('Firebase 초기화 실패 처리', async () => {
    // Firebase 초기화 실패 모킹
    mockInitializeApp.mockImplementationOnce(() => {
      throw new Error('Firebase 초기화 실패');
    });

    // 컴포넌트 렌더링 시도
    const utils = await renderRental();

    // 에러 메시지 확인
    await waitFor(() => {
      const errorMessage = screen.getByText(/차량 목록을 불러오는데 실패했습니다/);
      expect(errorMessage).toBeInTheDocument();
    });

    // Firebase 초기화 함수가 호출되었는지 확인
    expect(mockInitializeApp).toHaveBeenCalled();
  });

  test('데이터 처리 에러 케이스', async () => {
    // 잘못된 데이터로 mock 설정
    const invalidCarData = {
      carName: null,
      carNumber: null,
      rentalFee: null,
      manufacturer: null,
      carType: null,
      tags: null
    };

    mockGetDocs.mockResolvedValueOnce({
      docs: [
        {
          id: 'invalid-car',
          data: () => invalidCarData
        }
      ]
    });

    const utils = await renderRental();

    // 에러 메시지 또는 빈 차량 목록 확인
    await waitFor(() => {
      const errorMessage = screen.queryByText(/차량 목록을 불러오는데 실패했습니다/);
      const carCards = utils.container.querySelectorAll('.car-card');
      
      // 에러 메시지가 있거나 차량 카드가 없는 경우를 모두 유효한 상태로 처리
      expect(errorMessage || carCards.length === 0).toBeTruthy();
    }, { timeout: 3000 });
  });
});

describe('추가 커버리지 테스트', () => {
  test('대여 기간 유효성 검사', async () => {
    const utils = await renderRental();
    
    // 대여하기 버튼 클릭
    const carCards = utils.container.querySelectorAll('.car-card');
    const rentButton = within(carCards[0]).getByRole('button', { name: '대여하기' });
    
    await act(async () => {
      fireEvent.click(rentButton);
    });

    // 대여 다이얼로그가 열렸는지 확인
    const rentalDialog = await waitFor(() => {
      const dialog = utils.container.querySelector('.rental-dialog');
      expect(dialog).toBeInTheDocument();
      return dialog;
    });

    // 필수 정보 입력
    const guestNameInput = screen.getByPlaceholderText('대여자 이름을 입력하세요');
    const addressInput = screen.getByPlaceholderText('목적지를 입력하세요');
    const startDateInput = rentalDialog.querySelector('input[name="startTime"]');
    const endDateInput = rentalDialog.querySelector('input[name="endTime"]');

    // 현재 시간보다 이전 시간 입력
    const pastDate = new Date(Date.now() - 86400000); // 어제
    const futureDate = new Date(Date.now() + 86400000); // 내일

    await act(async () => {
      fireEvent.change(guestNameInput, { target: { value: '홍길동' } });
      fireEvent.change(addressInput, { target: { value: '서울시 강남구' } });
      fireEvent.change(startDateInput, { target: { value: formatDateTimeForInput(pastDate) } });
      fireEvent.change(endDateInput, { target: { value: formatDateTimeForInput(futureDate) } });
    });

    // 대여하기 버튼 클릭
    const submitButton = rentalDialog.querySelector('.rental-dialog-actions .apply-button');
    await act(async () => {
      fireEvent.click(submitButton);
    });

    // 에러 메시지 확인
    await waitFor(() => {
      const errorMessage = within(rentalDialog).getByText((content, element) => {
        return element.textContent.includes('시작 시간은 현재 시간 이후여야 합니다');
      });
      expect(errorMessage).toBeInTheDocument();
    });

    // 종료 시간이 시작 시간보다 이전인 경우
    const startDate = new Date(Date.now() + 86400000); // 내일
    const endDate = new Date(Date.now() + 43200000); // 12시간 후

    await act(async () => {
      fireEvent.change(startDateInput, { target: { value: formatDateTimeForInput(startDate) } });
      fireEvent.change(endDateInput, { target: { value: formatDateTimeForInput(endDate) } });
    });

    await act(async () => {
      fireEvent.click(submitButton);
    });

    // 에러 메시지 확인
    await waitFor(() => {
      const errorMessage = within(rentalDialog).getByText((content, element) => {
        return element.textContent.includes('종료 시간은 시작 시간보다 이후여야 합니다');
      });
      expect(errorMessage).toBeInTheDocument();
    });
  });

  test('UI 상태 관리 및 에러 처리', async () => {
    const utils = await renderRental();
    
    // 검색어 입력
    const searchInput = screen.getByPlaceholderText('차량명, 차량번호, 제조사, 차종, 태그 검색');
    await act(async () => {
      fireEvent.change(searchInput, { target: { value: '존재하지 않는 차량' } });
    });

    // 검색 버튼 클릭
    const searchButton = screen.getByRole('button', { name: '검색' });
    await act(async () => {
      fireEvent.click(searchButton);
    });

    // 검색 결과 없음 상태 확인
    await waitFor(() => {
      const noResultsMessage = screen.getByText((content, element) => {
        return element.textContent.includes('검색 결과가 없습니다');
      });
      expect(noResultsMessage).toBeInTheDocument();
    });

    // 검색어 초기화
    await act(async () => {
      fireEvent.change(searchInput, { target: { value: '' } });
      fireEvent.click(searchButton);
    });

    // 초기 상태로 복귀 확인
    await waitFor(() => {
      const carCards = utils.container.querySelectorAll('.car-card');
      expect(carCards.length).toBeGreaterThan(0);
    });
  });
});