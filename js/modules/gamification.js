// =============================================
// GAMIFICATION MODULE — Kelas Coding
// XP, Streaks, Badges, Realtime notifications
// Depends on: sbClient, currentProfile (supabase.js)
//             toast, escHtml (helpers.js)
// =============================================

// ---- XP Award Amounts ----
const XP = {
  DAILY_LOGIN:      5,
  TOPIC_COMPLETE:  20,
  QUIZ_PASS:       30,
  CLASS_ATTEND:    50,
  MODULE_COMPLETE: 100,
};

// ---- All badge definitions ----
const BADGE_DEFS = [
  { type: 'first_class',      emoji: '🎓', label: 'Kelas Pertama',    desc: 'Hadir di kelas pertamamu'         },
  { type: 'streak_3',         emoji: '🔥', label: 'Streak 3 Hari',    desc: 'Aktif 3 hari berturut-turut'      },
  { type: 'streak_7',         emoji: '🔥🔥', label: 'Streak 7 Hari', desc: 'Aktif 7 hari berturut-turut'      },
  { type: 'streak_30',        emoji: '⚡', label: 'Streak 30 Hari',   desc: 'Aktif 30 hari berturut-turut'     },
  { type: 'quiz_master',      emoji: '🏆', label: 'Quiz Master',      desc: 'Lulus 10 kuis'                    },
  { type: 'topic_10',         emoji: '📚', label: 'Pelajar Rajin',    desc: 'Selesaikan 10 topik'              },
  { type: 'module_complete',  emoji: '🎯', label: 'Modul Selesai',    desc: 'Selesaikan satu modul penuh'      },
  { type: 'xp_100',           emoji: '⭐', label: '100 XP',           desc: 'Kumpulkan 100 XP'                 },
  { type: 'xp_500',           emoji: '🌟', label: '500 XP',           desc: 'Kumpulkan 500 XP'                 },
  { type: 'xp_1000',          emoji: '💫', label: '1000 XP',          desc: 'Kumpulkan 1000 XP'                },
];

// ---- Internal state ----
let _earnedBadgeTypes = new Set();
let _realtimeChannel = null;

// =============================================
// CORE: Award XP
// =============================================
async function awardXP(amount, reason, refId = null) {
  if (!currentProfile) return;

  // 1. Insert XP event
  const { error: xpErr } = await sbClient
    .from('xp_events')
    .insert([{ student_id: currentProfile.id, amount, reason, ref_id: refId }]);

  if (xpErr) { console.error('XP insert error:', xpErr); return; }

  // 2. Update profile total_xp
  const newXp = (currentProfile.total_xp || 0) + amount;
  await sbClient
    .from('profiles')
    .update({ total_xp: newXp })
    .eq('id', currentProfile.id);

  currentProfile.total_xp = newXp;

  // 3. Update XP bar in UI
  renderXPBar();
  renderXPSummaryCard();

  // 4. Show toast with animation
  _showXPToast(amount, reason);

  // 5. Check XP-based badges
  await _checkXPBadges(newXp);
}

// =============================================
// CORE: Update Streak
// =============================================
async function updateStreak() {
  if (!currentProfile) return;

  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const lastDate = currentProfile.last_activity_date;

  if (lastDate === today) return; // already logged in today

  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const newStreak = (lastDate === yesterday)
    ? (currentProfile.streak_days || 0) + 1
    : 1; // reset if gap

  await sbClient
    .from('profiles')
    .update({ streak_days: newStreak, last_activity_date: today })
    .eq('id', currentProfile.id);

  currentProfile.streak_days = newStreak;
  currentProfile.last_activity_date = today;

  // Award daily login XP
  await awardXP(XP.DAILY_LOGIN, 'daily_login');

  // Render streak display
  renderStreakBadge();

  // Check streak badges
  await _checkStreakBadges(newStreak);
}

// =============================================
// BADGE: Check and award
// =============================================
async function checkAndAwardBadge(badgeType) {
  if (_earnedBadgeTypes.has(badgeType)) return; // already earned

  const { error } = await sbClient
    .from('badges')
    .insert([{ student_id: currentProfile.id, badge_type: badgeType }]);

  if (error) return; // unique constraint = already exists, fine

  _earnedBadgeTypes.add(badgeType);

  const def = BADGE_DEFS.find(b => b.type === badgeType);
  if (def) {
    toast(`${def.emoji} Badge baru: ${def.label}!`, 'success');
    renderBadgesSection();
  }
}

async function _checkXPBadges(xp) {
  if (xp >= 100)  await checkAndAwardBadge('xp_100');
  if (xp >= 500)  await checkAndAwardBadge('xp_500');
  if (xp >= 1000) await checkAndAwardBadge('xp_1000');
}

async function _checkStreakBadges(streak) {
  if (streak >= 3)  await checkAndAwardBadge('streak_3');
  if (streak >= 7)  await checkAndAwardBadge('streak_7');
  if (streak >= 30) await checkAndAwardBadge('streak_30');
}

// =============================================
// LOAD: Fetch current gamification state
// =============================================
async function loadGamificationState() {
  if (!currentProfile) return;

  // Load earned badges
  const { data: badges } = await sbClient
    .from('badges')
    .select('badge_type')
    .eq('student_id', currentProfile.id);

  _earnedBadgeTypes = new Set((badges || []).map(b => b.badge_type));

  // Render everything
  renderXPBar();
  renderStreakBadge();
  renderBadgesSection();
  renderXPSummaryCard();

  // Update streak for today
  await updateStreak();
}

// =============================================
// REALTIME: Replace polling with live push
// =============================================
function initRealtimeNotifications() {
  if (!currentProfile || _realtimeChannel) return;

  _realtimeChannel = sbClient
    .channel(`student-notifs-${currentProfile.id}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${currentProfile.id}`,
      },
      (payload) => {
        const n = payload.new;
        toast(`🔔 ${n.title}`, 'success');
        // Refresh badge count
        loadNotifications('student');
      }
    )
    .subscribe();
}

function destroyRealtimeNotifications() {
  if (_realtimeChannel) {
    sbClient.removeChannel(_realtimeChannel);
    _realtimeChannel = null;
  }
}

// =============================================
// RENDER: XP Bar in header
// =============================================
function renderXPBar() {
  const el = document.getElementById('xpBarWidget');
  if (!el || !currentProfile) return;

  const xp = currentProfile.total_xp || 0;
  const level = _xpToLevel(xp);
  const { current, next } = _xpForLevel(level);
  const pct = next > current ? Math.round(((xp - current) / (next - current)) * 100) : 100;

  el.innerHTML = `
    <div class="xp-bar-widget">
      <div class="xp-level-badge">Lv.${level}</div>
      <div class="xp-bar-wrap" title="${xp} XP total">
        <div class="xp-bar-track">
          <div class="xp-bar-fill" style="width:${pct}%"></div>
        </div>
        <span class="xp-bar-label">${xp} XP</span>
      </div>
    </div>`;
}

// =============================================
// RENDER: Streak flame in header
// =============================================
function renderStreakBadge() {
  const el = document.getElementById('streakWidget');
  if (!el || !currentProfile) return;

  const streak = currentProfile.streak_days || 0;
  if (streak === 0) {
    el.innerHTML = '';
    return;
  }

  const flame = streak >= 7 ? '🔥🔥' : '🔥';
  el.innerHTML = `
    <div class="streak-badge ${streak >= 7 ? 'streak-hot' : ''}" title="Streak ${streak} hari berturut-turut">
      <span class="streak-flame">${flame}</span>
      <span class="streak-count">${streak}</span>
    </div>`;
}

// =============================================
// RENDER: Badges grid section
// =============================================
function renderBadgesSection() {
  const el = document.getElementById('badgesSection');
  if (!el) return;

  el.innerHTML = BADGE_DEFS.map(b => {
    const earned = _earnedBadgeTypes.has(b.type);
    return `
      <div class="badge-item ${earned ? 'earned' : 'locked'}" title="${b.desc}">
        <div class="badge-emoji">${earned ? b.emoji : '🔒'}</div>
        <div class="badge-label">${escHtml(b.label)}</div>
      </div>`;
  }).join('');
}

// =============================================
// HELPERS: XP → Level
// =============================================
function _xpToLevel(xp) {
  // Level thresholds: 0→1, 100→2, 250→3, 500→4, 800→5, 1200→6, ...
  const thresholds = [0, 100, 250, 500, 800, 1200, 1700, 2300, 3000];
  let level = 1;
  for (let i = 0; i < thresholds.length; i++) {
    if (xp >= thresholds[i]) level = i + 1;
    else break;
  }
  return level;
}

function _xpForLevel(level) {
  const thresholds = [0, 100, 250, 500, 800, 1200, 1700, 2300, 3000, 99999];
  return {
    current: thresholds[level - 1] || 0,
    next:    thresholds[level]     || 99999,
  };
}

// =============================================
// HELPERS: Animated XP toast
// =============================================
function _showXPToast(amount, reason) {
  const labels = {
    daily_login:      '📅 Login harian',
    topic_complete:   '📖 Topik selesai',
    quiz_pass:        '✅ Kuis lulus',
    class_attend:     '🏫 Hadir kelas',
    module_complete:  '🎯 Modul selesai',
  };
  const label = labels[reason] || reason;
  toast(`+${amount} XP — ${label}`, 'success');
}

// =============================================
// PUBLIC HOOKS — call these from other modules
// =============================================

// Call when student attends a class (joins meeting)
async function onClassAttended(scheduleId) {
  await awardXP(XP.CLASS_ATTEND, 'class_attend', scheduleId);
  await checkAndAwardBadge('first_class');

  // Check if this is their first class → check quiz_master later
  const { data } = await sbClient
    .from('xp_events')
    .select('id')
    .eq('student_id', currentProfile.id)
    .eq('reason', 'class_attend');
  // (Badge awarding for first_class already done above)
}

// Call when student completes a topic
async function onTopicCompleted(topicId) {
  await awardXP(XP.TOPIC_COMPLETE, 'topic_complete', topicId);

  // Count total completed topics for badge
  const { count } = await sbClient
    .from('topic_progress')
    .select('id', { count: 'exact', head: true })
    .eq('is_completed', true)
    .in('enrollment_id', await _getEnrollmentIds());

  if ((count || 0) >= 10) await checkAndAwardBadge('topic_10');
}

// Call when student passes a quiz (score >= 60)
async function onQuizPassed(topicId, score) {
  if (score < 60) return;
  await awardXP(XP.QUIZ_PASS, 'quiz_pass', topicId);

  // Count total passed quizzes
  const { count } = await sbClient
    .from('xp_events')
    .select('id', { count: 'exact', head: true })
    .eq('student_id', currentProfile.id)
    .eq('reason', 'quiz_pass');

  if ((count || 0) >= 10) await checkAndAwardBadge('quiz_master');
}

// Call when student completes an entire module (exam submitted)
async function onModuleCompleted(moduleId) {
  await awardXP(XP.MODULE_COMPLETE, 'module_complete', moduleId);
  await checkAndAwardBadge('module_complete');
}

// ---- Helper: get student enrollment IDs ----
async function _getEnrollmentIds() {
  const { data } = await sbClient
    .from('module_enrollments')
    .select('id')
    .eq('student_id', currentProfile.id);
  return (data || []).map(e => e.id);
}


// =============================================
// RENDER: XP Summary card (used in badges tab)
// =============================================
function renderXPSummaryCard() {
  const el = document.getElementById('xpSummaryCard');
  if (!el || !currentProfile) return;

  const xp = currentProfile.total_xp || 0;
  const streak = currentProfile.streak_days || 0;
  const level = _xpToLevel(xp);
  const { current, next } = _xpForLevel(level);
  const pct = next > current ? Math.round(((xp - current) / (next - current)) * 100) : 100;
  const toNext = next - xp;

  el.innerHTML = `
    <div style="min-width:200px">
      <div class="flex items-center gap-3 mb-3">
        <div class="xp-level-large">Lv.${level}</div>
        <div>
          <div class="font-bold text-primary">${xp} XP</div>
          <div class="text-secondary text-xs">${toNext > 0 ? `${toNext} XP ke Level ${level+1}` : 'Level Maksimum!'}</div>
        </div>
        ${streak > 0 ? `<div class="streak-badge-lg" title="${streak} hari streak">🔥 ${streak}</div>` : ''}
      </div>
      <div class="xp-bar-track" style="height:8px">
        <div class="xp-bar-fill" style="width:${pct}%;height:8px"></div>
      </div>
    </div>`;
}
