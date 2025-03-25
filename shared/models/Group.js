import mongoose from 'mongoose';
import User from './User.js';

const GroupSchema = new mongoose.Schema({
    _id: {
        type: String,
        default: () => {
            const objectId = new mongoose.Types.ObjectId();
            return `grp-${objectId.toHexString()}`; // 生成grp-前缀的ID
        }
    },
    // 群组基础信息
    name: {
        type: String,
        required: true,
        maxlength: 50,
        trim: true,
        // 新增联合唯一验证
        validate: {
            validator: async function (v) {
                const existing = await this.constructor.findOne({
                    name: v,
                    creator: this.creator
                });
                return !existing;
            },
            message: '您已创建过同名群组'
        }
    },
    creator: {
        type: String,
        required: true,
        ref: 'User', // 指向同一数据库的User模型
        validate: {
            validator: v => /^usr-[a-f0-9]{24}$/.test(v),
            message: '创建者ID格式无效'
        }
    },

    // 成员管理
    members: [{
        userId: {
            type: String,
            required: true,
            validate: {
                validator: v => /^usr-[a-f0-9]{24}$/.test(v),
                message: '成员ID格式无效'
            }
        },
        role: {
            type: String,
            enum: ['owner', 'admin', 'member'],
            default: 'member'
        },
        joinTime: {
            type: Date,
            default: Date.now
        }
    }],

    // 群组元数据
    metadata: {
        avatar: String,
        announcement: {
            type: String,
            maxlength: 200
        }
    },

    // 自动时间戳
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: Date
});

// 添加复合索引优化查询
GroupSchema.index({ creator: 1, name: 1 }, { unique: true });

// 保存前更新时间戳
GroupSchema.pre('save', function (next) {
    this.updatedAt = new Date();
    next();
});

const Group = mongoose.model('Group', GroupSchema);
export default Group;