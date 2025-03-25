import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import groupRouters from './routes/groupRoutes.js';


dotenv.config();
const app = express();

// 数据库连接
mongoose.connect(process.env.USER_DB_URI)
    .then(() => console.log('Mongodb数据库已连接'))
    .catch(err => console.error(err));

// 中间件
app.use(express.json());

// 用户登录注册路由
app.use('/api/group', groupRouters);

app.listen(5000, () => {
    console.log('群组服务运行在 5000 端口');
});