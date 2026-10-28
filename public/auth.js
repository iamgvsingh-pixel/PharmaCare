if (localStorage.dark) document.body.classList.add('dark');
if (localStorage.t) location.replace('app.html');
const f = document.getElementById('f'), msg = document.getElementById('msg'), signup = f.hasAttribute('data-signup');
f.onsubmit = async e => {
  e.preventDefault();
  const body = { email: document.getElementById('e').value, password: document.getElementById('p').value };
  if (signup) body.name = document.getElementById('n').value;
  try {
    const r = await fetch('/api/' + (signup ? 'signup' : 'login'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.error || 'Something went wrong');
    localStorage.t = d.token; localStorage.u = JSON.stringify(d.user);
    location.replace('app.html');
  } catch (er) { msg.textContent = er.message; msg.hidden = false; }
};
