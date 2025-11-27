// script.js — adds password recovery flow to existing registration/login/enroll demo

// Helpers
const $ = id => document.getElementById(id);
const save = (k,v) => localStorage.setItem(k, JSON.stringify(v));
const load = (k) => JSON.parse(localStorage.getItem(k) || 'null') || [];
const now = () => new Date().toLocaleString();

// Demo courses
const COURSES = [
  { id: 'c1', title: 'Web Development (HTML/CSS/JS)' },
  { id: 'c2', title: 'Python for Data Science' },
  { id: 'c3', title: 'Ethical Hacking' }
];

// Ensure storage
if (!load('users') || !Array.isArray(load('users'))) save('users', []);
if (!load('enrollments') || !Array.isArray(load('enrollments'))) save('enrollments', []);

// --- UI navigation ---
function show(page) {
  ['register','login','courses','admin'].forEach(p=>{
    const sec = document.getElementById(p + 'Section');
    if (sec) sec.classList.add('hidden');
  });
  const target = document.getElementById(page + 'Section');
  if (target) target.classList.remove('hidden');
}

// nav buttons
['showRegister','showLogin','showCourses','showAdmin'].forEach(id=>{
  const el = document.getElementById(id);
  if(el) el.addEventListener('click', ()=> show(id.replace('show','').toLowerCase()));
});

// default
show('courses');
renderCourses();

// ---------------- Registration + OTP ----------------
let currentOtp = null;
let otpTimeout = null;

$('sendOtpBtn').addEventListener('click', ()=>{
  const name = $('regName').value.trim();
  const phone = $('regPhone').value.trim();
  const email = $('regEmail').value.trim();
  if(!name || !phone || !email){ $('regMsg').innerText = 'Fill name, phone & email first.'; return; }

  currentOtp = Math.floor(100000 + Math.random()*900000).toString();
  $('otpDemo').innerText = 'Demo OTP (sent): ' + currentOtp;
  $('otpVerifyArea').classList.remove('hidden');
  $('regMsg').innerText = 'OTP sent (demo).';

  if(otpTimeout) clearTimeout(otpTimeout);
  otpTimeout = setTimeout(()=>{ currentOtp = null; $('regMsg').innerText = 'OTP expired.'; $('otpDemo').innerText = '(OTP expired)'; }, 5*60*1000);
});

$('verifyOtpBtn').addEventListener('click', ()=>{
  const entered = $('regOtp').value.trim();
  if(!currentOtp){ $('regMsg').innerText = 'No OTP requested or it expired.'; return; }
  if(entered === currentOtp){
    $('regMsg').innerText = 'OTP verified — set your password.';
    $('regPassword').classList.remove('hidden');
    $('regPassword2').classList.remove('hidden');
    $('completeRegisterBtn').classList.remove('hidden');
    currentOtp = null; if(otpTimeout) clearTimeout(otpTimeout);
    $('otpDemo').innerText = '(OTP verified)';
  } else { $('regMsg').innerText = 'Incorrect OTP.'; }
});

$('registerForm').addEventListener('submit', (e)=>{
  e.preventDefault();
  const name = $('regName').value.trim();
  const email = $('regEmail').value.trim();
  const pass1 = $('regPassword').value;
  const pass2 = $('regPassword2').value;

  if(pass1.length < 4){ $('regMsg').innerText = 'Password must be at least 4 characters.'; return; }
  if(pass1 !== pass2){ $('regMsg').innerText = 'Passwords do not match.'; return; }

  const users = load('users') || [];
  if(users.find(u=>u.email === email)){ $('regMsg').innerText = 'Email already registered.'; return; }

  users.push({ id: 'u' + Date.now(), name, email, password: pass1, created: now() });
  save('users', users);

  $('regMsg').innerText = 'Account created. Please login.';
  $('registerForm').reset();
  $('regPassword').classList.add('hidden');
  $('regPassword2').classList.add('hidden');
  $('completeRegisterBtn').classList.add('hidden');
});

// ---------------- Login ----------------
$('loginForm').addEventListener('submit', (e)=>{
  e.preventDefault();
  const email = $('loginEmail').value.trim();
  const password = $('loginPassword').value;

  const users = load('users') || [];
  const user = users.find(u=>u.email===email && u.password===password);
  if(!user){ $('loginMsg').innerText = 'Invalid credentials.'; return; }

  sessionStorage.setItem('sessionUser', JSON.stringify(user));
  $('loginMsg').innerText = 'Login successful.';
  openStudentDashboard();
});

// forgot password link
$('forgotLink').addEventListener('click', (ev)=>{
  ev.preventDefault();
  $('forgotSection').classList.remove('hidden');
  $('forgotMsg').innerText = '';
});

// ---------------- Password Recovery (Forgot) ----------------
let resetOtp = null;
let resetOtpTimeout = null;
let resetEmailTarget = null;

$('sendResetOtpBtn').addEventListener('click', ()=>{
  const email = $('forgotEmail').value.trim();
  if(!email){ $('forgotMsg').innerText = 'Enter your email.'; return; }

  const users = load('users') || [];
  const user = users.find(u=>u.email === email);
  if(!user){ $('forgotMsg').innerText = 'No account found for this email.'; return; }

  resetEmailTarget = email;
  resetOtp = Math.floor(100000 + Math.random()*900000).toString();
  $('resetOtpDemo').innerText = 'Reset OTP (demo): ' + resetOtp;
  $('forgotStep2').classList.remove('hidden');
  $('forgotMsg').innerText = 'Reset OTP sent (demo).';

  if(resetOtpTimeout) clearTimeout(resetOtpTimeout);
  resetOtpTimeout = setTimeout(()=>{ resetOtp = null; $('forgotMsg').innerText = 'Reset OTP expired.'; $('resetOtpDemo').innerText = '(OTP expired)'; }, 5*60*1000);
});

$('verifyResetOtpBtn').addEventListener('click', ()=>{
  const entered = $('resetOtpInput').value.trim();
  if(!resetOtp){ $('forgotMsg').innerText = 'No reset OTP requested or it expired.'; return; }
  if(entered === resetOtp){
    $('forgotMsg').innerText = 'OTP verified — enter new password.';
    $('newPassword').classList.remove('hidden');
    $('newPassword2').classList.remove('hidden');
    $('completeResetBtn').classList.remove('hidden');
    resetOtp = null; if(resetOtpTimeout) clearTimeout(resetOtpTimeout);
    $('resetOtpDemo').innerText = '(OTP verified)';
  } else { $('forgotMsg').innerText = 'Incorrect reset OTP.'; }
});

$('completeResetBtn').addEventListener('click', ()=>{
  const p1 = $('newPassword').value;
  const p2 = $('newPassword2').value;
  if(!resetEmailTarget){ $('forgotMsg').innerText = 'No target email — start again.'; return; }
  if(p1.length < 4){ $('forgotMsg').innerText = 'Password must be at least 4 characters.'; return; }
  if(p1 !== p2){ $('forgotMsg').innerText = 'Passwords do not match.'; return; }

  const users = load('users') || [];
  const idx = users.findIndex(u=>u.email === resetEmailTarget);
  if(idx === -1){ $('forgotMsg').innerText = 'User not found (unexpected).'; return; }

  users[idx].password = p1;
  save('users', users);
  $('forgotMsg').innerText = 'Password updated. You may now login.';
  // reset UI
  $('forgotEmail').value = '';
  $('resetOtpInput').value = '';
  $('newPassword').value = '';
  $('newPassword2').value = '';
  $('newPassword').classList.add('hidden');
  $('newPassword2').classList.add('hidden');
  $('completeResetBtn').classList.add('hidden');
  $('forgotStep2').classList.add('hidden');
  resetEmailTarget = null;
});

// ---------------- Logout
$('logoutBtn').addEventListener('click', ()=>{
  sessionStorage.removeItem('sessionUser');
  location.reload();
});

// ---------------- Courses & Enroll ----------------
function renderCourses(){
  const container = $('coursesList');
  container.innerHTML = '';
  COURSES.forEach(c=>{
    const div = document.createElement('div');
    div.innerHTML = `
      <div style="flex:1"><strong>${c.title}</strong></div>
      <div><button type="button" class="btn-ghost enroll-btn" data-id="${c.id}">Enroll</button></div>
    `;
    container.appendChild(div);
  });
  document.querySelectorAll('.enroll-btn').forEach(b=>{
    b.addEventListener('click', ()=> enrollCourse(b.getAttribute('data-id')));
  });
}
renderCourses();

function enrollCourse(courseId){
  const s = sessionStorage.getItem('sessionUser');
  if(!s){ alert('Please login to enroll.'); show('login'); return; }
  const user = JSON.parse(s);
  const enrollments = load('enrollments') || [];
  if(enrollments.find(e=> e.studentId === user.id && e.courseId === courseId)){ alert('Already enrolled.'); return; }
  enrollments.push({ studentId: user.id, courseId, created: now() });
  save('enrollments', enrollments);
  alert('Enrolled successfully!');
  loadMyEnrollments();
}

function openStudentDashboard(){
  renderCourses();
  const sp = $('studentPanel'); if(sp) sp.classList.remove('hidden');
  loadMyEnrollments();
}

function loadMyEnrollments(){
  const ul = $('myEnrollments');
  ul.innerHTML = '';
  const s = sessionStorage.getItem('sessionUser'); if(!s){ ul.innerHTML = '<li class="muted">Login to see enrollments.</li>'; return; }
  const user = JSON.parse(s);
  const enrollments = load('enrollments') || [];
  const mine = enrollments.filter(e=> e.studentId === user.id);
  if(mine.length === 0) ul.innerHTML = '<li class="muted">No enrollments yet.</li>';
  mine.forEach(e=>{
    const course = COURSES.find(c=> c.id === e.courseId) || { title: 'Unknown' };
    const li = document.createElement('li'); li.innerText = `${course.title} — ${e.created}`;
    ul.appendChild(li);
  });
}

// ---------------- ADMIN ----------------
$('adminLoginBtn').addEventListener('click', ()=>{
  if($('adminPass').value === 'admin123'){
    $('adminLoginArea').classList.add('hidden');
    $('adminPanel').classList.remove('hidden');
    renderAdminTable();
  } else alert('Wrong admin password.');
});

$('adminLogout').addEventListener('click', ()=>{
  $('adminPanel').classList.add('hidden');
  $('adminLoginArea').classList.remove('hidden');
});

function renderAdminTable(){
  const tbody = document.querySelector('#enrollTable tbody');
  tbody.innerHTML = '';
  const enrollments = load('enrollments') || [];
  const users = load('users') || [];
  if(enrollments.length === 0){
    const tr = document.createElement('tr');
    tr.innerHTML = '<td colspan="4" class="muted">No enrollments yet.</td>';
    tbody.appendChild(tr);
    return;
  }
  enrollments.forEach(e=>{
    const user = users.find(u=> u.id === e.studentId) || { name:'Unknown', email:'-' };
    const course = COURSES.find(c=> c.id === e.courseId) || { title:'Unknown' };
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${user.name}</td><td>${user.email}</td><td>${course.title}</td><td>${e.created}</td>`;
    tbody.appendChild(tr);
  });
}
