import express from 'express';
import mongoose from 'mongoose';
import authRouter from './routes/auth.js';
import dotenv from 'dotenv';

dotenv.config();
const app = express();

// 数据库连接
mongoose.connect(process.env.USER_DB_URI)
    .then(() => console.log('用户数据库已连接'))
    .catch(err => console.error(err));

// 中间件
app.use(express.json());

// 用户登录注册路由
app.use('/api/auth', authRouter);

app.listen(4000, () => {
    console.log('用户服务运行在 4000 端口');
});