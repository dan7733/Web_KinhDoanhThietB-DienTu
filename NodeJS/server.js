import express from 'express'
import dotenv from 'dotenv/config'
import viewEngine from './configs/viewEngine';  
import initWebRouter from './router/WebRouter';
import initAPIRoute from './router/apiRouter';
import path from 'path'
import RedisStore from "connect-redis";
import session from "express-session";
import { createClient } from "redis";
import cors from 'cors';
import cookieParser from 'cookie-parser';
import './configs/cleanup'; // Thêm cron job

const app = express()
const port=process.env.PORT
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
viewEngine(app);
app.use('/static', express.static(path.join(__dirname, 'public')))
app.use('/images', express.static(path.join(__dirname, 'images')))
// css
// app.use(express.static(__dirname + '/views'));

// Khởi tạo Redis client
let redisClient = createClient();
redisClient.connect().catch(console.error); // Bắt lỗi nếu kết nối thất bại

// Khởi tạo Redis Store
let redisStore = new RedisStore({
  client: redisClient,
  prefix: "myapp:",
});

// Thiết lập session middleware với Redis Store
app.use(
  session({
    store: redisStore,
    resave: false, // Không lưu session nếu không có thay đổi
    saveUninitialized: false, // Chỉ lưu session nếu có dữ liệu
    secret: process.env.Ad_Session_Secret, // Khóa bí mật để mã hóa session
  })
);


// cho phéo gọi api ở server
const corsOptions = {
  origin: ['http://localhost:3001', 'http://localhost:1234'],
  optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
  credentials: true
};


app.use(cors(corsOptions));

app.use(cookieParser());

initAPIRoute(app)
initWebRouter(app)

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})







