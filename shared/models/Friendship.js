import mongoose from 'mongoose';

const FriendshipSchema = new mongoose.Schema({
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
        enum: ['active', 'blocked'],
        default: 'active'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// 添加复合唯一索引
FriendshipSchema.index({ user: 1, friend: 1 }, { unique: true });

export default mongoose.model('Friendship', FriendshipSchema);