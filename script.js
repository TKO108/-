// ネオンカラープリセット
const NEON_PRESETS = ['#00f0ff', '#00ff88', '#ff007f', '#b829ff', '#ffe600', '#ff5e00'];
const STORAGE_KEY = 'liquid_focus_app_state_v1';

// 過去7日間の日付ラベル生成
function getPastDays(count = 7) {
    const days = [];
    for (let i = count - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const month = d.getMonth() + 1;
        const date = d.getDate();
        days.push({
            key: d.toISOString().split('T')[0],
            label: i === 0 ? '今日' : `${month}/${date}`
        });
    }
    return days;
}

const DAYS = getPastDays(7);
const TODAY_KEY = DAYS[DAYS.length - 1].key;

// デフォルトの初期状態
const defaultAppState = {
    theme: 'dark',
    spaces: [
        {
            id: 'space-1',
            name: '資格・英語学習',
            idealHours: 2.0,
            color: '#00f0ff',
            history: {
                [DAYS[0].key]: 1.5,
                [DAYS[1].key]: 2.0,
                [DAYS[2].key]: 1.0,
                [DAYS[3].key]: 1.8,
                [DAYS[4].key]: 2.2,
                [DAYS[5].key]: 1.5,
                [TODAY_KEY]: 1.2
            }
        },
        {
            id: 'space-2',
            name: 'アプリ開発',
            idealHours: 3.0,
            color: '#00ff88',
            history: {
                [DAYS[0].key]: 2.0,
                [DAYS[1].key]: 1.5,
                [DAYS[2].key]: 3.0,
                [DAYS[3].key]: 2.5,
                [DAYS[4].key]: 1.0,
                [DAYS[5].key]: 2.8,
                [TODAY_KEY]: 1.5
            }
        },
        {
            id: 'space-3',
            name: '読書・インプット',
            idealHours: 1.0,
            color: '#ff007f',
            history: {
                [DAYS[0].key]: 0.5,
                [DAYS[1].key]: 1.0,
                [DAYS[2].key]: 0.8,
                [DAYS[3].key]: 0.5,
                [DAYS[4].key]: 1.0,
                [DAYS[5].key]: 0.7,
                [TODAY_KEY]: 0.6
            }
        }
    ],
    widgetTarget: 'total',
    activeSpaceId: null,
    timer: {
        isRunning: false,
        spaceId: null,
        startTime: null
    }
};

// ローカルストレージからデータを復元
function loadState() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            return {
                ...defaultAppState,
                ...parsed,
                activeSpaceId: null
            };
        }
    } catch (e) {
        console.error('データの読み込みに失敗しました:', e);
    }
    return defaultAppState;
}

// ローカルストレージへデータを保存
function saveState() {
    try {
        const toSave = {
            theme: appState.theme,
            spaces: appState.spaces,
            widgetTarget: appState.widgetTarget,
            timer: appState.timer
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    } catch (e) {
        console.error('データの保存に失敗しました:', e);
    }
}

// ==================== iPhone / iPad ショートカット＆ウィジェット連携 ====================
function syncToShortcuts(isManual = false) {
    const runningSpace = appState.spaces.find(s => s.id === appState.timer.spaceId);
    const payload = {
        target: appState.widgetTarget,
        theme: appState.theme,
        isRunning: appState.timer.isRunning,
        runningSpaceName: runningSpace ? runningSpace.name : '',
        startTime: appState.timer.startTime,
        spaces: appState.spaces.map(s => ({
            id: s.id,
            name: s.name,
            idealHours: s.idealHours,
            color: s.color,
            savedHours: s.history[TODAY_KEY] || 0
        }))
    };

    const jsonStr = JSON.stringify(payload);
    const shortcutUrl = `shortcuts://run-shortcut?name=${encodeURIComponent('LiquidFocusSync')}&input=text&text=${encodeURIComponent(jsonStr)}`;

    if (isManual) {
        showToast('ショートカットへデータを送信します...');
    }
    window.location.href = shortcutUrl;
}

let appState = loadState();
let timerInterval = null;
let ambientDripInterval = null;

// ==================== テーマ切り替え（ダーク / ホワイト） ====================
function toggleTheme() {
    appState.theme = appState.theme === 'dark' ? 'light' : 'dark';
    saveState();
    applyTheme();
    if (appState.activeSpaceId) {
        renderSpaceDetail();
    } else {
        renderHome();
    }
}

function applyTheme() {
    const body = document.body;
    const iconSun = document.getElementById('icon-sun');
    const iconMoon = document.getElementById('icon-moon');
    const metaTheme = document.querySelector('meta[name="theme-color"]');

    if (appState.theme === 'light') {
        body.classList.remove('theme-dark');
        body.classList.add('theme-light');
        iconSun.classList.add('hidden');
        iconMoon.classList.remove('hidden');
        if (metaTheme) metaTheme.setAttribute('content', '#f8fafc');
    } else {
        body.classList.remove('theme-light');
        body.classList.add('theme-dark');
        iconSun.classList.remove('hidden');
        iconMoon.classList.add('hidden');
        if (metaTheme) metaTheme.setAttribute('content', '#090d16');
    }
}

// ==================== 動的しずく＆波紋エフェクト ====================
function spawnDroplet(containerEl, color, fillPercent) {
    if (!containerEl) return;

    const containerHeight = containerEl.clientHeight || 180;
    const liquidHeightPx = (containerHeight * Math.min(95, fillPercent)) / 100;
    const dropDistance = Math.max(20, containerHeight - liquidHeightPx - 6);

    const drop = document.createElement('div');
    drop.className = 'droplet';
    drop.style.backgroundColor = color;
    drop.style.boxShadow = `0 0 10px ${color}, 0 0 18px ${color}`;
    drop.style.setProperty('--drop-distance', `${dropDistance}px`);
    const offsetX = (Math.random() - 0.5) * 16;
    drop.style.marginLeft = `${offsetX}px`;

    containerEl.appendChild(drop);

    setTimeout(() => {
        if (drop.parentNode) drop.remove();

        const splash = document.createElement('div');
        splash.className = 'splash-ring';
        splash.style.color = color;
        splash.style.top = `${dropDistance + 6}px`;
        splash.style.marginLeft = `${offsetX}px`;
        splash.style.boxShadow = `0 0 8px ${color}`;
        containerEl.appendChild(splash);

        setTimeout(() => {
            if (splash.parentNode) splash.remove();
        }, 600);
    }, 720);
}

function startAmbientDrips() {
    if (ambientDripInterval) clearInterval(ambientDripInterval);
    ambientDripInterval = setInterval(() => {
        if (appState.activeSpaceId) {
            const space = appState.spaces.find(s => s.id === appState.activeSpaceId);
            const tank = document.getElementById('main-tank-container');
            if (space && tank) {
                const pct = Math.min(100, (getTodayHours(space) / space.idealHours) * 100);
                if (appState.timer.isRunning && appState.timer.spaceId === space.id) {
                    spawnDroplet(tank, space.color, pct);
                } else if (Math.random() < 0.35) {
                    spawnDroplet(tank, space.color, pct);
                }
            }
        } else {
            const widgetTank = document.getElementById('widget-liquid-tank');
            if (widgetTank && appState.spaces.length > 0) {
                if (appState.widgetTarget === 'total') {
                    const randomSpace = appState.spaces[Math.floor(Math.random() * appState.spaces.length)];
                    const totalIdeal = appState.spaces.reduce((a, s) => a + s.idealHours, 0) || 1;
                    const totalActual = appState.spaces.reduce((a, s) => a + getTodayHours(s), 0);
                    const pct = Math.min(100, (totalActual / totalIdeal) * 100);
                    spawnDroplet(widgetTank, randomSpace.color, pct);
                } else {
                    const s = appState.spaces.find(sp => sp.id === appState.widgetTarget);
                    if (s) {
                        const pct = Math.min(100, (getTodayHours(s) / s.idealHours) * 100);
                        spawnDroplet(widgetTank, s.color, pct);
                    }
                }
            }
        }
    }, 950);
}

// ==================== ユーティリティ ====================
function showToast(msg) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.classList.remove('opacity-0');
    setTimeout(() => toast.classList.add('opacity-0'), 2500);
}

function createWaveSvgUrl(color) {
    const encodedColor = encodeURIComponent(color);
    return `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 88.7'%3E%3Cpath d='M800 56.9c-155.5 0-204.9-50-405.5-49.9-200 0-250 49.9-394.5 49.9v31.8h800v-.2-31.6z' fill='${encodedColor}'/%3E%3C/svg%3E")`;
}

function getLiveElapsedHours(spaceId) {
    if (appState.timer.isRunning && appState.timer.spaceId === spaceId && appState.timer.startTime) {
        return (Date.now() - appState.timer.startTime) / (1000 * 60 * 60);
    }
    return 0;
}

function getTodayHours(space) {
    const saved = space.history[TODAY_KEY] || 0;
    return saved + getLiveElapsedHours(space.id);
}

function formatDuration(totalSeconds) {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = Math.floor(totalSeconds % 60);
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

// ==================== 画面遷移 ====================
function navigateTo(view, spaceId = null) {
    const homeView = document.getElementById('view-home');
    const spaceView = document.getElementById('view-space');
    const backBtn = document.getElementById('back-btn');
    const headerTitle = document.getElementById('header-title');
    const bottomBar = document.getElementById('home-bottom-bar');

    if (view === 'home') {
        appState.activeSpaceId = null;
        homeView.classList.remove('hidden');
        spaceView.classList.add('hidden');
        backBtn.classList.add('hidden');
        bottomBar.classList.remove('hidden');
        headerTitle.textContent = 'Liquid Focus';
        renderHome();
    } else if (view === 'space' && spaceId) {
        appState.activeSpaceId = spaceId;
        homeView.classList.add('hidden');
        spaceView.classList.remove('hidden');
        backBtn.classList.remove('hidden');
        bottomBar.classList.add('hidden');
        const space = appState.spaces.find(s => s.id === spaceId);
        headerTitle.textContent = space ? space.name : '可視化スペース';
        renderSpaceDetail();
        setTimeout(() => {
            const tank = document.getElementById('main-tank-container');
            if (space && tank) {
                const pct = Math.min(100, (getTodayHours(space) / space.idealHours) * 100);
                spawnDroplet(tank, space.color, pct);
            }
        }, 200);
    }
}

function openActiveSpace() {
    if (appState.timer.spaceId) {
        navigateTo('space', appState.timer.spaceId);
    }
}

// ==================== ホーム画面描画 ====================
function renderHome() {
    updateChartFilterOptions();
    renderWidgetPreview();
    renderHomeChart();
    renderSpacesGrid();
}

function updateChartFilterOptions() {
    const select = document.getElementById('home-chart-filter');
    const currentVal = select.value;
    select.innerHTML = `<option value="total">総合時間（全スペース）</option>`;
    appState.spaces.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.id;
        opt.textContent = s.name;
        select.appendChild(opt);
    });
    if ([...select.options].some(o => o.value === currentVal)) {
        select.value = currentVal;
    }
}

function renderWidgetPreview() {
    const container = document.getElementById('widget-preview-content');
    
    if (appState.widgetTarget === 'total') {
        const totalIdeal = appState.spaces.reduce((acc, s) => acc + s.idealHours, 0) || 1;
        let totalActual = 0;

        let layersHtml = '';
        appState.spaces.forEach((space) => {
            const actual = getTodayHours(space);
            totalActual += actual;
            const heightPercent = Math.min(100, (actual / totalIdeal) * 100);
            if (heightPercent > 0) {
                layersHtml += `
                    <div style="height: ${heightPercent}%; background-color: ${space.color}; box-shadow: 0 0 12px ${space.color};" 
                         class="w-full transition-all duration-500 relative border-t border-white/40 first:border-t-0"
                         title="${space.name}: ${actual.toFixed(1)}h">
                    </div>
                `;
            }
        });

        const totalPercent = Math.min(100, Math.round((totalActual / totalIdeal) * 100));

        container.innerHTML = `
            <div id="widget-liquid-tank" class="liquid-container w-16 h-20 rounded-2xl flex flex-col justify-end shrink-0">
                ${layersHtml}
            </div>
            <div class="flex-1 min-w-0">
                <div class="flex items-baseline justify-between">
                    <h3 class="font-bold text-primary text-base truncate">総合時間</h3>
                    <span class="text-lg font-extrabold text-accent">${totalPercent}%</span>
                </div>
                <p class="text-xs text-muted mt-0.5">
                    達成 <strong class="text-primary">${totalActual.toFixed(1)}h</strong> / 目標 ${totalIdeal.toFixed(1)}h
                </p>
                <div class="flex flex-wrap gap-1.5 mt-2">
                    ${appState.spaces.map(s => `
                        <span class="chip-badge border inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full">
                            <span class="w-2 h-2 rounded-full" style="background:${s.color}; box-shadow: 0 0 6px ${s.color};"></span>
                            ${s.name}
                        </span>
                    `).join('')}
                </div>
            </div>
        `;
    } else {
        const space = appState.spaces.find(s => s.id === appState.widgetTarget) || appState.spaces[0];
        if (!space) {
            container.innerHTML = `<p class="text-xs text-muted">スペースを作成してください</p>`;
            return;
        }
        const actual = getTodayHours(space);
        const percent = Math.min(100, Math.round((actual / space.idealHours) * 100));

        container.innerHTML = `
            <div id="widget-liquid-tank" onclick="navigateTo('space', '${space.id}')" class="cursor-pointer liquid-container w-16 h-20 rounded-2xl flex flex-col justify-end shrink-0">
                <div class="liquid-layer" style="height: ${percent}%; background-color: ${space.color}; --neon-color: ${space.color};">
                    <div class="liquid-wave-front" style="background-image: ${createWaveSvgUrl(space.color)};"></div>
                </div>
            </div>
            <div onclick="navigateTo('space', '${space.id}')" class="cursor-pointer flex-1 min-w-0">
                <div class="flex items-baseline justify-between">
                    <h3 class="font-bold text-primary text-base truncate">${space.name}</h3>
                    <span class="text-lg font-extrabold" style="color: ${space.color}; text-shadow: 0 0 8px ${space.color}80;">${percent}%</span>
                </div>
                <p class="text-xs text-muted mt-0.5">
                    達成 <strong class="text-primary">${actual.toFixed(1)}h</strong> / 目標 ${space.idealHours.toFixed(1)}h
                </p>
                <p class="text-[11px] text-accent font-semibold mt-2">タップして計測スタート →</p>
            </div>
        `;
    }
}

function renderMixedChart(containerId, filterId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const isTotal = filterId === 'total';
    const targetSpaces = isTotal ? appState.spaces : appState.spaces.filter(s => s.id === filterId);
    
    const maxIdeal = targetSpaces.reduce((sum, s) => sum + s.idealHours, 0) || 1;
    let maxDataVal = maxIdeal;

    const dailyTotals = DAYS.map(day => {
        let sum = 0;
        targetSpaces.forEach(s => {
            const val = day.key === TODAY_KEY ? getTodayHours(s) : (s.history[day.key] || 0);
            sum += val;
        });
        if (sum > maxDataVal) maxDataVal = sum;
        return sum;
    });

    const yMax = Math.ceil(maxDataVal * 1.15 * 10) / 10;

    const points = dailyTotals.map((val, idx) => {
        const xPercent = ((idx + 0.5) / DAYS.length) * 100;
        const yPercent = 100 - Math.min(100, (val / yMax) * 100);
        return { x: xPercent, y: yPercent, val };
    });

    const polylinePoints = points.map(p => `${p.x},${p.y}`).join(' ');

    const barsHtml = DAYS.map((day) => {
        let barInnerHtml = '';
        if (isTotal) {
            targetSpaces.forEach(s => {
                const val = day.key === TODAY_KEY ? getTodayHours(s) : (s.history[day.key] || 0);
                const hPercent = Math.min(100, (val / yMax) * 100);
                if (hPercent > 0) {
                    barInnerHtml += `<div style="height:${hPercent}%; background-color:${s.color}; --bar-glow:${s.color};" class="w-full neon-bar"></div>`;
                }
            });
        } else if (targetSpaces[0]) {
            const s = targetSpaces[0];
            const val = day.key === TODAY_KEY ? getTodayHours(s) : (s.history[day.key] || 0);
            const hPercent = Math.min(100, (val / yMax) * 100);
            barInnerHtml = `<div style="height:${hPercent}%; background-color:${s.color}; --bar-glow:${s.color};" class="w-full rounded-t-md neon-bar"></div>`;
        }

        return `
            <div class="flex-1 flex flex-col items-center h-full justify-end z-10">
                <div class="w-6 sm:w-8 h-full bar-track border rounded-xl overflow-hidden flex flex-col justify-end relative">
                    ${barInnerHtml}
                </div>
                <span class="text-[10px] font-semibold ${day.key === TODAY_KEY ? 'text-accent font-bold' : 'text-muted'} mt-1.5">
                    ${day.label}
                </span>
            </div>
        `;
    }).join('');

    const idealLineY = 100 - Math.min(100, (maxIdeal / yMax) * 100);
    const defaultTotalLineColor = appState.theme === 'light' ? '#0f172a' : '#ffffff';
    const lineColor = (!isTotal && targetSpaces[0]) ? targetSpaces[0].color : defaultTotalLineColor;
    const dotBg = appState.theme === 'light' ? '#ffffff' : '#090d16';

    container.innerHTML = `
        <div class="relative w-full h-full flex flex-col">
            <div class="relative flex-1 flex items-end justify-between px-1">
                <div style="top: ${idealLineY}%;" class="absolute left-0 right-0 border-t border-dashed border-slate-400/60 z-0 pointer-events-none flex justify-end">
                    <span class="text-[9px] text-muted surface-card px-1.5 rounded -mt-2.5">目標 ${maxIdeal.toFixed(1)}h</span>
                </div>

                ${barsHtml}

                <svg viewBox="0 0 100 100" preserveAspectRatio="none" class="absolute inset-0 w-full h-[calc(100%-20px)] pointer-events-none z-20 overflow-visible" style="filter: drop-shadow(0 0 4px ${lineColor});">
                    <polyline fill="none" stroke="${lineColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" points="${polylinePoints}" vector-effect="non-scaling-stroke" />
                </svg>

                <div class="absolute inset-0 w-full h-[calc(100%-20px)] pointer-events-none z-30">
                    ${points.map(p => `
                        <div style="left: ${p.x}%; top: ${p.y}%; background-color: ${dotBg}; border-color: ${lineColor}; box-shadow: 0 0 8px ${lineColor};" class="absolute w-2.5 h-2.5 -ml-[5px] -mt-[5px] rounded-full border-2"></div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
}

function renderHomeChart() {
    const filterVal = document.getElementById('home-chart-filter').value;
    renderMixedChart('home-chart-container', filterVal);
}

function renderSpacesGrid() {
    const grid = document.getElementById('spaces-grid');
    document.getElementById('space-count').textContent = `${appState.spaces.length}個`;

    if (appState.spaces.length === 0) {
        grid.innerHTML = `
            <div class="col-span-2 text-center py-10 surface-card rounded-3xl border border-dashed">
                <p class="text-sm text-muted">まだスペースがありません</p>
                <p class="text-xs text-muted mt-1">下のボタンから作成しましょう</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = appState.spaces.map(space => {
        const actual = getTodayHours(space);
        const percent = Math.min(100, Math.round((actual / space.idealHours) * 100));
        const isRunningThis = appState.timer.isRunning && appState.timer.spaceId === space.id;

        return `
            <div onclick="navigateTo('space', '${space.id}')" 
                 style="${isRunningThis ? `border-color: ${space.color}; box-shadow: 0 0 18px ${space.color}40;` : ''}"
                 class="cursor-pointer surface-card rounded-3xl p-4 shadow-lg border transition active:scale-95 flex flex-col justify-between">
                
                <div class="flex items-start justify-between gap-1 mb-3">
                    <h3 class="font-bold text-primary text-sm line-clamp-1">${space.name}</h3>
                    ${isRunningThis ? `<span class="w-2.5 h-2.5 rounded-full animate-ping shrink-0 mt-1" style="background-color:${space.color};"></span>` : ''}
                </div>

                <div class="liquid-container w-full h-24 rounded-2xl flex flex-col justify-end mb-3">
                    <div class="absolute inset-0 flex items-center justify-center z-10">
                        <span class="text-lg font-extrabold text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.85)] bg-slate-950/55 backdrop-blur-[2px] px-2.5 py-0.5 rounded-lg border border-white/15">${percent}%</span>
                    </div>
                    <div class="liquid-layer" style="height: ${percent}%; background-color: ${space.color}; --neon-color: ${space.color};">
                        <div class="liquid-wave-back" style="background-image: ${createWaveSvgUrl(space.color)};"></div>
                        <div class="liquid-wave-front" style="background-image: ${createWaveSvgUrl(space.color)};"></div>
                    </div>
                </div>

                <div class="flex items-center justify-between text-xs text-muted">
                    <span>${actual.toFixed(1)}h / ${space.idealHours}h</span>
                    <span class="w-6 h-6 rounded-full secondary-btn border flex items-center justify-center" style="color: ${space.color};">
                        <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                    </span>
                </div>
            </div>
        `;
    }).join('');
}

// ==================== 可視化スペース詳細画面描画 ====================
function renderSpaceDetail() {
    const space = appState.spaces.find(s => s.id === appState.activeSpaceId);
    if (!space) return navigateTo('home');

    const actual = getTodayHours(space);
    const percent = Math.min(100, Math.round((actual / space.idealHours) * 100));

    const badge = document.getElementById('space-detail-badge');
    badge.textContent = space.name;
    badge.style.backgroundColor = space.color;
    badge.style.boxShadow = `0 0 12px ${space.color}80`;

    document.getElementById('space-detail-ratio').textContent = `${actual.toFixed(2)}h / ${space.idealHours.toFixed(1)}h`;
    document.getElementById('space-tank-percent').textContent = `${percent}%`;

    const liquid = document.getElementById('space-tank-liquid');
    liquid.style.height = `${percent}%`;
    liquid.style.backgroundColor = space.color;
    liquid.style.setProperty('--neon-color', space.color);
    document.getElementById('space-tank-wave').style.backgroundImage = createWaveSvgUrl(space.color);
    document.getElementById('space-tank-wave-back').style.backgroundImage = createWaveSvgUrl(space.color);

    const isRunningThis = appState.timer.isRunning && appState.timer.spaceId === space.id;
    const toggleBtn = document.getElementById('timer-toggle-btn');
    const iconPlay = document.getElementById('icon-play');
    const iconPause = document.getElementById('icon-pause');
    const btnLabel = document.getElementById('timer-btn-label');
    const nozzle = document.getElementById('tank-nozzle');

    if (isRunningThis) {
        toggleBtn.style.backgroundColor = '#ff007f';
        toggleBtn.style.boxShadow = '0 0 20px rgba(255, 0, 127, 0.5)';
        toggleBtn.classList.remove('text-slate-950');
        toggleBtn.classList.add('text-white');
        iconPlay.classList.add('hidden');
        iconPause.classList.remove('hidden');
        btnLabel.textContent = '計測停止・記録';
        nozzle.style.backgroundColor = space.color;
        nozzle.style.boxShadow = `0 0 10px ${space.color}`;
    } else {
        toggleBtn.style.backgroundColor = space.color;
        toggleBtn.style.boxShadow = `0 0 20px ${space.color}66`;
        toggleBtn.classList.add('text-slate-950');
        toggleBtn.classList.remove('text-white');
        iconPlay.classList.remove('hidden');
        iconPause.classList.add('hidden');
        btnLabel.textContent = '計測開始';
        nozzle.style.backgroundColor = '#64748b';
        nozzle.style.boxShadow = 'none';
    }

    updateTimerDisplayText();
    renderMixedChart('space-chart-container', space.id);

    document.getElementById('edit-space-name').value = space.name;
    document.getElementById('edit-space-ideal').value = space.idealHours;
    document.getElementById('edit-space-color').value = space.color;
    renderColorPresets('edit-color-presets', 'edit-space-color');
}

function updateTimerDisplayText() {
    const space = appState.spaces.find(s => s.id === appState.activeSpaceId);
    if (!space) return;
    const totalSecs = Math.floor(getTodayHours(space) * 3600);
    document.getElementById('space-timer-display').textContent = formatDuration(totalSecs);
}

// ==================== タイマー計測ロジック ====================
function toggleTimer() {
    const targetId = appState.activeSpaceId;
    if (!targetId) return;

    if (appState.timer.isRunning && appState.timer.spaceId !== targetId) {
        stopAndSaveTimer(false);
    }

    if (appState.timer.isRunning && appState.timer.spaceId === targetId) {
        stopAndSaveTimer(true);
        showToast('作業時間を記録しました！');
    } else {
        appState.timer = {
            isRunning: true,
            spaceId: targetId,
            startTime: Date.now()
        };
        saveState();
        startTicker();
        showToast('計測を開始しました');
        const space = appState.spaces.find(s => s.id === targetId);
        const tank = document.getElementById('main-tank-container');
        if (space && tank) {
            const pct = Math.min(100, (getTodayHours(space) / space.idealHours) * 100);
            spawnDroplet(tank, space.color, pct);
        }
        setTimeout(() => syncToShortcuts(false), 400);
    }
    renderSpaceDetail();
    updateHeaderPill();
}

function stopAndSaveTimer(shouldSync = true) {
    if (!appState.timer.isRunning || !appState.timer.spaceId) return;
    const space = appState.spaces.find(s => s.id === appState.timer.spaceId);
    if (space) {
        const elapsedHours = getLiveElapsedHours(space.id);
        space.history[TODAY_KEY] = (space.history[TODAY_KEY] || 0) + elapsedHours;
    }
    appState.timer = { isRunning: false, spaceId: null, startTime: null };
    saveState();
    stopTicker();
    updateHeaderPill();
    if (shouldSync) {
        setTimeout(() => syncToShortcuts(false), 300);
    }
}

function startTicker() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        updateHeaderPill();
        if (appState.activeSpaceId === appState.timer.spaceId) {
            renderSpaceDetail();
        } else if (!appState.activeSpaceId) {
            renderWidgetPreview();
            renderSpacesGrid();
        }
    }, 1000);
}

function stopTicker() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function updateHeaderPill() {
    const pill = document.getElementById('active-timer-pill');
    const pillText = document.getElementById('pill-text');
    if (appState.timer.isRunning && appState.timer.startTime) {
        const secs = Math.floor((Date.now() - appState.timer.startTime) / 1000);
        const space = appState.spaces.find(s => s.id === appState.timer.spaceId);
        pill.classList.remove('hidden');
        pillText.textContent = `${space ? space.name : '計測中'} ${formatDuration(secs)}`;
    } else {
        pill.classList.add('hidden');
    }
}

function addMockMinutes(mins) {
    const space = appState.spaces.find(s => s.id === appState.activeSpaceId);
    if (!space) return;
    const tank = document.getElementById('main-tank-container');
    const currentPct = Math.min(100, (getTodayHours(space) / space.idealHours) * 100);

    [0, 180, 360].forEach(delay => {
        setTimeout(() => spawnDroplet(tank, space.color, currentPct), delay);
    });

    setTimeout(() => {
        space.history[TODAY_KEY] = (space.history[TODAY_KEY] || 0) + (mins / 60);
        saveState();
        renderSpaceDetail();
        showToast(`+${mins}分 蓄積しました！`);
        syncToShortcuts(false);
    }, 650);
}

// ==================== スペース作成・編集・削除 ====================
function renderColorPresets(containerId, inputId) {
    const container = document.getElementById(containerId);
    container.innerHTML = NEON_PRESETS.map(color => `
        <button type="button" onclick="document.getElementById('${inputId}').value='${color}'"
                style="background-color: ${color}; box-shadow: 0 0 10px ${color}80;"
                class="w-7 h-7 rounded-full border border-white/70 hover:scale-110 transition"></button>
    `).join('');
}

function openCreateModal() {
    document.getElementById('new-space-name').value = '';
    document.getElementById('new-space-ideal').value = '2.0';
    document.getElementById('new-space-color').value = NEON_PRESETS[appState.spaces.length % NEON_PRESETS.length];
    renderColorPresets('new-color-presets', 'new-space-color');
    document.getElementById('modal-create').classList.remove('hidden');
}

function closeModal(id) {
    document.getElementById(id).classList.add('hidden');
}

function createSpace() {
    const nameInput = document.getElementById('new-space-name').value.trim();
    const idealInput = parseFloat(document.getElementById('new-space-ideal').value);
    const colorInput = document.getElementById('new-space-color').value;

    if (!nameInput) {
        showToast('作業名を入力してください');
        return;
    }
    if (isNaN(idealInput) || idealInput <= 0) {
        showToast('理想時間は0より大きい数値を入力してください');
        return;
    }

    const newSpace = {
        id: 'space-' + Date.now(),
        name: nameInput,
        idealHours: idealInput,
        color: colorInput,
        history: { [TODAY_KEY]: 0 }
    };

    appState.spaces.push(newSpace);
    saveState();
    closeModal('modal-create');
    renderHome();
    showToast(`「${nameInput}」を作成しました`);
    syncToShortcuts(false);
}

function saveSpaceSettings() {
    const space = appState.spaces.find(s => s.id === appState.activeSpaceId);
    if (!space) return;

    const name = document.getElementById('edit-space-name').value.trim();
    const ideal = parseFloat(document.getElementById('edit-space-ideal').value);
    const color = document.getElementById('edit-space-color').value;

    if (!name || isNaN(ideal) || ideal <= 0) {
        showToast('正しい作業名と理想時間を入力してください');
        return;
    }

    space.name = name;
    space.idealHours = ideal;
    space.color = color;
    saveState();

    document.getElementById('header-title').textContent = name;
    renderSpaceDetail();
    showToast('設定を保存しました');
    syncToShortcuts(false);
}

function deleteCurrentSpace() {
    if (appState.timer.spaceId === appState.activeSpaceId) {
        stopAndSaveTimer(false);
    }
    appState.spaces = appState.spaces.filter(s => s.id !== appState.activeSpaceId);
    if (appState.widgetTarget === appState.activeSpaceId) {
        appState.widgetTarget = 'total';
    }
    saveState();
    showToast('スペースを削除しました');
    navigateTo('home');
    syncToShortcuts(false);
}

// ==================== ウィジェット設定 ====================
function openWidgetModal() {
    const list = document.getElementById('widget-options-list');
    
    const options = [
        { id: 'total', title: '総合時間（全スペース合算）', desc: '全目標の合計枠に、ネオン液体が層になって表示', color: 'linear-gradient(135deg, #00f0ff, #00ff88, #ff007f)' },
        ...appState.spaces.map(s => ({
            id: s.id,
            title: s.name,
            desc: `目標: ${s.idealHours}時間 / 日`,
            color: s.color
        }))
    ];

    list.innerHTML = options.map(opt => {
        const isSelected = appState.widgetTarget === opt.id;
        return `
            <div onclick="selectWidgetTarget('${opt.id}')" 
                 class="cursor-pointer p-3.5 rounded-2xl border ${isSelected ? 'border-cyan-400 bg-cyan-500/10' : 'divider hover:opacity-80'} flex items-center justify-between transition">
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-xl shrink-0" style="background: ${opt.color}; box-shadow: 0 0 10px rgba(0,240,255,0.25);"></div>
                    <div>
                        <div class="text-sm font-bold text-primary">${opt.title}</div>
                        <div class="text-[11px] text-muted">${opt.desc}</div>
                    </div>
                </div>
                <div class="w-5 h-5 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-cyan-400' : 'border-slate-500'}">
                    ${isSelected ? '<div class="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#00f0ff]"></div>' : ''}
                </div>
            </div>
        `;
    }).join('');

    document.getElementById('modal-widget').classList.remove('hidden');
}

function selectWidgetTarget(targetId) {
    appState.widgetTarget = targetId;
    saveState();
    closeModal('modal-widget');
    renderWidgetPreview();
    showToast('ウィジェット表示を更新しました');
    syncToShortcuts(false);
}

document.addEventListener('visibilitychange', () => {
    if (!document.hidden && appState.timer.isRunning) {
        updateHeaderPill();
        if (appState.activeSpaceId) renderSpaceDetail();
        else renderHome();
    }
});

window.onload = () => {
    applyTheme();
    if (appState.timer.isRunning && appState.timer.startTime) {
        startTicker();
        updateHeaderPill();
    }
    renderHome();
    startAmbientDrips();
};