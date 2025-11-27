// script.js - Firebase Firestore integrated (for GitHub Pages static site)

// DOM helper
const $ = id => document.getElementById(id);
const now = () => new Date().toLocaleString();

// Firestore must be exposed as window.__db from index.html
const db = window.__db;
if (!db) {
  console.warn('Firestore not initialized. Add Firebase config to index.html.');
}

// Demo course list
const COURSES = [
  { id: 'c1', title: 'Web Development (HTML/CSS/JS)' },
  { id: 'c2', title: 'Python for Data Science' },
  { id: 'c3', title: 'Ethical Hacking' }
];

// Local helpers
const saveLocal = (k,v) => localStorage.setItem(k, JSON.stringify(v));
const loadLocal = (k) => JSON.parse(localStorage.getItem(k) || 'null') || [];

// Ensure arrays
if (!Array.isArray(loadLocal('users'))) saveLocal('users', []);
if (!Array.isArray(loadLocal('enrollments'))) saveLocal('enrollments', []);

// UI show/hide
function show(page){
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
show('courses');

// Render courses
function renderCourses(){
  const container = $('coursesList'); container.innerHTML = '';
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

/* ---------------- Registration (OTP demo) ---------------- */
let currentOtp = null, otpTimeout = null;
$('sendOtpBtn').addEventListener('click', ()=>{
  const name = $('regName').value.trim(), phone = $('regPhone').value.trim(), email = $('regEmail').value.trim();
  if(!name || !phone || !email){ $('regMsg').innerText = 'Fill name, phone & email first.'; return; }
  currentOtp = Math.floor(100000 + Math.random()*900000).toString();
  $('otpDemo').innerText = 'Demo OTP (sent): ' + currentOtp;
  $('otpVerifyArea').classList.remove('hidden'); $('regMsg').innerText = 'OTP sent (demo).';
  if(otpTimeout) clearTimeout(otpTimeout);
  otpTimeout = setTimeout(()=>{ currentOtp = null; $('regMsg').innerText = 'OTP expired.'; $('otpDemo').innerText='(OTP expired)'; }, 5*60*1000);
});
$('verifyOtpBtn').addEventListener('click', ()=>{
  const entered = $('regOtp').value.trim();
  if(!currentOtp){ $('regMsg').innerText = 'No OTP requested or expired.'; return; }
  if(entered === currentOtp){
    $('regMsg').innerText = 'OTP verified — set your password.';
    $('regPassword').classList.remove('hidden'); $('regPassword2').classList.remove('hidden'); $('completeRegisterBtn').classList.remove('hidden');
    currentOtp = null; if(otpTimeout) clearTimeout(otpTimeout); $('otpDemo').innerText='(OTP verified)';
  } else { $('regMsg').innerText = 'Incorrect OTP.';}
});

/* Register submit: save local (password) and metadata to Firestore (no password) */
$('registerForm').addEventListener('submit', async (e)=>{
  e.preventDefault();
  const name = $('regName').value.trim(), email = $('regEmail').value.trim(), phone = $('regPhone').value.trim();
  const pass1 = $('regPassword').value, pass2 = $('regPassword2').value;
  if(pass1.length < 4){ $('regMsg').innerText = 'Password must be at least 4 characters.'; return; }
  if(pass1 !== pass2){ $('regMsg').innerText = 'Passwords do not match.'; return; }

  // local store
  const usersLocal = loadLocal('users');
  if(usersLocal.find(u=>u.email===email)){ $('regMsg').innerText = 'Email already registered (local).'; return; }
  const id = 'u' + Date.now();
  usersLocal.push({ id, name, email, phone, password: pass1, created: now() });
  saveLocal('users', usersLocal);

  // write user metadata to Firestore (phone included). DO NOT store password in Firestore for production.
  if (db) {
    try {
      await db.collection('users').doc(id).set({ id, name, email, phone, created: now() });
      $('regMsg').innerText = 'Account created and saved to cloud. Please login.';
    } catch(err) {
      console.error('Firestore user write failed', err);
      $('regMsg').innerText = 'Account saved locally; cloud save failed (check console).';
    }
  } else {
    $('regMsg').innerText = 'Account created locally (no cloud).';
  }

  $('registerForm').reset();
  $('regPassword').classList.add('hidden'); $('regPassword2').classList.add('hidden'); $('completeRegisterBtn').classList.add('hidden');
});

/* ---------------- Login (local demo) ---------------- */
$('loginForm').addEventListener('submit', (e)=>{
  e.preventDefault();
  const email = $('loginEmail').value.trim(), password = $('loginPassword').value;
  const users = loadLocal('users') || [];
  const user = users.find(u=>u.email===email && u.password===password);
  if(!user){ $('loginMsg').innerText = 'Invalid credentials.'; return; }
  sessionStorage.setItem('sessionUser', JSON.stringify(user)); $('loginMsg').innerText = 'Login successful.'; openStudentDashboard();
});

/* ---------------- Forgot password (local reset) ---------------- */
$('forgotLink').addEventListener('click', (ev)=>{ ev.preventDefault(); $('forgotSection').classList.remove('hidden'); $('forgotMsg').innerText=''; });
let resetOtp=null, resetOtpTimeout=null, resetEmailTarget=null;
$('sendResetOtpBtn').addEventListener('click', ()=>{
  const email = $('forgotEmail').value.trim();
  if(!email){ $('forgotMsg').innerText='Enter your email.'; return; }
  const users = loadLocal('users') || [];
  const user = users.find(u=>u.email===email);
  if(!user){ $('forgotMsg').innerText='No account found for this email.'; return; }
  resetEmailTarget = email;
  resetOtp = Math.floor(100000 + Math.random()*900000).toString();
  $('resetOtpDemo').innerText = 'Reset OTP (demo): ' + resetOtp;
  $('forgotStep2').classList.remove('hidden'); $('forgotMsg').innerText='Reset OTP sent (demo).';
  if(resetOtpTimeout) clearTimeout(resetOtpTimeout);
  resetOtpTimeout = setTimeout(()=>{ resetOtp=null; $('forgotMsg').innerText='Reset OTP expired.'; $('resetOtpDemo').innerText='(OTP expired)'; }, 5*60*1000);
});
$('verifyResetOtpBtn').addEventListener('click', ()=>{
  const entered = $('resetOtpInput').value.trim();
  if(!resetOtp){ $('forgotMsg').innerText='No reset OTP requested or expired.'; return; }
  if(entered === resetOtp){ $('forgotMsg').innerText='OTP verified — set new password.'; $('newPassword').classList.remove('hidden'); $('newPassword2').classList.remove('hidden'); $('completeResetBtn').classList.remove('hidden'); resetOtp=null; if(resetOtpTimeout) clearTimeout(resetOtpTimeout); $('resetOtpDemo').innerText='(OTP verified)'; } else { $('forgotMsg').innerText='Incorrect reset OTP.'; }
});
$('completeResetBtn').addEventListener('click', ()=>{
  const p1 = $('newPassword').value, p2 = $('newPassword2').value;
  if(!resetEmailTarget){ $('forgotMsg').innerText='No target email — start again.'; return; }
  if(p1.length < 4){ $('forgotMsg').innerText='Password must be at least 4 characters.'; return; }
  if(p1 !== p2){ $('forgotMsg').innerText='Passwords do not match.'; return; }
  const users = loadLocal('users') || []; const idx = users.findIndex(u=>u.email===resetEmailTarget);
  if(idx === -1){ $('forgotMsg').innerText='User not found.'; return; }
  users[idx].password = p1; saveLocal('users', users);
  $('forgotMsg').innerText = 'Password updated. You may now login.';
  // reset UI
  $('forgotEmail').value=''; $('resetOtpInput').value=''; $('newPassword').value=''; $('newPassword2').value=''; $('newPassword').classList.add('hidden'); $('newPassword2').classList.add('hidden'); $('completeResetBtn').classList.add('hidden'); $('forgotStep2').classList.add('hidden'); resetEmailTarget=null;
});

/* ---------------- Logout ---------------- */
$('logoutBtn').addEventListener('click', ()=>{ sessionStorage.removeItem('sessionUser'); location.reload(); });

/* ---------------- Enroll (save to Firestore so admin sees it across devices) ---------------- */
async function enrollCourse(courseId){
  const s = sessionStorage.getItem('sessionUser');
  if(!s){ alert('Please login to enroll.'); show('login'); return; }
  const user = JSON.parse(s);
  const enrollment = {
    studentId: user.id,
    studentName: user.name,
    studentEmail: user.email,
    courseId,
    courseTitle: (COURSES.find(c=>c.id===courseId)||{title:'Unknown'}).title,
    created: now()
  };

  // Save to Firestore
  if(db){
    try{
      const docRef = await db.collection('enrollments').add(enrollment);
      // optional local copy
      const enrollLoc = loadLocal('enrollments'); enrollLoc.push(enrollment); saveLocal('enrollments', enrollLoc);
      alert('Enrolled successfully! Saved to cloud (id: ' + docRef.id + ').');
      loadMyEnrollments();
    } catch(err){
      console.error('Firestore enrollment write failed', err);
      alert('Enrolled locally but failed to save to cloud. Check console.');
    }
  } else {
    // fallback local only
    const enrollLoc = loadLocal('enrollments'); enrollLoc.push(enrollment); saveLocal('enrollments', enrollLoc);
    alert('Enrolled locally (no cloud).');
    loadMyEnrollments();
  }
}

/* ---------------- Student dashboard reads cloud enrollments for user ---------------- */
function openStudentDashboard(){ renderCourses(); const sp = $('studentPanel'); if(sp) sp.classList.remove('hidden'); loadMyEnrollments(); }
function loadMyEnrollments(){
  const ul = $('myEnrollments'); ul.innerHTML = '';
  const s = sessionStorage.getItem('sessionUser'); if(!s){ ul.innerHTML = '<li class="muted">Login to see enrollments.</li>'; return; }
  const user = JSON.parse(s);
  if(db){
    db.collection('enrollments').where('studentId','==', user.id).orderBy('created','desc').get().then(snapshot=>{
      if(snapshot.empty){ ul.innerHTML = '<li class="muted">No enrollments yet.</li>'; return; }
      snapshot.forEach(doc => { const e = doc.data(); const li = document.createElement('li'); li.innerText = `${e.courseTitle} — ${e.created}`; ul.appendChild(li); });
    }).catch(err=>{
      console.error('Error loading enrollments', err);
      const enrollLoc = loadLocal('enrollments').filter(e=>e.studentId===user.id);
      if(enrollLoc.length===0) ul.innerHTML = '<li class="muted">No enrollments yet.</li>';
      enrollLoc.forEach(e=>{ const li = document.createElement('li'); li.innerText = `${e.courseTitle} — ${e.created}`; ul.appendChild(li); });
    });
  } else {
    const enrollLoc = loadLocal('enrollments').filter(e=>e.studentId===user.id);
    if(enrollLoc.length===0) ul.innerHTML = '<li class="muted">No enrollments yet.</li>';
    enrollLoc.forEach(e=>{ const li = document.createElement('li'); li.innerText = `${e.courseTitle} — ${e.created}`; ul.appendChild(li); });
  }
}

/* ---------------- Admin realtime listeners: enrollments & users ---------------- */
let unsubscribeEnrollments = null;
let unsubscribeUsers = null;

$('adminLoginBtn').addEventListener('click', ()=>{
  if($('adminPass').value === 'admin123'){
    $('adminLoginArea').classList.add('hidden');
    $('adminPanel').classList.remove('hidden');
    subscribeAdminEnrollments();
    subscribeAdminUsers();
  } else alert('Wrong admin password.');
});

$('adminLogout').addEventListener('click', ()=>{
  $('adminPanel').classList.add('hidden');
  $('adminLoginArea').classList.remove('hidden');
  // unsubscribe realtime listeners
  if(typeof unsubscribeEnrollments === 'function') unsubscribeEnrollments();
  if(typeof unsubscribeUsers === 'function') unsubscribeUsers();
});

function subscribeAdminEnrollments(){
  const tbody = document.querySelector('#enrollTable tbody');
  tbody.innerHTML = '<tr><td colspan="4" class="muted">Loading enrollments...</td></tr>';
  if(!db){ tbody.innerHTML = '<tr><td colspan="4" class="muted">No cloud DB.</td></tr>'; return; }

  if(typeof unsubscribeEnrollments === 'function') unsubscribeEnrollments();
  unsubscribeEnrollments = db.collection('enrollments').orderBy('created','desc')
    .onSnapshot(snapshot=>{
      tbody.innerHTML = '';
      if(snapshot.empty){ tbody.innerHTML = '<tr><td colspan="4" class="muted">No enrollments yet.</td></tr>'; return; }
      snapshot.forEach(doc=>{
        const e = doc.data();
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${e.studentName}</td><td>${e.studentEmail}</td><td>${e.courseTitle}</td><td>${e.created}</td>`;
        tbody.appendChild(tr);
      });
    }, err=> {
      console.error('Enrollments onSnapshot error', err);
      tbody.innerHTML = '<tr><td colspan="4" class="muted">Unable to load enrollments (check console).</td></tr>';
    });
}

function subscribeAdminUsers(){
  const tbody = document.querySelector('#usersTable tbody');
  tbody.innerHTML = '<tr><td colspan="4" class="muted">Loading users...</td></tr>';
  if(!db){ tbody.innerHTML = '<tr><td colspan="4" class="muted">No cloud DB.</td></tr>'; return; }

  if(typeof unsubscribeUsers === 'function') unsubscribeUsers();
  unsubscribeUsers = db.collection('users').orderBy('created','desc')
    .onSnapshot(snapshot=>{
      tbody.innerHTML = '';
      if(snapshot.empty){ tbody.innerHTML = '<tr><td colspan="4" class="muted">No users registered yet.</td></tr>'; return; }
      snapshot.forEach(doc=>{
        const u = doc.data();
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${u.name || ''}</td><td>${u.email || ''}</td><td>${u.phone || ''}</td><td>${u.created || ''}</td>`;
        tbody.appendChild(tr);
      });
    }, err=>{
      console.error('Users onSnapshot error', err);
      tbody.innerHTML = '<tr><td colspan="4" class="muted">Unable to load users (check console).</td></tr>';
    });
}
