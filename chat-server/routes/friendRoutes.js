import express from 'express';
import Friend from '../../shared/models/Friend.js';
import {verifyUser} from '../../shared/middleware/auth.js';

const router = express.Router();
import User from '../../shared/models/User.js';
import mongoose from 'mongoose';
import Friendship from '../../shared/models/Friendship.js';


// 发送好友申请
// 修改获取用户ID的方式
router.post('/requests', verifyUser, async (req, res) => {
    try {
        const {targetUserId} = req.body;

        // 修改为从 verifiedUser 获取当前用户ID
        const currentUserId = req.verifiedUser.userId;

        if (targetUserId === currentUserId) {
            return res.status(400).json({error: '不能添加自己为好友'});
        }

        const newRequest = new Friend({
            user: currentUserId,  // 使用统一后的用户ID路径
            friend: targetUserId,
            status: 'pending'
        });

        await newRequest.save();
        res.status(201).json({message: '好友申请已发送'});
    } catch (error) {
        res.status(500).json({error: error.message});
    }
});

// 处理好友申请
router.put('/requests/:requestId', verifyUser, async (req, res) => {
    try {
        const request = await Friend.findOne({
            _id: req.params.requestId,
            // 修复查询条件：应该匹配接收方是当前用户
            friend: req.verifiedUser.userId,
            status: 'pending'
        }).populate('user', 'username avatar');

        if (!request) {
            console.error('申请记录查询失败:', {
                requestId: req.params.requestId,
                currentUser: req.verifiedUser.userId
            });
            return res.status(404).json({error: '申请记录不存在或已处理'});
        }

        // 更新申请状态
        request.status = req.body.action === 'accept' ? 'accepted' : 'rejected';
        await request.save();

        // 如果是接受，创建反向好友记录
        // 修改好友申请处理逻辑
        // 修改后的接受好友逻辑（去事务化）
        if (request.status === 'accepted') {
            // 创建双向好友关系
            await Friendship.create([
                {user: request.user, friend: request.friend},
                {user: request.friend, friend: request.user}
            ]);

            // 返回成功响应
            res.json({
                status: 'accepted',
                message: '好友关系已建立'
            });
        } else {
            res.json({request});
        }
        const reverseFriend = new Friend({
            user: req.verifiedUser.userId,
            friend: request.user,
            status: 'accepted'
        });
        await reverseFriend.save();
    } catch (error) {
        res.status(500).json({error: error.message});
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


// 新增好友列表查询接口
router.get('/:userId/friends', verifyUser, async (req, res) => {
    try {
        const user = await User.findById(req.params.userId)
            .select('friends')
            .populate({
                path: 'friends',
                select: 'username avatar lastActive',
                options: {allowEmptyArray: true} // 允许空数组
            });

        // 添加空值保护逻辑
        const safeFriends = user?.friends.size ? user.friends : [];

        res.json({
            userId: req.params.userId,
            count: safeFriends.size,
            friends: safeFriends
        });
    } catch (error) {
        res.status(500).json({
            error: '获取好友列表失败',
            detail: error.message
        });
    }
});

// 新增我的好友列表接口
router.get('/my-friends', verifyUser, async (req, res) => {
    try {
        const friendships = await Friendship.find({
            user: req.verifiedUser.userId,
            status: 'active'
        })
            .populate('friend', 'username avatar lastActive')
            .select('friend status createdAt');

        res.json({
            count: friendships.length,
            friends: friendships.map(f => ({
                ...f.friend.toObject(),
                friendshipSince: f.createdAt
            }))
        });
    } catch (error) {
        res.status(500).json({error: error.message});
    }
});


export default router;