const STORAGE_KEYS = {
  url: 'cgh_supabase_url',
  key: 'cgh_supabase_key',
};

const REQUIRED_SPECIALIZATIONS = ['Ton', 'Video', 'Licht'];

const state = {
  supabase: null,
  user: null,
  profile: null,
  plans: [],
  sundays: [],
  technicians: [],
  availability: [],
  assignments: [],
};

const els = {
  url: document.getElementById('supabase-url'),
  key: document.getElementById('supabase-key'),
  saveSupabase: document.getElementById('save-supabase'),
  clearSupabase: document.getElementById('clear-supabase'),
  email: document.getElementById('auth-email'),
  password: document.getElementById('auth-password'),
  login: document.getElementById('login-btn'),
  register: document.getElementById('register-btn'),
  logout: document.getElementById('logout-btn'),
  userInfo: document.getElementById('user-info'),
  tabs: document.getElementById('app-tabs'),
  tabButtons: [...document.querySelectorAll('.tab-btn')],
  tabAdmin: document.getElementById('admin'),
  tabTech: document.getElementById('tech'),
  toast: document.getElementById('toast'),
  kpiTechs: document.getElementById('kpi-techs'),
  kpiSundays: document.getElementById('kpi-sundays'),
  kpiAssigned: document.getElementById('kpi-assigned'),
  planStart: document.getElementById('plan-start'),
  planCount: document.getElementById('plan-count'),
  planTime: document.getElementById('plan-time'),
  createPlan: document.getElementById('create-plan'),
  publishPlan: document.getElementById('publish-plan'),
  deletePlan: document.getElementById('delete-plan'),
  planStatus: document.getElementById('plan-status'),
  newTechName: document.getElementById('new-tech-name'),
  newTechEmail: document.getElementById('new-tech-email'),
  newTechSpec: document.getElementById('new-tech-spec'),
  newTechRole: document.getElementById('new-tech-role'),
  addTech: document.getElementById('add-tech'),
  techTable: document.getElementById('tech-table'),
  autoAssign: document.getElementById('auto-assign'),
  adminSchedule: document.getElementById('admin-schedule'),
  myAvailability: document.getElementById('my-availability'),
  myAssignments: document.getElementById('my-assignments'),
  exportICS: document.getElementById('export-ics'),
  exportCSV: document.getElementById('export-csv'),
};

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.remove('hidden');
  setTimeout(() => els.toast.classList.add('hidden'), 2200);
}

function getStoredSupabaseConfig() {
  return {
    url: localStorage.getItem(STORAGE_KEYS.url) || '',
    key: localStorage.getItem(STORAGE_KEYS.key) || '',
  };
}

function setStoredSupabaseConfig(url, key) {
  localStorage.setItem(STORAGE_KEYS.url, url);
  localStorage.setItem(STORAGE_KEYS.key, key);
}

function clearStoredSupabaseConfig() {
  localStorage.removeItem(STORAGE_KEYS.url);
  localStorage.removeItem(STORAGE_KEYS.key);
}

function initSupabase(url, key) {
  if (!url || !key) return false;
  state.supabase = window.supabase.createClient(url, key);
  return true;
}

function isAdmin() {
  return state.profile?.role === 'admin';
}

function formatDate(dateISO) {
  return new Date(`${dateISO}T00:00:00`).toLocaleDateString('de-DE', {
    weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric'
  });
}

function setTab(tab) {
  els.tabButtons.forEach((btn) => btn.classList.toggle('active', btn.dataset.tab === tab));
  els.tabAdmin.classList.toggle('hidden', tab !== 'admin');
  els.tabTech.classList.toggle('hidden', tab !== 'tech');
}

async function upsertOwnProfile(name, role = 'technician', specialization = 'Kombi') {
  const payload = {
    id: state.user.id,
    email: state.user.email,
    name: name || state.user.email,
    role,
    specialization,
  };
  const { error } = await state.supabase.from('profiles').upsert(payload, { onConflict: 'id' });
  if (error) throw error;
}

async function loadData() {
  const [profilesRes, plansRes, sundaysRes, availabilityRes, assignmentsRes] = await Promise.all([
    state.supabase.from('profiles').select('*').order('name'),
    state.supabase.from('plans').select('*').order('created_at', { ascending: false }),
    state.supabase.from('plan_sundays').select('*').order('date'),
    state.supabase.from('availability').select('*'),
    state.supabase.from('assignments').select('*'),
  ]);
  [profilesRes, plansRes, sundaysRes, availabilityRes, assignmentsRes].forEach((res) => {
    if (res.error) throw res.error;
  });
  state.technicians = profilesRes.data || [];
  state.plans = plansRes.data || [];
  state.sundays = sundaysRes.data || [];
  state.availability = availabilityRes.data || [];
  state.assignments = assignmentsRes.data || [];
}

function getCurrentPlan() {
  return state.plans[0] || null;
}

function renderAuthState() {
  if (!state.user) {
    els.userInfo.textContent = 'Nicht angemeldet.';
    els.logout.classList.add('hidden');
    els.tabs.classList.add('hidden');
    els.tabAdmin.classList.add('hidden');
    els.tabTech.classList.add('hidden');
    return;
  }
  els.userInfo.textContent = `Angemeldet als ${state.user.email} (${state.profile?.role || 'technician'})`;
  els.logout.classList.remove('hidden');
  els.tabs.classList.remove('hidden');
  els.tabAdmin.classList.toggle('hidden', !isAdmin());
  setTab(isAdmin() ? 'admin' : 'tech');
}

function renderKPI() {
  els.kpiTechs.textContent = `${state.technicians.filter((t) => t.role === 'technician').length}`;
  els.kpiSundays.textContent = `${state.sundays.length}`;
  els.kpiAssigned.textContent = `${state.assignments.length}`;
  const plan = getCurrentPlan();
  els.planStatus.textContent = plan ? (plan.status === 'published' ? 'Freigegeben' : 'Entwurf') : 'Kein Plan';
}

function renderTechnicianTable() {
  if (!isAdmin()) return;
  els.techTable.innerHTML = '';
  state.technicians.forEach((tech) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${tech.name || '-'}</td>
      <td>${tech.email}</td>
      <td>${tech.specialization || '-'}</td>
      <td>${tech.role}</td>
      <td>${tech.role === 'admin' ? '-' : `<button data-delete-tech="${tech.id}" class="danger">Löschen</button>`}</td>
    `;
    els.techTable.appendChild(tr);
  });
}

function renderAdminSchedule() {
  if (!isAdmin()) return;
  els.adminSchedule.innerHTML = '';
  state.sundays.forEach((sun) => {
    const row = document.createElement('article');
    row.className = 'row';
    const av = state.availability.filter((a) => a.sunday_id === sun.id);
    const as = state.assignments.filter((a) => a.sunday_id === sun.id);
    row.innerHTML = `
      <h4>${formatDate(sun.date)}</h4>
      <p class="muted">Verfügbar: ${av.filter((x) => x.status === 'green').length} grün, ${av.filter((x) => x.status === 'yellow').length} gelb, ${av.filter((x) => x.status === 'red').length} rot</p>
      <div>${as.length ? as.map((a) => {
        const tech = state.technicians.find((t) => t.id === a.profile_id);
        return `<span class="badge role">${a.role_label}</span> ${tech?.name || a.profile_id}`;
      }).join('<br/>') : '<span class="muted">Keine Zuweisung</span>'}</div>
    `;
    els.adminSchedule.appendChild(row);
  });
}

function renderTechnicianView() {
  if (!state.user) return;
  const plan = getCurrentPlan();
  els.myAvailability.innerHTML = '';
  state.sundays.forEach((sun) => {
    const existing = state.availability.find((a) => a.sunday_id === sun.id && a.profile_id === state.user.id);
    const row = document.createElement('article');
    row.className = 'row';
    row.innerHTML = `
      <h4>${formatDate(sun.date)}</h4>
      <div class="status-buttons">
        <button class="status green" data-set-status="green" data-sunday="${sun.id}">Grün</button>
        <button class="status yellow" data-set-status="yellow" data-sunday="${sun.id}">Gelb</button>
        <button class="status red" data-set-status="red" data-sunday="${sun.id}">Rot</button>
      </div>
      <p class="muted">Aktuell: <strong>${existing?.status || 'nicht gesetzt'}</strong></p>
    `;
    els.myAvailability.appendChild(row);
  });

  els.myAssignments.innerHTML = '';
  if (plan?.status !== 'published') {
    els.myAssignments.innerHTML = '<p class="muted">Plan ist noch nicht freigegeben.</p>';
    return;
  }
  const myAssignments = state.assignments
    .filter((a) => a.profile_id === state.user.id)
    .map((a) => ({ ...a, sunday: state.sundays.find((s) => s.id === a.sunday_id) }))
    .filter((a) => a.sunday)
    .sort((a, b) => a.sunday.date.localeCompare(b.sunday.date));

  if (!myAssignments.length) {
    els.myAssignments.innerHTML = '<p class="muted">Du bist aktuell für keinen Sonntag eingeplant.</p>';
    return;
  }
  myAssignments.forEach((a) => {
    const row = document.createElement('article');
    row.className = 'row';
    row.innerHTML = `<h4>${formatDate(a.sunday.date)}</h4><span class="badge role">${a.role_label}</span>`;
    els.myAssignments.appendChild(row);
  });
}

function render() {
  renderAuthState();
  renderKPI();
  renderTechnicianTable();
  renderAdminSchedule();
  renderTechnicianView();
}

async function refreshAndRender() {
  if (!state.supabase || !state.user) return;
  await loadData();
  render();
}

async function handleLogin() {
  const email = els.email.value.trim();
  const password = els.password.value.trim();
  const { data, error } = await state.supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  state.user = data.user;
}

async function handleRegister() {
  const email = els.email.value.trim();
  const password = els.password.value.trim();
  const { data, error } = await state.supabase.auth.signUp({ email, password });
  if (error) throw error;
  state.user = data.user;
  await upsertOwnProfile(email.split('@')[0], 'technician', 'Kombi');
}

async function resolveCurrentUserProfile() {
  if (!state.user) return;
  const { data, error } = await state.supabase.from('profiles').select('*').eq('id', state.user.id).maybeSingle();
  if (error) throw error;
  if (!data) {
    await upsertOwnProfile(state.user.email?.split('@')[0]);
    const retry = await state.supabase.from('profiles').select('*').eq('id', state.user.id).single();
    if (retry.error) throw retry.error;
    state.profile = retry.data;
    return;
  }
  state.profile = data;
}

function ensureSunday(date) {
  const weekday = new Date(`${date}T00:00:00`).getDay();
  if (weekday !== 0) throw new Error('Startdatum muss ein Sonntag sein.');
}

async function createPlan() {
  const start = els.planStart.value;
  const count = Number(els.planCount.value);
  const timeBlock = els.planTime.value.trim() || '10:00-11:30';
  if (!start || !count) throw new Error('Bitte Startdatum und Anzahl setzen.');
  ensureSunday(start);

  const existingPlan = getCurrentPlan();
  if (existingPlan) {
    await state.supabase.from('assignments').delete().neq('id', 0);
    await state.supabase.from('availability').delete().neq('id', 0);
    await state.supabase.from('plan_sundays').delete().neq('id', 0);
    await state.supabase.from('plans').delete().eq('id', existingPlan.id);
  }

  const { data: planData, error: planError } = await state.supabase
    .from('plans')
    .insert({ status: 'draft' })
    .select()
    .single();
  if (planError) throw planError;

  const sundays = [];
  const base = new Date(`${start}T00:00:00`);
  for (let i = 0; i < count; i += 1) {
    const d = new Date(base);
    d.setDate(base.getDate() + i * 7);
    sundays.push({
      plan_id: planData.id,
      date: d.toISOString().slice(0, 10),
      start_time: timeBlock.split('-')[0] || '10:00',
      end_time: timeBlock.split('-')[1] || '11:30',
    });
  }
  const { error: sundayError } = await state.supabase.from('plan_sundays').insert(sundays);
  if (sundayError) throw sundayError;
}

async function publishPlan() {
  const plan = getCurrentPlan();
  if (!plan) throw new Error('Kein Plan vorhanden.');
  const { error } = await state.supabase.from('plans').update({ status: 'published' }).eq('id', plan.id);
  if (error) throw error;
}

async function deletePlan() {
  const plan = getCurrentPlan();
  if (!plan) return;
  await state.supabase.from('assignments').delete().neq('id', 0);
  await state.supabase.from('availability').delete().neq('id', 0);
  await state.supabase.from('plan_sundays').delete().eq('plan_id', plan.id);
  const { error } = await state.supabase.from('plans').delete().eq('id', plan.id);
  if (error) throw error;
}

async function addTechnician() {
  const payload = {
    name: els.newTechName.value.trim(),
    email: els.newTechEmail.value.trim(),
    specialization: els.newTechSpec.value,
    role: els.newTechRole.value,
  };
  if (!payload.name || !payload.email) throw new Error('Name und E-Mail sind Pflicht.');
  const { error } = await state.supabase.from('profiles').insert(payload);
  if (error) throw error;
}

async function deleteTechnician(profileId) {
  await state.supabase.from('assignments').delete().eq('profile_id', profileId);
  await state.supabase.from('availability').delete().eq('profile_id', profileId);
  const { error } = await state.supabase.from('profiles').delete().eq('id', profileId);
  if (error) throw error;
}

async function setAvailability(sundayId, status, profileId = state.user.id) {
  const payload = { sunday_id: sundayId, profile_id: profileId, status };
  const { error } = await state.supabase.from('availability').upsert(payload, { onConflict: 'sunday_id,profile_id' });
  if (error) throw error;
}

function pickFallback(candidates, assignedIds) {
  return candidates.find((t) => !assignedIds.has(t.id)) || null;
}

async function runAutoAssign() {
  await state.supabase.from('assignments').delete().neq('id', 0);

  const technicians = state.technicians.filter((t) => t.role === 'technician');
  for (const sun of state.sundays) {
    const green = state.availability
      .filter((a) => a.sunday_id === sun.id && a.status === 'green')
      .map((a) => technicians.find((t) => t.id === a.profile_id))
      .filter(Boolean);

    const assignments = [];
    const assignedIds = new Set();

    for (const neededSpec of REQUIRED_SPECIALIZATIONS) {
      const specialist = green.find((t) => t.specialization === neededSpec && !assignedIds.has(t.id));
      if (specialist) {
        assignments.push({ sunday_id: sun.id, profile_id: specialist.id, role_label: neededSpec });
        assignedIds.add(specialist.id);
      }
    }

    if (!assignments.length && green.length) {
      const fallback = pickFallback(green, assignedIds);
      if (fallback) {
        assignments.push({ sunday_id: sun.id, profile_id: fallback.id, role_label: fallback.specialization || 'Fallback' });
      }
    }

    if (assignments.length) {
      const { error } = await state.supabase.from('assignments').insert(assignments);
      if (error) throw error;
    }
  }
}

function download(filename, content, mime) {
  const blob = new Blob([content], { type: mime });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

function myPublishedAssignments() {
  const plan = getCurrentPlan();
  if (plan?.status !== 'published') return [];
  return state.assignments
    .filter((a) => a.profile_id === state.user.id)
    .map((a) => ({ ...a, sunday: state.sundays.find((s) => s.id === a.sunday_id) }))
    .filter((a) => a.sunday)
    .sort((a, b) => a.sunday.date.localeCompare(b.sunday.date));
}

function exportICS() {
  const rows = myPublishedAssignments();
  const entries = rows.map((entry) => {
    const dtStart = `${entry.sunday.date.replaceAll('-', '')}T100000`;
    const dtEnd = `${entry.sunday.date.replaceAll('-', '')}T113000`;
    return [
      'BEGIN:VEVENT',
      `UID:${entry.id}@cgh-technik-planer`,
      `DTSTAMP:${dtStart}Z`,
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
      `SUMMARY:CGH Technikdienst (${entry.role_label})`,
      'END:VEVENT',
    ].join('\n');
  }).join('\n');

  const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//CGH//Technik Planer//DE', entries, 'END:VCALENDAR'].join('\n');
  download('cgh-meine-termine.ics', ics, 'text/calendar');
}

function exportCSV() {
  const rows = myPublishedAssignments();
  const csv = ['Datum,Rolle', ...rows.map((r) => `${r.sunday.date},${r.role_label}`)].join('\n');
  download('cgh-meine-termine.csv', csv, 'text/csv');
}

async function bootstrap() {
  const config = getStoredSupabaseConfig();
  els.url.value = config.url;
  els.key.value = config.key;
  if (config.url && config.key && initSupabase(config.url, config.key)) {
    const { data } = await state.supabase.auth.getSession();
    state.user = data.session?.user || null;
    if (state.user) {
      await resolveCurrentUserProfile();
      await loadData();
    }
  }
  render();
}

els.saveSupabase.addEventListener('click', async () => {
  try {
    const url = els.url.value.trim();
    const key = els.key.value.trim();
    setStoredSupabaseConfig(url, key);
    initSupabase(url, key);
    showToast('Supabase Verbindung gespeichert.');
    render();
  } catch (error) {
    showToast(error.message || 'Fehler beim Speichern.');
  }
});

els.clearSupabase.addEventListener('click', () => {
  clearStoredSupabaseConfig();
  state.supabase = null;
  state.user = null;
  state.profile = null;
  render();
  showToast('Verbindung zurückgesetzt.');
});

els.login.addEventListener('click', async () => {
  try {
    if (!state.supabase) throw new Error('Bitte zuerst Supabase konfigurieren.');
    await handleLogin();
    await resolveCurrentUserProfile();
    await refreshAndRender();
    showToast('Login erfolgreich.');
  } catch (error) {
    showToast(error.message || 'Login fehlgeschlagen.');
  }
});

els.register.addEventListener('click', async () => {
  try {
    if (!state.supabase) throw new Error('Bitte zuerst Supabase konfigurieren.');
    await handleRegister();
    await resolveCurrentUserProfile();
    await refreshAndRender();
    showToast('Registrierung erfolgreich.');
  } catch (error) {
    showToast(error.message || 'Registrierung fehlgeschlagen.');
  }
});

els.logout.addEventListener('click', async () => {
  await state.supabase.auth.signOut();
  state.user = null;
  state.profile = null;
  render();
  showToast('Abgemeldet.');
});

els.tabButtons.forEach((btn) => btn.addEventListener('click', () => setTab(btn.dataset.tab)));

els.createPlan.addEventListener('click', async () => {
  try {
    await createPlan();
    await refreshAndRender();
    showToast('Plan erstellt.');
  } catch (error) {
    showToast(error.message || 'Plan konnte nicht erstellt werden.');
  }
});

els.publishPlan.addEventListener('click', async () => {
  try {
    await publishPlan();
    await refreshAndRender();
    showToast('Plan freigegeben.');
  } catch (error) {
    showToast(error.message || 'Freigabe fehlgeschlagen.');
  }
});

els.deletePlan.addEventListener('click', async () => {
  try {
    await deletePlan();
    await refreshAndRender();
    showToast('Plan gelöscht.');
  } catch (error) {
    showToast(error.message || 'Löschen fehlgeschlagen.');
  }
});

els.addTech.addEventListener('click', async () => {
  try {
    await addTechnician();
    els.newTechName.value = '';
    els.newTechEmail.value = '';
    await refreshAndRender();
    showToast('Techniker hinzugefügt.');
  } catch (error) {
    showToast(error.message || 'Anlegen fehlgeschlagen.');
  }
});

els.techTable.addEventListener('click', async (event) => {
  const id = event.target.dataset.deleteTech;
  if (!id) return;
  try {
    await deleteTechnician(id);
    await refreshAndRender();
    showToast('Techniker gelöscht.');
  } catch (error) {
    showToast(error.message || 'Löschen fehlgeschlagen.');
  }
});

els.autoAssign.addEventListener('click', async () => {
  try {
    await runAutoAssign();
    await refreshAndRender();
    showToast('Auto-Zuweisung abgeschlossen.');
  } catch (error) {
    showToast(error.message || 'Auto-Zuweisung fehlgeschlagen.');
  }
});

els.myAvailability.addEventListener('click', async (event) => {
  const status = event.target.dataset.setStatus;
  const sundayId = event.target.dataset.sunday;
  if (!status || !sundayId) return;
  try {
    await setAvailability(sundayId, status);
    await refreshAndRender();
    showToast('Verfügbarkeit gespeichert.');
  } catch (error) {
    showToast(error.message || 'Speichern fehlgeschlagen.');
  }
});

els.exportICS.addEventListener('click', exportICS);
els.exportCSV.addEventListener('click', exportCSV);

bootstrap().catch((error) => {
  console.error(error);
  showToast('Initialisierung fehlgeschlagen. Prüfe Supabase & Tabellen.');
});
