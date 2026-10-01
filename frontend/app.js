const pageTitles = { dashboard: 'Ringkasan', employees: 'Pegawai', attendance: 'Kehadiran', payroll: 'Penggajian' };
const state = { employees: [], departments: [], payrolls: [], attendance: [] };
const rupiah = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });
const dateFormat = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
const supabaseUrl = 'https://vagxesnkbbazirhwdiqe.supabase.co';
const supabasePublishableKey = 'sb_publishable_UygSBbwxPHByq2aER30VVA__biR3qUW';
const getRoutes = {
  departments: 'departments?select=id,name&order=name.asc',
  employees: 'employees?select=id,employee_code,full_name,position,base_salary,departments(name)&is_active=eq.true&order=full_name.asc',
  attendance: 'attendance_records?select=id,attendance_date,status,employees(full_name,employee_code)&order=attendance_date.desc&limit=100',
  payrolls: 'payrolls?select=id,period_start,period_end,base_salary,allowance,deductions,net_salary,employees(full_name,employee_code)&order=created_at.desc&limit=100',
};
async function databaseRequest(resource, options = {}) {
  const response = await fetch(`${supabaseUrl}/rest/v1/${resource}`, {
    method: options.method || 'GET',
    headers: { apikey: supabasePublishableKey, Authorization: `Bearer ${supabasePublishableKey}`, 'Content-Type': 'application/json', ...(options.method === 'POST' ? { Prefer: 'return=representation' } : {}) },
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(data?.message || data?.details || 'Supabase menolak permintaan.');
  return data;
}
const api = async (path, options = {}) => {
  if (path === 'summary') {
    await databaseRequest('employees?select=id&is_active=eq.true&limit=1');
    return { message: 'Data diperbarui dari basis data.' };
  }
  if (!options.method) return databaseRequest(getRoutes[path]);
  const body = { ...options.body };
  if (path === 'payrolls') {
    const employees = await databaseRequest(`employees?select=id,base_salary&id=eq.${encodeURIComponent(body.employee_id)}&is_active=eq.true`);
    if (!employees.length) throw new Error('Pegawai tidak ditemukan atau sudah nonaktif.');
    body.base_salary = employees[0].base_salary;
  }
  return databaseRequest(path === 'attendance' ? 'attendance_records' : path, { ...options, body });
};
const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const formatDate = (value) => value ? dateFormat.format(new Date(`${value}T00:00:00`)) : '—';
const getInitials = (name = '') => name.trim().split(/\s+/).slice(0, 2).map((part) => part[0] || '').join('').toUpperCase();
const statusNames = { present: 'Hadir', sick: 'Sakit', leave: 'Izin', absent: 'Tidak hadir' };

function showToast(message) {
  const toast = document.querySelector('#toast');
  toast.textContent = message;
  toast.classList.add('is-visible');
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove('is-visible'), 3200);
}
function setTableMessage(id, message, columns) {
  document.querySelector(`#${id}`).innerHTML = `<tr><td class="empty-cell" colspan="${columns}">${escapeHtml(message)}</td></tr>`;
}
function renderEmployees(filter = '') {
  const rows = state.employees.filter((employee) => `${employee.employee_code} ${employee.full_name} ${employee.position} ${employee.departments?.name || ''}`.toLowerCase().includes(filter.toLowerCase()));
  document.querySelector('#employee-count').textContent = `${state.employees.length} pegawai terdaftar`;
  document.querySelector('#employees-body').innerHTML = rows.length ? rows.map((employee) => `<tr><td>${escapeHtml(employee.employee_code)}</td><td><span class="person-cell"><span class="person-initial">${escapeHtml(getInitials(employee.full_name))}</span><span class="person-name">${escapeHtml(employee.full_name)}</span></span></td><td>${escapeHtml(employee.departments?.name || '—')}</td><td>${escapeHtml(employee.position)}</td><td>${rupiah.format(employee.base_salary)}</td></tr>`).join('') : `<tr><td class="empty-cell" colspan="5">${filter ? 'Pegawai tidak ditemukan.' : 'Belum ada data pegawai.'}</td></tr>`;
}
function renderAttendance() {
  document.querySelector('#attendance-body').innerHTML = state.attendance.length ? state.attendance.map((item) => `<tr><td>${formatDate(item.attendance_date)}</td><td class="person-name">${escapeHtml(item.employees?.full_name || 'Pegawai')}</td><td>${escapeHtml(item.employees?.employee_code || '—')}</td><td><span class="status-pill status-${escapeHtml(item.status)}">${statusNames[item.status] || '—'}</span></td></tr>`).join('') : '<tr><td class="empty-cell" colspan="4">Belum ada catatan kehadiran.</td></tr>';
}
function renderPayrolls() {
  const rows = state.payrolls;
  document.querySelector('#payroll-body').innerHTML = rows.length ? rows.map((item) => `<tr><td><span class="person-cell"><span class="person-initial">${escapeHtml(getInitials(item.employees?.full_name))}</span><span><span class="person-name">${escapeHtml(item.employees?.full_name || 'Pegawai')}</span><small class="sub-cell">${escapeHtml(item.employees?.employee_code || '')}</small></span></span></td><td>${formatDate(item.period_start)} – ${formatDate(item.period_end)}</td><td>${rupiah.format(item.base_salary)}</td><td>${rupiah.format(item.allowance)}</td><td>${rupiah.format(item.deductions)}</td><td class="person-name">${rupiah.format(item.net_salary)}</td></tr>`).join('') : '<tr><td class="empty-cell" colspan="6">Belum ada data penggajian.</td></tr>';
  document.querySelector('#recent-payroll-body').innerHTML = rows.length ? rows.slice(0, 5).map((item) => `<tr><td><span class="person-cell"><span class="person-initial">${escapeHtml(getInitials(item.employees?.full_name))}</span><span><span class="person-name">${escapeHtml(item.employees?.full_name || 'Pegawai')}</span><small class="sub-cell">${escapeHtml(item.employees?.employee_code || '')}</small></span></span></td><td>${formatDate(item.period_start)} – ${formatDate(item.period_end)}</td><td class="person-name">${rupiah.format(item.net_salary)}</td><td><span class="status-pill">Tersimpan</span></td></tr>`).join('') : '<tr><td class="empty-cell" colspan="4">Belum ada data penggajian.</td></tr>';
}
function renderDashboard() {
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().slice(0, 10);
  const periodPayrolls = state.payrolls.filter((item) => item.period_start <= monthEnd && item.period_end >= monthStart);
  const attendanceCount = state.attendance.filter((item) => item.attendance_date >= monthStart && item.attendance_date <= monthEnd).length;
  document.querySelector('#metric-employees').textContent = state.employees.length;
  document.querySelector('#metric-payroll').textContent = rupiah.format(periodPayrolls.reduce((total, item) => total + Number(item.net_salary), 0));
  document.querySelector('#metric-period').textContent = periodPayrolls.length ? `${periodPayrolls.length} slip gaji periode ini` : 'belum ada penggajian bulan ini';
  document.querySelector('#metric-attendance').textContent = attendanceCount;
}
function populateDepartmentSelect(emptyMessage = 'Belum ada unit kerja. Jalankan backend/schema.sql.') {
  const select = document.querySelector('#department-select');
  const options = state.departments.map((department) => `<option value="${escapeHtml(department.id)}">${escapeHtml(department.name)}</option>`).join('');
  select.innerHTML = options ? `<option value="">Pilih unit kerja</option>${options}` : `<option value="">${escapeHtml(emptyMessage)}</option>`;
  select.disabled = state.departments.length === 0;
}
function populateEmployeeSelects() {
  const options = state.employees.map((employee) => `<option value="${escapeHtml(employee.id)}">${escapeHtml(employee.employee_code)} · ${escapeHtml(employee.full_name)}</option>`).join('');
  document.querySelectorAll('.employee-select').forEach((select) => { select.innerHTML = `<option value="">Pilih pegawai</option>${options}`; });
  populateDepartmentSelect();
}
async function refreshData() {
  try {
    state.departments = await api('departments');
    populateDepartmentSelect();
  } catch {
    state.departments = [];
    populateDepartmentSelect('Gagal memuat unit kerja. Periksa koneksi dan kebijakan Supabase.');
  }
  try {
    const [summary, employees, attendance, payrolls] = await Promise.all([api('summary'), api('employees'), api('attendance'), api('payrolls')]);
    state.employees = employees; state.attendance = attendance; state.payrolls = payrolls;
    renderEmployees(document.querySelector('#employee-search').value); renderAttendance(); renderPayrolls(); renderDashboard(); populateEmployeeSelects();
    document.querySelector('#dashboard-note').textContent = summary.message || 'Data diperbarui dari basis data.';
  } catch (error) {
    document.querySelector('#dashboard-note').textContent = `Koneksi data belum tersedia: ${error.message}`;
    [['employees-body', 5], ['attendance-body', 4], ['payroll-body', 6], ['recent-payroll-body', 4]].forEach(([id, count]) => setTableMessage(id, 'Gagal memuat data. Periksa koneksi dan kebijakan Supabase.', count));
    ['metric-employees', 'metric-payroll', 'metric-attendance'].forEach((id) => { document.querySelector(`#${id}`).textContent = '—'; });
  }
}
function showPage(pageName) {
  document.querySelectorAll('.page').forEach((page) => { const visible = page.id === `page-${pageName}`; page.hidden = !visible; page.classList.toggle('is-visible', visible); });
  document.querySelectorAll('.nav-link').forEach((link) => link.classList.toggle('is-active', link.dataset.page === pageName));
  document.querySelector('#breadcrumb-current').textContent = pageTitles[pageName];
  history.replaceState(null, '', `#${pageName}`);
}
function setupForm(formId, dialogId, errorId, endpoint) {
  const form = document.querySelector(`#${formId}`);
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const error = document.querySelector(`#${errorId}`); error.textContent = '';
    const submit = form.querySelector('[type="submit"]'); submit.disabled = true;
    try {
      const body = Object.fromEntries(new FormData(form));
      ['base_salary', 'allowance', 'deductions'].forEach((key) => { if (body[key] !== undefined) body[key] = Number(body[key]); });
      await api(endpoint, { method: 'POST', body });
      document.querySelector(`#${dialogId}`).close(); form.reset(); showToast('Data berhasil disimpan.'); await refreshData();
    } catch (submitError) { error.textContent = submitError.message; }
    finally { submit.disabled = false; }
  });
}
document.querySelectorAll('.nav-link').forEach((link) => link.addEventListener('click', () => showPage(link.dataset.page)));
document.querySelectorAll('[data-go]').forEach((button) => button.addEventListener('click', () => showPage(button.dataset.go)));
document.querySelectorAll('[data-close]').forEach((button) => button.addEventListener('click', () => button.closest('dialog').close()));
document.querySelector('#employee-search').addEventListener('input', (event) => renderEmployees(event.target.value));
document.querySelector('#add-employee-button').addEventListener('click', () => document.querySelector('#employee-dialog').showModal());
document.querySelector('#add-attendance-button').addEventListener('click', () => { document.querySelector('#attendance-form').elements.attendance_date.value = new Date().toISOString().slice(0, 10); document.querySelector('#attendance-dialog').showModal(); });
document.querySelector('#add-payroll-button').addEventListener('click', () => document.querySelector('#payroll-dialog').showModal());
document.querySelectorAll('dialog').forEach((dialog) => dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); }));
setupForm('employee-form', 'employee-dialog', 'employee-error', 'employees');
setupForm('attendance-form', 'attendance-dialog', 'attendance-error', 'attendance');
setupForm('payroll-form', 'payroll-dialog', 'payroll-error', 'payrolls');
document.querySelector('#today-label').textContent = new Intl.DateTimeFormat('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).format(new Date());
const initialPage = location.hash.slice(1);
showPage(pageTitles[initialPage] ? initialPage : 'dashboard');
refreshData();