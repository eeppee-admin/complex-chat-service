import mongoose from 'mongoose';

// 考虑移除
const SessionSchema = new mongoose.Schema({
    participants: {
        type: [String],
        required: true,
        validate: {
            validator: p => new Set(p).size === 2,
            message: '会话必须包含两个不同参与者'
        }
    },

    // 最近活跃时间
    lastActive: {type: Date, default: Date.now},

    // 消息元数据（避免全量存储）
    messageStats: {
        total: {type: Number, default: 0},
        unread: {type: Number, default: 0}
    }
});

// 创建唯一参与者组合索引
SessionSchema.index({participants: 1}, {unique: true});

const Session = mongoose.model('Session', SessionSchema);
export default Session;