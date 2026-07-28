const sendMessage = async (msg) => {
  try {
    return await chrome.runtime.sendMessage(msg);
  } catch (err) {
    return { ok: false, error: err?.message || String(err) };
  }
};

const loginView = document.getElementById('loginView');
const statusView = document.getElementById('statusView');
const loginBtn = document.getElementById('loginBtn');
const loginError = document.getElementById('loginError');
const statusName = document.getElementById('statusName');
const statusBadge = document.getElementById('statusBadge');
const statusMsg = document.getElementById('statusMsg');

function showStatus(state) {
  loginView.style.display = 'none';
  statusView.style.display = 'block';
  statusName.textContent = state.name || state.userId || '';
  if (state.allowed) {
    statusBadge.innerHTML = '<span class="sy-badge sy-ok">Extension access approved</span>';
    statusMsg.textContent = 'Open web.whatsapp.com — the CRM sidebar will appear on the right.';
  } else {
    statusBadge.innerHTML = '<span class="sy-badge sy-pending">Waiting for admin approval</span>';
    statusMsg.textContent = 'Ask your admin to approve extension access for your account in QR WhatsApp → Settings, then click "Refresh access status" below.';
  }
}

async function init() {
  const state = await sendMessage({ type: 'GET_STATE' });
  if (state.loggedIn) {
    showStatus(state);
  }
}

document.getElementById('togglePassword').addEventListener('click', () => {
  const pwInput = document.getElementById('password');
  const btn = document.getElementById('togglePassword');
  const showing = pwInput.type === 'text';
  pwInput.type = showing ? 'password' : 'text';
  btn.textContent = showing ? '👁' : '🙈';
});

loginBtn.addEventListener('click', async () => {
  const userId = document.getElementById('userId').value.trim();
  const password = document.getElementById('password').value;
  loginError.textContent = '';
  if (!userId || !password) {
    loginError.textContent = 'Enter both fields.';
    return;
  }
  loginBtn.disabled = true;
  loginBtn.textContent = 'Signing in…';
  const res = await sendMessage({ type: 'LOGIN', userId, password });
  loginBtn.disabled = false;
  loginBtn.textContent = 'Sign in';
  if (!res.ok) {
    loginError.textContent = res.error || 'Login failed';
    return;
  }
  showStatus(res);
});

document.getElementById('refreshBtn').addEventListener('click', async () => {
  const res = await sendMessage({ type: 'REFRESH_ACCESS' });
  if (res.ok) {
    const state = await sendMessage({ type: 'GET_STATE' });
    showStatus(state);
  }
});

document.getElementById('logoutBtn').addEventListener('click', async () => {
  await sendMessage({ type: 'LOGOUT' });
  loginView.style.display = 'block';
  statusView.style.display = 'none';
  document.getElementById('userId').value = '';
  document.getElementById('password').value = '';
});

init();
