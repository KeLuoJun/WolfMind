// ===== Global State =====
let currentLogFile = null;
let autoRefreshInterval = null;
let lastLogHash = '';
let showAllHistory = false;
let apiBaseUrl = '';
let playerReflections = {}; // Store player reflections for modal
let currentGameData = null; // Store current game data

// ===== Role Mapping =====
const roleMap = {
    'werewolf': '狼人',
    'villager': '村民',
    'seer': '预言家',
    'witch': '女巫',
    'hunter': '猎人'
};

const actionIcons = {
    '狼人频道': '🐺',
    '狼人投票': '🗡️',
    '女巫行动': '💊',
    '预言家行动': '🔮',
    '公开发言': '🗣️',
    '投票': '🗳️',
    '遗言': '👻',
    '猎人开枪': '🔫'
};

// ===== Initialize =====
document.addEventListener('DOMContentLoaded', () => {
    loadLogFiles();
    setupEventListeners();
});

function setupEventListeners() {
    document.getElementById('logSelector').addEventListener('change', (e) => {
        if (e.target.value) {
            lastLogHash = '';
            loadGameLog(e.target.value);
        }
    });

    document.getElementById('refreshBtn').addEventListener('click', () => {
        if (currentLogFile) {
            lastLogHash = '';
            loadGameLog(currentLogFile);
        } else {
            loadLogFiles();
        }
    });

    document.getElementById('autoRefresh').addEventListener('change', (e) => {
        if (e.target.checked) {
            startAutoRefresh();
        } else {
            stopAutoRefresh();
        }
    });

    document.getElementById('showAllBtn').addEventListener('click', () => {
        showAllHistory = !showAllHistory;
        document.getElementById('showAllBtn').textContent = showAllHistory ? '显示最近' : '显示全部';
        if (currentLogFile) {
            lastLogHash = '';
            loadGameLog(currentLogFile);
        }
    });
}

// ===== API Functions =====
async function loadLogFiles() {
    try {
        let response;
        try {
            response = await fetch('/api/logs');
            if (!response.ok) throw new Error('Relative failed');
            apiBaseUrl = '';
        } catch {
            apiBaseUrl = 'http://localhost:8080';
            response = await fetch(`${apiBaseUrl}/api/logs`);
        }

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const files = await response.json();
        const selector = document.getElementById('logSelector');

        if (files.length === 0) {
            selector.innerHTML = '<option>无日志文件</option>';
            showError('未找到日志文件');
            return;
        }

        selector.innerHTML = files.map(f =>
            `<option value="${f.name}">${f.name} (${f.time})</option>`
        ).join('');

        currentLogFile = files[0].name;
        selector.value = currentLogFile;
        loadGameLog(currentLogFile);
    } catch (error) {
        console.error('加载失败:', error);
        showError('无法加载日志列表，请确保 server.py 正在运行');
    }
}

async function loadGameLog(filename) {
    try {
        const response = await fetch(`${apiBaseUrl}/api/logs/${filename}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const content = await response.text();
        const hash = simpleHash(content);

        if (hash === lastLogHash) return; // Skip if unchanged
        lastLogHash = hash;
        currentLogFile = filename;

        const gameData = parseLogContent(content);
        renderUI(gameData);
    } catch (error) {
        console.error('加载日志失败:', error);
        showError('无法加载日志文件');
    }
}

function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0;
    }
    return hash.toString();
}

// ===== Auto Refresh =====
function startAutoRefresh() {
    stopAutoRefresh();
    autoRefreshInterval = setInterval(() => {
        if (currentLogFile) loadGameLog(currentLogFile);
    }, 3000); // 3 seconds
    document.getElementById('autoRefresh').checked = true;
}

function stopAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
    }
    document.getElementById('autoRefresh').checked = false;
}

// ===== Theme Switching =====
function updateTheme(gameData) {
    // Get the current phase from the latest round
    let isDay = false;

    if (gameData.rounds && gameData.rounds.length > 0) {
        const lastRound = gameData.rounds[gameData.rounds.length - 1];
        if (lastRound.phases && lastRound.phases.length > 0) {
            const lastPhase = lastRound.phases[lastRound.phases.length - 1];
            isDay = lastPhase.type === 'day';
        }
    }

    // Apply theme class
    if (isDay) {
        document.body.classList.add('day-theme');
    } else {
        document.body.classList.remove('day-theme');
    }
}

// ===== Render UI =====
function renderUI(gameData) {
    currentGameData = gameData; // Store for modal access
    renderGameStats(gameData);
    renderTable(gameData);
    renderFeed(gameData);

    // Update theme based on current phase
    updateTheme(gameData);

    // Auto-manage refresh based on game status
    const isGameOver = gameData.status.includes('结束') ||
        gameData.status.includes('异常终止') ||
        gameData.status.includes('胜利') ||
        gameData.endTime;

    if (isGameOver) {
        stopAutoRefresh();
    } else if (!autoRefreshInterval) {
        // Game in progress, start auto-refresh if not already running
        startAutoRefresh();
    }
}

function renderGameStats(gameData) {
    document.getElementById('gameId').textContent = gameData.gameId || '-';
    document.getElementById('startTime').textContent = gameData.startTime || '-';

    // Determine display status
    let displayStatus = gameData.status || '进行中';
    const statusEl = document.getElementById('gameStatus');

    if (displayStatus.includes('异常终止') || displayStatus.includes('正常结束') ||
        displayStatus.includes('胜利') || gameData.endTime) {
        displayStatus = '游戏结束';
        statusEl.style.background = 'rgba(239, 68, 68, 0.15)';
        statusEl.style.color = '#fca5a5';
    } else {
        displayStatus = '进行中';
        statusEl.style.background = 'rgba(34, 197, 94, 0.15)';
        statusEl.style.color = '#86efac';
    }

    statusEl.textContent = displayStatus;
}

function renderTable(gameData) {
    const container = document.getElementById('playersGrid');
    container.innerHTML = '';

    // Center logo
    const center = document.createElement('div');
    center.className = 'table-center';
    center.innerHTML = '<span class="table-logo">🐺</span>';
    container.appendChild(center);

    const players = gameData.players || [];
    if (players.length === 0) return;

    const lastActions = getLastActions(gameData);
    const radius = 240;

    players.forEach((player, index) => {
        const angle = (index / players.length) * Math.PI * 2 - Math.PI / 2;
        const x = 300 + Math.cos(angle) * radius;
        const y = 300 + Math.sin(angle) * radius;

        // Player seat
        const seat = document.createElement('div');
        seat.className = `player-seat role-${player.role || 'villager'}${player.alive === false ? ' dead' : ''}`;
        seat.style.left = `${x}px`;
        seat.style.top = `${y}px`;

        // Card
        const card = document.createElement('div');
        card.className = 'player-card';
        card.innerHTML = `
            <div class="player-avatar">${player.name.slice(-1)}</div>
            <div class="player-name">${player.name}</div>
            <div class="player-role">${roleMap[player.role] || player.role || '未知'}</div>
        `;

        // Click handler for player detail modal
        card.addEventListener('click', () => openPlayerModal(player.name));

        if (player.alive === false) {
            const marker = document.createElement('div');
            marker.className = 'death-marker';
            marker.textContent = '☠';
            seat.appendChild(marker);
        }

        seat.appendChild(card);

        // Only show bubble for the SINGLE latest speaker (behavior + speech only)
        if (lastActions && lastActions.player === player.name && player.alive !== false) {
            const bubble = document.createElement('div');
            const isTop = Math.sin(angle) < 0;

            // Build content: behavior first, then speech (NO thought)
            let bubbleContent = '';
            if (lastActions.behavior) {
                bubbleContent += '👁 ' + lastActions.behavior;
            }
            if (lastActions.speech) {
                if (bubbleContent) bubbleContent += '\n\n';
                bubbleContent += '💬 ' + lastActions.speech;
            }

            if (bubbleContent) {
                bubble.className = `speech-bubble bubble-speech ${isTop ? 'bubble-top' : 'bubble-bottom'}`;
                bubble.textContent = bubbleContent.length > 150
                    ? bubbleContent.substring(0, 150) + '...'
                    : bubbleContent;
                bubble.style.left = '50%';
                bubble.style.transform = 'translateX(-50%)';
                bubble.style.whiteSpace = 'pre-wrap';
                bubble.style[isTop ? 'bottom' : 'top'] = '100%';
                bubble.style.marginTop = isTop ? '' : '12px';
                bubble.style.marginBottom = isTop ? '12px' : '';
                seat.appendChild(bubble);
            }
        }

        container.appendChild(seat);
    });
}

function getLastActions(gameData) {
    // Return only the SINGLE most recent action with speech or behavior
    if (!gameData.rounds || gameData.rounds.length === 0) return null;

    const lastRound = gameData.rounds[gameData.rounds.length - 1];
    if (!lastRound.phases || lastRound.phases.length === 0) return null;

    const lastPhase = lastRound.phases[lastRound.phases.length - 1];

    // Find the last action that has speech or behavior (NOT thought)
    for (let i = lastPhase.actions.length - 1; i >= 0; i--) {
        const action = lastPhase.actions[i];
        if (action.player && (action.speech || action.behavior)) {
            return {
                player: action.player,
                behavior: action.behavior || '',
                speech: action.speech || ''
            };
        }
    }

    return null;
}

function renderFeed(gameData) {
    const container = document.getElementById('roundsContainer');

    let rounds = gameData.rounds || [];
    if (!showAllHistory && rounds.length > 3) {
        rounds = rounds.slice(-3);
    }

    if (rounds.length === 0) {
        container.innerHTML = '<div class="loading">暂无游戏数据</div>';
        return;
    }

    container.innerHTML = rounds.map(round => `
        <div class="round-block">
            <div class="round-title">第 ${round.number} 回合</div>
            ${round.phases.map(phase => renderPhase(phase)).join('')}
        </div>
    `).join('');

    container.scrollTop = container.scrollHeight;
}

function renderPhase(phase) {
    const isNight = phase.type === 'night';
    return `
        <div class="phase-block">
            <div class="phase-label ${phase.type}">${isNight ? '🌙 夜晚' : '☀️ 白天'}</div>
            ${phase.actions.map(action => renderAction(action)).join('')}
        </div>
    `;
}

function renderAction(action) {
    if (action.type === 'vote_result') {
        return `<div class="system-msg vote">📊 ${action.details}</div>`;
    }
    if (action.type === 'death') {
        return `<div class="system-msg death">💀 ${action.details}</div>`;
    }
    if (action.type === 'system') {
        return `<div class="system-msg">📢 ${action.details}</div>`;
    }

    const icon = actionIcons[action.type] || '📝';
    return `
        <div class="action-card">
            <div class="action-meta">
                <span class="action-player">${icon} ${action.player}</span>
                <span class="action-time">${action.time || ''}</span>
            </div>
            <div class="action-body">
                ${action.thought ? `<div class="action-thought">💭 ${action.thought}</div>` : ''}
                ${action.behavior ? `<div class="action-behavior">👁 ${action.behavior}</div>` : ''}
                ${action.speech ? `<div class="action-speech">💬 ${action.speech}</div>` : ''}
            </div>
        </div>
    `;
}

// ===== Log Parser =====
function parseLogContent(content) {
    const lines = content.split('\n');
    const gameData = {
        gameId: '',
        startTime: '',
        endTime: '',
        status: '进行中',
        players: [],
        rounds: []
    };

    let currentRound = null;
    let currentPhase = null;
    let currentAction = null;
    let currentField = null;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        if (line.startsWith('游戏ID:')) {
            gameData.gameId = line.split(':')[1].trim();
        }
        if (line.startsWith('开始时间:')) {
            gameData.startTime = line.split('开始时间:')[1].trim();
        }
        if (line.startsWith('游戏结束时间:')) {
            gameData.endTime = line.split('游戏结束时间:')[1].trim();
        }
        if (line.includes('游戏结束:')) {
            gameData.status = line.split('游戏结束:')[1].split('。')[0].trim();
        }

        if (line.startsWith('- Player')) {
            const match = line.match(/- (Player\d+): (\w+)/);
            if (match) {
                gameData.players.push({
                    name: match[1],
                    role: match[2],
                    alive: true
                });
            }
        }

        if (line.match(/^第 \d+ 回合$/)) {
            if (currentRound) gameData.rounds.push(currentRound);
            currentRound = {
                number: parseInt(line.match(/\d+/)[0]),
                phases: []
            };
            currentPhase = null;
        }

        if (line === '【夜晚阶段】') {
            currentPhase = { type: 'night', actions: [] };
            if (currentRound) currentRound.phases.push(currentPhase);
        } else if (line === '【白天阶段】') {
            currentPhase = { type: 'day', actions: [] };
            if (currentRound) currentRound.phases.push(currentPhase);
        }

        if (line.match(/^\[\d{2}:\d{2}:\d{2}\]/)) {
            // Skip reflection entries (format: [time] [第X回合-反思] PlayerName)
            if (line.includes('回合-反思') || line.includes('反思]')) {
                currentAction = null;
                currentField = null;
                continue;
            }

            const timeMatch = line.match(/\[(\d{2}:\d{2}:\d{2})\]/);
            const actionMatch = line.match(/\] (.+?) \| (.+)/);

            if (timeMatch && actionMatch) {
                currentAction = {
                    time: timeMatch[1],
                    type: actionMatch[1],
                    player: actionMatch[2],
                    thought: '',
                    behavior: '',
                    speech: ''
                };
                if (currentPhase) currentPhase.actions.push(currentAction);
            }
        }

        if (currentAction) {
            // Skip separator lines (dashes, equals)
            if (line.match(/^[-=]+$/) || line === '') {
                continue;
            }

            if (line.startsWith('(心声)') || line.startsWith('    (心声)')) {
                const content = line.replace(/^\s*\(心声\)\s*/, '');
                currentAction.thought = content;
                currentField = 'thought';
            } else if (line.startsWith('(表现)') || line.startsWith('    (表现)')) {
                const content = line.replace(/^\s*\(表现\)\s*/, '');
                currentAction.behavior = content;
                currentField = 'behavior';
            } else if (line.startsWith('(发言)') || line.startsWith('    (发言)')) {
                const content = line.replace(/^\s*\(发言\)\s*/, '');
                currentAction.speech = content;
                currentField = 'speech';
            } else if (line.startsWith('(思考)') || line.startsWith('    (思考)') ||
                line.startsWith('(印象)') || line.startsWith('    (印象)')) {
                // These are reflection-specific fields, skip them
                currentField = null;
            } else if (currentField &&
                !line.startsWith('[') &&
                !line.startsWith('游戏') &&
                !line.startsWith('- Player') &&
                !line.match(/^第 \d+ 回合$/) &&
                !line.match(/^[【📢💀📊]/) &&
                !line.match(/^[-=]+$/)) {
                // Continue appending to current field
                if (currentField === 'thought') currentAction.thought += '\n' + line;
                if (currentField === 'behavior') currentAction.behavior += '\n' + line;
                if (currentField === 'speech') currentAction.speech += '\n' + line;
            }
        }

        if (line.match(/📊 .+投票结果/)) {
            const match = line.match(/📊 (.+投票结果 .+)/);
            if (match && currentPhase) {
                currentPhase.actions.push({ type: 'vote_result', details: match[1] });
            }
        }

        if (line.match(/💀 (夜晚死亡|白天死亡)/)) {
            const match = line.match(/💀 (夜晚死亡|白天死亡) (.+)/);
            if (match && currentPhase) {
                currentPhase.actions.push({ type: 'death', details: `${match[1]}: ${match[2]}` });
                match[2].split(',').forEach(name => {
                    const player = gameData.players.find(p => p.name === name.trim());
                    if (player) player.alive = false;
                });
            }
        }

        if (line.match(/📢 系统公告/)) {
            let announcement = '';
            i++;
            while (i < lines.length && !lines[i].includes('[') && lines[i].trim()) {
                announcement += lines[i].trim() + ' ';
                i++;
            }
            if (currentPhase) {
                currentPhase.actions.push({ type: 'system', details: announcement.trim() });
            }
        }
    }

    if (currentRound) gameData.rounds.push(currentRound);

    // Parse reflections separately
    parseReflections(content);

    return gameData;
}

// ===== Parse Reflections =====
function parseReflections(content) {
    playerReflections = {};
    const lines = content.split('\n');

    let currentPlayer = null;
    let currentReflection = { thinking: '', impressions: '' };
    let currentSection = null;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();

        // Detect reflection header
        if (trimmed.match(/^\[\d{2}:\d{2}:\d{2}\].*回合-反思.*Player\d+/)) {
            // Save previous player's reflection
            if (currentPlayer && (currentReflection.thinking || currentReflection.impressions)) {
                playerReflections[currentPlayer] = { ...currentReflection };
            }

            // Extract new player name
            const match = trimmed.match(/Player\d+/);
            if (match) {
                currentPlayer = match[0];
                currentReflection = { thinking: '', impressions: '' };
                currentSection = null;
            }
        } else if (currentPlayer) {
            // Skip game end info lines
            if (trimmed.includes('游戏异常终止') ||
                trimmed.includes('游戏结束时间') ||
                trimmed.includes('游戏状态') ||
                trimmed.includes('游戏结束') ||
                trimmed.startsWith('游戏')) {
                currentSection = null;
                continue;
            }

            // Parse reflection content
            if (trimmed.startsWith('(思考)') || line.includes('(思考)')) {
                currentSection = 'thinking';
                const content = trimmed.replace(/^\s*\(思考\)\s*/, '');
                currentReflection.thinking = content;
            } else if (trimmed.startsWith('(印象)') || line.includes('(印象)')) {
                currentSection = 'impressions';
                const content = trimmed.replace(/^\s*\(印象\)\s*/, '');
                currentReflection.impressions = content;
            } else if (currentSection && !trimmed.startsWith('[') && !trimmed.match(/^[-=]+$/)) {
                if (currentSection === 'thinking') {
                    currentReflection.thinking += '\n' + trimmed;
                } else if (currentSection === 'impressions') {
                    currentReflection.impressions += '\n' + trimmed;
                }
            }
        }
    }

    // Save last player's reflection
    if (currentPlayer && (currentReflection.thinking || currentReflection.impressions)) {
        playerReflections[currentPlayer] = { ...currentReflection };
    }
}

// ===== Modal Functions =====
function openPlayerModal(playerName) {
    const modal = document.getElementById('playerModal');
    document.getElementById('modalPlayerName').textContent = playerName;

    // Display reflection
    const reflection = playerReflections[playerName];
    const reflectionEl = document.getElementById('modalReflection');
    if (reflection && (reflection.thinking || reflection.impressions)) {
        let text = '';
        if (reflection.thinking) {
            text += '💭 思考:\n' + reflection.thinking + '\n\n';
        }
        if (reflection.impressions) {
            text += '👥 印象:\n' + reflection.impressions;
        }
        reflectionEl.textContent = text.trim();
    } else {
        reflectionEl.textContent = '暂无反思内容';
    }

    // Load experience from API
    const expEl = document.getElementById('modalExperience');
    expEl.textContent = '加载中...';

    // Extract date from current log file (e.g., game_20251212_153557.log -> 20251212_153557)
    if (currentLogFile) {
        const dateMatch = currentLogFile.match(/(\d{8}_\d{6})/);
        if (dateMatch) {
            const dateSuffix = dateMatch[1];
            loadPlayerExperience(dateSuffix, playerName, expEl);
        } else {
            expEl.textContent = '无法解析日期';
        }
    } else {
        expEl.textContent = '未选择日志文件';
    }

    modal.classList.add('active');
}

async function loadPlayerExperience(dateSuffix, playerName, targetEl) {
    try {
        const response = await fetch(`${apiBaseUrl}/api/experiences/${dateSuffix}/${playerName}`);
        const data = await response.json();

        if (data.error) {
            targetEl.textContent = data.error;
            return;
        }

        if (data.experiences && Object.keys(data.experiences).length > 0) {
            // Format experiences nicely
            let text = '';
            for (const [key, value] of Object.entries(data.experiences)) {
                text += `📌 ${key}:\n${typeof value === 'object' ? JSON.stringify(value, null, 2) : value}\n\n`;
            }
            targetEl.textContent = text.trim() || '暂无经验数据';
        } else {
            targetEl.textContent = '暂无经验数据';
        }
    } catch (error) {
        console.error('加载经验失败:', error);
        targetEl.textContent = '加载失败';
    }
}

function closePlayerModal() {
    document.getElementById('playerModal').classList.remove('active');
}

// Close modal on background click
document.addEventListener('click', (e) => {
    const modal = document.getElementById('playerModal');
    if (e.target === modal) {
        closePlayerModal();
    }
});

// ===== Utility =====
function showError(message) {
    document.getElementById('roundsContainer').innerHTML = `<div class="error">❌ ${message}</div>`;
}
