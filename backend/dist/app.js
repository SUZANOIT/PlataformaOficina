"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const routes_1 = require("./routes");
const app = (0, express_1.default)();
exports.app = app;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Serve frontend static files from the built dist directory
const frontendDist = path_1.default.join(__dirname, '..', '..', 'frontend', 'dist');
app.use(express_1.default.static(frontendDist));
app.use(routes_1.routes);
// SPA fallback: serve index.html for any unmatched route
app.use((_req, res) => {
    res.sendFile(path_1.default.join(frontendDist, 'index.html'));
});
