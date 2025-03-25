import Group from '../../shared/models/Group.js';
import express from "express";
import GroupMembership from '../../shared/models/GroupMembersship.js';

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

export default router;