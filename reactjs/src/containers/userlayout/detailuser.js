import React, { useRef, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import styles from '../css/detailuser/detailuser.module.css';
import DFavatar from '../../img/avatar/avatar.png'; // Default avatar
import { Context } from '../login/context';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet icon issue (consistent with Payment component)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const DetailUser = () => {
  const avatarInputRef = useRef(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [userData, setUserData] = useState(null);
  const [error, setError] = useState(null);
  const [isBirthday, setIsBirthday] = useState(false);
  const [userCoords, setUserCoords] = useState(null); // New state for user coordinates
  const { username } = useParams(); // Get username from URL
  const navigate = useNavigate();
  const { user } = React.useContext(Context); // Use context to get user

  // Authentication check
  useEffect(() => {
    if (!user || !user.username || !user.auth) {
      navigate('/login');
    }
  }, [user, navigate]);

  // Geocode address
  const geocodeAddress = async (address) => {
    if (!address || address.trim().length < 10 || !address.includes(' ')) {
      console.warn('Address too short or generic:', address);
      return null;
    }

    try {
      const query = encodeURIComponent(`${address}, Vietnam`);
      const response = await axios.get(
        `https://nominatim.openstreetmap.org/search?format=json&q=${query}&countrycodes=VN&limit=1`
      );
      if (response.data.length > 0) {
        const { lat, lon, display_name } = response.data[0];
        console.log('Geocoded address:', address, { lat, lon, display_name });
        return { lat: parseFloat(lat), lon: parseFloat(lon), display_name };
      }
      console.warn('No geocoding results for:', address);
      return null;
    } catch (error) {
      console.error('Error geocoding address:', error);
      return null;
    }
  };

  // Fetch user data and geocode address
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await axios.get(
          `http://localhost:3000/api/v1/detailuserbyusername/${username}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('jwt')}`,
            },
            withCredentials: true,
          }
        );

        if (response.data.errCode === 0) {
          const data = response.data.detailuser;
          setUserData(data);
          // Prepend backend URL to avatar if it exists, else use default
          setAvatarPreview(
            data.avatar
              ? `http://localhost:3000/images/useravatar/${data.avatar}`
              : DFavatar
          );
          // Check if today is the user's birthday
          if (data.dateOfBirth && data.dateOfBirth !== '0000-00-00') {
            const birthDate = new Date(data.dateOfBirth);
            const today = new Date();
            if (
              birthDate.getDate() === today.getDate() &&
              birthDate.getMonth() === today.getMonth()
            ) {
              setIsBirthday(true);
            }
          }
          // Geocode address if it exists
          if (data.address && data.address.trim()) {
            const coords = await geocodeAddress(data.address);
            if (coords) {
              setUserCoords(coords);
            }
          }
        } else {
          setError(response.data.message || 'Không thể tải thông tin người dùng.');
        }
      } catch (err) {
        if (err.response?.status === 401 || err.response?.status === 403) {
          navigate('/login'); // Redirect to login on unauthorized/forbidden
        } else {
          setError('Đã xảy ra lỗi khi tải thông tin. Vui lòng thử lại.');
        }
      }
    };

    if (username && user?.auth) {
      fetchUserData();
    }
  }, [username, navigate, user]);

  // Handle avatar change (unused in this read-only view but kept for consistency)
  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setAvatarPreview(ev.target.result);
      reader.readAsDataURL(file);
    }
  };

  // Loading or error state
  if (error) {
    return <div className={styles.error}>{error}</div>;
  }

  if (!userData) {
    return <div className={styles.loading}>Đang tải...</div>;
  }

  return (
    <div className={styles.formBox}>
      <h5>Thông tin tài khoản</h5>
      {isBirthday && (
        <div className={styles.birthdayMessage}>
          Chúc mừng sinh nhật 🎉 Hôm nay là ngày đặc biệt của bạn!
        </div>
      )}
      <div className={styles.avatarSection}>
        <div className={styles.avatarWrapper}>
          <img
            src={avatarPreview}
            className={styles.avatarImage}
            alt="Avatar"
          />
          <input
            type="file"
            ref={avatarInputRef}
            onChange={handleAvatarChange}
            accept=".jpg,.jpeg,.png"
            hidden
          />
        </div>
      </div>

      <div className={styles.userInfo}>
        <div className={styles.infoItem}>
          <label className={styles.infoLabel}>Tên đăng nhập</label>
          <p className={styles.infoValue}>{userData.username || 'N/A'}</p>
        </div>
        <div className={styles.infoItem}>
          <label className={styles.infoLabel}>Họ và tên</label>
          <p className={styles.infoValue}>{userData.fullname || 'N/A'}</p>
        </div>
        <div className={styles.infoItem}>
          <label className={styles.infoLabel}>Email</label>
          <p className={styles.infoValue}>{userData.email || 'N/A'}</p>
        </div>
        <div className={styles.infoItem}>
          <label className={styles.infoLabel}>Số điện thoại</label>
          <p className={styles.infoValue}>{userData.phone || 'N/A'}</p>
        </div>
        <div className={styles.infoItem}>
          <label className={styles.infoLabel}>Giới tính</label>
          <p className={styles.infoValue}>{userData.sex || 'N/A'}</p>
        </div>
        <div className={styles.infoItem}>
          <label className={styles.infoLabel}>Ngày sinh</label>
          <p className={styles.infoValue}>
            {userData.dateOfBirth && userData.dateOfBirth !== '0000-00-00'
              ? new Date(userData.dateOfBirth).toLocaleDateString('vi-VN')
              : 'N/A'}
          </p>
        </div>
        <div className={styles.infoItem}>
          <label className={styles.infoLabel}>Địa chỉ</label>
          <p className={styles.infoValue}>{userData.address || 'N/A'}</p>
        </div>
      </div>

      {userCoords && (
        <div className={styles.mapSection}>
          <h6 className={styles.mapTitle}>Vị trí của bạn</h6>
          <div className={styles.mapContainer}>
            <MapContainer
              center={[userCoords.lat, userCoords.lon]}
              zoom={14}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              <Marker position={[userCoords.lat, userCoords.lon]}>
                <Popup>{userCoords.display_name}</Popup>
              </Marker>
            </MapContainer>
          </div>
        </div>
      )}
    </div>
  );
};

export default DetailUser;