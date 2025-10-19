import rateLimit from "express-rate-limit";

export const rateLimitConfig = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    message: "Too many requests from this IP, please try again later",
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req: any) => {
        return req.path.startsWith("/health") ||
            req.path.startsWith("/metrics") ||
            req.ip === "127.0.0.1";
    }
};

// Specific rate limiters for sensitive routes
export const authRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 10, 
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res, next, options) => {
        return res.status(options.statusCode).json({
            message: "Too many login attempts. Please try again after an hour.",
        });
    },
});

export const apiRateLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res, next, options) => {
        return res.status(options.statusCode).json({
            message: "Too many requests. Please try again later.",
        });
    },
}); 