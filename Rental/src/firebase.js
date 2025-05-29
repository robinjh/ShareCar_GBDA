import { initializeApp } from 'firebase/app';
import { getFirestore, collection } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// 환경변수 디버깅
console.log('환경변수 확인:', {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
});

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};

console.log('Firebase 설정:', firebaseConfig);

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// 컬렉션 참조
export const registrationsRef = collection(db, 'registrations');
export const requestsRef = collection(db, 'requests');
export const archivesRef = collection(db, 'archives');

// 컬렉션 스키마 타입 정의
export const COLLECTION_TYPES = {
  REGISTRATION: {
    carNumber: 'string',
    carType: 'string',
    carName: 'string',
    carBrand: 'string',
    rentalFee: 'string',
    tags: 'array',
    hostID: 'string'
  },
  REQUEST: {
    carNumber: 'string',
    requesterID: 'string',
    startTime: 'string',
    endTime: 'string',
    fee: 'string',
    status: 'string',
    requestedAt: 'timestamp',
    tags: 'array',
    guestName: 'string'
  },
  ARCHIVE: {
    carNumber: 'string',
    requesterID: 'string',
    startTime: 'string',
    endTime: 'string',
    fee: 'string',
    status: 'string',
    tags: 'array',
    guestName: 'string',
    rate: 'number',
    show: 'boolean',
    archivedAt: 'timestamp'
  }
};

// 상태 열거형
export const STATUS = {
  PENDING: '대기중',
  IN_USE: '사용중',
  REJECTED: '거부',
  COMPLETED: '완료'
};

console.log('Firebase 초기화 완료');

export default app; 