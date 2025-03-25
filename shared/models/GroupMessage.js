import mongoose from 'mongoose';

const GroupMessageSchema = new mongoose.Schema({
    _id: {
        type: String,
        default: () => `gmsg-${new mongoose.Types.ObjectId().toHexString()}`
    },
    group: {
        type: String,
        ref: 'Group',
        required: true,
        index: true
    },
    sender: {
        type: String,
        ref: 'User',
        required: true
    },
    content: {
        type: String,
        required: true,
        maxlength: 1000
    },
    readBy: [{
        type: String,
        ref: 'User'
    }],
    metadata: {
        type: {
            type: String,
            enum: ['text', 'image', 'file'],
            default: 'text'
        },
        url: String
    }
}, {
    timestamps: true
});

export default mongoose.model('GroupMessage', GroupMessageSchema);