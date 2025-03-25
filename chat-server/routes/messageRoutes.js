import express from 'express';
import Message from '../../shared/models/Message.js';
import { verifyUser } from '../../shared/middleware/auth.js';
import Friend from '../../shared/models/Friend.js';
const router = express.Router();
import User from '../../shared/models/User.js';
import Friendship from '../../shared/models/Friendship.js';

// 修改后的发送消息接口
// 在消息发送前添加好友验证
router.post('/', verifyUser, async (req, res) => {
    try {
        const { receiver, content } = req.body;
        const sender = req.verifiedUser.userId;

        // 验证好友关系
        const isFriends = await Friendship.exists({
            user: sender,
            friend: receiver,
            status: 'active'
        });

        if (!isFriends) {
            return res.status(403).json({ error: '请先成为好友才能发送消息' });
        }

        const newMessage = new Message({
            sender,
            receiver,
            content
        });

        await newMessage.save();
        res.status(201).json(newMessage);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 修改后的消息历史接口
router.get('/history', verifyUser, async (req, res) => {
    try {
        const userId = req.verifiedUser.userId;
        const { friendId, limit = 50, offset = 0 } = req.query;

        // 验证必须提供好友ID参数
        if (!friendId) {
            return res.status(400).json({ error: '需要提供好友ID参数' });
        }

        // 验证好友关系
        const isFriend = await Friendship.exists({
            user: userId,
            friend: friendId,
            status: 'active'
        });

        if (!isFriend) {
            return res.status(403).json({ error: '只能查看好友消息历史' });
        }

        const messages = await Message.find({
            $or: [
                { sender: userId, receiver: friendId },
                { sender: friendId, receiver: userId }
            ]
        })
            .sort({ createdAt: -1 })
            .skip(parseInt(offset))
            .limit(Math.min(parseInt(limit), 100))
            .populate('sender receiver', 'username avatar');

        res.json({
            total: messages.length,
            messages: messages.reverse()
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 消息撤回接口
router.put('/:messageId/recall', verifyUser, async (req, res) => {
    try {
        const message = await Message.findOne({
            _id: req.params.messageId,
            sender: req.verifiedUser.userId,
            createdAt: { $gte: new Date(Date.now() - 120000) } // 2分钟内可撤回
        });

        if (!message) {
            return res.status(403).json({
                error: '消息不存在、超过撤回时效或无权操作'
            });
        }

        message.status = 'recalled';
        message.content = '[消息已撤回]';
        await message.save();

        res.json({
            message: '消息撤回成功',
            updatedMessage: message
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


export default router;