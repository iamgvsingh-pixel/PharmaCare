const P = {
  dash: 'M3 12l9-9 9 9M5 10v10h14V10', box: 'M21 8l-9-5-9 5v8l9 5 9-5zM3 8l9 5 9-5M12 13v8', bill: 'M6 2h12v20l-3-2-3 2-3-2-3 2zM9 7h6M9 11h6',
  users: 'M17 21v-2a4 4 0 00-4-4H7a4 4 0 00-4 4v2M10 11a4 4 0 100-8 4 4 0 000 8M21 21v-2a4 4 0 00-3-3.9M16 3.1a4 4 0 010 7.8',
  truck: 'M1 3h13v13H1zM14 8h4l4 4v4h-8M5.5 21a2 2 0 100-4 2 2 0 000 4M18.5 21a2 2 0 100-4 2 2 0 000 4',
  file: 'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M12 18v-6M9 15l3-3 3 3', info: 'M12 22a10 10 0 100-20 10 10 0 000 20M12 16v-4M12 8h.01',
  plus: 'M12 5v14M5 12h14', edit: 'M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z', trash: 'M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6',
  moon: 'M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z', rupee: 'M6 3h12M6 8h12M6 13l8 8M6 13h3a4 4 0 000-8', alert: 'M12 9v4M12 17h.01M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z',
  clock: 'M12 22a10 10 0 100-20 10 10 0 000 20M12 6v6l4 2'
};
const I = n => `<svg class="ic" viewBox="0 0 24 24"><path d="${P[n]}"/></svg>`;
const $ = s => document.querySelector(s), money = n => '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
let token = localStorage.t, user = JSON.parse(localStorage.u || 'null'), chart;
if (!token || !user) location.replace('login.html');

async function api(url, method = 'GET', body) {
  const r = await fetch('/api' + url, { method, headers: { 'Content-Type': 'application/json', Authorization: token || '' }, body: body ? JSON.stringify(body) : undefined });
  const d = await r.json().catch(() => ({}));
  if (r.status === 401 && token) { localStorage.removeItem('t'); localStorage.removeItem('u'); location.replace('login.html'); }
  if (!r.ok) throw new Error(d.error || 'Something went wrong');
  return d;
}
function toast(msg, err) { const t = document.createElement('div'); t.className = 'toast' + (err ? ' err' : ''); t.textContent = msg; $('#toasts').append(t); setTimeout(() => t.remove(), 3200); }
function modal(html) { $('#modal').innerHTML = `<div class="mbox">${html}</div>`; $('#modal').hidden = false; }
function closeModal() { $('#modal').hidden = true; document.body.classList.remove('printing'); }
$('#modal').addEventListener('mousedown', e => { if (e.target.id === 'modal') closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
function formModal(title, fields, vals, onSave, label = 'Save changes') {
  modal(`<h3>${title}</h3><form id="mf" class="fgrid">${fields.map(f => `<label class="${f.full ? 'full' : ''}">${f.l}${f.opts ? `<select name="${f.k}">${f.opts.map(o => `<option value="${esc(o.v)}" ${o.v == vals[f.k] ? 'selected' : ''}>${esc(o.t)}</option>`).join('')}</select>` : `<input name="${f.k}" type="${f.t || 'text'}" step="any" value="${esc(vals[f.k])}" ${f.req === false ? '' : 'required'} placeholder="${f.p || ''}">`}</label>`).join('')}
  <div class="mfoot full" style="grid-column:1/-1"><button type="button" class="btn" onclick="closeModal()">Cancel</button><button class="btn primary">${label}</button></div></form>`);
  $('#mf').onsubmit = async e => { e.preventDefault(); const d = Object.fromEntries(new FormData(e.target)); try { await onSave(d); closeModal(); } catch (er) { toast(er.message, true); } };
}
function confirmBox(msg, onYes) { modal(`<h3>Please confirm</h3><p class="muted">${msg}</p><div class="mfoot"><button class="btn" onclick="closeModal()">Cancel</button><button class="btn danger" id="cy">Delete</button></div>`); $('#cy').onclick = async () => { try { await onYes(); closeModal(); } catch (e) { toast(e.message, true); } }; }

$('#lo').onclick = () => { localStorage.removeItem('t'); localStorage.removeItem('u'); location.replace('login.html'); };
$('#dm').innerHTML = I('moon');
$('#dm').onclick = () => { document.body.classList.toggle('dark'); localStorage.dark = document.body.classList.contains('dark') ? 1 : ''; };
if (localStorage.dark) document.body.classList.add('dark');

/* shell */
const admin = () => user.role === 'admin';
const PAGES = {
  admin: [['Dashboard', 'dash', dash, 'Overview of sales, stock and alerts'], ['Inventory', 'box', inventory, 'Manage medicines, stock levels and expiry dates'], ['Billing', 'bill', billing, 'Create bills and print invoices'],
    ['Customers', 'users', customers, 'Customer records and purchase history'], ['Suppliers', 'truck', suppliers, 'Who supplies which medicines'], ['Prescriptions', 'file', prescriptions, 'Prescriptions uploaded by customers'], ['About & Contact', 'info', about, 'Pharmacy details and messages']],
  customer: [['Medicines', 'box', inventory, 'Browse available medicines'], ['Cart', 'bill', customerCart, 'Review medicines added to your cart'], ['Your Prescribed Medicines', 'file', prescribedMedicines, 'Medicines assigned by the pharmacy'], ['Upload Prescription', 'file', prescriptions, 'Send us your prescription photo'], ['About & Contact', 'info', about, 'Pharmacy details and contact form']]
};
function start() {
  if (!token || !user) return;
  $('#un').textContent = user.name; $('#ur').textContent = user.role; $('#av').textContent = user.name.trim()[0].toUpperCase();
  const pg = PAGES[user.role];
  $('#nav').innerHTML = pg.map((p, i) => `<a data-i="${i}">${I(p[1])}<span>${p[0]}</span></a>`).join('');
  $('#nav').onclick = e => { const a = e.target.closest('a'); if (a) go(+a.dataset.i); };
  go(0);
}
function go(i) {
  const p = PAGES[user.role][i];
  document.querySelectorAll('#nav a').forEach((a, n) => a.classList.toggle('on', n === i));
  $('#pt').textContent = p[0]; $('#ps').textContent = p[3]; $('#main').innerHTML = '<div class="panel empty">Loading…</div>';
  window.refresh = () => go(i);
  p[2]().catch(e => { $('#main').innerHTML = `<div class="panel empty"><b>Could not load this page</b>${esc(e.message)}</div>`; });
}
const empty = (t, s) => `<div class="empty"><b>${t}</b>${s}</div>`;
const stockBadge = m => m.stock <= 0 ? '<span class="badge r">Out of stock</span>' : m.stock <= 10 ? '<span class="badge w">Low stock</span>' : '<span class="badge">In stock</span>';
const expBadge = d => { const days = (new Date(d) - Date.now()) / 864e5; return days < 0 ? '<span class="badge r">Expired</span>' : days < 90 ? '<span class="badge w">Expires soon</span>' : ''; };

/* dashboard */
async function dash() {
  const d = await api('/dashboard');
  $('#main').innerHTML = `<div class="stats">
    <div class="panel stat"><div class="si">${I('rupee')}</div><div><b>${money(d.totalSales)}</b><span>Total sales</span></div></div>
    <div class="panel stat"><div class="si">${I('bill')}</div><div><b>${d.bills}</b><span>Bills generated</span></div></div>
    <div class="panel stat w"><div class="si">${I('alert')}</div><div><b>${d.lowStock.length}</b><span>Low-stock medicines</span></div></div>
    <div class="panel stat r"><div class="si">${I('clock')}</div><div><b>${d.expiring.length}</b><span>Expiring within 90 days</span></div></div></div>
  <div class="two"><div class="panel"><h3>Sales, last 7 days</h3>${d.chart.length ? '<canvas id="ch" height="120"></canvas>' : empty('No sales yet', 'Create your first bill to see the trend here.')}</div>
  <div class="panel"><h3>Needs attention</h3><div class="alerts">
    ${d.lowStock.map(m => `<div class="al"><span>${esc(m.name)}</span><span class="badge w">${m.stock} left</span></div>`).join('')}
    ${d.expiring.map(m => `<div class="al"><span>${esc(m.name)}</span><span class="badge r">${esc(m.expiry)}</span></div>`).join('')}
    ${d.lowStock.length + d.expiring.length ? '' : empty('All clear', 'Stock and expiry dates look healthy.')}</div></div></div>`;
  if (d.chart.length && window.Chart) { if (chart) chart.destroy(); chart = new Chart($('#ch'), { type: 'bar', data: { labels: d.chart.map(x => x.d), datasets: [{ data: d.chart.map(x => x.t), backgroundColor: '#1b9c6b', borderRadius: 6 }] }, options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: '#8884' } }, x: { grid: { display: false } } } } }); }
}

/* inventory */
async function inventory() {
  const meds = await api('/medicines'), sup = admin() ? await api('/suppliers') : [];
  const cats = [...new Set(meds.map(m => m.category))];
  $('#main').innerHTML = `<div class="panel"><div class="ph"><div class="tools"><input id="q" placeholder="Search medicines…"><select id="cat"><option value="">All categories</option>${cats.map(c => `<option>${esc(c)}</option>`).join('')}</select></div>
    ${admin() ? `<button class="btn primary" id="add">${I('plus')} Add medicine</button>` : ''}</div>
    <div class="tw"><table><thead><tr><th>Medicine</th><th>Category</th><th class="num">Price</th><th>Stock</th><th>Expiry</th>${admin() ? '<th></th>' : '<th></th>'}</tr></thead><tbody id="tb"></tbody></table></div></div>`;
  const draw = () => {
    const q = $('#q').value.toLowerCase(), c = $('#cat').value, l = meds.filter(m => m.name.toLowerCase().includes(q) && (!c || m.category === c));
    $('#tb').innerHTML = l.map(m => `<tr><td><b>${esc(m.name)}</b></td><td>${esc(m.category)}</td><td class="num">${money(m.price)}</td><td>${m.stock} ${stockBadge(m)}</td><td>${esc(m.expiry)} ${expBadge(m.expiry)}</td>
      ${admin() ? `<td><div class="acts"><button class="btn sm" data-e="${m.id}">${I('edit')} Edit</button><button class="btn sm danger" data-d="${m.id}">${I('trash')}</button></div></td>` : `<td><button class="btn sm primary" data-cart="${m.id}" ${m.stock <= 0 ? 'disabled' : ''}>Add to Cart</button></td>`}</tr>`).join('') || `<tr><td colspan="6">${empty('No medicines found', 'Try a different search or category.')}</td></tr>`;
  };
  $('#q').oninput = $('#cat').onchange = draw; draw();
  if (!admin()) {
    $('#tb').onclick = e => { const b=e.target.closest('button[data-cart]'); if(!b) return; const m=meds.find(x=>x.id==b.dataset.cart); addToCustomerCart(m); };
    return;
  }
  const F = [{ k: 'name', l: 'Medicine name', full: 1 }, { k: 'category', l: 'Category', p: 'Tablet, Syrup…' }, { k: 'price', l: 'Price (₹)', t: 'number' }, { k: 'stock', l: 'Stock quantity', t: 'number' }, { k: 'expiry', l: 'Expiry date', t: 'date' },
    { k: 'supplier_id', l: 'Supplier', opts: [{ v: '', t: 'None' }, ...sup.map(s => ({ v: s.id, t: s.name }))] }];
  const edit = m => formModal(m ? 'Edit medicine' : 'Add medicine', F, m || {}, async d => { await api('/medicines' + (m ? '/' + m.id : ''), m ? 'PUT' : 'POST', { ...d, price: +d.price, stock: +d.stock, supplier_id: d.supplier_id || null }); toast(m ? 'Medicine updated' : 'Medicine added'); refresh(); }, m ? 'Save changes' : 'Add medicine');
  $('#add').onclick = () => edit(null);
  $('#tb').onclick = e => { const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.e) edit(meds.find(m => m.id == b.dataset.e));
    if (b.dataset.d) confirmBox('This medicine will be permanently removed from inventory.', async () => { await api('/medicines/' + b.dataset.d, 'DELETE'); toast('Medicine deleted'); refresh(); }); };
}

/* billing */
let cart = [];
async function billing() {
  const meds = await api('/medicines'), cus = await api('/customers'); cart = [];
  $('#main').innerHTML = `<div class="billing"><div class="panel"><h3>Select medicines</h3><input id="bq" placeholder="Search medicines…"><div class="pick" id="pick"></div></div>
  <div class="panel"><h3>Current bill</h3><label>Customer<select id="cu"><option value="">Walk-in customer</option>${cus.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select></label>
  <div id="cart" style="margin-top:12px"></div>
  <label>Discount (%)<input id="disc" type="number" min="0" max="100" value="0"></label><div class="sum" id="sum"></div><button class="btn primary lg" style="width:100%" id="co">Generate bill</button></div></div>`;
  const drawPick = () => { const q = $('#bq').value.toLowerCase();
    $('#pick').innerHTML = meds.filter(m => m.name.toLowerCase().includes(q)).map(m => `<div class="pi"><div><b>${esc(m.name)}</b><br><small>${money(m.price)} · ${m.stock} in stock</small></div><button class="btn sm" data-a="${m.id}" ${m.stock <= 0 ? 'disabled' : ''}>${I('plus')} Add</button></div>`).join('') || empty('No match', 'Check the spelling.'); };
  const calc = () => { const sub = cart.reduce((s, c) => s + c.price * c.qty, 0), dp = Math.min(100, Math.max(0, +$('#disc').value || 0)), d = sub * dp / 100, g = (sub - d) * .12; return { sub, d, g, t: sub - d + g }; };
  const drawCart = () => { const c = calc();
    $('#cart').innerHTML = cart.length ? cart.map((x, i) => `<div class="pi" style="margin-bottom:8px"><div><b>${esc(x.name)}</b><br><small>${money(x.price)} each</small></div><div class="qty"><button data-m="${i}">−</button><span>${x.qty}</span><button data-p="${i}">+</button></div></div>`).join('') : empty('Cart is empty', 'Add medicines from the list.');
    $('#sum').innerHTML = `<div><span>Subtotal</span><span>${money(c.sub)}</span></div><div><span>Discount</span><span>− ${money(c.d)}</span></div><div><span>GST (12%)</span><span>${money(c.g)}</span></div><div class="tot"><span>Total</span><span>${money(c.t)}</span></div>`; };
  $('#bq').oninput = drawPick; $('#disc').oninput = drawCart; drawPick(); drawCart();
  $('#pick').onclick = e => { const b = e.target.closest('button'); if (!b) return; const m = meds.find(x => x.id == b.dataset.a), x = cart.find(c => c.id === m.id);
    if ((x ? x.qty : 0) >= m.stock) return toast('Not enough stock for ' + m.name, true); x ? x.qty++ : cart.push({ id: m.id, name: m.name, price: m.price, qty: 1 }); drawCart(); };
  $('#cart').onclick = e => { const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.p) { const x = cart[b.dataset.p], m = meds.find(z => z.id === x.id); x.qty < m.stock ? x.qty++ : toast('Not enough stock', true); }
    if (b.dataset.m) { const x = cart[b.dataset.m]; if (--x.qty <= 0) cart.splice(b.dataset.m, 1); } drawCart(); };
  $('#co').onclick = async () => {
    if (!cart.length) return toast('Add at least one medicine', true);
    try { const snap = [...cart], cn = $('#cu').selectedOptions[0].text, r = await api('/sales', 'POST', { customer_id: $('#cu').value || null, items: cart, discount: +$('#disc').value || 0 }); invoice(r, snap, cn); }
    catch (er) { toast(er.message, true); }
  };
}
function invoice(r, items, cn) {
  modal(`<div class="inv"><h3>PharmaCare — Invoice #${r.id}</h3><div class="meta"><span>${esc(cn)}</span><span>${new Date().toLocaleString('en-IN')}</span></div>
  <table><thead><tr><th>Item</th><th class="num">Qty</th><th class="num">Amount</th></tr></thead><tbody>${items.map(i => `<tr><td>${esc(i.name)}</td><td class="num">${i.qty}</td><td class="num">${money(i.price * i.qty)}</td></tr>`).join('')}</tbody></table>
  <div class="sum"><div><span>Subtotal</span><span>${money(r.subtotal)}</span></div><div><span>Discount</span><span>− ${money(r.discount)}</span></div><div><span>GST (12%)</span><span>${money(r.gst)}</span></div><div class="tot"><span>Total paid</span><span>${money(r.total)}</span></div></div>
  <p class="muted" style="font-size:12px">Thank you for choosing PharmaCare. Get well soon.</p></div>
  <div class="mfoot noprint"><button class="btn" id="ic">Close</button><button class="btn primary" id="ip">Print invoice</button></div>`);
  toast('Bill saved'); $('#ic').onclick = () => { closeModal(); refresh(); }; $('#ip').onclick = () => { document.body.classList.add('printing'); print(); document.body.classList.remove('printing'); };
}

/* customers */
async function customers() {
  const cus = await api('/customers'); const F = [{ k: 'name', l: 'Full name', full: 1 }, { k: 'phone', l: 'Phone number', full: 1, t: 'tel' }];
  $('#main').innerHTML = `<div class="panel"><div class="ph"><h3>${cus.length} customers</h3><button class="btn primary" id="add">${I('plus')} Add customer</button></div>
  <div class="tw"><table><thead><tr><th>Customer</th><th>Phone</th><th></th></tr></thead><tbody>${cus.map(c => `<tr><td><div class="cname"><div class="avatar">${esc(c.name[0] || '?').toUpperCase()}</div>${esc(c.name)}</div></td><td>${esc(c.phone)}</td>
  <td><div class="acts"><button class="btn sm" data-h="${c.id}" data-n="${esc(c.name)}">Purchase history</button><button class="btn sm danger" data-d="${c.id}">${I('trash')}</button></div></td></tr>`).join('') || `<tr><td colspan="3">${empty('No customers yet', 'Add a customer to track their purchases.')}</td></tr>`}</tbody></table></div></div>`;
  $('#add').onclick = () => formModal('Add customer', F, {}, async d => { await api('/customers', 'POST', d); toast('Customer added'); refresh(); }, 'Add customer');
  $('#main').onclick = async e => { const b = e.target.closest('button[data-h],button[data-d]'); if (!b) return;
    if (b.dataset.d) return confirmBox('This customer record will be permanently removed.', async () => { await api('/customers/' + b.dataset.d, 'DELETE'); toast('Customer deleted'); refresh(); });
    const s = await api(`/customers/${b.dataset.h}/sales`);
    modal(`<h3>${b.dataset.n} — purchase history</h3>${s.length ? `<table><thead><tr><th>Bill</th><th>Date</th><th class="num">Total</th></tr></thead><tbody>${s.map(x => `<tr><td>#${x.id}</td><td>${esc(x.created)}</td><td class="num">${money(x.total)}</td></tr>`).join('')}</tbody></table>` : empty('No purchases yet', 'Bills linked to this customer will appear here.')}<div class="mfoot"><button class="btn" onclick="closeModal()">Close</button></div>`); };
}

/* suppliers */
async function suppliers() {
  const s = await api('/suppliers'); const F = [{ k: 'name', l: 'Supplier name', full: 1 }, { k: 'phone', l: 'Phone', t: 'tel' }, { k: 'medicines', l: 'Medicines supplied', p: 'Comma separated', full: 1 }];
  $('#main').innerHTML = `<div class="panel"><div class="ph"><h3>${s.length} suppliers</h3><button class="btn primary" id="add">${I('plus')} Add supplier</button></div>
  <div class="tw"><table><thead><tr><th>Supplier</th><th>Phone</th><th>Medicines</th><th></th></tr></thead><tbody>${s.map(x => `<tr><td><b>${esc(x.name)}</b></td><td>${esc(x.phone)}</td><td>${esc(x.medicines)}</td>
  <td><div class="acts"><button class="btn sm" data-e="${x.id}">${I('edit')} Edit</button><button class="btn sm danger" data-d="${x.id}">${I('trash')}</button></div></td></tr>`).join('') || `<tr><td colspan="4">${empty('No suppliers yet', 'Add the companies you buy medicines from.')}</td></tr>`}</tbody></table></div></div>`;
  const edit = x => formModal(x ? 'Edit supplier' : 'Add supplier', F, x || {}, async d => { await api('/suppliers' + (x ? '/' + x.id : ''), x ? 'PUT' : 'POST', d); toast('Supplier saved'); refresh(); });
  $('#add').onclick = () => edit(null);
  $('#main').onclick = e => { const b = e.target.closest('button[data-e],button[data-d]'); if (!b) return;
    if (b.dataset.e) edit(s.find(x => x.id == b.dataset.e));
    else confirmBox('This supplier will be permanently removed.', async () => { await api('/suppliers/' + b.dataset.d, 'DELETE'); toast('Supplier deleted'); refresh(); }); };
}

/* prescriptions */
async function prescriptions() {
  const list = admin() ? await api('/prescriptions') : [];
  $('#main').innerHTML = `<div class="${admin() ? 'two' : ''}"><div class="panel"><h3>Upload a prescription</h3><p class="muted" style="margin-bottom:14px">Attach a clear photo of your prescription. Our pharmacist will review it.</p>
  <label>Prescription image<input type="file" id="pf" accept="image/*"></label><button class="btn primary" id="pu" style="margin-top:14px">${I('file')} Upload prescription</button></div>
  ${admin() ? `<div class="panel"><h3>Received prescriptions</h3>${list.map(x => `<div class="al" style="margin-bottom:8px"><span><b>${esc(x.name)}</b><br><small class="muted">${esc(x.email)} · ${esc(x.created)}</small></span><div class="acts"><a class="btn sm" href="/uploads/${esc(x.file)}" target="_blank">View</a><button class="btn sm primary" data-assign-user="${x.user_id}" data-assign-name="${esc(x.name)}">Assign medicines</button></div></div>`).join('') || empty('Nothing uploaded', 'Customer prescriptions will show up here.')}</div>` : ''}</div>`;
  if (admin()) $('#main').onclick = async e => { const b=e.target.closest('button[data-assign-user]'); if(!b) return; await assignMedicineModal(b.dataset.assignUser,b.dataset.assignName); };
  $('#pu').onclick = async () => { const f = $('#pf').files[0]; if (!f) return toast('Choose an image first', true);
    const fd = new FormData(); fd.append('file', f); const r = await fetch('/api/prescriptions', { method: 'POST', headers: { Authorization: token }, body: fd });
    r.ok ? (toast('Prescription uploaded'), refresh()) : toast('Upload failed. Please try again.', true); };
}

/* customer cart and prescribed medicines */
let cartItems = JSON.parse(sessionStorage.cartItems || '[]');
function saveCustomerCart(){ sessionStorage.cartItems = JSON.stringify(cartItems); }
function addToCustomerCart(m){
  if(!m || m.stock<=0) return toast('Medicine is out of stock',true);
  const item=cartItems.find(x=>x.id===m.id);
  if(item){ if(item.qty>=m.stock) return toast('Not enough stock',true); item.qty++; }
  else cartItems.push({id:m.id,name:m.name,price:m.price,qty:1,stock:m.stock});
  saveCustomerCart(); toast(m.name+' added to cart');
}
async function customerCart(){
  const meds=await api('/medicines');
  cartItems=cartItems.map(x=>({...x,stock:(meds.find(m=>m.id===x.id)||{}).stock||0})).filter(x=>meds.some(m=>m.id===x.id)); saveCustomerCart();
  const total=cartItems.reduce((s,x)=>s+x.price*x.qty,0);
  $('#main').innerHTML=`<div class="panel"><div class="ph"><h3>Your Cart (${cartItems.length} items)</h3></div>${cartItems.length?`<div class="tw"><table><thead><tr><th>Medicine</th><th>Price</th><th>Quantity</th><th>Total</th><th></th></tr></thead><tbody>${cartItems.map(x=>`<tr><td><b>${esc(x.name)}</b></td><td>${money(x.price)}</td><td><div class="qty"><button data-minus="${x.id}">−</button><span>${x.qty}</span><button data-plus="${x.id}" ${x.qty>=x.stock?'disabled':''}>+</button></div></td><td>${money(x.price*x.qty)}</td><td><button class="btn sm danger" data-remove="${x.id}">Remove</button></td></tr>`).join('')}</tbody></table></div><div class="sum"><div class="tot"><span>Estimated total</span><span>${money(total)}</span></div></div><p class="muted">This is a cart preview. Checkout and payment are not enabled in this demo.</p>`:empty('Your cart is empty','Go to Medicines and use Add to Cart to add products.')}</div>`;
  $('#main').onclick=e=>{const b=e.target.closest('button');if(!b)return;const x=cartItems.find(z=>z.id===(+b.dataset.plus||+b.dataset.minus||+b.dataset.remove));if(!x)return;if(b.dataset.plus){if(x.qty<x.stock)x.qty++;else toast('Not enough stock',true)}if(b.dataset.minus){x.qty--;if(x.qty<=0)cartItems=cartItems.filter(z=>z.id!==x.id)}if(b.dataset.remove)cartItems=cartItems.filter(z=>z.id!==x.id);saveCustomerCart();refresh();};
}
async function prescribedMedicines(){
  const rows=await api('/prescribed-medicines');
  $('#main').innerHTML=`<div class="panel"><h3>Your Prescribed Medicines</h3><p class="muted" style="margin:8px 0 16px">These medicines have been assigned by the pharmacy after reviewing your prescription.</p>${rows.length?`<div class="tw"><table><thead><tr><th>Medicine</th><th>Category</th><th>Quantity</th><th>Price</th><th>Instructions</th><th>Availability</th><th></th></tr></thead><tbody>${rows.map(x=>`<tr><td><b>${esc(x.name)}</b></td><td>${esc(x.category)}</td><td>${x.qty}</td><td>${money(x.price)}</td><td>${esc(x.instructions||'—')}</td><td>${x.stock>0?'In stock':'Out of stock'}</td><td><button class="btn sm primary" data-add-prescribed="${x.medicine_id}" ${x.stock<=0?'disabled':''}>Add to Cart</button></td></tr>`).join('')}</tbody></table></div>`:empty('No prescribed medicines yet','The pharmacy will list medicines here after reviewing your uploaded prescription.')}</div>`;
  $('#main').onclick=e=>{const b=e.target.closest('button[data-add-prescribed]');if(!b)return;const m=rows.find(x=>x.medicine_id==b.dataset.addPrescribed);addToCustomerCart({...m,id:m.medicine_id});};
}
async function assignMedicineModal(userId,userName){
 const [meds]=await Promise.all([api('/medicines')]);
 const fields=[{k:'medicine_id',l:'Medicine',opts:meds.map(m=>({v:m.id,t:`${m.name} — ${money(m.price)} (${m.stock} in stock)`}))},{k:'qty',l:'Quantity',t:'number'},{k:'instructions',l:'Instructions',full:1,req:false,p:'As directed by pharmacist'}];
 formModal('Assign medicines to '+userName,fields,{medicine_id:meds[0]?.id||'',qty:1,instructions:''},async d=>{await api('/prescribed-medicines','POST',{user_id:+userId,medicine_id:+d.medicine_id,qty:+d.qty,instructions:d.instructions});toast('Medicine assigned to customer');refresh();},'Assign medicine');
}

/* about */
async function about() {
  $('#main').innerHTML = `<div class="two"><div class="panel"><h3>About PharmaCare</h3><p>PharmaCare is a neighbourhood pharmacy focused on genuine medicines, fair prices and quick service.</p>
  <div class="alerts" style="margin-top:16px"><div class="al"><span>Opening hours</span><b>Mon–Sat, 9 AM – 9 PM</b></div><div class="al"><span>Sunday</span><b>10 AM – 2 PM</b></div><div class="al"><span>Phone</span><b>+91 98765 43210</b></div></div>
  <p class="muted" style="margin-top:16px;font-size:13px">Built by Gaurav Singh Bajetha (12613038)<br>Other team members: Aditya Kumar (12613103), Adarsh Kumar (12613193)</p></div>
  <div class="panel"><h3>Send us a message</h3><form id="cf" class="fgrid"><label>Name<input name="name" required></label><label>Email<input name="email" type="email" required></label>
  <label class="full">Message<textarea name="message" rows="4" required></textarea></label><button class="btn primary full">Send message</button></form></div></div>`;
  $('#cf').onsubmit = async e => { e.preventDefault(); await api('/contact', 'POST', Object.fromEntries(new FormData(e.target))); e.target.reset(); toast('Message sent. We will get back to you soon.'); };
}
start();
