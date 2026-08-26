const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const sendEmail = require("../utils/sendEmail");

const ADMIN_EMAIL = String(
    process.env.ADMIN_EMAIL ||
    "admin@khanmoves.co.uk"
)
    .trim()
    .toLowerCase();

const ADMIN_PASSWORD = String(
    process.env.ADMIN_PASSWORD ||
    "Admin@123"
);

const normalizeEmail = value =>
    String(value || "")
        .trim()
        .toLowerCase();

const createToken = user => {
    return jwt.sign(
        {
            id: user.id,
            email: user.email,
            role: user.role
        },
        process.env.JWT_SECRET,
        {
            expiresIn:
                process.env.JWT_EXPIRES_IN ||
                "365d"
        }
    );
};

const createUserResponse = user => ({
    _id: user._id || user.id,
    name: user.name,
    email: user.email,
    phone: user.phone || "",
    role: user.role,
    accountStatus:
        user.accountStatus || "active"
});

const generateTemporaryPassword = () => {
    return `Km@${crypto
        .randomBytes(5)
        .toString("hex")}`;
};

const sendWelcomeEmail = async user => {
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
    </head>

    <body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif">
        <div style="max-width:600px;margin:0 auto;background:#ffffff">
            <div style="height:5px;background:#C0392B"></div>

            <div style="background:#C0392B;padding:24px 32px">
                <div style="font-size:21px;font-weight:700;color:#ffffff">
                    KHAN MOVES
                </div>

                <div style="margin-top:3px;font-size:11px;color:#ffcccc">
                    Professional Removals UK
                </div>
            </div>

            <div style="padding:30px 32px">
                <div style="margin-bottom:24px;border:1px solid #bbf7d0;border-radius:10px;background:#f0fdf4;padding:18px;text-align:center">
                    <div style="margin-bottom:8px;font-size:30px">
                        🎉
                    </div>

                    <div style="font-size:19px;font-weight:700;color:#166534">
                        Welcome to Khan Moves!
                    </div>
                </div>

                <h2 style="margin-bottom:10px;font-size:18px;color:#1a1a1a">
                    Hello ${user.name},
                </h2>

                <p style="font-size:13px;line-height:1.7;color:#555555">
                    Your Khan Moves account has been created successfully.
                    You can now sign in, create bookings and track your
                    removal requests.
                </p>

                <div style="margin-top:20px;border-radius:8px;background:#f7f7f7;padding:16px 20px">
                    <p style="margin:0 0 7px;font-size:11px;color:#888888">
                        Registered Email
                    </p>

                    <p style="margin:0;font-size:13px;font-weight:700;color:#1a1a1a">
                        ${user.email}
                    </p>
                </div>

                <p style="margin-top:22px;font-size:13px;line-height:1.7;color:#555555">
                    Thank you for choosing Khan Moves.
                </p>
            </div>

            <div style="height:4px;background:#C0392B"></div>
        </div>
    </body>
    </html>
    `;

    await sendEmail(
        user.email,
        "Welcome to Khan Moves",
        html,
        [],
        "info"
    );
};

const sendTemporaryPasswordEmail = async (
    user,
    temporaryPassword
) => {
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
    </head>

    <body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif">
        <div style="max-width:600px;margin:0 auto;background:#ffffff">
            <div style="height:5px;background:#C0392B"></div>

            <div style="background:#C0392B;padding:24px 32px">
                <div style="font-size:21px;font-weight:700;color:#ffffff">
                    KHAN MOVES
                </div>

                <div style="margin-top:3px;font-size:11px;color:#ffcccc">
                    Professional Removals UK
                </div>
            </div>

            <div style="padding:30px 32px">
                <h2 style="margin-bottom:10px;font-size:18px;color:#1a1a1a">
                    Hello ${user.name},
                </h2>

                <p style="font-size:13px;line-height:1.7;color:#555555">
                    A password reset was requested for your Khan Moves
                    account. Your temporary password is shown below.
                </p>

                <div style="margin:22px 0;border:1px solid #fecaca;border-radius:10px;background:#fef2f2;padding:20px;text-align:center">
                    <p style="margin:0 0 8px;font-size:11px;font-weight:700;text-transform:uppercase;color:#991b1b">
                        New Temporary Password
                    </p>

                    <p style="margin:0;font-size:22px;font-weight:700;letter-spacing:1px;color:#C0392B">
                        ${temporaryPassword}
                    </p>
                </div>

                <p style="font-size:13px;line-height:1.7;color:#555555">
                    Use this password to sign in. Do not share it with
                    anyone.
                </p>
            </div>

            <div style="height:4px;background:#C0392B"></div>
        </div>
    </body>
    </html>
    `;

    await sendEmail(
        user.email,
        "Your New Khan Moves Password",
        html,
        [],
        "info"
    );
};

const signup = async (req, res) => {
    try {
        const name = String(
            req.body.name || ""
        ).trim();

        const email = normalizeEmail(
            req.body.email
        );

        const phone = String(
            req.body.phone || ""
        ).trim();

        const password = String(
            req.body.password || ""
        );

        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message:
                    "Name, email and password are required."
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message:
                    "Password must be at least 6 characters."
            });
        }

        if (email === ADMIN_EMAIL) {
            return res.status(409).json({
                success: false,
                message:
                    "This email address is reserved."
            });
        }

        const existingUser =
            await User.findOne({ email });

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message:
                    "An account already exists with this email."
            });
        }

        const hashedPassword =
            await bcrypt.hash(password, 12);

        const user = await User.create({
            name,
            email,
            phone,
            password: hashedPassword,
            role: "user"
        });

        try {
            await sendWelcomeEmail(user);
        } catch (emailError) {
            console.error(
                "Welcome email failed:",
                emailError.message
            );
        }

        const userData =
            createUserResponse(user);

        const token = createToken({
            id: user._id,
            email: user.email,
            role: user.role
        });

        return res.status(201).json({
            success: true,
            message:
                "Account created successfully.",
            token,
            user: userData
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message:
                    "An account already exists with this email."
            });
        }

        console.error(
            "Signup error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

const login = async (req, res) => {
    try {
        const email = normalizeEmail(
            req.body.email
        );

        const password = String(
            req.body.password || ""
        );

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message:
                    "Email and password are required."
            });
        }

        if (
            email === ADMIN_EMAIL &&
            password === ADMIN_PASSWORD
        ) {
            const adminUser = {
                id: "static-admin",
                _id: "static-admin",
                name: "Khan Moves Admin",
                email: ADMIN_EMAIL,
                phone: "",
                role: "admin",
                accountStatus: "active"
            };

            const token =
                createToken(adminUser);

            return res.json({
                success: true,
                message:
                    "Admin signed in successfully.",
                token,
                user: adminUser
            });
        }

        const user = await User.findOne({
            email
        }).select("+password");

        if (!user) {
            return res.status(401).json({
                success: false,
                message:
                    "Invalid email or password."
            });
        }

        if (
            user.accountStatus === "blocked"
        ) {
            return res.status(403).json({
                success: false,
                message:
                    "Your account has been blocked."
            });
        }

        const passwordMatches =
            await bcrypt.compare(
                password,
                user.password
            );

        if (!passwordMatches) {
            return res.status(401).json({
                success: false,
                message:
                    "Invalid email or password."
            });
        }

        const token = createToken({
            id: user._id,
            email: user.email,
            role: user.role
        });

        return res.json({
            success: true,
            message:
                "Signed in successfully.",
            token,
            user: createUserResponse(user)
        });
    } catch (error) {
        console.error(
            "Login error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

const forgotPassword = async (
    req,
    res
) => {
    try {
        const email = normalizeEmail(
            req.body.email
        );

        if (!email) {
            return res.status(400).json({
                success: false,
                message:
                    "Registered email is required."
            });
        }

        if (email === ADMIN_EMAIL) {
            return res.status(400).json({
                success: false,
                message:
                    "Static admin password cannot be reset here."
            });
        }

        const user = await User.findOne({
            email
        }).select("+password");

        /*
         * Generic response prevents email
         * account discovery.
         */
        if (!user) {
            return res.json({
                success: true,
                message:
                    "If an account exists with this email, a new password has been sent."
            });
        }

        const temporaryPassword =
            generateTemporaryPassword();

        const previousPassword =
            user.password;

        user.password = await bcrypt.hash(
            temporaryPassword,
            12
        );

        await user.save();

        try {
            await sendTemporaryPasswordEmail(
                user,
                temporaryPassword
            );
        } catch (emailError) {
            /*
             * Email fail ho to purana password
             * restore kar do.
             */
            user.password =
                previousPassword;

            await user.save();

            throw emailError;
        }

        return res.json({
            success: true,
            message:
                "A new password has been sent to your registered email."
        });
    } catch (error) {
        console.error(
            "Forgot password error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Failed to send the new password. Please try again."
        });
    }
};

const getMe = async (req, res) => {
    try {
        if (
            req.auth.role === "admin" &&
            req.auth.id === "static-admin"
        ) {
            return res.json({
                success: true,
                user: {
                    _id: "static-admin",
                    name:
                        "Khan Moves Admin",
                    email: ADMIN_EMAIL,
                    phone: "",
                    role: "admin",
                    accountStatus:
                        "active"
                }
            });
        }

        const user = await User.findById(
            req.auth.id
        );

        if (!user) {
            return res.status(401).json({
                success: false,
                message:
                    "Account no longer exists."
            });
        }

        if (
            user.accountStatus === "blocked"
        ) {
            return res.status(403).json({
                success: false,
                message:
                    "Your account has been blocked."
            });
        }

        return res.json({
            success: true,
            user: createUserResponse(user)
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

module.exports = {
    signup,
    login,
    forgotPassword,
    getMe
};