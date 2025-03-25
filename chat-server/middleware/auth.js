// import fetch from 'node-fetch';
import jwt from 'jsonwebtoken';

export const verifyUser = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        // 增强错误提示
        if (!authHeader) {
            return res.status(401).json({ error: '缺少授权头，请提供访问令牌' });
        }

        const token = authHeader.split(' ')[1];

        // 添加JWT_SECRET检查
        if (!process.env.JWT_SECRET) {
            throw new Error('服务器配置错误：JWT_SECRET未设置');
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.verifiedUser = { userId: decoded.userId };

        next();
    } catch (error) {
        console.error('验证失败详情:', error.message);

        // 细化错误类型
        const errorMap = {
            'TokenExpiredError': '令牌已过期',
            'JsonWebTokenError': '无效令牌',
            'NotBeforeError': '令牌尚未生效'
        };

        res.status(401).json({
            error: errorMap[error.name] || '用户验证失败',
            solution: '请重新登录获取新令牌'
        });
    }
};