import { supabase } from './supabase.js';

// Elements
const messageEl = document.getElementById('message');
const loginTab = document.getElementById('loginTab');
const signupTab = document.getElementById('signupTab');
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const dashboardContent = document.getElementById('content');
const pageTitle = document.getElementById('pageTitle');
const userNameEl = document.getElementById('userName');
const themeToggleBtn = document.getElementById('themeToggle');
const logoutBtn = document.getElementById('logoutBtn');
const sidebarToggle = document.getElementById('sidebarToggle');
const sidebar = document.getElementById('sidebar');

// Teacher Elements
const teacherDashboardSection = document.getElementById('teacherDashboard');
const totalStudentsCountEl = document.getElementById('totalStudentsCount');
const presentCountEl = document.getElementById('presentCount');
const absentCountEl = document.getElementById('absentCount');
const lateCountEl = document.getElementById('lateCount');
const teacherStudentsSection = document.getElementById('teacherStudents');
const studentsTableBody = document.getElementById('studentsTableBody');
const attendanceDateInput = document.getElementById('attendanceDate');
const bulkMarkPresentBtn = document.getElementById('bulkMarkPresent');
const teacherReportsSection = document.getElementById('teacherReports');
const teacherAddStudentSection = document.getElementById('teacherAddStudent');
const addStudentForm = document.getElementById('addStudentForm');
const addStudentMessageEl = document.getElementById('addStudentMessage');
const exportCsvBtn = document.getElementById('exportCsvBtn');
const exportPdfBtn = document = document.getElementById('exportPdfBtn');

// Student Elements
const studentDashboardSection = document.getElementById('studentDashboard');
const studentAttendancePercentageEl = document.getElementById('studentAttendancePercentage');
const studentAttendanceChartCtx = document.getElementById('studentAttendanceChart');

let allStudents = [];
let allAttendance = [];

// --- UI Logic ---
function showMessage(text, isError = false) {
    messageEl.textContent = text;
    messageEl.className = `text-center mt-4 text-sm font-medium ${isError ? 'text-red-500' : 'text-green-500'}`;
}

function setActiveTab(tab) {
    if (tab === 'login') {
        loginTab.className = 'py-2 px-6 font-semibold rounded-full focus:outline-none transition-all duration-300 bg-blue-500 text-white shadow-md';
        signupTab.className = 'py-2 px-6 font-semibold rounded-full focus:outline-none transition-all duration-300 hover:bg-gray-200 dark:hover:bg-gray-700';
        loginForm.classList.remove('hidden');
        signupForm.classList.add('hidden');
    } else {
        signupTab.className = 'py-2 px-6 font-semibold rounded-full focus:outline-none transition-all duration-300 bg-blue-500 text-white shadow-md';
        loginTab.className = 'py-2 px-6 font-semibold rounded-full focus:outline-none transition-all duration-300 hover:bg-gray-200 dark:hover:bg-gray-700';
        signupForm.classList.remove('hidden');
        loginForm.classList.add('hidden');
    }
}

function handleNavigation() {
    const hash = window.location.hash || '#dashboard';
    const sections = dashboardContent.querySelectorAll('section');
    sections.forEach(section => section.classList.add('hidden'));

    const targetSection = document.querySelector(hash);
    if (targetSection) {
        targetSection.classList.remove('hidden');
        pageTitle.textContent = hash.substring(1).split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    }
}

function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    document.body.classList.toggle('light-mode');
    localStorage.setItem('theme', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
}

function applyTheme() {
    const theme = localStorage.getItem('theme') || 'light';
    if (theme === 'dark') {
        document.body.classList.add('dark-mode');
        document.body.classList.remove('light-mode');
    } else {
        document.body.classList.add('light-mode');
        document.body.classList.remove('dark-mode');
    }
}

// --- Authentication ---
async function handleLogin(event) {
    event.preventDefault();
    const email = loginEmail.value;
    const password = loginPassword.value;

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
        showMessage(error.message, true);
    }
}

async function handleSignup(event) {
    event.preventDefault();
    const email = signupEmail.value;
    const password = signupPassword.value;
    const name = signupName.value;
    const role = signupRole.value;

    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
        showMessage(error.message, true);
        return;
    }

    const { error: profileError } = await supabase.from('profiles').insert({
        id: data.user.id,
        role,
        name,
        roll_no: role === 'student' ? 'N/A' : null,
        class: role === 'teacher' ? 'N/A' : null,
        contact: null
    });

    if (profileError) {
        showMessage(profileError.message, true);
        return;
    }
    showMessage("Signup successful! Please check your email for confirmation.");
}

async function handleLogout() {
    await supabase.auth.signOut();
}

// --- Data Fetching and UI Rendering ---
async function fetchProfilesAndRenderDashboard() {
    const { data: { user } } = await supabase.auth.getSession();
    if (!user) {
        window.location.href = 'index.html';
        return;
    }

    const { data: profile, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    if (error || !profile) {
        window.location.href = 'index.html';
        return;
    }
    
    userNameEl.textContent = profile.name;
    const isTeacher = profile.role === 'teacher';

    const teacherLinks = document.querySelectorAll('.teacher-only');
    if (!isTeacher) {
        teacherLinks.forEach(link => link.classList.add('hidden'));
    }

    if (isTeacher) {
        await fetchTeacherData();
    } else {
        await fetchStudentData(user.id);
    }
    handleNavigation();
}

async function fetchTeacherData() {
    teacherDashboardSection.classList.remove('hidden');
    teacherStudentsSection.classList.remove('hidden');
    teacherReportsSection.classList.remove('hidden');
    teacherAddStudentSection.classList.remove('hidden');
    studentDashboardSection.classList.add('hidden');

    const { data: students, error: studentsError } = await supabase.from('profiles').select('*').eq('role', 'student');
    const { data: attendance, error: attendanceError } = await supabase.from('attendance').select('*').eq('date', new Date().toISOString().split('T')[0]);
    
    if (studentsError || attendanceError) {
        console.error(studentsError || attendanceError);
        return;
    }
    
    allStudents = students;
    allAttendance = attendance;
    
    // Dashboard Stats
    totalStudentsCountEl.textContent = allStudents.length;
    presentCountEl.textContent = attendance.filter(a => a.status === 'Present').length;
    absentCountEl.textContent = attendance.filter(a => a.status === 'Absent').length;
    lateCountEl.textContent = attendance.filter(a => a.status === 'Late').length;

    renderStudentsTable(allStudents, attendance);
}

function renderStudentsTable(students, attendanceToday) {
    studentsTableBody.innerHTML = '';
    students.forEach(student => {
        const attendance = attendanceToday.find(a => a.student_id === student.id);
        const status = attendance ? attendance.status : 'Not Marked';

        const row = document.createElement('tr');
        row.className = "hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200";
        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap">${student.name}</td>
            <td class="px-6 py-4 whitespace-nowrap">${student.roll_no}</td>
            <td class="px-6 py-4 whitespace-nowrap">${student.class}</td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex space-x-2">
                    <button data-id="${student.id}" data-status="Present" class="mark-btn bg-green-500 text-white rounded-full px-4 py-1 text-xs">✔ Present</button>
                    <button data-id="${student.id}" data-status="Absent" class="mark-btn bg-red-500 text-white rounded-full px-4 py-1 text-xs">❌ Absent</button>
                    <button data-id="${student.id}" data-status="Late" class="mark-btn bg-yellow-500 text-white rounded-full px-4 py-1 text-xs">⏰ Late</button>
                </div>
                <span class="status-badge mt-2 inline-block rounded-full px-3 py-1 text-xs font-semibold ${status === 'Present' ? 'bg-green-100 text-green-800' : status === 'Absent' ? 'bg-red-100 text-red-800' : status === 'Late' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}">${status}</span>
            </td>
        `;
        studentsTableBody.appendChild(row);
    });
}

async function fetchStudentData(userId) {
    studentDashboardSection.classList.remove('hidden');
    teacherDashboardSection.classList.add('hidden');
    teacherStudentsSection.classList.add('hidden');
    teacherReportsSection.classList.add('hidden');
    teacherAddStudentSection.classList.add('hidden');

    const { data: attendance, error } = await supabase.from('attendance').select('*').eq('student_id', userId);
    if (error) {
        console.error(error);
        return;
    }

    const totalDays = attendance.length;
    const presentDays = attendance.filter(a => a.status === 'Present').length;
    const percentage = totalDays > 0 ? (presentDays / totalDays * 100).toFixed(2) : 0;
    studentAttendancePercentageEl.textContent = `${percentage}%`;

    renderStudentChart(attendance);
}

function renderStudentChart(attendance) {
    const dates = attendance.map(a => new Date(a.date).toLocaleDateString());
    const data = attendance.map(a => {
        if (a.status === 'Present') return 1;
        if (a.status === 'Late') return 0.5;
        return 0;
    });

    new Chart(studentAttendanceChartCtx, {
        type: 'bar',
        data: {
            labels: dates,
            datasets: [{
                label: 'Attendance',
                data: data,
                backgroundColor: [
                    'rgba(75, 192, 192, 0.6)',
                    'rgba(255, 99, 132, 0.6)',
                    'rgba(255, 206, 86, 0.6)'
                ],
                borderColor: [
                    'rgba(75, 192, 192, 1)',
                    'rgba(255, 99, 132, 1)',
                    'rgba(255, 206, 86, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true,
                    max: 1.1
                }
            }
        }
    });
}

// --- Event Handlers ---
loginTab.addEventListener('click', () => setActiveTab('login'));
signupTab.addEventListener('click', () => setActiveTab('signup'));
loginForm.addEventListener('submit', handleLogin);
signupForm.addEventListener('submit', handleSignup);
logoutBtn.addEventListener('click', handleLogout);
window.addEventListener('hashchange', handleNavigation);
sidebarToggle.addEventListener('click', () => {
    sidebar.classList.toggle('-translate-x-full');
});
themeToggleBtn.addEventListener('click', toggleTheme);

window.onload = () => {
    applyTheme();
    const { data: { session } } = supabase.auth.getSession();
    if (session) {
        window.location.href = 'dashboard.html';
    }
};

supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN') {
        window.location.href = 'dashboard.html';
    } else if (event === 'SIGNED_OUT') {
        window.location.href = 'index.html';
    }
});

// Load dashboard data on dashboard page load
if (window.location.pathname.includes('dashboard.html')) {
    fetchProfilesAndRenderDashboard();
}

// Teacher Functionality
attendanceDateInput.valueAsDate = new Date();

studentsTableBody.addEventListener('click', async (event) => {
    if (event.target.classList.contains('mark-btn')) {
        const studentId = event.target.dataset.id;
        const status = event.target.dataset.status;
        const date = attendanceDateInput.value;
        const { data: { user } } = await supabase.auth.getSession();

        const { error } = await supabase.from('attendance').upsert({
            student_id: studentId,
            date: date,
            status: status,
            marked_by: user.id
        });

        if (error) {
            console.error(error);
        } else {
            fetchTeacherData(); // Re-fetch data to update UI
        }
    }
});

bulkMarkPresentBtn.addEventListener('click', async () => {
    const date = attendanceDateInput.value;
    const { data: { user } } = await supabase.auth.getSession();

    const attendanceRecords = allStudents.map(student => ({
        student_id: student.id,
        date: date,
        status: 'Present',
        marked_by: user.id
    }));

    const { error } = await supabase.from('attendance').upsert(attendanceRecords);

    if (error) {
        console.error(error);
    } else {
        fetchTeacherData();
    }
});

addStudentForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const name = document.getElementById('newStudentName').value;
    const email = document.getElementById('newStudentEmail').value;
    const rollNo = document.getElementById('newStudentRollNo').value;
    const studentClass = document.getElementById('newStudentClass').value;
    const contact = document.getElementById('newStudentContact').value;

    const { data: { user }, error: authError } = await supabase.auth.signUp({ email, password: Math.random().toString(36).slice(-8) });

    if (authError) {
        addStudentMessageEl.textContent = authError.message;
        addStudentMessageEl.className = "text-red-500";
        return;
    }

    const { error: profileError } = await supabase.from('profiles').insert({
        id: user.id,
        role: 'student',
        name,
        roll_no: rollNo,
        class: studentClass,
        contact
    });

    if (profileError) {
        addStudentMessageEl.textContent = profileError.message;
        addStudentMessageEl.className = "text-red-500";
        return;
    }
    addStudentMessageEl.textContent = "Student added successfully! A temporary password has been sent to their email.";
    addStudentMessageEl.className = "text-green-500";
    addStudentForm.reset();
    fetchTeacherData();
});

// Reports functionality (placeholders for now)
function createReports() {
    // This is a placeholder. You would fetch and process data here.
    const weeklyData = {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
        datasets: [{
            label: 'Attendance %',
            data: [95, 90, 85, 92, 98],
            backgroundColor: 'rgba(54, 162, 235, 0.2)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1
        }]
    };
    new Chart(document.getElementById('weeklyAttendanceChart'), {
        type: 'bar',
        data: weeklyData,
        options: { responsive: true }
    });
    // Repeat for monthly chart
}

// Call reports function when the page loads or when the reports section is active
window.addEventListener('hashchange', () => {
    if (window.location.hash === '#reports') {
        createReports();
    }
});