import mongoose from 'mongoose';

// 群组成员
const GroupMembershipSchema = new mongoose.Schema({
    user: {
        type: String,
        ref: 'User',
        required: true,
        validate: {
            validator: v => /^usr-[a-f0-9]{24}$/.test(v),
            message: '用户ID格式无效'
        },
        index: true
    },
    group: {
        type: String,
        ref: 'Group',
        required: true,
        validate: {
            validator: v => /^grp-[a-f0-9]{24}$/.test(v),
            message: '群组ID格式无效'
        },
        index: true
    },
    role: {
        type: String,
        enum: ['member', 'admin', 'owner'],
        default: 'member'
    },
    joinedAt: {
        type: Date,
        default: Date.now
    },
    lastAccessed: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        enum: ['active', 'muted', 'left'],
        default: 'active'
    }
});

// 添加复合唯一索引
GroupMembershipSchema.index({user: 1, group: 1}, {unique: true});

// 添加虚拟字段
GroupMembershipSchema.virtual('userInfo', {
    ref: 'User',
    localField: 'user',
    foreignField: '_id',
    justOne: true
});

GroupMembershipSchema.virtual('groupInfo', {
    ref: 'Group',
    localField: 'group',
    foreignField: '_id',
    justOne: true
});

export default mongoose.model('GroupMembership', GroupMembershipSchema);