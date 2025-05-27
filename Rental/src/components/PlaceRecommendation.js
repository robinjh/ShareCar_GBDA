import React, { useState, useEffect, useRef } from "react";
import { Box, Typography, TextField, Button, List, ListItem, ListItemText, Paper } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import tagToKeywordMap from "../utils/tagKeywordMap";
import { searchPlacesByKeyword } from "../api/kakaoSearch";
import useKakaoLoader from "../utils/useKakaoLoader";

function safePlaceName(name, maxLen = 16) {
  return name.length > maxLen ? name.slice(0, maxLen - 2) + "…" : name;
}

function PlaceRecommendation({ tags }) {
  const [keyword, setKeyword] = useState("");
  const [places, setPlaces] = useState([]);
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [isKakaoLoaded, setIsKakaoLoaded] = useState(false);
  const mapRef = useRef(null);
  const markersRef = useRef([]);

  useKakaoLoader(() => setIsKakaoLoaded(true));

  useEffect(() => {
    if (!isKakaoLoaded) return;
    const container = document.getElementById("map");
    if (container && !mapRef.current) {
      const options = {
        center: new window.kakao.maps.LatLng(37.5665, 126.978),
        level: 5,
      };
      mapRef.current = new window.kakao.maps.Map(container, options);
    }
  }, [isKakaoLoaded]);

  const clearMarkers = () => {
    markersRef.current.forEach((obj) => obj.infowindow.close());
    markersRef.current.forEach((obj) => obj.marker.setMap(null));
    markersRef.current = [];
  };

  const displayMarkers = (placesArr) => {
    clearMarkers();
    if (!mapRef.current || !placesArr || placesArr.length === 0) return;
    placesArr.forEach((place, idx) => {
      const marker = new window.kakao.maps.Marker({
        map: mapRef.current,
        position: new window.kakao.maps.LatLng(place.y, place.x),
      });
      const infowindow = new window.kakao.maps.InfoWindow({
        content: `
          <div style="
            color: #232323;
            text-align: center;
            font-size: 15px;
            font-weight: 600;
            min-width: 80px;
            max-width: 160px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          ">&nbsp;${safePlaceName(place.place_name)}&nbsp;</div>
        `,
      });
      marker.customIdx = idx;
      window.kakao.maps.event.addListener(marker, "click", () => {
        markersRef.current.forEach((obj) => obj.infowindow.close());
        infowindow.open(mapRef.current, marker);
        setSelectedIdx(idx);
      });
      markersRef.current.push({ marker, infowindow });
    });
    if (placesArr[0]) {
      mapRef.current.setCenter(
        new window.kakao.maps.LatLng(placesArr[0].y, placesArr[0].x)
      );
    }
  };

  const handleListClick = (idx) => {
    setSelectedIdx(idx);
    const place = places[idx];
    if (!place || !mapRef.current) return;
    mapRef.current.setCenter(new window.kakao.maps.LatLng(place.y, place.x));
    markersRef.current.forEach((obj) => obj.infowindow.close());
    if (markersRef.current[idx]) {
      markersRef.current[idx].infowindow.open(
        mapRef.current,
        markersRef.current[idx].marker
      );
    }
  };

  const handleInputSearch = async () => {
    try {
      if (!keyword.trim()) return;
      const results = await searchPlacesByKeyword(keyword);
      setPlaces(results);
      setSelectedIdx(null);
      displayMarkers(results);
    } catch (err) {
      console.error(err);
      alert("장소 검색 실패!");
    }
  };

  const handleInputKeyDown = (e) => {
    if (e.key === "Enter") handleInputSearch();
  };

  useEffect(() => {
    if (!isKakaoLoaded || !tags || tags.length === 0) return;
    if (!window.kakao || !window.kakao.maps || !window.kakao.maps.services)
      return;

    let allKeywords = [];
    tags.forEach((tag) => {
      const key = tag;
      const keywords = tagToKeywordMap[key] || [];
      allKeywords = [...allKeywords, ...keywords];
    });
    allKeywords = [...new Set(allKeywords)];

    const ps = new window.kakao.maps.services.Places();
    setPlaces([]);
    setSelectedIdx(null);

    const center = mapRef.current.getCenter();

    let combined = [];
    let callCount = 0;
    allKeywords.forEach((word) => {
      ps.keywordSearch(
        word,
        (data, status) => {
          callCount += 1;
          if (
            status === window.kakao.maps.services.Status.OK &&
            Array.isArray(data)
          ) {
            combined = [...combined, ...data];
          }
          if (callCount === allKeywords.length) {
            const uniquePlaces = [];
            const seen = new Set();
            for (const p of combined) {
              if (!seen.has(p.id)) {
                uniquePlaces.push(p);
                seen.add(p.id);
              }
            }
            setPlaces(uniquePlaces);
            displayMarkers(uniquePlaces);
          }
        },
        {
          location: center,
          radius: 20000,
          sort: window.kakao.maps.services.SortBy.DISTANCE,
        }
      );
    });
  }, [isKakaoLoaded, tags]);

  return (
    <Box sx={{ mt: 4 }}>
      <Typography variant="h5" component="h2" sx={{ mb: 2 }}>
        추천 장소
      </Typography>
      <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
        <TextField
          fullWidth
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onKeyDown={handleInputKeyDown}
          placeholder="예: 커플 데이트, 조용한 카페 등"
          size="small"
        />
        <Button
          variant="contained"
          onClick={handleInputSearch}
          startIcon={<SearchIcon />}
        >
          검색
        </Button>
      </Box>
      <Box sx={{ display: "flex", gap: 2 }}>
        <Paper
          elevation={3}
          sx={{
            width: "30%",
            height: "400px",
            overflow: "auto",
            p: 1,
          }}
        >
          <List>
            {places.map((place, idx) => (
              <ListItem
                key={place.id}
                button
                selected={selectedIdx === idx}
                onClick={() => handleListClick(idx)}
              >
                <ListItemText
                  primary={place.place_name}
                  secondary={place.road_address_name || place.address_name}
                />
              </ListItem>
            ))}
          </List>
        </Paper>
        <Paper
          elevation={3}
          sx={{
            width: "70%",
            height: "400px",
            overflow: "hidden",
          }}
        >
          <div
            id="map"
            style={{
              width: "100%",
              height: "100%",
            }}
          />
        </Paper>
      </Box>
    </Box>
  );
}

export default PlaceRecommendation; 