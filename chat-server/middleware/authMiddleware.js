// 确保中间件设置用户信息路径一致
export const verifyUser = (req, res, next) => {
    try {
        const token = req.header('Authorization').replace('Bearer ', '');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // 统一使用 verifiedUser 对象存储用户信息
        req.verifiedUser = {
            userId: decoded.userId,
            // ...其他用户信息...
        };

        next();
    } catch (error) {
        res.status(401).json({ error: '身份验证失败' });
    }
};