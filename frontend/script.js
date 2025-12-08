// 全局变量
let currentLogFile = null;
let autoRefreshInterval = null;

// 角色映射
const roleMap = {
    'werewolf': '狼人',
    'villager': '村民',
    'seer': '预言家',
    'witch': '女巫',
    'hunter': '猎人'
};

// 动作图标映射
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

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    loadLogFiles();
    setupEventListeners();
});

// 设置事件监听
function setupEventListeners() {
    document.getElementById('logSelector').addEventListener('change', (e) => {
        if (e.target.value) {
            loadGameLog(e.target.value);
        }
    });

    document.getElementById('refreshBtn').addEventListener('click', () => {
        if (currentLogFile) {
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
}

// 加载日志文件列表
async function loadLogFiles() {
    try {
        const response = await fetch('/api/logs');
        const files = await response.json();

        const selector = document.getElementById('logSelector');
        selector.innerHTML = files.map(file =>
            `<option value="${file.name}">${file.name} (${file.time})</option>`
        ).join('');

        // 自动加载最新的日志
        if (files.length > 0) {
            currentLogFile = files[0].name;
            selector.value = currentLogFile;
            loadGameLog(currentLogFile);
        }
    } catch (error) {
        console.error('加载日志列表失败:', error);
        showError('无法加载日志列表，请确保后端服务正在运行');
    }
}

// 加载游戏日志
async function loadGameLog(filename) {
    try {
        showLoading();
        const response = await fetch(`/api/logs/${filename}`);
        const logContent = await response.text();

        currentLogFile = filename;
        parseAndDisplayLog(logContent);
    } catch (error) {
        console.error('加载日志失败:', error);
        showError('无法加载日志文件');
    }
}

// 解析并显示日志
function parseAndDisplayLog(logContent) {
    const gameData = parseLogContent(logContent);
    displayGameInfo(gameData);
    displayPlayers(gameData);
    displayRounds(gameData);
}

// 解析日志内容
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

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        // 解析游戏ID
        if (line.startsWith('游戏ID:')) {
            gameData.gameId = line.split(':')[1].trim();
        }

        // 解析开始时间
        if (line.startsWith('开始时间:')) {
            gameData.startTime = line.split('开始时间:')[1].trim();
        }

        // 解析结束时间
        if (line.startsWith('游戏结束时间:')) {
            gameData.endTime = line.split('游戏结束时间:')[1].trim();
        }

        // 解析游戏结束状态
        if (line.includes('游戏结束:')) {
            gameData.status = line.split('游戏结束:')[1].split('。')[0].trim();
        }

        // 解析玩家列表
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

        // 解析回合
        if (line.match(/^第 \d+ 回合$/)) {
            if (currentRound) {
                gameData.rounds.push(currentRound);
            }
            currentRound = {
                number: parseInt(line.match(/\d+/)[0]),
                phases: []
            };
            currentPhase = null;
        }

        // 解析阶段
        if (line === '【夜晚阶段】') {
            currentPhase = { type: 'night', actions: [] };
            if (currentRound) currentRound.phases.push(currentPhase);
        } else if (line === '【白天阶段】') {
            currentPhase = { type: 'day', actions: [] };
            if (currentRound) currentRound.phases.push(currentPhase);
        }

        // 解析动作
        if (line.match(/^\[\d{2}:\d{2}:\d{2}\]/)) {
            const timeMatch = line.match(/\[(\d{2}:\d{2}:\d{2})\]/);
            const actionMatch = line.match(/\] (.+?) \| (.+)/);

            if (timeMatch && actionMatch) {
                currentAction = {
                    time: timeMatch[1],
                    type: actionMatch[1],
                    player: actionMatch[2],
                    thought: '',
                    behavior: '',
                    speech: '',
                    details: ''
                };

                if (currentPhase) {
                    currentPhase.actions.push(currentAction);
                }
            }
        }

        // 解析心声、表现、发言
        if (currentAction) {
            if (line.startsWith('(心声)')) {
                currentAction.thought = line.substring(4).trim();
            } else if (line.startsWith('(表现)')) {
                currentAction.behavior = line.substring(4).trim();
            } else if (line.startsWith('(发言)')) {
                currentAction.speech = line.substring(4).trim();
            } else if (line.includes('投票给') || line.includes('查验') || line.includes('使用')) {
                currentAction.details = line;
            }
        }

        // 解析投票结果
        if (line.match(/📊 .+投票结果/)) {
            const resultMatch = line.match(/📊 (.+投票结果 .+)/);
            if (resultMatch && currentPhase) {
                currentPhase.actions.push({
                    type: 'vote_result',
                    details: resultMatch[1]
                });
            }
        }

        // 解析死亡公告
        if (line.match(/💀 (夜晚死亡|白天死亡)/)) {
            const deathMatch = line.match(/💀 (夜晚死亡|白天死亡) (.+)/);
            if (deathMatch && currentPhase) {
                currentPhase.actions.push({
                    type: 'death',
                    details: `${deathMatch[1]}: ${deathMatch[2]}`
                });

                // 更新玩家状态
                const deadPlayers = deathMatch[2].split(',').map(p => p.trim());
                deadPlayers.forEach(playerName => {
                    const player = gameData.players.find(p => p.name === playerName);
                    if (player) player.alive = false;
                });
            }
        }

        // 解析系统公告
        if (line.match(/📢 系统公告/)) {
            let announcement = '';
            i++;
            while (i < lines.length && !lines[i].includes('[') && lines[i].trim()) {
                announcement += lines[i].trim() + ' ';
                i++;
            }
            if (currentPhase) {
                currentPhase.actions.push({
                    type: 'system',
                    details: announcement.trim()
                });
            }
        }
    }

    // 添加最后一个回合
    if (currentRound) {
        gameData.rounds.push(currentRound);
    }

    return gameData;
}

// 显示游戏信息
function displayGameInfo(gameData) {
    document.getElementById('gameId').textContent = gameData.gameId || '-';
    document.getElementById('startTime').textContent = gameData.startTime || '-';
    document.getElementById('endTime').textContent = gameData.endTime || '游戏进行中';
    document.getElementById('gameStatus').textContent = gameData.status || '进行中';
}

// 显示玩家列表
// 显示玩家列表
function displayPlayers(gameData) {
    const playersGrid = document.getElementById('playersGrid');
    const totalPlayers = gameData.players.length;
    const radius = 260; // Distance from center

    // Build HTML for table (static center) + players
    let html = `
        <div class="table-surface">
            <div class="wolf-logo">🐺</div>
        </div>
    `;

    gameData.players.forEach((player, index) => {
        // Calculate position in circle
        // -90deg to start from top
        const angle = (index * (360 / totalPlayers)) - 90;
        const radians = angle * (Math.PI / 180);

        // Offset from center (300, 300) since container is 600x600
        // But we use CSS relative to 50% 50%, so simple trig is enough for transform
        const x = Math.round(Math.cos(radians) * radius);
        const y = Math.round(Math.sin(radians) * radius);

        html += `
            <div class="player-card ${player.alive ? '' : 'dead'}" 
                 style="transform: translate(${x}px, ${y}px)">
                ${!player.alive ? '<div class="death-mark">💀</div>' : ''}
                <div class="player-avatar">
                   ${getRoleIcon(player.role)}
                </div>
                <div class="player-name">${player.name}</div>
                <div class="player-role-badge role-${player.role}">
                    ${roleMap[player.role] || player.role}
                </div>
            </div>
        `;
    });

    playersGrid.innerHTML = html;
}

function getRoleIcon(role) {
    const icons = {
        'werewolf': '🐺',
        'villager': '🧑‍🌾',
        'seer': '🔮',
        'witch': '🧪',
        'hunter': '🔫'
    };
    return icons[role] || '👤';
}

// 显示回合
function displayRounds(gameData) {
    const roundsContainer = document.getElementById('roundsContainer');
    roundsContainer.innerHTML = gameData.rounds.map(round => `
        <div class="round-card">
            <div class="round-header">第 ${round.number} 回合</div>
            <div class="round-content">
                ${round.phases.map(phase => displayPhase(phase)).join('')}
            </div>
        </div>
    `).join('');
}

// 显示阶段
function displayPhase(phase) {
    const phaseTitle = phase.type === 'night' ? '🌙 夜晚阶段' : '☀️ 白天阶段';
    return `
        <div class="phase-section">
            <div class="phase-title">${phaseTitle}</div>
            ${phase.actions.map(action => displayAction(action)).join('')}
        </div>
    `;
}

// 显示动作
function displayAction(action) {
    if (action.type === 'vote_result') {
        return `<div class="vote-result">📊 ${action.details}</div>`;
    }

    if (action.type === 'death') {
        return `<div class="death-announcement">💀 ${action.details}</div>`;
    }

    if (action.type === 'system') {
        return `<div class="system-announcement">📢 ${action.details}</div>`;
    }

    const icon = actionIcons[action.type] || '📝';

    return `
        <div class="action-item">
            <div class="action-header">
                <span class="action-icon">${icon}</span>
                <span>${action.type} | ${action.player}</span>
                <span class="action-time">${action.time}</span>
            </div>
            <div class="action-content">
                ${action.thought ? `<div class="thought">${action.thought}</div>` : ''}
                ${action.behavior ? `<div class="behavior">${action.behavior}</div>` : ''}
                ${action.speech ? `<div class="speech">${action.speech}</div>` : ''}
                ${action.details ? `<div style="margin-top: 8px; color: #6c757d;">${action.details}</div>` : ''}
            </div>
        </div>
    `;
}

// 显示加载中
function showLoading() {
    document.getElementById('roundsContainer').innerHTML = '<div class="loading">⏳ 加载中...</div>';
}

// 显示错误
function showError(message) {
    document.getElementById('roundsContainer').innerHTML = `<div class="error">❌ ${message}</div>`;
}

// 开始自动刷新
function startAutoRefresh() {
    stopAutoRefresh();
    autoRefreshInterval = setInterval(() => {
        if (currentLogFile) {
            loadGameLog(currentLogFile);
        }
    }, 5000);
}

// 停止自动刷新
function stopAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
    }
}
