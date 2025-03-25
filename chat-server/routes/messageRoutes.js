import express from 'express';
import Message from '../models/Message.js';
import { verifyUser } from '../middleware/auth.js';
import Friend from '../models/Friend.js';
const router = express.Router();
import User from '../models/User.js';

// 修改后的发送消息接口
// 在消息发送前添加好友验证
router.post('/', verifyUser, async (req, res) => {
    const isFriend = await Friend.exists({
        user: req.verifiedUser.userId,
        friend: req.body.receiver,
        status: 'accepted'
    });

    if (!isFriend) {
        return res.status(403).json({
            error: '请先添加好友',
            action: `/api/friends/requests/${req.body.receiver}`,
            method: 'POST'
        });
    }
    try {
        const { receiver, content } = req.body;

        // 验证接收方是否存在
        const receiverExists = await User.exists({ _id: receiver });
        if (!receiverExists) {
            return res.status(404).json({ error: '目标用户不存在' });
        }

        // 验证好友关系
        const isFriend = await Friend.exists({
            $or: [
                { user: req.user.id, friend: receiver, status: 'accepted' },
                { user: receiver, friend: req.user.id, status: 'accepted' }
            ]
        });

        if (!isFriend) {
            return res.status(403).json({
                error: '非好友不能发送消息',
                action: '/api/friends/requests', // 添加好友申请入口
                method: 'POST'
            });
        }

        // 原有消息创建逻辑
        const newMessage = new Message({
            sender: req.user.id,
            receiver,
            content,
            type: 'private'
        });

        const savedMessage = await newMessage.save();
        res.status(201).json(savedMessage);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 修改路由定义（移除userId参数）
router.get('/history', verifyUser, async (req, res) => {
    try {
        const { startDate, endDate, type } = req.query;
        const currentUserId = req.verifiedUser.userId; // 从认证信息获取用户ID

        // 构建仅包含当前用户的查询条件
        const conditions = {
            $or: [
                { sender: currentUserId },
                { receiver: currentUserId }
            ],
            status: { $ne: 'recalled' },// 过滤已撤回消息
            ...(type && { type })
        };

        // 添加时间范围过滤
        if (startDate || endDate) {
            conditions.createdAt = {};
            if (startDate) conditions.createdAt.$gte = new Date(startDate);
            if (endDate) conditions.createdAt.$lte = new Date(endDate);
        }

        const messages = await Message.find(conditions)
            .sort({ createdAt: -1 })
            .limit(100);

        res.json({
            count: messages.length,
            results: messages
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 消息撤回接口（5分钟内可撤回）
router.put('/:id/recall', verifyUser, async (req, res) => {
    try {
        const message = await Message.findOne({
            _id: req.params.id,
            sender: req.verifiedUser.userId, // 严格验证发送者身份
            createdAt: { $gt: new Date(Date.now() - 5 * 60 * 1000) } // 5分钟限制
        });

        if (!message) {
            return res.status(404).json({
                error: '消息不存在(无权限)或超过撤回时限'
            });
        }

        message.status = 'recalled';
        await message.save();

        res.json({
            success: true,
            updated: message
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
export default router;