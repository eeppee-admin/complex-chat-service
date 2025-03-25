import mongoose from 'mongoose';

const FriendSchema = new mongoose.Schema({
    user: {
        type: String,
        ref: 'User',
        required: true,
        index: true
    },
    friend: {
        type: String,
        ref: 'User',
        required: true,
        index: true
    },
    status: {
        type: String,
        enum: ['pending', 'accepted', 'rejected'],
        default: 'pending'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// 添加唯一复合索引防止重复申请
FriendSchema.index({user: 1, friend: 1}, {
    unique: true,
    partialFilterExpression: {status: 'pending'}
});

// 添加虚拟字段方便查询
FriendSchema.virtual('requester', {
    ref: 'User',
    localField: 'user',
    foreignField: '_id',
    justOne: true
});

FriendSchema.virtual('targetUser', {
    ref: 'User',
    localField: 'friend',
    foreignField: '_id',
    justOne: true
});

export default mongoose.model('Friend', FriendSchema);