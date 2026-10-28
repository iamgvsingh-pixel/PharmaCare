const express = require('express'), Database = require('better-sqlite3'), bcrypt = require('bcryptjs');
const crypto = require('crypto'), path = require('path'), multer = require('multer');
const db = new Database('pharmacy.db');
db.exec(`
CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY, name TEXT, email TEXT UNIQUE, password TEXT, role TEXT DEFAULT 'customer');
CREATE TABLE IF NOT EXISTS medicines(id INTEGER PRIMARY KEY, name TEXT, category TEXT, price REAL, stock INTEGER, expiry TEXT, supplier_id INTEGER);
CREATE TABLE IF NOT EXISTS customers(id INTEGER PRIMARY KEY, name TEXT, phone TEXT);
CREATE TABLE IF NOT EXISTS suppliers(id INTEGER PRIMARY KEY, name TEXT, phone TEXT, medicines TEXT);
CREATE TABLE IF NOT EXISTS sales(id INTEGER PRIMARY KEY, customer_id INTEGER, subtotal REAL, discount REAL, gst REAL, total REAL, created TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS sale_items(id INTEGER PRIMARY KEY, sale_id INTEGER, medicine_id INTEGER, name TEXT, qty INTEGER, price REAL);
CREATE TABLE IF NOT EXISTS prescriptions(id INTEGER PRIMARY KEY, user_id INTEGER, file TEXT, created TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS prescribed_medicines(id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL, medicine_id INTEGER NOT NULL, qty INTEGER NOT NULL DEFAULT 1, instructions TEXT DEFAULT '', created TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS messages(id INTEGER PRIMARY KEY, name TEXT, email TEXT, message TEXT, created TEXT DEFAULT CURRENT_TIMESTAMP);
`);
if (!db.prepare('SELECT 1 FROM users').get()) {
  db.prepare('INSERT INTO users(name,email,password,role) VALUES(?,?,?,?)').run('Admin', 'admin@pharmacy.com', bcrypt.hashSync('admin123', 10), 'admin');
  db.prepare("INSERT INTO suppliers(name,phone,medicines) VALUES('MediSupply Co.','9876500001','Paracetamol, Cetirizine'),('HealthPlus Distributors','9876500002','Amoxicillin, Vitamin C')").run();
  const m = db.prepare('INSERT INTO medicines(name,category,price,stock,expiry,supplier_id) VALUES(?,?,?,?,?,?)');
  [['Paracetamol 500mg','Tablet',20,100,'2027-06-30',1],['Cetirizine 10mg','Tablet',35,8,'2027-01-15',1],['Amoxicillin 250mg','Capsule',90,50,'2026-12-10',2],['Cough Syrup','Syrup',75,5,'2027-03-01',2],['Vitamin C','Tablet',120,60,'2028-01-01',2]].forEach(r => m.run(...r));
}
const app = express(); app.use(express.json()); app.use(express.static('public'));
const upload = multer({ dest: path.join(__dirname, 'public/uploads') });
const sessions = new Map();
const auth = (admin) => (req, res, next) => {
  const u = sessions.get(req.headers.authorization);
  if (!u) return res.status(401).json({ error: 'Login required' });
  if (admin && u.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  req.user = u; next();
};
const sign = u => { const t = crypto.randomUUID(); const user = { id: u.id, name: u.name, role: u.role }; sessions.set(t, user); return { token: t, user }; };

app.post('/api/signup', (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'Please fill in all fields' });
  try {
    const r = db.prepare('INSERT INTO users(name,email,password) VALUES(?,?,?)').run(name, email, bcrypt.hashSync(password, 10));
    res.json(sign({ id: r.lastInsertRowid, name, role: 'customer' }));
  } catch { res.status(400).json({ error: 'Email already registered' }); }
});
app.post('/api/login', (req, res) => {
  const u = db.prepare('SELECT * FROM users WHERE email=?').get(req.body.email);
  if (!u || !bcrypt.compareSync(req.body.password || '', u.password)) return res.status(401).json({ error: 'Incorrect email or password' });
  res.json(sign(u));
});

// Generic CRUD
const crud = (table, cols) => {
  app.get('/api/' + table, auth(), (req, res) => res.json(db.prepare(`SELECT * FROM ${table}`).all()));
  app.post('/api/' + table, auth(true), (req, res) => {
    const r = db.prepare(`INSERT INTO ${table}(${cols}) VALUES(${cols.split(',').map(() => '?').join(',')})`).run(...cols.split(',').map(c => req.body[c] ?? null));
    res.json({ id: r.lastInsertRowid });
  });
  app.put('/api/' + table + '/:id', auth(true), (req, res) => {
    db.prepare(`UPDATE ${table} SET ${cols.split(',').map(c => c + '=?').join(',')} WHERE id=?`).run(...cols.split(',').map(c => req.body[c] ?? null), req.params.id);
    res.json({ ok: true });
  });
  app.delete('/api/' + table + '/:id', auth(true), (req, res) => { db.prepare(`DELETE FROM ${table} WHERE id=?`).run(req.params.id); res.json({ ok: true }); });
};
crud('medicines', 'name,category,price,stock,expiry,supplier_id');
crud('customers', 'name,phone');
crud('suppliers', 'name,phone,medicines');

app.get('/api/customers/:id/sales', auth(true), (req, res) => res.json(db.prepare('SELECT * FROM sales WHERE customer_id=? ORDER BY id DESC').all(req.params.id)));

app.post('/api/sales', auth(true), (req, res) => {
  const { customer_id, items, discount = 0 } = req.body;
  if (!items?.length) return res.status(400).json({ error: 'Cart is empty' });
  try {
    const out = db.transaction(() => {
      let subtotal = 0; const rows = [];
      for (const it of items) {
        const m = db.prepare('SELECT * FROM medicines WHERE id=?').get(it.id);
        if (!m || m.stock < it.qty) throw new Error(`${m ? m.name : 'Medicine'}: insufficient stock`);
        db.prepare('UPDATE medicines SET stock=stock-? WHERE id=?').run(it.qty, m.id);
        subtotal += m.price * it.qty; rows.push({ m, qty: it.qty });
      }
      const disc = subtotal * discount / 100, gst = (subtotal - disc) * 0.12, total = subtotal - disc + gst;
      const s = db.prepare('INSERT INTO sales(customer_id,subtotal,discount,gst,total) VALUES(?,?,?,?,?)').run(customer_id || null, subtotal, disc, gst, total);
      rows.forEach(r => db.prepare('INSERT INTO sale_items(sale_id,medicine_id,name,qty,price) VALUES(?,?,?,?,?)').run(s.lastInsertRowid, r.m.id, r.m.name, r.qty, r.m.price));
      return { id: s.lastInsertRowid, subtotal, discount: disc, gst, total };
    })();
    res.json(out);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

app.get('/api/dashboard', auth(true), (req, res) => {
  const today = new Date().toISOString().slice(0, 10), soon = new Date(Date.now() + 90 * 864e5).toISOString().slice(0, 10);
  res.json({
    totalSales: db.prepare('SELECT COALESCE(SUM(total),0) t FROM sales').get().t,
    bills: db.prepare('SELECT COUNT(*) c FROM sales').get().c,
    lowStock: db.prepare('SELECT * FROM medicines WHERE stock<=10').all(),
    expiring: db.prepare('SELECT * FROM medicines WHERE expiry<=?').all(soon),
    chart: db.prepare("SELECT substr(created,1,10) d, SUM(total) t FROM sales GROUP BY d ORDER BY d DESC LIMIT 7").all().reverse()
  });
});

app.post('/api/prescriptions', auth(), upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Please choose a file' });
  db.prepare('INSERT INTO prescriptions(user_id,file) VALUES(?,?)').run(req.user.id, req.file.filename);
  res.json({ ok: true });
});
app.get('/api/prescriptions', auth(true), (req, res) => res.json(db.prepare('SELECT p.*,u.name,u.email FROM prescriptions p JOIN users u ON u.id=p.user_id ORDER BY p.id DESC').all()));
app.get('/api/customer-users', auth(true), (req, res) => res.json(db.prepare("SELECT id,name,email FROM users WHERE role='customer' ORDER BY name").all()));
app.get('/api/prescribed-medicines', auth(), (req, res) => {
  const sql = `SELECT pm.id,pm.user_id,pm.medicine_id,pm.qty,pm.instructions,pm.created,m.name,m.category,m.price,m.stock,m.expiry,u.name AS customer_name,u.email AS customer_email
    FROM prescribed_medicines pm JOIN medicines m ON m.id=pm.medicine_id JOIN users u ON u.id=pm.user_id`;
  const rows = req.user.role === 'admin' ? db.prepare(sql + ' ORDER BY pm.created DESC').all() : db.prepare(sql + ' WHERE pm.user_id=? ORDER BY pm.created DESC').all(req.user.id);
  res.json(rows);
});
app.post('/api/prescribed-medicines', auth(true), (req, res) => {
  const { user_id, medicine_id, qty, instructions='' } = req.body;
  const user = db.prepare("SELECT id FROM users WHERE id=? AND role='customer'").get(user_id);
  const med = db.prepare('SELECT id,stock FROM medicines WHERE id=?').get(medicine_id);
  if (!user || !med) return res.status(400).json({error:'Choose a valid customer and medicine'});
  if (!Number.isInteger(+qty) || +qty < 1) return res.status(400).json({error:'Quantity must be at least 1'});
  db.prepare('INSERT INTO prescribed_medicines(user_id,medicine_id,qty,instructions) VALUES(?,?,?,?)').run(user_id, medicine_id, +qty, String(instructions).slice(0,500));
  res.json({ok:true});
});
app.delete('/api/prescribed-medicines/:id', auth(true), (req,res) => { db.prepare('DELETE FROM prescribed_medicines WHERE id=?').run(req.params.id); res.json({ok:true}); });
app.post('/api/contact', (req, res) => { db.prepare('INSERT INTO messages(name,email,message) VALUES(?,?,?)').run(req.body.name, req.body.email, req.body.message); res.json({ ok: true }); });

app.listen(3000, () => console.log('Running on http://localhost:3000'));
