import React from 'react';
import { useSearchParams } from 'react-router-dom';
import PlaceRecommendation from '../components/PlaceRecommendation';

function PlaceRecommendationPage() {
  const [searchParams] = useSearchParams();
  const tags = JSON.parse(decodeURIComponent(searchParams.get('tags') || '[]'));
  const address = decodeURIComponent(searchParams.get('address') || '');

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <PlaceRecommendation 
        isDarkMode={false}
        tags={tags}
        address={address}
      />
    </div>
  );
}

export default PlaceRecommendationPage; 