import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { Context } from '../login/context';
import ReviewForm from './ReviewForm';
import styles from '../css/detailuser/detailorder.module.css';

const OrderDetail = () => {
  const { orderid } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(Context);
  const [order, setOrder] = useState(null);
  const [orderDetails, setOrderDetails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reviews, setReviews] = useState({}); // Store reviews by product_id

  const fetchOrderDetails = useCallback(async () => {
    try {
      const response = await axios.get(`http://localhost:3000/api/v1/orderdetail/${orderid}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('jwt')}`,
        },
        withCredentials: true,
      });

      if (response.data.errCode === 0) {
        setOrder(response.data.data.order);
        setOrderDetails(response.data.data.orderDetails);
        console.log('orderDetails:', JSON.stringify(response.data.data.orderDetails, null, 2));

        // Fetch existing reviews for each product
        const reviewPromises = response.data.data.orderDetails.map(async (detail) => {
          const reviewResponse = await axios.get('http://localhost:3000/api/v1/user-review', {
            params: { order_id: orderid, product_id: detail.product_id, username: user.username },
            headers: {
              Authorization: `Bearer ${localStorage.getItem('jwt')}`,
            },
            withCredentials: true,
          });
          return { product_id: detail.product_id, review: reviewResponse.data.data };
        });

        const reviewResults = await Promise.all(reviewPromises);
        const reviewsMap = reviewResults.reduce((acc, { product_id, review }) => {
          acc[product_id] = review;
          return acc;
        }, {});
        setReviews(reviewsMap);
      } else {
        setError(response.data.message);
      }
    } catch (err) {
      setError('Có lỗi xảy ra khi lấy chi tiết đơn hàng.');
      if (err.response?.status === 401 || err.response?.status === 403) {
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  }, [orderid, navigate, user]);

  useEffect(() => {
    if (!user || !user.username || !user.auth) {
      navigate('/login');
    } else {
      fetchOrderDetails();
    }
  }, [user, navigate, fetchOrderDetails]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getProductImageUrl = (imagePath) => {
    return `http://localhost:3000/images/products/${imagePath}`;
  };

  return (
    <div className={styles.container}>
      <h5 className="text-dark mb-4">Chi tiết đơn hàng #{orderid}</h5>
      {loading && <p>Đang tải...</p>}
      {error && <p className="text-danger">{error}</p>}
      {order && (
        <div className={styles.orderInfo}>
          <p><strong>Ngày tạo:</strong> {formatDate(order.created_at)}</p>
          <p><strong>Tổng tiền:</strong> {order.total_price.toLocaleString('vi-VN')}₫</p>
          <p><strong>Địa chỉ:</strong> {order.address}</p>
          <p><strong>Số điện thoại:</strong> {order.phone}</p>
          <p>
            <strong>Trạng thái:</strong>{' '}
            {order.status === 'delivered'
              ? 'Đã giao'
              : order.status === 'shipped'
              ? 'Đang giao'
              : order.status === 'confirmed'
              ? 'Đã xác nhận'
              : 'Đang chờ'}
          </p>
          <p>
            <strong>Trạng thái thanh toán:</strong>{' '}
            {order.status_payment === 'paid' ? 'Đã thanh toán' : 'Chưa thanh toán'}
          </p>
        </div>
      )}
      {orderDetails.length > 0 && (
        <div className={styles.orderDetails}>
          <h6>Danh sách sản phẩm</h6>
          <table className={styles.orderTable}>
            <thead>
              <tr>
                <th>Sản phẩm</th>
                <th>Số lượng</th>
                <th>Giá</th>
              </tr>
            </thead>
            <tbody>
              {orderDetails.map((detail) => (
                <tr key={detail.order_detail_id}>
                  <td>
                    <img
                      src={getProductImageUrl(detail.Product?.product_img || 'placeholder.jpg')}
                      alt={detail.Product?.name || 'Sản phẩm không xác định'}
                      className={styles.productImg}
                    />
                    {detail.Product?.name || 'Sản phẩm không xác định'}
                  </td>
                  <td>{detail.quantity}</td>
                  <td>{(detail.price || detail.discount_price || 0).toLocaleString('vi-VN')}₫</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className={styles.reviewSection}>
            <h6>Đánh giá sản phẩm</h6>
            {orderDetails.map((detail) => (
              <div key={detail.order_detail_id} className={styles.reviewItem}>
                <div className={styles.reviewProductInfo}>
                  <img
                    src={getProductImageUrl(detail.Product?.product_img || 'placeholder.jpg')}
                    alt={detail.Product?.name || 'Sản phẩm không xác định'}
                    className={styles.productImg}
                  />
                  <span>{detail.Product?.name || 'Sản phẩm không xác định'}</span>
                </div>
                <div className={styles.reviewContent}>
                  {order?.status === 'delivered' && order?.status_payment === 'paid' ? (
                    <ReviewForm
                      orderId={orderid}
                      productId={detail.product_id}
                      productName={detail.Product?.name || 'Sản phẩm không xác định'}
                      existingReview={reviews[detail.product_id] || null}
                      onReviewSubmitted={fetchOrderDetails}
                    />
                  ) : (
                    <span className={styles.reviewStatus}>Chưa đủ điều kiện đánh giá</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <Link to={`/account/${user?.username}/orders`} className={styles.backBtn}>
        Quay lại danh sách đơn hàng
      </Link>
    </div>
  );
};

export default OrderDetail;