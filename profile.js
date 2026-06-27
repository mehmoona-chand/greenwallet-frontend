// GreenWallet Profile JS — fully dynamic from localStorage

const PAKISTAN_DAILY = 2.74;
const WORLD_DAILY    = 10.9;
const DAILY_GOAL_DEFAULT = 5.0;

const LEVELS = [
  { min:0,    label:'Eco Beginner',     xpNext:100  },
  { min:100,  label:'Green Explorer',   xpNext:250  },
  { min:250,  label:'Carbon Cutter',    xpNext:500  },
  { min:500,  label:'Eco Warrior',      xpNext:800  },
  { min:800,  label:'Climate Guardian', xpNext:1200 },
  { min:1200, label:'Eco Champion',     xpNext:1800 },
  { min:1800, label:'Eco Crusader',     xpNext:2600 },
  { min:2600, label:'Planet Protector', xpNext:9999 },
];

const BADGES_DEF = [
  { id:'first_log',  icon:'🌱', name:'First Step',    desc:'Log your first entry',         check: h => h.length >= 1 },
  { id:'streak3',    icon:'🔥', name:'3-Day Streak',  desc:'Log 3 days in a row',           check: (h,s) => s >= 3 },
  { id:'streak7',    icon:'⚡', name:'Week Warrior',  desc:'7-day logging streak',          check: (h,s) => s >= 7 },
  { id:'below_avg',  icon:'🏆', name:'Below Avg',     desc:'Stay below Pakistan average',   check: h => h.some(e => parseFloat(e.co2) < PAKISTAN_DAILY) },
  { id:'five_logs',  icon:'📊', name:'Data Driven',   desc:'Log 5 entries',                 check: h => h.length >= 5 },
  { id:'ten_logs',   icon:'🌍', name:'Committed',     desc:'Log 10 entries',                check: h => h.length >= 10 },
  { id:'low_co2',    icon:'🍃', name:'Low Footprint', desc:'Log under 2 kg in one day',     check: h => h.some(e => parseFloat(e.co2) < 2.0) },
  { id:'calculator', icon:'🧮', name:'Calc Pro',      desc:'Save 3+ calculations',          check: h => h.length >= 3 },
];

const LEADERBOARD_FALLBACK = [
  { name:'Ahmed K.', level:7, xp:2100, avgCO2:1.65, levelLabel:'Eco Crusader', initials:'AK', isSeed:true },
  { name:'Sara M.',  level:6, xp:1580, avgCO2:1.92, levelLabel:'Eco Champion', initials:'SM', isSeed:true },
  { name:'Bilal R.', level:5, xp:920,  avgCO2:2.15, levelLabel:'Climate Guardian', initials:'BR', isSeed:true },
  { name:'Nida F.',  level:4, xp:620,  avgCO2:2.38, levelLabel:'Eco Warrior', initials:'NF', isSeed:true },
  { name:'Usman T.', level:3, xp:380,  avgCO2:2.55, levelLabel:'Carbon Cutter', initials:'UT', isSeed:true },
];

const CAT_ICONS  = { car:'🚗', public:'🚌', meals:'🍽️', electricity:'⚡', flights:'✈️', waste:'🗑️' };
const CAT_LABELS = { car:'Car', public:'Transit', meals:'Food', electricity:'Power', flights:'Flights', waste:'Waste' };

document.addEventListener('DOMContentLoaded', () => { init().catch(console.error); });

async function init() {
  const history  = JSON.parse(localStorage.getItem('greenWalletHistory') || '[]');
  const settings = JSON.parse(localStorage.getItem('gwProfile') || '{}');
  const username = localStorage.getItem('greenWalletUser') || settings.name || 'Eco User';
  const location = settings.location || 'Lahore, Pakistan';
  const goalKg   = parseFloat(settings.goal) || DAILY_GOAL_DEFAULT;

  renderHero(username, location, history);
  renderTopStats(history);
  renderBadges(history);
  renderBreakdown(history);
  renderGoalRing(history, goalKg);
  await renderLeaderboard(username, history);
  renderMiniChart(history);
  setupModal(settings, username, location, goalKg);
  setupAvatarUpload();
  setupHamburger();
  setupLogout();
}

// ── HERO ──────────────────────────────────────
function renderHero(username, location, history) {
  const parts    = username.trim().split(' ');
  const initials = parts.length >= 2
    ? (parts[0][0] + parts[parts.length-1][0]).toUpperCase()
    : username.slice(0,2).toUpperCase();

  document.getElementById('avatar-initials').textContent = initials;
  document.getElementById('user-name').textContent = username;
  document.getElementById('user-location').textContent = location;

  // Load saved avatar photo if exists
  const savedPhoto = localStorage.getItem('gwAvatarPhoto');
  if (savedPhoto) {
    const img = document.getElementById('avatar-photo');
    img.src = savedPhoto;
    img.style.display = 'block';
    document.getElementById('avatar-initials').style.display = 'none';
  }

  // XP
  let xp = history.length * 50;
  history.forEach(e => {
    const c = parseFloat(e.co2);
    if (c < PAKISTAN_DAILY) xp += 30;
    if (c < 2.0) xp += 20;
  });

  let level = 1, levelData = LEVELS[0];
  for (let i = LEVELS.length-1; i >= 0; i--) {
    if (xp >= LEVELS[i].min) { level = i+1; levelData = LEVELS[i]; break; }
  }

  const xpInLevel = xp - levelData.min;
  const xpNeeded  = levelData.xpNext - levelData.min;
  const xpPct     = Math.min((xpInLevel / xpNeeded) * 100, 100);

  document.getElementById('avatar-level').textContent = level;
  document.getElementById('level-label').textContent  = `Level ${level} · ${levelData.label}`;
  document.getElementById('xp-text').textContent      = `${xp} / ${levelData.xpNext} XP`;
  document.getElementById('total-xp').textContent     = xp;
  setTimeout(() => { document.getElementById('xp-fill').style.width = xpPct + '%'; }, 300);
}

// ── TOP STATS ─────────────────────────────────
function renderTopStats(history) {
  const streak = calcStreak(history);
  document.getElementById('streak-num').textContent  = streak;
  document.getElementById('total-saved').textContent = history.length;
  if (history.length > 0) {
    const latest = [...history].reverse()[0];
    document.getElementById('today-co2').textContent = parseFloat(latest.co2).toFixed(1);
  }
  const xp = history.length * 50 + history.filter(e => parseFloat(e.co2) < PAKISTAN_DAILY).length * 30;
  document.getElementById('total-xp').textContent = xp;
}

function calcStreak(history) {
  if (history.length === 0) return 0;
  const dates = [...new Set(history.map(e => e.date))].reverse();
  let streak = 1;
  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(dates[i-1]);
    const curr = new Date(dates[i]);
    const diff = (prev - curr) / (1000*60*60*24);
    if (Math.round(diff) === 1) streak++;
    else break;
  }
  return Math.min(streak, dates.length);
}

// ── BADGES ────────────────────────────────────
function renderBadges(history) {
  const streak = calcStreak(history);
  const grid   = document.getElementById('badges-grid');
  grid.innerHTML = '';
  let unlocked = 0;

  BADGES_DEF.forEach(b => {
    const isUnlocked = b.check(history, streak);
    if (isUnlocked) unlocked++;
    const div = document.createElement('div');
    div.className = 'badge-item ' + (isUnlocked ? 'unlocked' : 'locked');
    div.title = b.desc;
    div.innerHTML = `
      <span class="badge-icon">${b.icon}</span>
      <div class="badge-name">${b.name}</div>
      <div class="badge-tick"><i class="fas fa-check"></i></div>
    `;
    grid.appendChild(div);
  });

  document.getElementById('badge-count').textContent = `${unlocked} / ${BADGES_DEF.length} unlocked`;
}

// ── BREAKDOWN ─────────────────────────────────
function renderBreakdown(history) {
  const container = document.getElementById('breakdown-bars');
  const dateEl    = document.getElementById('breakdown-date');
  if (history.length === 0) return;

  const latest = [...history].reverse()[0];
  dateEl.textContent = latest.date;

  if (!latest.categories) {
    container.innerHTML = '<div class="empty-breakdown"><i class="fas fa-info-circle"></i><p>No category data — recalculate to see breakdown</p></div>';
    return;
  }

  const cats = latest.categories;
  const max  = Math.max(...Object.values(cats), 0.01);
  container.innerHTML = '';

  Object.entries(cats).forEach(([key, val]) => {
    if (val <= 0) return;
    const pct = (val / max) * 100;
    const row = document.createElement('div');
    row.className = 'br-row';
    row.innerHTML = `
      <span class="br-icon">${CAT_ICONS[key] || '📌'}</span>
      <span class="br-label">${CAT_LABELS[key] || key}</span>
      <div class="br-track"><div class="br-fill" style="width:0%" data-pct="${pct}"></div></div>
      <span class="br-val">${val.toFixed(2)}</span>
    `;
    container.appendChild(row);
  });

  setTimeout(() => {
    container.querySelectorAll('.br-fill').forEach(el => {
      el.style.width = el.dataset.pct + '%';
    });
  }, 200);
}

// ── GOAL RING ─────────────────────────────────
function renderGoalRing(history, goalKg) {
  const fill    = document.getElementById('goal-ring-fill');
  const pctEl   = document.getElementById('goal-pct');
  const verdict = document.getElementById('goal-verdict');
  const subEl   = document.getElementById('goal-sub');

  subEl.textContent = `Target: ${goalKg} kg/day`;
  if (history.length === 0) { pctEl.textContent = '—'; return; }

  const latest = parseFloat([...history].reverse()[0].co2);
  const pct    = Math.min((latest / goalKg) * 100, 150);
  const circ   = 314;

  fill.style.stroke = pct <= 80 ? '#2a9d8f' : pct <= 100 ? '#e8a020' : '#e05050';
  pctEl.textContent = Math.round(Math.min(pct,100)) + '%';
  setTimeout(() => { fill.style.strokeDashoffset = circ - (Math.min(pct,100) / 100) * circ; }, 400);

  if (pct <= 60)       verdict.textContent = `🌟 Excellent! ${latest.toFixed(1)} kg is well under your ${goalKg} kg goal!`;
  else if (pct <= 100) verdict.textContent = `✅ Good — ${latest.toFixed(1)} kg is within your ${goalKg} kg goal today.`;
  else                 verdict.textContent = `⚠️ ${latest.toFixed(1)} kg exceeds your ${goalKg} kg goal. Try small changes!`;

  verdict.style.borderLeftColor = pct <= 100 ? '#2a9d8f' : '#e8a020';
  verdict.style.background      = pct <= 100 ? 'rgba(42,157,143,0.08)' : 'rgba(232,160,32,0.08)';
  verdict.style.color           = pct <= 100 ? '#1a5f57' : '#a06010';
}

// ── LEADERBOARD ───────────────────────────────
async function renderLeaderboard(username, history) {
  const list   = document.getElementById('leaderboard-list');
  const rankEl = document.getElementById('your-rank');
  const noteEl = document.getElementById('leaderboard-note');
  list.innerHTML = '<div class="lb-loading"><i class="fas fa-spinner fa-spin"></i> Loading rankings…</div>';

  let board = [];
  let myRank = null;
  let total = 0;
  let youInTop = false;
  let fromApi = false;

  if (typeof GW !== 'undefined' && GW.auth.isLoggedIn()) {
    const data = await GW.stats.getLeaderboard();
    if (data?.success) {
      board    = data.leaderboard || [];
      myRank   = data.myRank;
      total    = data.total || board.length;
      youInTop = data.youInTop;
      fromApi  = true;
    }
  }

  if (!fromApi) {
    const co2s  = history.map(e => parseFloat(e.co2));
    const myAvg = co2s.length ? (co2s.reduce((a, b) => a + b, 0) / co2s.length) : null;
    let myXp = history.length * 50;
    history.forEach(e => {
      const c = parseFloat(e.co2);
      if (c < PAKISTAN_DAILY) myXp += 30;
      if (c < 2.0) myXp += 20;
    });
    let myLevel = 1;
    for (let i = LEVELS.length - 1; i >= 0; i--) {
      if (myXp >= LEVELS[i].min) { myLevel = i + 1; break; }
    }

    board = [
      ...LEADERBOARD_FALLBACK,
      {
        name: username,
        level: myLevel,
        xp: myXp,
        avgCO2: myAvg,
        levelLabel: LEVELS[Math.min(myLevel - 1, LEVELS.length - 1)].label,
        initials: getInitials(username),
        isYou: true,
        isSeed: false,
      },
    ].sort((a, b) => {
      if (b.xp !== a.xp) return b.xp - a.xp;
      if (b.level !== a.level) return b.level - a.level;
      return (a.avgCO2 ?? 999) - (b.avgCO2 ?? 999);
    }).slice(0, 10);

    myRank   = board.findIndex(p => p.isYou) + 1;
    total    = board.length;
    youInTop = myRank > 0;
  }

  if (noteEl) {
    if (fromApi) {
      noteEl.innerHTML = '<i class="fas fa-trophy"></i> Live rankings — log entries & earn XP to climb!';
      noteEl.style.background = 'rgba(42,157,143,0.08)';
      noteEl.style.borderColor = 'rgba(42,157,143,0.25)';
      noteEl.style.color = 'var(--green-dark)';
    } else {
      noteEl.innerHTML = '<i class="fas fa-info-circle"></i> Offline mode — sign in to see live rankings';
    }
  }

  list.innerHTML = '';
  const rankColors = ['gold', 'silver', 'bronze'];



  board.forEach((player, i) => {
    const div = document.createElement('div');
    div.className = 'lb-item' + (player.isYou ? ' you' : '') + (player.isSeed ? ' seed' : '');
    const co2Text = player.avgCO2 != null
      ? `${player.avgCO2.toFixed(2)} kg/day avg`
      : 'No entries yet';

    div.innerHTML = `
      <div class="lb-rank ${rankColors[i] || ''}">${i < 3 ? ['🥇','🥈','🥉'][i] : i + 1}</div>
      <div class="lb-avatar" style="background:${player.isYou ? '#2a9d8f' : player.isSeed ? '#8ab8b3' : '#2a9d8f'}">${player.initials}</div>
      <div class="lb-info">
        <div class="lb-name">${player.name}${player.isYou ? ' (You)' : ''}</div>
        <div class="lb-meta">Lvl ${player.level} · ${player.xp} XP · ${player.levelLabel}</div>
        <div class="lb-co2">${co2Text}</div>
      </div>
      <span class="lb-tree">${player.level >= 4 ? '🌿' : '🌱'}</span>
    `;
    list.appendChild(div);
  });

  if (myRank) {
    rankEl.textContent = youInTop
      ? `You are ranked #${myRank} out of ${total} eco-champions`
      : `You are ranked #${myRank} out of ${total} — keep logging to reach the top 10!`;
  } else {
    rankEl.textContent = 'Log your first entry to join the leaderboard!';
  }
}

function getInitials(name) {
  const parts = name.trim().split(' ');
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length-1][0]).toUpperCase()
    : name.slice(0,2).toUpperCase();
}

// ── MINI CHART ────────────────────────────────
function renderMiniChart(history) {
  const chart   = document.getElementById('mini-chart');
  const countEl = document.getElementById('history-count');
  countEl.textContent = history.length + ' entries';
  if (history.length === 0) return;

  const last7 = history.slice(-7);
  const max   = Math.max(...last7.map(e => parseFloat(e.co2)), 0.01);
  chart.innerHTML = '';

  last7.forEach(entry => {
    const co2   = parseFloat(entry.co2);
    const pct   = (co2 / max) * 100;
    const color = co2 < PAKISTAN_DAILY
      ? 'linear-gradient(to top,#2a9d8f,#4ecdc4)'
      : 'linear-gradient(to top,#e8a020,#f5c842)';
    const wrap = document.createElement('div');
    wrap.className = 'mini-bar-wrap';
    wrap.innerHTML = `
      <div class="mini-bar" style="height:0%;background:${color}" data-h="${pct}"></div>
      <div class="mini-bar-label">${entry.date.split('/').slice(0,2).join('/')}</div>
    `;
    chart.appendChild(wrap);
  });

  setTimeout(() => {
    chart.querySelectorAll('.mini-bar').forEach(b => { b.style.height = b.dataset.h + '%'; });
  }, 200);
}

// ── EDIT MODAL ────────────────────────────────
function setupModal(settings, username, location, goalKg) {
  const overlay  = document.getElementById('modal-overlay');
  const editBtn  = document.getElementById('edit-btn');
  const closeBtn = document.getElementById('modal-close');
  const saveBtn  = document.getElementById('modal-save');

  document.getElementById('edit-name').value     = username;
  document.getElementById('edit-location').value = location;
  document.getElementById('edit-goal').value     = goalKg;

  editBtn.addEventListener('click',  () => overlay.classList.add('open'));
  closeBtn.addEventListener('click', () => overlay.classList.remove('open'));
  overlay.addEventListener('click',  e => { if (e.target === overlay) overlay.classList.remove('open'); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') overlay.classList.remove('open'); });

  saveBtn.addEventListener('click', () => {
    const newName     = document.getElementById('edit-name').value.trim() || username;
    const newLocation = document.getElementById('edit-location').value.trim() || location;
    const newGoal     = parseFloat(document.getElementById('edit-goal').value) || goalKg;

    localStorage.setItem('greenWalletUser', newName);
    localStorage.setItem('gwProfile', JSON.stringify({ name:newName, location:newLocation, goal:newGoal }));

    saveBtn.innerHTML = '<i class="fas fa-check"></i> Saved!';
    saveBtn.style.background = 'linear-gradient(135deg,#4ecdc4,#2a9d8f)';
    // BUG FIX: was `location.reload && window.location.reload()` — location was the city string variable!
    setTimeout(() => { overlay.classList.remove('open'); window.location.reload(); }, 700);
  });
}

// ── AVATAR PHOTO UPLOAD ───────────────────────
function setupAvatarUpload() {
  const input = document.getElementById('avatar-file-input');
  input.addEventListener('change', function() {
    const file = this.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
      const dataUrl = e.target.result;
      localStorage.setItem('gwAvatarPhoto', dataUrl);
      const img = document.getElementById('avatar-photo');
      img.src = dataUrl;
      img.style.display = 'block';
      document.getElementById('avatar-initials').style.display = 'none';
    };
    reader.readAsDataURL(file);
  });
}

// ── HAMBURGER ─────────────────────────────────
function setupHamburger() {
  const btn  = document.getElementById('hamburger');
  const menu = document.getElementById('nav-menu');
  if (btn && menu) btn.addEventListener('click', () => menu.classList.toggle('open'));
}

// ── LOGOUT ────────────────────────────────────
function setupLogout() {
  const btn = document.getElementById('logout-btn');
  if (btn) btn.addEventListener('click', e => {
    e.preventDefault();
    localStorage.removeItem('greenWalletUser');
    window.location.href = 'login.html';
  });
}
