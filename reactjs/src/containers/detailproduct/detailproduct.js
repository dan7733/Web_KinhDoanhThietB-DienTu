import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styles from '../css/detailproduct/detailproduct.module.css';
import axios from 'axios';
import DOMPurify from 'dompurify';
import RecommendProduct from '../recommendProduct/recommendproduct';
import ProductReviews from '../ProductReviews/ProductReviews';
import PopularProductDisplay from '../recommendProduct/popularProduct';
import { Context } from '../login/context';

const DetailProduct = () => {
  const [showFullInfo, setShowFullInfo] = useState(false);
  const [showFullSpecs, setShowFullSpecs] = useState(false);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [isAddingToCompare, setIsAddingToCompare] = useState(false);
  const [isAddingToWishlist, setIsAddingToWishlist] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: '' });
  const { id } = useParams();
  const [detailProduct, setDetailProduct] = useState(null);
  const [averageRating, setAverageRating] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const navigate = useNavigate();
  const { user } = useContext(Context);

  useEffect(() => {
    // Fetch product details
    axios
      .get(`http://localhost:3000/api/v1/productdetail/${id}`)
      .then((response) => {
        console.log('Fetched product:', response.data.product);
        setDetailProduct(response.data.product);
      })
      .catch((error) => {
        console.error('Error fetching product detail:', error);
      });

    // Fetch reviews to calculate average rating and count
    axios
      .get(`http://localhost:3000/api/v1/reviews/${id}`)
      .then((response) => {
        if (response.data.errCode === 0) {
          const reviews = response.data.data;
          setReviewCount(reviews.length);
          const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
          const avgRating = reviews.length > 0 ? totalRating / reviews.length : 0;
          setAverageRating(avgRating.toFixed(1));
        } else {
          console.error('Error fetching reviews:', response.data.message);
        }
      })
      .catch((error) => {
        console.error('Error fetching reviews:', error);
      });
  }, [id]);

  const showTemporaryNotification = (message) => {
    setNotification({ show: true, message });
    setTimeout(() => {
      setNotification({ show: false, message: '' });
    }, 3000);
  };

  const handleBuyNow = () => {
    navigate('/payment', {
      state: { product: { ...detailProduct } },
    });
  };

  const handleAddToCart = () => {
    if (isAddingToCart) return;
    setIsAddingToCart(true);

    if (!detailProduct?.product_id) {
      console.error('Product ID is missing:', detailProduct);
      setIsAddingToCart(false);
      return;
    }

    const cartItem = {
      product_id: detailProduct.product_id,
      name: detailProduct.name,
      price: detailProduct.price,
      discount_price: detailProduct.discount_price,
      product_img: detailProduct.product_img,
      quantity: 1,
      selected: false,
    };

    const existingCart = JSON.parse(localStorage.getItem('cart')) || [];
    const existingItemIndex = existingCart.findIndex(
      (item) => item.product_id === cartItem.product_id
    );

    if (existingItemIndex >= 0) {
      existingCart[existingItemIndex].quantity += 1;
    } else {
      existingCart.push(cartItem);
    }

    localStorage.setItem('cart', JSON.stringify(existingCart));

    showTemporaryNotification(`Đã thêm ${detailProduct.name} vào giỏ hàng thành công!`);
    setIsAddingToCart(false);
  };

  const handleAddToCompare = () => {
    if (isAddingToCompare) return;
    setIsAddingToCompare(true);

    if (!detailProduct?.product_id) {
      console.error('Product ID is missing:', detailProduct);
      setIsAddingToCompare(false);
      return;
    }

    const compareItem = {
      product_id: detailProduct.product_id,
      name: detailProduct.name,
      price: detailProduct.price,
      discount_price: detailProduct.discount_price,
      product_img: detailProduct.product_img,
      technical_details: detailProduct.technical_details,
    };

    const existingCompare = JSON.parse(localStorage.getItem('compare')) || [];

    const isAlreadyInCompare = existingCompare.some(
      (item) => item.product_id === compareItem.product_id
    );

    if (isAlreadyInCompare) {
      showTemporaryNotification(`${detailProduct.name} đã có trong danh sách so sánh!`);
      setIsAddingToCompare(false);
      return;
    }

    if (existingCompare.length >= 2) {
      existingCompare.shift();
    }

    existingCompare.push(compareItem);
    localStorage.setItem('compare', JSON.stringify(existingCompare));

    showTemporaryNotification(`Đã thêm ${detailProduct.name} vào danh sách so sánh!`);
    setTimeout(() => {
      setIsAddingToCompare(false);
      navigate('/compare');
    }, 3000);
  };

  const handleAddToWishlist = () => {
    if (isAddingToWishlist) return;
    setIsAddingToWishlist(true);

    if (!detailProduct?.product_id) {
      console.error('Product ID is missing:', detailProduct);
      setIsAddingToWishlist(false);
      return;
    }

    if (!user || !user.auth) {
      showTemporaryNotification('Vui lòng đăng nhập để thêm vào danh sách yêu thích!');
      setIsAddingToWishlist(false);
      setTimeout(() => {
        navigate('/login');
      }, 3000);
      return;
    }

    const wishlistItem = {
      product_id: detailProduct.product_id,
      name: detailProduct.name,
      price: detailProduct.price,
      discount_price: detailProduct.discount_price,
      product_img: detailProduct.product_img,
    };

    const existingWishlist = JSON.parse(localStorage.getItem('wishlist')) || [];
    const isAlreadyInWishlist = existingWishlist.some(
      (item) => item.product_id === wishlistItem.product_id
    );

    if (isAlreadyInWishlist) {
      showTemporaryNotification(`${detailProduct.name} đã có trong danh sách yêu thích!`);
      setIsAddingToWishlist(false);
      return;
    }

    existingWishlist.push(wishlistItem);
    localStorage.setItem('wishlist', JSON.stringify(existingWishlist));
    showTemporaryNotification(`Đã thêm ${detailProduct.name} vào danh sách yêu thích!`);
    setIsAddingToWishlist(false);
  };

  const toggleInfo = () => setShowFullInfo(!showFullInfo);
  const toggleSpecs = () => setShowFullSpecs(!showFullSpecs);

  if (!detailProduct) {
    return (
      <div className={styles['detailproduct-loading']}>
        Đang tải thông tin sản phẩm...
      </div>
    );
  }

  const sanitizedDescription = DOMPurify.sanitize(detailProduct?.description || '', {
    ALLOWED_TAGS: ['p', 'strong', 'ul', 'li', 'br', 'img'],
    ALLOWED_ATTR: ['src', 'alt'],
    ADD_ATTR: ['loading'],
  });

  return (
    <div className={styles['container-contain']}>
      <div className="container mt-5">
        <div className={`row g-2 ${styles['detailproduct-contain-one']}`}>
          <div
            className={`col-lg-6 col-md-6 col-12 d-flex justify-content-center ${styles['detailproduct-container-img']}`}
          >
            <img
              className={styles['detailproduct-img-sup']}
              src={`http://localhost:3000/images/products/${detailProduct.product_img}`}
              alt={detailProduct.name}
            />
          </div>

          <div className={`col-lg-6 col-md-6 col-12 ${styles['detailproduct-container-info']}`}>
            <div className={styles['info-header']}>
              <h3 className={styles['detailproduct-title']}>{detailProduct.name}</h3>
              <div className={styles['product-rating']}>
                {averageRating > 0 ? (
                  <>
                    <span className={styles['average-rating']}>{averageRating}/5</span>
                    <div className={styles['rating-stars']}>
                      {[...Array(5)].map((_, i) => (
                        <i
                          key={i}
                          className={`fa-solid fa-star ${
                            i < Math.round(averageRating)
                              ? styles['star-filled']
                              : styles['star-empty']
                          }`}
                        ></i>
                      ))}
                    </div>
                    <span className={styles['review-count']}>({reviewCount} đánh giá)</span>
                  </>
                ) : (
                  <span className={styles['no-rating']}>Chưa có đánh giá</span>
                )}
              </div>
            </div>

            <div className={styles['info-details']}>
              <div className={styles['detail-section']}>
                <span className={styles['detail-label']}>Phí vận chuyển</span>
                <p className={styles['detail-text']}>
                  Miễn phí vận chuyển toàn quốc cho đơn hàng từ 1.000.000₫
                </p>
              </div>

              <div className={styles['detail-section']}>
                <span className={styles['detail-label']}>Bảo hành</span>
                <p className={styles['detail-text']}>
                  Bảo hành chính hãng 12 tháng, đổi trả trong 30 ngày nếu có lỗi từ nhà sản xuất.
                </p>
              </div>
            </div>

            <div className={styles['price-section']}>
              {detailProduct.discount_price ? (
                <>
                  <span className={styles['price-original']}>
                    {detailProduct.price.toLocaleString()}₫
                  </span>
                  <span className={styles['price-discount']}>
                    {detailProduct.discount_price.toLocaleString()}₫
                  </span>
                </>
              ) : (
                <span className={styles['price']}>{detailProduct.price.toLocaleString()}₫</span>
              )}
              {detailProduct.stock.quantity <= 0 && (
                <span className={styles['out-of-stock']}>Hết hàng 😢</span>
              )}
            </div>

            <div className={styles['action-buttons']}>
              {detailProduct.stock.quantity > 0 ? (
                <>
                  <button
                    className={styles['button-buy-now']}
                    onClick={handleBuyNow}
                  >
                    MUA NGAY
                  </button>
                  <button
                    className={styles['button-add-cart']}
                    onClick={handleAddToCart}
                    disabled={isAddingToCart}
                  >
                    <i className="fa-solid fa-cart-shopping"></i> Thêm vào giỏ hàng
                  </button>
                </>
              ) : null}
              <button
                className={styles['button-compare']}
                onClick={handleAddToCompare}
                disabled={isAddingToCompare}
              >
                <i className="fa-solid fa-scale-balanced"></i> So sánh
              </button>
              <button
                className={styles['button-wishlist']}
                onClick={handleAddToWishlist}
                disabled={isAddingToWishlist}
              >
                <i className="fa-solid fa-heart"></i> Yêu thích
              </button>
            </div>
          </div>
        </div>
      </div>

      {notification.show && (
        <div className={styles['notification']}>
          <div className={styles['notification-content']}>
            <i className="fa-solid fa-check-circle"></i>
            <span>{notification.message}</span>
          </div>
        </div>
      )}

      <div className="container mt-5">
        <div className={`row g-2 ${styles['detailproduct-contain-two']}`}>
          <div
            className={`col-lg-6 col-md-6 col-12 ${styles['detailproduct-product-info']}`}
          >
            <div className={styles['detailproduct-book']}>
              <h2 className={styles['detailproduct-info-title']}>
                <i className="fa-solid fa-book"></i> THÔNG TIN SẢN PHẨM
              </h2>
            </div>
            <div
              className={`${styles['detailproduct-info']} ${
                showFullInfo ? styles.expandedContent : styles.collapsedContent
              }`}
              dangerouslySetInnerHTML={{ __html: sanitizedDescription }}
            />
            <div className={styles['detailproduct-info-all']}>
              <button className={styles.readMoreBtn} onClick={toggleInfo}>
                {showFullInfo ? 'THU GỌN' : 'XEM TOÀN BỘ BÀI VIẾT'}
                <i
                  className={`fa-solid fa-chevron-${showFullInfo ? 'up' : 'down'}`}
                ></i>
              </button>
            </div>
          </div>

          <div
            className={`col-lg-6 col-md-6 col-12 ${styles['detailproduct-specifications']}`}
          >
            <div className={styles['detailproduct-gear']}>
              <h2 className={styles['detailproduct-gear-title']}>
                <i className="fa-solid fa-gear"></i> THÔNG SỐ KỸ THUẬT
              </h2>
            </div>
            <div
              className={`${styles['detailproduct-specs']} ${
                showFullSpecs ? styles.expandedContent : styles.collapsedContent
              }`}
            >
              {detailProduct.technical_details &&
                Object.entries(detailProduct.technical_details)
                  .slice(2)
                  .map(([key, value], index) => (
                    <div key={index}>
                      <strong>{key}:</strong> <span>{value}</span>
                    </div>
                  ))}
            </div>
            <div className={styles['detailproduct-specs-all']}>
              <button className={styles.readMoreBtn} onClick={toggleSpecs}>
                {showFullSpecs ? 'THU GỌN' : 'XEM CẤU HÌNH CHI TIẾT'}
                <i
                  className={`fa-solid fa-chevron-${showFullSpecs ? 'up' : 'down'}`}
                ></i>
              </button>
            </div>
          </div>
        </div>
      </div>

      <RecommendProduct />
      <ProductReviews />
      <PopularProductDisplay />
    </div>
  );
};

export default DetailProduct;