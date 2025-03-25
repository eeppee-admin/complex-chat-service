import axios from 'axios';

export const validateGroupMembers = async (req, res, next) => {
    try {
        const { members } = req.body;
        const allMembers = [...new Set([req.verifiedUser.userId, ...members])];

        // 调用用户服务验证用户存在性
        const validationResults = await Promise.all(
            allMembers.map(async userId => {
                // 修改请求路径为 /exists/
                const response = await axios.get(
                    `http://localhost:4000/api/auth/exists/${userId}`,
                    {
                        headers: {
                            Authorization: req.headers.authorization
                        },
                        timeout: 5000  // 添加超时设置
                    }
                );
                return response.status === 200;
            })
        );

        if (validationResults.some(valid => !valid)) {
            return res.status(400).json({ error: '包含无效的用户ID' });
        }

        next();
    }
    // 在catch块中添加详细错误日志
    catch (error) {
        console.error('[用户验证] 服务调用失败:', {
            endpoint: `http://localhost:4000/api/auth/exists/${userId}`,
            error: error.message,
            response: error.response?.data
        });
        res.status(500).json({
            error: '用户服务不可用',
            detail: error.message
        });
    }
};