import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import multer from "multer";
import http from "http";
import { Server } from "socket.io";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "change_this_secret";

if (!fs.existsSync("uploads")) fs.mkdirSync("uploads");

const upload = multer({ dest: "uploads/" });

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const users = [];
const messages = [];

function auth(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token" });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

app.post("/api/register", async (req, res) => {
  const { login, password } = req.body;
  if (!login || !password) return res.status(400).json({ error: "Missing data" });
  if (users.find(u => u.login === login)) return res.status(400).json({ error: "User exists" });

  const passwordHash = await bcrypt.hash(password, 10);
  const user = { id: Date.now().toString(), login, passwordHash };
  users.push(user);
  res.json({ id: user.id, login: user.login });
});

app.post("/api/login", async (req, res) => {
  const { login, password } = req.body;
  const user = users.find(u => u.login === login);
  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "Invalid credentials" });

  const token = jwt.sign({ id: user.id, login: user.login }, JWT_SECRET, { expiresIn: "7d" });
  res.json({ token, user: { id: user.id, login: user.login } });
});

app.get("/api/users", auth, (req, res) => {
  res.json(users.map(({ id, login }) => ({ id, login })));
});

app.get("/api/messages/:peerId", auth, (req, res) => {
  const me = req.user.id;
  const peerId = req.params.peerId;
  res.json(messages.filter(m =>
    (m.senderId === me && m.receiverId === peerId) ||
    (m.senderId === peerId && m.receiverId === me)
  ));
});

app.post("/api/messages", auth, (req, res) => {
  const { receiverId, text, fileUrl } = req.body;
  const msg = {
    id: Date.now().toString(),
    senderId: req.user.id,
    receiverId,
    text: text || "",
    fileUrl: fileUrl || "",
    createdAt: new Date().toISOString()
  };
  messages.push(msg);
  io.emit("message", msg);
  res.json(msg);
});

app.post("/api/upload", auth, upload.single("file"), (req, res) => {
  res.json({ fileUrl: `/uploads/${req.file.filename}` });
});

io.on("connection", (socket) => {
  socket.on("call-user", (data) => io.emit("incoming-call", data));
  socket.on("answer-call", (data) => io.emit("call-answered", data));
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

server.listen(PORT, () => {
  console.log(`Lingle running on port ${PORT}`);
});
import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import multer from "multer";
import http from "http";
import { Server } from "socket.io";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "change_this_secret";

if (!fs.existsSync("uploads")) fs.mkdirSync("uploads");

const upload = multer({ dest: "uploads/" });

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const users = [];
const messages = [];

function auth(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token" });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

app.post("/api/register", async (req, res) => {
  const { login, password } = req.body;
  if (!login || !password) return res.status(400).json({ error: "Missing data" });
  if (users.find(u => u.login === login)) return res.status(400).json({ error: "User exists" });

  const passwordHash = await bcrypt.hash(password, 10);
  const user = { id: Date.now().toString(), login, passwordHash };
  users.push(user);
  res.json({ id: user.id, login: user.login });
});

app.post("/api/login", async (req, res) => {
  const { login, password } = req.body;
  const user = users.find(u => u.login === login);
  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "Invalid credentials" });

  const token = jwt.sign({ id: user.id, login: user.login }, JWT_SECRET, { expiresIn: "7d" });
  res.json({ token, user: { id: user.id, login: user.login } });
});

app.get("/api/users", auth, (req, res) => {
  res.json(users.map(({ id, login }) => ({ id, login })));
});

app.get("/api/messages/:peerId", auth, (req, res) => {
  const me = req.user.id;
  const peerId = req.params.peerId;
  res.json(messages.filter(m =>
    (m.senderId === me && m.receiverId === peerId) ||
    (m.senderId === peerId && m.receiverId === me)
  ));
});

app.post("/api/messages", auth, (req, res) => {
  const { receiverId, text, fileUrl } = req.body;
  const msg = {
    id: Date.now().toString(),
    senderId: req.user.id,
    receiverId,
    text: text || "",
    fileUrl: fileUrl || "",
    createdAt: new Date().toISOString()
  };
  messages.push(msg);
  io.emit("message", msg);
  res.json(msg);
});

app.post("/api/upload", auth, upload.single("file"), (req, res) => {
  res.json({ fileUrl: `/uploads/${req.file.filename}` });
});

io.on("connection", (socket) => {
  socket.on("call-user", (data) => io.emit("incoming-call", data));
  socket.on("answer-call", (data) => io.emit("call-answered", data));
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

server.listen(PORT, () => {
  console.log(`Lingle running on port ${PORT}`);
});
