router.post('/',
    verifyUser,
    async (req, res) => {
        try {
            const senderId = req.verifiedUser.userId;
            const { receiver: receiverId } = req.body;
            
            console.log('发送者ID:', senderId); 
            console.log('接收者ID:', receiverId);

            // 添加好友关系查询调试
            const friendship = await Friendship.findOne({
                $or: [
                    { requester: senderId, recipient: receiverId, status: 'accepted' },
                    { requester: receiverId, recipient: senderId, status: 'accepted' }
                ]
            }).lean();
            console.log('好友关系查询结果:', friendship);

            // ... 原有逻辑保持不变 ...