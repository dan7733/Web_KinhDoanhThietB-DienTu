import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import polyline from '@mapbox/polyline';
import styles from '../css/storemap/storemap.module.css';

// Sửa lỗi icon mặc định của Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const StoreMap = () => {
  const [stores, setStores] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [inputLocation, setInputLocation] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Lấy danh sách cửa hàng từ API
  useEffect(() => {
    const fetchStores = async () => {
      try {
        const res = await axios.get('http://localhost:3000/api/v1/liststore');
        if (res.data.errCode === 0) {
          setStores(res.data.data);
        } else {
          console.error('Lỗi API:', res.data.message);
        }
      } catch (err) {
        console.error('Lỗi khi lấy danh sách cửa hàng:', err);
        alert('Không thể tải danh sách cửa hàng.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchStores();
  }, []);

  const getNearestStore = (userLat, userLng) => {
    let nearest = null;
    let minDist = Infinity;
    stores.forEach((store) => {
      const dist = Math.sqrt(
        Math.pow(store.latitude - userLat, 2) + Math.pow(store.longitude - userLng, 2)
      );
      if (dist < minDist) {
        minDist = dist;
        nearest = store;
      }
    });
    return nearest;
  };

  const geocodeLocation = async () => {
    if (!inputLocation) {
      alert('Vui lòng nhập vị trí.');
      return;
    }
    try {
      const res = await axios.get(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(inputLocation)}&format=json`
      );
      if (res.data && res.data.length > 0) {
        const { lat, lon } = res.data[0];
        const parsedLat = parseFloat(lat);
        const parsedLon = parseFloat(lon);
        setUserLocation([parsedLat, parsedLon]);
        await drawRoute(parsedLat, parsedLon);
      } else {
        alert('Không tìm thấy vị trí bạn nhập.');
      }
    } catch (err) {
      console.error('Lỗi khi tìm vị trí:', err);
      alert('Lỗi khi tìm vị trí. Vui lòng thử lại.');
    }
  };

  const drawRoute = async (lat, lng) => {
    const nearestStore = getNearestStore(lat, lng);
    if (!nearestStore) {
      alert('Không tìm thấy cửa hàng nào gần vị trí này.');
      return;
    }

    const directionsUrl = 'https://api.openrouteservice.org/v2/directions/driving-car';
    const body = {
      coordinates: [[lng, lat], [nearestStore.longitude, nearestStore.latitude]],
    };

    try {
      const res = await axios.post(directionsUrl, body, {
        headers: {
          Authorization: '5b3ce3597851110001cf6248410fa96dbf134b59b64e995b9536503e',
          'Content-Type': 'application/json; charset=utf-8',
          Accept: 'application/json, application/geo+json, application/gpx+xml, img/png; charset=utf-8',
        },
      });

      if (res.data && res.data.routes && res.data.routes.length > 0) {
        const geometry = res.data.routes[0].geometry;
        if (typeof geometry === 'string') {
          const decodedCoords = polyline.decode(geometry);
          const coords = decodedCoords.map(([lat, lng]) => [lat, lng]);
          setRouteCoordinates(coords);
        } else {
          alert('Dữ liệu tuyến đường không hợp lệ: Geometry không phải chuỗi polyline.');
        }
      } else {
        alert('Không tìm thấy tuyến đường. Vui lòng kiểm tra tọa độ hoặc API key.');
      }
    } catch (err) {
      console.error('Lỗi khi vẽ tuyến đường:', err);
      alert('Lỗi khi kết nối OpenRouteService: ' + (err.response?.data?.error?.message || err.message));
    }
  };

  // Component để điều chỉnh khung nhìn bản đồ
  const MapController = () => {
    const map = useMap();
    useEffect(() => {
      if (stores.length > 0) {
        const bounds = L.latLngBounds(stores.map((store) => [store.latitude, store.longitude]));
        map.fitBounds(bounds);
      }
      if (userLocation) {
        map.setView(userLocation, 16);
      }
    }, [stores, userLocation, map]);
    return null;
  };

  return (
    <div className={styles.container}>
      <div className={styles.sidebar}>
        <h2 className={styles.title}>
          <i className="fas fa-store me-2"></i> Danh sách cửa hàng
        </h2>
        <div className={styles.inputGroup}>
          <input
            type="text"
            className="form-control"
            value={inputLocation}
            onChange={(e) => setInputLocation(e.target.value)}
            placeholder="Nhập vị trí của bạn..."
          />
          <button className="btn btn-primary" onClick={geocodeLocation}>
            <i className="fas fa-search me-2"></i> 
          </button>
        </div>
        {isLoading ? (
          <div className="text-center mt-3">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Đang tải...</span>
            </div>
          </div>
        ) : (
          <>
            <div className={styles.storeListDesktop}>
              <ul className={styles.storeList}>
                {stores.length > 0 ? (
                  stores.map((store) => (
                    <li
                      key={store.store_id}
                      className={styles.storeItem}
                      onClick={() => {
                        setUserLocation([store.latitude, store.longitude]);
                      }}
                    >
                      <div>
                        <strong>{store.name}</strong>
                        <br />
                        <i className="fas fa-map-marker-alt me-1"></i> {store.address}
                        <br />
                        <i className="fas fa-clock me-1"></i> {store.open_hours} - {store.close_hour}
                      </div>
                    </li>
                  ))
                ) : (
                  <p className="text-muted mt-3">Không có cửa hàng nào.</p>
                )}
              </ul>
            </div>
            <div className={styles.storeListMobile}>
              <button
                className="btn btn-outline-primary w-100 text-white"
                type="button"
                data-bs-toggle="offcanvas"
                data-bs-target="#storeOffcanvas"
                aria-controls="storeOffcanvas"
              >
                <i className="fas fa-store me-2"></i> Xem danh sách cửa hàng
              </button>
              <div
                className="offcanvas offcanvas-end"
                tabIndex="-1"
                id="storeOffcanvas"
                aria-labelledby="storeOffcanvasLabel"
              >
                <div className="offcanvas-header">
                  <h5 className="offcanvas-title" id="storeOffcanvasLabel">
                    Danh sách cửa hàng
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    data-bs-dismiss="offcanvas"
                    aria-label="Close"
                  ></button>
                </div>
                <div className="offcanvas-body">
                  <ul className={styles.storeList}>
                    {stores.length > 0 ? (
                      stores.map((store) => (
                        <li
                          key={store.store_id}
                          className={styles.storeItem}
                          onClick={() => {
                            setUserLocation([store.latitude, store.longitude]);
                            // Đóng offcanvas khi chọn cửa hàng
                            document.getElementById('storeOffcanvas').classList.remove('show');
                            document.body.classList.remove('offcanvas-open');
                            document.querySelector('.offcanvas-backdrop')?.remove();
                          }}
                        >
                          <div>
                            <strong>{store.name}</strong>
                            <br />
                            <i className="fas fa-map-marker-alt me-1"></i> {store.address}
                            <br />
                            <i className="fas fa-clock me-1"></i> {store.open_hours} - {store.close_hour}
                          </div>
                        </li>
                      ))
                    ) : (
                      <p className="text-muted mt-3">Không có cửa hàng nào.</p>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
      <MapContainer
        center={[10.0478, 105.769]}
        zoom={13}
        className={styles.map}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="© OpenStreetMap contributors"
        />
        <MapController />
        {stores.map((store) => (
          <Marker key={store.store_id} position={[store.latitude, store.longitude]}>
            <Popup>
              <b>{store.name}</b>
              <br />
              {store.address}
              <br />
              Giờ mở: {store.open_hours} - {store.close_hour}
            </Popup>
          </Marker>
        ))}
        {userLocation && (
          <Marker position={userLocation}>
            <Popup>Vị trí của bạn</Popup>
          </Marker>
        )}
        {routeCoordinates.length > 0 && (
          <Polyline positions={routeCoordinates} color="blue" />
        )}
      </MapContainer>
    </div>
  );
};

export default StoreMap;