import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
    _id: {
        type: String,
        required: true,
        match: /^usr-[a-f0-9]{24}$/,
        default: () => `usr-${new mongoose.Types.ObjectId().toHexString()}` // 添加自动生成规则
    },
    username: {
        type: String,
        required: true,
        unique: true,
        index: true, // 添加索引优化查询
        minlength: 3,
        maxlength: 20,
        validate: {
            validator: v => /^[a-zA-Z0-9_]+$/.test(v), // 添加格式验证
            message: '用户名只能包含字母、数字和下划线'
        }
    },
    password: {
        type: String,
        required: true,
        select: false, // 默认不返回密码字段
        minlength: 8,
        validate: {
            validator: function (v) {
                return /^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(v);
            },
            message: '密码必须包含字母和数字且至少8位'
        }
    },
    // 修改用户模型的好友字段定义
    friends: {
        type: [{
            type: String,
            ref: 'User',
            validate: {
                validator: function (v) {
                    // 添加长度验证（示例限制最多500好友）
                    return this.friends.length < 500 &&
                        /^usr-[a-f0-9]{24}$/.test(v) &&
                        v !== this._id;
                },
                message: '好友数量超过限制或ID格式无效'
            }
        }],
        default: () => [],
        required: true,
        validate: [{
            validator: function (v) {
                // 确保字段存在且是数组
                return Array.isArray(v) && v.every(id => /^usr-[a-f0-9]{24}$/.test(id));
            },
            message: '好友列表格式无效'
        }]
    },
    lastLogin: {
        type: Date,
        default: Date.now // 设置默认登录时间
    }
}, {
    timestamps: true,
    toJSON: {virtuals: true} // 允许虚拟字段序列化
});

// 添加好友数量统计虚拟字段
UserSchema.virtual('friendCount').get(function () {
    return this.friends.length;
});

// 添加最后活跃时间更新方法
UserSchema.methods.updateLastActive = function () {
    this.lastLogin = new Date();
    return this.save();
};

// 添加密码对比方法
UserSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// 修复后的清理逻辑
UserSchema.post('updateOne', async function () {
    if (this._update.$addToSet?.friends) {
        await this.model.updateOne(
            {_id: this._conditions._id},
            {$pull: {friends: {$size: 0}}}, // 改为数值0
            {strict: false}
        );
    }
});

export default mongoose.model('User', UserSchema);