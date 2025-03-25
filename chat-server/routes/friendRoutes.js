import express from 'express';
import Friend from '../models/Friend.js';
import { verifyUser } from '../middleware/auth.js';
const router = express.Router();

// 发送好友申请
// 修改获取用户ID的方式
router.post('/requests', verifyUser, async (req, res) => {
    try {
        const { targetUserId } = req.body;

        // 修改为从 verifiedUser 获取当前用户ID
        const currentUserId = req.verifiedUser.userId;

        if (targetUserId === currentUserId) {
            return res.status(400).json({ error: '不能添加自己为好友' });
        }

        const newRequest = new Friend({
            user: currentUserId,  // 使用统一后的用户ID路径
            friend: targetUserId,
            status: 'pending'
        });

        await newRequest.save();
        res.status(201).json({ message: '好友申请已发送' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 处理好友申请
router.put('/requests/:requestId', verifyUser, async (req, res) => {
    try {
        const request = await Friend.findOne({
            _id: req.params.requestId,
            friend: req.verifiedUser.userId,
            status: 'pending'
        });
        
        if (!request) return res.status(404).json({ error: '申请记录不存在' });
        
        // 更新申请状态
        request.status = req.body.action === 'accept' ? 'accepted' : 'rejected';
        await request.save();
        
        // 如果是接受，创建反向好友记录
        if (request.status === 'accepted') {
            const reverseFriend = new Friend({
                user: req.verifiedUser.userId,
                friend: request.user,
                status: 'accepted'
            });
            await reverseFriend.save();
        }
        
        res.json(request);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 查询好友申请
router.get('/requests', verifyUser, async (req, res) => {
    const requests = await Friend.find({
        friend: req.verifiedUser.userId,
        status: 'pending'
    }).populate('requester', 'username avatar');
    
    res.json(requests);
});

export default router;