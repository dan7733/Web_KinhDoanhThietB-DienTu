import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import styles from '../css/news/news.module.css';

const NewsDisplay = () => {
  const [latestNews, setLatestNews] = useState([]);

  useEffect(() => {
    axios.get('http://localhost:3000/api/v1/latestnews')
      .then(response => setLatestNews(response.data.news))
      .catch(error => console.error('Error fetching latest news:', error));
  }, []);

  const renderNews = (newsItem, index) => (
    <Link
      to={`/detailnews/${newsItem.news_id}`}
      key={newsItem.news_id}
      className={`${styles['news-card']} ${index === 0 ? styles['featured-news'] : ''}`}
    >
      <img src={`http://localhost:3000/images/news/${newsItem.image}`} alt={newsItem.title} />
      <h5>{newsItem.title}</h5>
      <p>{newsItem.summary}</p>
    </Link>
  );

  return (
    <div className={`container-lg mt-3 ${styles['news-container']}`}>
      <div className={styles['news-category-bar']}>
        <span className="text-white fw-bold">TIN TỨC MỚI NHẤT</span>
        <div className={styles['news-category-links']}>
          <Link to="/newslist" className={styles['news-more']}>
            Xem thêm <i className="fa-solid fa-angle-double-right"></i>
          </Link>
        </div>
      </div>
      <div className={`mt-3 ${styles['news-wrapper']}`}>
        {Array.isArray(latestNews) && latestNews.length > 0 && (
          <>
            {renderNews(latestNews[0], 0)} {/* Tin tức nổi bật */}
            <div className={styles['regular-news']}>
              {latestNews.slice(1, 5).map((newsItem, index) => renderNews(newsItem, index + 1))} {/* 4 tin tức bình thường */}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default NewsDisplay;