import React from 'react';
import PlaceRecommendation from '../components/recomendation/PlaceRecommendation';
import { useLocation } from 'react-router-dom';

function PlaceRecommendationPage() {
  const location = useLocation();
  const { tags, address } = location.state || {};

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