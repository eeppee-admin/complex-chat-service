import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
    _id: {
        type: String,
        required: true,
        match: /^usr-[a-f0-9]{24}$/
    },
    username: String,
    avatar: String
});

export default mongoose.model('User', UserSchema);