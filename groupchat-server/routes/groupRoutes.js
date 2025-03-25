import Group from '../../shared/models/Group.js';
import express from "express";
import GroupMembership from '../../shared/models/GroupMembersship.js';
import GroupMessage from '../../shared/models/GroupMessage.js';
import { verifyUser } from '../../shared/middleware/auth.js';


const router = express.Router();

// 创建群组
router.post('/', verifyUser, async (req, res) => {
    try {
        const { groupName, initialMembers = [] } = req.body;
        const creatorId = req.verifiedUser.userId;

        // 参数验证
        if (!groupName) {
            return res.status(400).json({
                error: '群组名称不能为空',
                solution: '请提供有效的群组名称（2-50个字符）'
            });
        }

        // 验证初始成员有效性
        const invalidUsers = [];
        await Promise.all(
            initialMembers.map(async (userId) => {
                try {
                    const response = await fetch(
                        `http://localhost:4000/api/auth/exists/${userId}`,
                        {
                            headers: {
                                Authorization: req.headers.authorization
                            }
                        }
                    );

                    // 新增调试日志
                    console.log(`用户验证结果 [${userId}]:`, {
                        status: response.status,
                        statusText: response.statusText
                    });

                    if (!response.ok) invalidUsers.push(userId);
                } catch (error) {
                    console.error(`用户验证失败 [${userId}]:`, error);
                    invalidUsers.push(userId);
                }
            })
        );

        if (invalidUsers.length > 0) {
            return res.status(400).json({
                error: '包含无效的用户ID',
                invalidUsers,
                solution: '请检查用户ID是否正确或联系系统管理员'
            });
        }

        // 创建群组记录
        const newGroup = await Group.create({
            name: groupName,
            creator: creatorId
        });

        // 创建成员关系
        await GroupMembership.create({
            user: creatorId,
            group: newGroup._id,
            role: 'owner'
        });

        // 修改群组成员更新部分
        await Group.findByIdAndUpdate(newGroup._id, {
            $push: {
                members: {
                    userId: creatorId,
                    role: 'owner',
                    joinTime: new Date()
                }
            }
        });

        // 初始成员添加修改为
        if (initialMembers.length > 0) {
            const memberObjects = initialMembers.map(userId => ({
                userId,
                role: 'member',
                joinTime: new Date()
            }));

            await Group.findByIdAndUpdate(newGroup._id, {
                $push: { members: { $each: memberObjects } }
            });
        }

        res.status(201).json({
            groupId: newGroup._id,
            name: newGroup.name,
            createdAt: newGroup.createdAt
        });

    } catch (error) {
        // 处理唯一性验证错误
        if (error.name === 'ValidationError') {
            return res.status(400).json({
                error: '创建群组失败',
                details: error.message
            });
        } else {
            res.status(500).json({
                error: '群组创建失败',
                detail: error.message
            });
        }
    }
});

// 查看我创建的群组
router.get('/my-groups/:groupName',
    verifyUser,
    async (req, res) => {
        try {
            const decodedGroupName = decodeURIComponent(req.params.groupName);
            // 添加查询条件过滤已退出的群组
            const group = await Group.findOne({
                name: decodedGroupName,
                creator: req.verifiedUser.userId,
                'members.status': { $ne: 'left' } // 新增过滤条件
            }).populate({
                path: 'creator',
                select: 'username avatar',
                options: { strictPopulate: false } // 添加此选项
            }).lean();

            if (!group) {
                return res.status(404).json({
                    error: '群组不存在',
                    solution: '请检查群组名称或确认您是否有权访问'
                });
            }

            // 优化计数查询
            const [memberCount] = await Promise.all([
                GroupMembership.countDocuments({ group: group._id }),
                Group.populate(group, {
                    path: 'members.userInfo',
                    select: 'username avatar',
                    options: { lean: true }
                })
            ]);

            res.json({
                ...group,
                memberCount,
                isOwner: true
            });
        } catch (error) {
            console.error('群组查询错误:', error); // 添加详细日志
            res.status(500).json({
                error: '查询失败',
                detail: process.env.NODE_ENV === 'development' ? error.message : undefined // 开发环境显示错误详情
            });
        }
    }
);

// 对群组发送消息
router.post('/:groupId/messages',
    verifyUser,
    async (req, res) => {
        try {
            const { content, metadata } = req.body;
            const { groupId } = req.params;
            const senderId = req.verifiedUser.userId;

            // 创建群消息记录
            const newMessage = await GroupMessage.create({
                group: groupId,
                sender: senderId,
                content,
                metadata: metadata || { type: 'text' }
            });

            // 获取群组成员（排除发送者）
            const members = await GroupMembership.find({
                group: groupId,
                user: { $ne: senderId }
            }).select('user -_id');

            // 推送消息给成员（需要实现消息推送服务）
            members.forEach(member => {
                // 这里调用消息推送服务
                console.log(`推送消息到用户 ${member.user}`);
            });

            res.status(201).json({
                messageId: newMessage._id,
                sentAt: newMessage.createdAt,
                receivers: members.map(m => m.user)
            });

        } catch (error) {
            res.status(500).json({
                error: '消息发送失败',
                detail: error.message
            });
        }
    }
);


// 修改消息发送路由路径, 对群组名
router.post('/my-groups/:groupName/messages',
    verifyUser,
    async (req, res) => {
        try {
            const { content, metadata } = req.body;
            const groupName = decodeURIComponent(req.params.groupName);
            const senderId = req.verifiedUser.userId;

            // 获取完整的群组文档
            const group = await Group.findOne({
                name: groupName,
                'members.userId': senderId  // 验证用户是群组成员
            });

            if (!group) {
                return res.status(404).json({
                    error: '群组不存在或您没有权限',
                    solution: '请检查群组名称是否正确 | 您不是该群组成员或群组不存在'
                });
            }

            // 从group文档直接获取成员列表
            const allMembers = group.members.map(m => m.userId);
            const receivers = allMembers.filter(id => id !== senderId);

            // 创建群消息记录
            const newMessage = await GroupMessage.create({
                group: group._id,
                sender: senderId,
                content,
                metadata: metadata || { type: 'text' }
            });

            // 推送消息给所有成员
            receivers.forEach(userId => {
                console.log(`推送消息到用户 ${userId}`);
            });

            res.status(201).json({
                messageId: newMessage._id,
                sentAt: newMessage.createdAt,
                receivers,
                total: receivers.length
            });

        } catch (error) {
            res.status(500).json({
                error: '消息发送失败',
                detail: error.message
            });
        }
    }
);


router.get('/my-groups/:groupName/messages',
    verifyUser,
    async (req, res) => {
        try {
            const groupName = decodeURIComponent(req.params.groupName);
            const userId = req.verifiedUser.userId;

            // 验证用户群组成员身份
            const group = await Group.findOne({
                name: groupName,
                'members.userId': userId
            });

            if (!group) {
                return res.status(403).json({
                    error: '访问拒绝',
                    solution: '您不是该群组成员或群组不存在'
                });
            }

            // 获取群组消息（按时间倒序）
            const messages = await GroupMessage.find({ group: group._id })
                .sort({ createdAt: -1 })
                .populate('sender', 'username avatar')
                .lean();

            res.json({
                groupId: group._id,
                groupName: group.name,
                total: messages.length,
                messages: messages.map(msg => ({
                    id: msg._id,
                    content: msg.content,
                    sender: msg.sender,
                    timestamp: msg.createdAt,
                    metadata: msg.metadata
                }))
            });

        } catch (error) {
            res.status(500).json({
                error: '获取消息失败',
                detail: error.message
            });
        }
    }
);

export default router;