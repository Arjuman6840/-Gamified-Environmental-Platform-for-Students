// ============================================================
// CONFIG
// ============================================================
const API_URL = 'http://localhost:5000/api';

// ============================================================
// AUTH HELPERS
// ============================================================
function getToken() { return localStorage.getItem('token'); }
function getUser()  { return JSON.parse(localStorage.getItem('user') || 'null'); }
function setSession(token, user) {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
  updateNav();
}
function clearSession() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  updateNav();
}
function logout() {
  clearSession();
  showToast('Logged out');
  showPage('home');
}
function authHeaders(extra = {}) {
  const h = { ...extra };
  if (getToken()) h['Authorization'] = 'Bearer ' + getToken();
  return h;
}

// ============================================================
// NAV
// ============================================================
function updateNav() {
  const user = getUser();
  const badge = document.getElementById('userBadge');
  const loginBtn = document.getElementById('loginBtn');
  const regBtn = document.getElementById('registerBtn');
  const logoutBtn = document.getElementById('logoutBtn');

  if (user) {
    badge.textContent = `${user.full_name} (${user.role})`;
    badge.classList.remove('hidden');
    loginBtn.classList.add('hidden');
    regBtn.classList.add('hidden');
    logoutBtn.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
    loginBtn.classList.remove('hidden');
    regBtn.classList.remove('hidden');
    logoutBtn.classList.add('hidden');
  }
}

// ============================================================
// PAGE ROUTER
// ============================================================
function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const page = document.getElementById('page-' + name);
  if (page) page.classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Lazy-load data per page
  if (name === 'courses')     loadCourses();
  if (name === 'activities')  loadActivities();
  if (name === 'leaderboard') loadLeaderboard();
}

// ============================================================
// ROLE TABS
// ============================================================
let selectedRole = 'student';
function selectRole(role) {
  selectedRole = role;
  document.getElementById('tab-student').classList.toggle('active', role === 'student');
  document.getElementById('tab-teacher').classList.toggle('active', role === 'teacher');
}

let selectedLoginRole = 'student';
function selectLoginRole(role) {
  selectedLoginRole = role;
  document.getElementById('login-tab-student').classList.toggle('active', role === 'student');
  document.getElementById('login-tab-teacher').classList.toggle('active', role === 'teacher');
}

// ============================================================
// AUTH: REGISTER
// ============================================================
async function handleRegister(e) {
  e.preventDefault();
  const body = {
    full_name: document.getElementById('regName').value.trim(),
    email:     document.getElementById('regEmail').value.trim(),
    school:    document.getElementById('regSchool').value.trim(),
    password:  document.getElementById('regPassword').value,
    role:      selectedRole
  };

  try {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Registration failed');

    setSession(data.token, data.user);
    showToast('Account created! Welcome 🌱');
    showPage('home');
  } catch (err) {
    showToast(err.message, true);
  }
}

// ============================================================
// AUTH: LOGIN
// ============================================================
async function handleLogin(e) {
  e.preventDefault();
  const body = {
    email:    document.getElementById('loginEmail').value.trim(),
    password: document.getElementById('loginPassword').value
  };

  try {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');

    setSession(data.token, data.user);
    showToast(`Welcome back, ${data.user.full_name}!`);
    showPage('home');
  } catch (err) {
    showToast(err.message, true);
  }
}

// ============================================================
// COURSES
// ============================================================
async function loadCourses() {
  const container = document.getElementById('coursesList');
  container.innerHTML = '<p class="muted">Loading courses...</p>';

  try {
    const res = await fetch(`${API_URL}/courses`, { headers: authHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed');

    if (!data.courses || data.courses.length === 0) {
      container.innerHTML = '<p class="muted">No courses yet.</p>';
      return;
    }

    container.innerHTML = data.courses.map(c => `
      <div class="course-card">
        <h3>${escapeHtml(c.title)}</h3>
        <p>${escapeHtml(c.description || 'No description')}</p>
        <div class="course-meta">
          <span>📘 ${escapeHtml(c.topic || 'general')}</span>
          <span>👥 ${c.enrolled_count || 0} enrolled</span>
          ${c.teacher_name ? `<span>👩‍🏫 ${escapeHtml(c.teacher_name)}</span>` : ''}
        </div>
        ${getUser() && getUser().role === 'student' ? `
          <button class="btn-solid" onclick="enrollCourse(${c.id})">Enroll</button>
        ` : ''}
      </div>
    `).join('');
  } catch (err) {
    container.innerHTML = `<p class="muted">Failed to load courses.</p>`;
  }
}

async function enrollCourse(courseId) {
  try {
    const res = await fetch(`${API_URL}/courses/${courseId}/enroll`, {
      method: 'POST',
      headers: authHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed');
    showToast('Enrolled successfully!');
    loadCourses();
  } catch (err) {
    showToast(err.message, true);
  }
}

// ============================================================
// ACTIVITIES
// ============================================================
async function loadActivities() {
  const user = getUser();
  if (!user) {
    document.getElementById('myActivities').innerHTML = '<p class="muted">Log in to view your submissions.</p>';
    return;
  }

  try {
    const res = await fetch(`${API_URL}/activities/mine`, { headers: authHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    const container = document.getElementById('myActivities');
    if (!data.activities || data.activities.length === 0) {
      container.innerHTML = '<p class="muted">You haven\'t submitted any activities yet.</p>';
    } else {
      container.innerHTML = data.activities.map(a => `
        <div class="activity-item">
          <div>
            <strong>${escapeHtml(a.title)}</strong>
            <div class="muted">${escapeHtml(a.description || '')}</div>
          </div>
          <div style="text-align:right">
            <span class="status-badge status-${a.status}">${a.status}</span>
            ${a.points_awarded ? `<div class="muted">+${a.points_awarded} pts</div>` : ''}
          </div>
        </div>
      `).join('');
    }

    // Update stats
    document.getElementById('statActivities').textContent = data.activities.length;
    const pointsRes = await fetch(`${API_URL}/leaderboard/me`, { headers: authHeaders() });
    if (pointsRes.ok) {
      const pd = await pointsRes.json();
      document.getElementById('statPoints').textContent = pd.total_points || 0;
      document.getElementById('statRank').textContent = pd.rank ? '#' + pd.rank : '—';
    }

    // Load courses into the select dropdown
    const coursesRes = await fetch(`${API_URL}/courses`, { headers: authHeaders() });
    if (coursesRes.ok) {
      const cd = await coursesRes.json();
      const sel = document.getElementById('actCourse');
      sel.innerHTML = '<option value="">— Select a course —</option>' +
        cd.courses.map(c => `<option value="${c.id}">${escapeHtml(c.title)}</option>`).join('');
    }
  } catch (err) {
    // silent
  }
}

async function handleActivitySubmit(e) {
  e.preventDefault();
  const formData = new FormData();
  formData.append('title', document.getElementById('actTitle').value);
  formData.append('description', document.getElementById('actDesc').value);
  formData.append('course_id', document.getElementById('actCourse').value);
  formData.append('proof', document.getElementById('actProof').files[0]);

  try {
    const res = await fetch(`${API_URL}/activities`, {
      method: 'POST',
      headers: authHeaders(),
      body: formData
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Submit failed');

    showToast('Activity submitted for review 🌱');
    document.getElementById('activityForm').reset();
    loadActivities();
  } catch (err) {
    showToast(err.message, true);
  }
}

// ============================================================
// QUIZ
// ============================================================
let currentQuiz = null;

async function generateQuiz() {
  const user = getUser();
  if (!user || user.role !== 'student') {
    showToast('Only students can take quizzes', true);
    return;
  }

  const topic = document.getElementById('quizTopic').value.trim();
  const difficulty = document.getElementById('quizDifficulty').value;
  const container = document.getElementById('quizContainer');
  container.innerHTML = '<p class="muted">Generating quiz... this can take a few seconds ⏳</p>';

  try {
    const res = await fetch(`${API_URL}/ai/quiz/generate`, {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ topic, difficulty, numQuestions: 5 })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed');

    currentQuiz = data.quiz;
    renderQuiz(data.questions);
  } catch (err) {
    container.innerHTML = `<p class="muted">${escapeHtml(err.message)}</p>`;
  }
}

function renderQuiz(questions) {
  const container = document.getElementById('quizContainer');
  container.innerHTML = `
    <div class="card">
      <h3>Quiz: ${escapeHtml(currentQuiz.topic)} — ${escapeHtml(currentQuiz.difficulty)}</h3>
      ${questions.map((q, i) => `
        <div class="quiz-question">
          <h4>Q${i + 1}. ${escapeHtml(q.question)}</h4>
          ${q.options.map((opt, j) => `
            <label class="quiz-option">
              <input type="radio" name="q${i}" value="${j}" />
              <span>${escapeHtml(opt)}</span>
            </label>
          `).join('')}
        </div>
      `).join('')}
      <button class="btn-solid full" onclick="submitQuiz()">Submit Quiz</button>
    </div>
  `;
}

async function submitQuiz() {
  if (!currentQuiz) return;

  const answers = [];
  const questionCount = document.querySelectorAll('.quiz-question').length;
  for (let i = 0; i < questionCount; i++) {
    const selected = document.querySelector(`input[name="q${i}"]:checked`);
    if (!selected) {
      showToast(`Please answer question ${i + 1}`, true);
      return;
    }
    answers.push(parseInt(selected.value));
  }

  try {
    const res = await fetch(`${API_URL}/ai/quiz/submit`, {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ quizId: currentQuiz.id, answers })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Submit failed');

    showToast(`Score: ${data.score}/${data.total} (${data.percentage}%) — +${data.pointsEarned} pts`);

    const container = document.getElementById('quizContainer');
    container.innerHTML = `
      <div class="card" style="text-align:center">
        <h2>${data.percentage}% 🎯</h2>
        <p>You scored ${data.score} out of ${data.total}</p>
        <p class="muted">Earned ${data.pointsEarned} eco-points</p>
        <button class="btn-solid" onclick="showPage('leaderboard')">View Leaderboard</button>
      </div>
    `;
  } catch (err) {
    showToast(err.message, true);
  }
}

// ============================================================
// LEADERBOARD
// ============================================================
async function loadLeaderboard() {
  const container = document.getElementById('leaderboardContent');
  container.innerHTML = '<p class="muted">Loading...</p>';

  try {
    const res = await fetch(`${API_URL}/leaderboard`, { headers: authHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    const me = getUser();
    if (!data.leaderboard || data.leaderboard.length === 0) {
      container.innerHTML = '<p class="muted">No rankings yet.</p>';
      return;
    }

    container.innerHTML = `
      <table class="lb-table">
        <thead>
          <tr><th>Rank</th><th>Student</th><th>School</th><th>Points</th></tr>
        </thead>
        <tbody>
          ${data.leaderboard.map(r => `
            <tr class="${me && r.student_id === me.id ? 'me' : ''}">
              <td>#${r.rank}</td>
              <td>${escapeHtml(r.full_name)}</td>
              <td>${escapeHtml(r.school || '—')}</td>
              <td><strong>${r.total_points}</strong></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } catch (err) {
    container.innerHTML = '<p class="muted">Failed to load leaderboard.</p>';
  }
}

// ============================================================
// AI TUTOR
// ============================================================
async function sendTutorMessage() {
  const user = getUser();
  if (!user) { showToast('Please login first', true); return; }

  const input = document.getElementById('chatInput');
  const question = input.value.trim();
  if (!question) return;

  const messages = document.getElementById('chatMessages');
  messages.innerHTML += `<div class="chat-bubble user">${escapeHtml(question)}</div>`;
  messages.innerHTML += `<div class="chat-bubble bot" id="thinking">Thinking... 🌱</div>`;
  messages.scrollTop = messages.scrollHeight;
  input.value = '';

  try {
    const res = await fetch(`${API_URL}/ai/tutor`, {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ question })
    });
    const data = await res.json();
    document.getElementById('thinking').remove();

    if (!res.ok) throw new Error(data.error || 'Failed');
    messages.innerHTML += `<div class="chat-bubble bot">${escapeHtml(data.answer)}</div>`;
  } catch (err) {
    document.getElementById('thinking').remove();
    messages.innerHTML += `<div class="chat-bubble bot" style="background:#ffebee;color:#c62828">Error: ${escapeHtml(err.message)}</div>`;
  }
  messages.scrollTop = messages.scrollHeight;
}

// ============================================================
// HELPERS
// ============================================================
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function showToast(msg, isError = false) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = 'toast show' + (isError ? ' error' : '');
  setTimeout(() => toast.className = 'toast', 3000);
}

// ============================================================
// INIT
// ============================================================
updateNav();
showPage('home');