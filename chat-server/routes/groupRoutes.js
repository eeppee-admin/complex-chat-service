import express from 'express';
import Group from '../../shared/models/Group.js';
import {verifyUser} from '../../shared/middleware/auth.js';

const router = express.Router();
import Message from '../../shared/models/Message.js';


// 创建群组
router.post('/', verifyUser, async (req, res) => {
    try {
        const {name, members} = req.body;
        const allMembers = [...new Set([req.verifiedUser.userId, ...members])];

        // 直接查询用户是否存在
        const existingUsers = await User.countDocuments({
            _id: {$in: allMembers}
        });

        if (existingUsers !== allMembers.length) {
            return res.status(400).json({error: '包含无效的用户ID'});
        }

        const newGroup = new Group({
            name,
            creator: req.verifiedUser.userId,
            members: [...new Set([req.verifiedUser.userId, ...members])]
        });

        const savedGroup = await newGroup.save();
        console.log('[DEBUG] 已创建群组:', savedGroup); // 添加调试日志
        res.status(201).json(savedGroup);
    } catch (error) {
        console.error('[ERROR] 群组创建失败:', error.message);
        res.status(400).json({error: error.message});
    }
});


// 获取用户所在群组列表
router.get('/my-groups', verifyUser, async (req, res) => {
    try {
        // 添加身份验证日志
        console.log(`[DEBUG] 查询用户 ${req.verifiedUser.userId} 的群组列表`);

        const groups = await Group.find({
            members: {
                $in: [req.verifiedUser.userId]  // 使用 $in 操作符确保准确查询
            }
        }).select('name _id members createdAt')
            .sort({createdAt: -1});  // 按创建时间倒序

        // 添加空结果处理
        if (groups.length === 0) {
            return res.status(404).json({
                message: '未找到您加入的群组',
                suggestion: '请创建或让其他成员邀请您加入群组'
            });
        }

        res.json(groups);
    } catch (error) {
        console.error(`[ERROR] 用户 ${req.verifiedUser.userId} 群组查询失败:`, error);
        res.status(500).json({
            error: '服务器内部错误',
            detail: error.message
        });
    }
});

// 获取群组详情（通过群组名称）
router.get('/my-groups/:groupName', verifyUser, async (req, res) => {
    try {
        // 添加调试日志
        console.log('[DEBUG] 接收到的群组名称参数:', req.params.groupName);

        // 使用decodeURIComponent解码中文
        const groupName = decodeURIComponent(req.params.groupName);
        console.log('[DEBUG] 解码后的群组名称:', groupName);

        const group = await Group.findOne({
            name: groupName, // 使用解码后的名称
            members: req.verifiedUser.userId
        }).populate('creator', 'username avatar -_id');

        if (!group) {
            return res.status(403).json({
                error: '无访问权限或群组不存在'
            });
        }

        res.json({
            id: group._id,
            name: group.name,
            creator: group.creator,
            members: group.members,
            createdAt: group.createdAt
        });
    } catch (error) {
        res.status(500).json({
            error: '获取群组详情失败',
            detail: error.message
        });
    }
});

// 发送群消息
router.post('/my-groups/:groupName/messages', verifyUser, async (req, res) => {
    try {
        // 解码中文群组名
        const groupName = decodeURIComponent(req.params.groupName);

        // 1. 验证用户是否在群组中
        const group = await Group.findOne({
            name: groupName,
            members: req.verifiedUser.userId
        });

        if (!group) {
            return res.status(403).json({
                error: '无权限发送消息或群组不存在'
            });
        }

        // 2. 创建消息记录
        const newMessage = new Message({
            sender: req.verifiedUser.userId,
            receiver: group._id, // 使用群组ID
            type: 'group',
            content: req.body.content
        });

        const savedMessage = await newMessage.save();

        // 3. 返回完整消息信息
        res.status(201).json({
            ...savedMessage._doc,
            groupName: group.name // 添加群组名称便于前端显示
        });
    } catch (error) {
        res.status(500).json({
            error: '消息发送失败',
            detail: error.message
        });
    }
});


// 新增通过群名退出群组
router.delete('/my-groups/:groupName/members/me', verifyUser, async (req, res) => {
    try {
        // 解码中文群组名
        const groupName = decodeURIComponent(req.params.groupName);

        const updatedGroup = await Group.findOneAndUpdate(
            {
                name: groupName,
                members: req.verifiedUser.userId
            },
            {
                $pull: {members: req.verifiedUser.userId}
            },
            {
                new: true,
                runValidators: true
            }
        );

        if (!updatedGroup) {
            return res.status(403).json({
                error: '无操作权限或群组不存在'
            });
        }

        res.json({
            message: '成功退出群组',
            groupName: updatedGroup.name,
            remainingMembers: updatedGroup.members.length
        });
    } catch (error) {
        res.status(500).json({
            error: '退出群组失败',
            detail: error.message
        });
    }
});

export default router;