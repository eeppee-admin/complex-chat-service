
import dotenv from 'dotenv';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import messageRoutes from './routes/messageRoutes.js';
import mongoose from 'mongoose';
import groupRoutes from './routes/groupRoutes.js';
import cors from 'cors';
import friendRoutes from './routes/friendRoutes.js';

dotenv.config();
// 在dotenv配置之后添加数据库连接
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error('MongoDB connection error:', err));

const app = express();
const server = createServer(app);
const io = new Server(server);

// 中间件
app.use(express.json());
app.use('/api/messages', messageRoutes);
// 挂载群组路由
app.use('/api/groups', groupRoutes);
app.use('/api/friends', friendRoutes);
// 在中间件部分添加
app.use(cors({
    origin: 'http://localhost:4000', // user-server端口
    credentials: true
}));

// Socket初始化
io.on('connection', (socket) => {
    console.log('用户连接:', socket.id);
});



// 在server.listen之前添加连接验证
server.listen(process.env.PORT, () => {
    console.log(`服务运行在端口 ${process.env.PORT}`);
});


