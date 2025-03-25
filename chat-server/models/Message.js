import mongoose from 'mongoose';

const MessageSchema = new mongoose.Schema({
  sender: {
    type: String,
    required: true,
    validate: {
      validator: v => v.startsWith('usr-') && v.length === 28, // 添加i标志忽略大小写
      message: '用户ID格式应为usr-前缀加24位十六进制'
    }
  },
  receiver: {
    type: String,
    required: true,
    validate: [
      {
        validator: function (v) {
          // 当类型为私聊时验证发送接收人不一致
          return this.type === 'private' ? v !== this.sender : true;
        },
        message: '私聊接收者不能是发送者'
      },
      {
        validator: function (v) {
          // 根据消息类型使用不同格式验证
          const pattern = this.type === 'group'
            ? /^grp-[a-f0-9]{24}$/
            : /^usr-[a-f0-9]{24}$/;
          return pattern.test(v);
        },
        message: '接收方ID格式无效'
      }
    ]
  },
  type: {
    type: String,
    enum: ['private', 'group'],
    default: 'private'
  },
  // 消息内容结构
  content: {
    type: String,
    required: true,
    minlength: 1
  },

  // 新增原始内容字段（撤回时保留原始数据）
  originalContent: {
    type: String,
    select: false // 默认不返回
  },

  // 扩展消息状态枚举
  status: {
    type: String,
    enum: ['sent', 'delivered', 'recalled'], // 新增撤回状态
    default: 'sent'
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true // 添加索引加速查询
  }
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: function (doc, ret) {
      // 撤回消息时替换内容
      if (doc.status === 'recalled') {
        ret.content = '[消息已撤回]';
      }
      return ret;
    }
  }
});

// 添加复合索引优化查询
MessageSchema.index({
  $or: [
    { sender: 1, createdAt: -1 },
    { receiver: 1, createdAt: -1 }
  ]
});

const Message = mongoose.model('Message', MessageSchema);
export default Message;