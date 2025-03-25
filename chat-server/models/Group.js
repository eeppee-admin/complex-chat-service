import mongoose from 'mongoose';
import User from '../../shared/models/User.js';

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
    minlength: 2,
    maxlength: 50,
    index: true,
    validate: {
      validator: async function (name) {
        const group = await this.constructor.findOne({
          name,
          creator: this.creator
        });
        return !group;
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
    userId: String,
    type: String,
    validate: {
      validator: v => /^usr-[a-f0-9]{24}$/.test(v),
      message: '成员ID格式无效'
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