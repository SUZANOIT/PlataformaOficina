"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = require("../lib/prisma");
const zod_1 = require("zod");
const registerSchema = zod_1.z.object({
    name: zod_1.z.string().min(3),
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(6),
});
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string(),
});
const updateUserSchema = zod_1.z.object({
    name: zod_1.z.string().min(3),
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(6).optional().or(zod_1.z.literal('')),
});
exports.AuthController = {
    async register(req, res) {
        try {
            const { name, email, password } = registerSchema.parse(req.body);
            const userExists = await prisma_1.prisma.user.findUnique({ where: { email } });
            if (userExists) {
                return res.status(400).json({ error: 'User already exists' });
            }
            const hashedPassword = await bcrypt_1.default.hash(password, 10);
            const user = await prisma_1.prisma.user.create({
                data: {
                    name,
                    email,
                    password: hashedPassword,
                },
            });
            return res.status(201).json({ id: user.id, name: user.name, email: user.email });
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                return res.status(400).json({ error: error.errors });
            }
            return res.status(500).json({ error: 'Internal server error' });
        }
    },
    async login(req, res) {
        try {
            const { email, password } = loginSchema.parse(req.body);
            const user = await prisma_1.prisma.user.findUnique({ where: { email } });
            if (!user) {
                return res.status(400).json({ error: 'Invalid credentials' });
            }
            const validPassword = await bcrypt_1.default.compare(password, user.password);
            if (!validPassword) {
                return res.status(400).json({ error: 'Invalid credentials' });
            }
            const token = jsonwebtoken_1.default.sign({ id: user.id }, process.env.JWT_SECRET || 'secret', {
                expiresIn: '1d',
            });
            return res.json({
                user: { id: user.id, name: user.name, email: user.email },
                token,
            });
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                return res.status(400).json({ error: error.errors });
            }
            return res.status(500).json({ error: 'Internal server error' });
        }
    },
    async listUsers(req, res) {
        try {
            const users = await prisma_1.prisma.user.findMany({
                select: { id: true, name: true, email: true, createdAt: true },
                orderBy: { createdAt: 'desc' }
            });
            return res.json(users);
        }
        catch (error) {
            return res.status(500).json({ error: 'Internal server error' });
        }
    },
    async updateUser(req, res) {
        try {
            const { id } = req.params;
            const { name, email, password } = updateUserSchema.parse(req.body);
            const user = await prisma_1.prisma.user.findUnique({ where: { id } });
            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }
            if (email !== user.email) {
                const emailCollision = await prisma_1.prisma.user.findUnique({ where: { email } });
                if (emailCollision) {
                    return res.status(400).json({ error: 'E-mail already in use' });
                }
            }
            const updateData = { name, email };
            if (password && password.length >= 6) {
                updateData.password = await bcrypt_1.default.hash(password, 10);
            }
            const updatedUser = await prisma_1.prisma.user.update({
                where: { id },
                data: updateData,
                select: { id: true, name: true, email: true, createdAt: true }
            });
            return res.json(updatedUser);
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                return res.status(400).json({ error: error.errors });
            }
            return res.status(500).json({ error: 'Internal server error' });
        }
    },
    async deleteUser(req, res) {
        try {
            const { id } = req.params;
            const user = await prisma_1.prisma.user.findUnique({ where: { id } });
            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }
            await prisma_1.prisma.user.delete({ where: { id } });
            return res.status(204).send();
        }
        catch (error) {
            return res.status(500).json({ error: 'Internal server error' });
        }
    }
};
