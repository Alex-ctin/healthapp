const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcrypt');
const path = require('path');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);

const app = express();
const port = 3000;

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Kết nối MySQL
const db = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '123456',
    database: process.env.DB_NAME || 'student_health',
});

db.connect((err) => {
    if (err) throw err;
    console.log('✅ Kết nối MySQL thành công');
});

// Lưu session vào MySQL
const sessionStore = new MySQLStore({}, db);

app.use(
    session({
        secret: 'your-secret-key',
        resave: false,
        saveUninitialized: false,
        store: sessionStore,
        cookie: {
            maxAge: 24 * 60 * 60 * 1000,
        },
    })
);

// 🟢 Trang đăng nhập
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// 🟢 Trang đăng ký
app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

// 🟢 Màn hình chính
app.get('/main', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/');
    }
    res.sendFile(path.join(__dirname, 'public', 'main.html'));
});

// 🟢 Màn hình thiết lập (khi chưa nhập cân nặng và chiều cao)
app.get('/setup', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/');
    }
    res.sendFile(path.join(__dirname, 'public', 'setup.html'));
});

// 🟢 Xử lý đăng ký
app.post('/register', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Thiếu thông tin đăng ký' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const sql = 'INSERT INTO users (username, password) VALUES (?, ?)';
        db.query(sql, [username, hashedPassword], (err) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: 'Lỗi máy chủ' });
            }
            res.json({ message: 'Đăng ký thành công' });
        });
    } catch (err) {
        res.status(500).json({ error: 'Lỗi mã hóa mật khẩu' });
    }
});

// 🟢 Xử lý đăng nhập
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Thiếu thông tin đăng nhập' });
    }

    const sql = 'SELECT * FROM users WHERE username = ?';
    db.query(sql, [username], async (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Lỗi máy chủ' });
        }

        if (results.length > 0) {
            const isMatch = await bcrypt.compare(password, results[0].password);
            if (isMatch) {
                req.session.user = {
                    id: results[0].id,
                    username: results[0].username,
                    weight: results[0].weight,
                    height: results[0].height,
                };

                console.log('✅ Đăng nhập thành công:', req.session.user);

                if (results[0].weight && results[0].height) {
                    return res.json({ success: true, redirect: '/main' });
                } else {
                    return res.json({ success: true, redirect: '/setup' });
                }
            } else {
                return res.status(401).json({ error: 'Sai mật khẩu!' });
            }
        } else {
            return res.status(404).json({ error: 'Tài khoản không tồn tại!' });
        }
    });
});

// 🟢 Màn hình setup
app.get('/setup', (req, res) => {
  if (!req.session.user) {
      return res.redirect('/');
  }
  res.sendFile(path.join(__dirname, 'public', 'setup.html'));
});


// 🟢 Khởi động server
app.listen(port, () => {
    console.log(`✅ Server chạy tại http://localhost:${port}`);
});
