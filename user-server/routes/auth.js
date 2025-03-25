import express from 'express';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import User from '../models/User.js';
import bcrypt from 'bcryptjs';

dotenv.config();
const router = express.Router();

// 注册接口
router.post('/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.create({ username, password });
        res.status(201).json({ userId: user.userId });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// 登录接口
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ error: '无效的登录凭证' });
        }

        const token = jwt.sign(
            { userId: user.userId },
            process.env.JWT_SECRET, // 从环境变量读取
            { expiresIn: '8h' }
        );

        res.json({ token, userId: user.userId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 验证接口（供聊天服务调用）
router.get('/verify', async (req, res) => {
    try {
        const token = req.headers.authorization.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        res.json({ userId: decoded.userId });
    } catch (error) {
        res.status(401).json({ error: '令牌验证失败' });
    }
});

// 添加测试路由
router.get('/test-verify', (req, res) => {
    res.json({
        userId: 'usr-1234567890abcdef12345678' // 标准格式
    });
});

// 用户ID验证接口
// 修改路由路径为 /exists/:id
router.get('/exists/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        res.status(user ? 200 : 404).json({ exists: !!user });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;