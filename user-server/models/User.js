import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const UserSchema = new mongoose.Schema({
    _id: {
        type: String,
        required: true,
        match: /^usr-[a-f0-9]{24}$/,  // Match our custom ID format
        default: () => `usr-${new mongoose.Types.ObjectId().toHexString()}`
    },
    username: {
        type: String,
        unique: true,
        required: [true, '用户名不能为空']
    },
    password: {
        type: String,
        required: [true, '密码不能为空']
    },
    userId: {
        type: String,
        unique: true,
        default: () => {
            // 生成24位随机十六进制（更简单的方式）
            const hex = [...Array(24)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');
            return `usr-${hex}`;
        }
    }
});

// 密码加密中间件
UserSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 12);
    next();
});



export default mongoose.model('User', UserSchema);