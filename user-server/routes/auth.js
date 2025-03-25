import express from 'express';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import User from '../../shared/models/User.js';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

dotenv.config();
const router = express.Router();

// 注册接口
router.post('/register', async (req, res) => {
    try {
        const { username, password } = req.body;

        // 生成符合格式要求的用户ID
        const userId = `usr-${new mongoose.Types.ObjectId().toHexString()}`;

        const newUser = new User({
            _id: userId, // 明确设置_id字段
            username,
            password: await bcrypt.hash(password, 10)
        });

        await newUser.save();
        res.status(201).json({ userId });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// 登录接口
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        // 添加空值检查
        if (!username || !password) {
            return res.status(400).json({ error: '需要提供用户名和密码' });
        }

        // 显式选择密码字段
        const user = await User.findOne({ username }).select('+password');
        if (!user) return res.status(404).json({ error: '用户不存在' });

        // 添加密码存在性检查
        if (!user.password) {
            console.error('数据库密码字段异常:', user._id);
            return res.status(500).json({ error: '系统错误' });
        }

        // 修复密码对比逻辑
        const isMatch = await bcrypt.compare(String(password), user.password);
        if (!isMatch) return res.status(401).json({ error: '密码错误' });

        // 生成JWT令牌
        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );

        res.json({ token, userId: user._id, username: user.username });
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