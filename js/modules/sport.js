/**
 * 运动日记模块
 * 支持手动记录 + URL Scheme 接收健康数据（配合 iOS 快捷指令自动同步）
 */
const SportModule = (function() {

  let currentDate = null;
  let healthData = null;
  let healthConnected = false;

  const sportTypes = [
    { name: '步行', icon: '🚶' },
    { name: '跑步', icon: '🏃' },
    { name: '骑行', icon: '🚴' },
    { name: '游泳', icon: '🏊' },
    { name: '瑜伽', icon: '🧘' },
    { name: '力量训练', icon: '💪' },
    { name: '球类运动', icon: '⚽' },
    { name: '其他', icon: '🏅' }
  ];

  // 监听 URL Scheme 回调，接收来自快捷指令的健康数据
  window.addEventListener('load', () => {
    const params = new URLSearchParams(window.location.hash.substring(1));
    if (params.get('action') === 'healthSync') {
      const steps = parseInt(params.get('steps')) || 0;
      const duration = parseInt(params.get('duration')) || 0;
      const calories = parseInt(params.get('calories')) || 0;
      const types = (params.get('types') || '').split(',').filter(Boolean);
      const date = params.get('date') || Storage.formatDate(new Date());

      if (steps || duration || calories) {
        healthData = { steps, duration, calories, sportTypes: types, syncedAt: Date.now() };
        healthConnected = true;
        Storage.setData('healthConnected', true);
        Storage.setData('healthData_' + date, healthData);
        UI.toast('✅ 健康数据已自动同步');

        // 清理 URL hash
        if (window.history && window.history.replaceState) {
          window.history.replaceState(null, '', window.location.pathname);
        }
      }
    }
  });

  function render(date) {
    currentDate = date;
    const main = document.getElementById('mainContent');
    const records = Storage.getModuleRecords(date, 'sport');

    // 读取健康数据连接状态
    healthConnected = Storage.getData('healthConnected', false);
    healthData = Storage.getData('healthData_' + date, null);

    // 汇总当日运动数据
    let totalSteps = healthData?.steps || 0;
    let totalDuration = healthData?.duration || 0;
    let totalCalories = healthData?.calories || 0;
    records.forEach(r => {
      totalSteps += parseInt(r.steps) || 0;
      totalDuration += parseInt(r.duration) || 0;
      totalCalories += parseInt(r.calories) || 0;
    });

    main.innerHTML = `
      <div class="fade-in">
        <div class="module-calendar" id="sportCalendar"></div>

        <div class="card" style="display:flex;justify-content:space-between;align-items:center;">
          <div>
            <div style="font-size:13px;color:var(--text-secondary);">${UI.formatDateFull(date)}</div>
            <div style="font-size:15px;font-weight:600;margin-top:4px;">${UI.getWeekday(date)}</div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:28px;font-weight:700;color:var(--danger);">${totalCalories}</div>
            <div style="font-size:12px;color:var(--text-hint);">千卡</div>
          </div>
        </div>

        <div class="health-sync-card">
          <div class="health-sync-header">
            <svg viewBox="0 0 24 24" width="22" height="22"><path fill="currentColor" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
            <div class="health-sync-title">健康数据</div>
            <div class="health-sync-status ${healthConnected ? 'connected' : ''}" id="healthStatus">${healthConnected ? '已连接' : '未连接'}</div>
          </div>
          <div class="health-metrics" id="healthMetrics">
            <div class="health-metric">
              <div class="health-metric-label">步数</div>
              <div class="health-metric-value">${totalSteps}<span class="health-metric-unit">步</span></div>
            </div>
            <div class="health-metric">
              <div class="health-metric-label">运动时长</div>
              <div class="health-metric-value">${totalDuration}<span class="health-metric-unit">分钟</span></div>
            </div>
            <div class="health-metric">
              <div class="health-metric-label">消耗卡路里</div>
              <div class="health-metric-value">${totalCalories}<span class="health-metric-unit">kcal</span></div>
            </div>
            <div class="health-metric">
              <div class="health-metric-label">运动类型</div>
              <div class="health-metric-value" style="font-size:16px;">${getSportTypesSummary()}</div>
            </div>
          </div>
          <button class="health-sync-btn" id="healthSyncBtn">
            <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/></svg>
            ${healthConnected ? '同步今日数据' : '连接苹果健康'}
          </button>
        </div>

        <div class="section-title">运动记录</div>
        <div id="sportList"></div>
      </div>
    `;

    renderList(records);
    document.getElementById('fab').style.display = 'flex';
    document.getElementById('fab').onclick = () => showAddModal();

    UI.renderModuleCalendar('sportCalendar', date, 'sport', (newDate) => {
      render(newDate);
    });

    document.getElementById('healthSyncBtn').addEventListener('click', syncHealthData);
  }

  function getSportTypesSummary() {
    const records = Storage.getModuleRecords(currentDate, 'sport');
    const types = new Set();
    if (healthData?.sportTypes) healthData.sportTypes.forEach(t => types.add(t));
    records.forEach(r => { if (r.type) types.add(r.type); });
    if (types.size === 0) return '暂无';
    return Array.from(types).slice(0, 2).join('、') + (types.size > 2 ? '等' : '');
  }

  async function syncHealthData() {
    const btn = document.getElementById('healthSyncBtn');
    const statusEl = document.getElementById('healthStatus');

    btn.innerHTML = '<span style="display:inline-block;width:16px;height:16px;border:2px solid rgba(255,255,255,0.3);border-top-color:#fff;border-radius:50%;animation:spin 0.6s linear infinite;"></span> 同步中...';
    btn.disabled = true;

    try {
      // 尝试通过 Web API 访问健康数据
      // 注意：浏览器环境无法直接访问 Apple HealthKit
      // 这里通过多种策略尝试获取数据
      const data = await fetchHealthData();

      if (data) {
        healthData = data;
        healthConnected = true;
        Storage.setData('healthConnected', true);
        Storage.setData('healthData_' + currentDate, data);
        statusEl.textContent = '已连接';
        statusEl.classList.add('connected');
        UI.toast('健康数据同步成功');
        render(currentDate);
      } else {
        throw new Error('无法获取健康数据');
      }
    } catch (err) {
      console.warn('健康数据同步失败:', err);
      // 提供手动输入入口
      showHealthManualInput();
    } finally {
      btn.disabled = false;
    }
  }

  async function fetchHealthData() {
    // 策略1：尝试通过 HealthKit Web Bridge（iOS Safari + 快捷指令桥接）
    if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.healthKit) {
      return new Promise((resolve) => {
        window.webkit.messageHandlers.healthKit.postMessage({
          date: currentDate,
          metrics: ['steps', 'duration', 'calories', 'sportTypes']
        });
        window._healthKitCallback = (data) => resolve(data);
        setTimeout(() => resolve(null), 5000);
      });
    }

    // 策略2：尝试通过 Generic Sensor API（部分设备支持计步器）
    if ('Accelerometer' in window && 'Gyroscope' in window) {
      try {
        // 注：此处为占位逻辑，实际步数需要持续累积
        return null;
      } catch (e) {
        // 忽略
      }
    }

    // 策略3：PWA 环境下无法直接访问 HealthKit
    return null;
  }

  function showHealthManualInput() {
    // 获取当前 APP 的 URL 基础地址
    const appUrl = window.location.origin + window.location.pathname;
    const shortcutUrl = appUrl + '#action=healthSync&steps=STEPS&duration=DURATION&calories=CALORIES&types=TYPES&date=DATE';

    const bodyHTML = `
      <div style="background:linear-gradient(135deg,#E8F5E9,#C8E6C9);padding:16px;border-radius:12px;margin-bottom:16px;">
        <div style="font-weight:600;font-size:15px;margin-bottom:8px;">📲 两种同步方式</div>
        <div style="font-size:13px;color:var(--text-secondary);line-height:1.6;">
          <strong>方式一：自动同步（推荐）</strong><br>
          打开 iOS「快捷指令」App → 新建自动化 → 添加"查找健康样本"操作 → 添加"打开URL"操作 → 粘贴下方URL模板<br><br>
          <strong>方式二：手动输入</strong><br>
          直接在下方填写今日数据
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">📋 快捷指令 URL 模板（复制到快捷指令中）</label>
        <textarea class="form-textarea" readonly style="font-size:11px;font-family:monospace;height:60px;background:#f5f5f5;" id="shortcutUrl">${shortcutUrl}</textarea>
        <button class="btn btn-secondary" style="margin-top:6px;width:100%;padding:8px;" id="copyShortcutBtn">📋 复制快捷指令 URL</button>
      </div>

      <hr style="border:none;border-top:1px solid var(--border);margin:16px 0;">

      <div class="form-group">
        <label class="form-label">步数</label>
        <input type="number" class="form-input" id="manualSteps" placeholder="如：8000" value="${healthData?.steps || ''}">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">运动时长 (分钟)</label>
          <input type="number" class="form-input" id="manualDuration" placeholder="如：30" value="${healthData?.duration || ''}">
        </div>
        <div class="form-group">
          <label class="form-label">消耗卡路里</label>
          <input type="number" class="form-input" id="manualCalories" placeholder="如：200" value="${healthData?.calories || ''}">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">运动类型（逗号分隔）</label>
        <input type="text" class="form-input" id="manualTypes" placeholder="如：步行,跑步" value="${healthData?.sportTypes ? healthData.sportTypes.join(',') : ''}">
      </div>
    `;

    UI.confirm(
      '选择健康数据同步方式',
      () => {
        UI.closeModal();
        setTimeout(() => {
          const { modal } = UI.showModal('同步健康数据', bodyHTML, {
            confirmText: '保存数据',
            cancelText: '取消',
            onConfirm: () => {
              const steps = parseInt(modal.querySelector('#manualSteps').value) || 0;
              const duration = parseInt(modal.querySelector('#manualDuration').value) || 0;
              const calories = parseInt(modal.querySelector('#manualCalories').value) || 0;
              const types = modal.querySelector('#manualTypes').value.split(',').map(t => t.trim()).filter(Boolean);

              healthData = { steps, duration, calories, sportTypes: types, syncedAt: Date.now() };
              healthConnected = true;
              Storage.setData('healthConnected', true);
              Storage.setData('healthData_' + currentDate, healthData);
              UI.toast('健康数据已保存');
              render(currentDate);
            }
          });

          // 复制按钮
          modal.querySelector('#copyShortcutBtn').addEventListener('click', () => {
            const url = modal.querySelector('#shortcutUrl').value;
            navigator.clipboard.writeText(url).then(() => {
              UI.toast('URL 已复制！粘贴到快捷指令中');
            }).catch(() => {
              UI.toast('请手动复制上方URL');
            });
          });
        }, 300);
      }
    );
  }

  async function renderList(records) {
    const container = document.getElementById('sportList');
    if (records.length === 0) {
      container.innerHTML = UI.emptyState('点击右下角 + 记录运动');
      return;
    }

    container.innerHTML = '';
    for (let i = 0; i < records.length; i++) {
      const r = records[i];
      const div = document.createElement('div');
      div.className = 'sport-card';
      const typeInfo = sportTypes.find(t => t.name === r.type) || sportTypes[sportTypes.length - 1];

      let imgHTML = '';
      if (r.imageId) {
        const url = await Storage.getImageURL(r.imageId);
        if (url) {
          imgHTML = `<img class="sport-thumb" src="${url}" alt="">`;
        }
      }

      div.innerHTML = `
        ${imgHTML}
        <div class="sport-header">
          <span style="font-size:24px;">${typeInfo.icon}</span>
          <span class="sport-type-badge">${escapeHtml(r.type || '运动')}</span>
          <span class="sport-time">${r.time || ''}</span>
        </div>
        <div class="sport-metrics">
          ${r.steps ? `<div class="sport-metric"><div class="sport-metric-num">${r.steps}</div><div class="sport-metric-label">步数</div></div>` : ''}
          ${r.duration ? `<div class="sport-metric"><div class="sport-metric-num">${r.duration}</div><div class="sport-metric-label">分钟</div></div>` : ''}
          ${r.calories ? `<div class="sport-metric"><div class="sport-metric-num">${r.calories}</div><div class="sport-metric-label">千卡</div></div>` : ''}
          ${r.distance ? `<div class="sport-metric"><div class="sport-metric-num">${r.distance}</div><div class="sport-metric-label">公里</div></div>` : ''}
        </div>
        ${r.note ? `<div class="sport-note">${escapeHtml(r.note)}</div>` : ''}
        <div style="display:flex;gap:4px;margin-top:10px;justify-content:flex-end;">
          <button class="plan-action-btn" data-action="edit" data-idx="${i}">
            <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
          </button>
          <button class="plan-action-btn" data-action="delete" data-idx="${i}">
            <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
          </button>
        </div>
      `;
      container.appendChild(div);

      const img = div.querySelector('.sport-thumb');
      if (img) {
        img.addEventListener('click', () => UI.showImage(img.src));
      }
    }

    container.querySelectorAll('[data-action="edit"]').forEach(btn => {
      btn.addEventListener('click', () => showAddModal(parseInt(btn.dataset.idx)));
    });
    container.querySelectorAll('[data-action="delete"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx);
        UI.confirm('确定删除这条运动记录吗？', () => {
          Storage.deleteRecord(currentDate, 'sport', idx);
          render(currentDate);
          UI.toast('已删除');
        });
      });
    });
  }

  function showAddModal(editIdx) {
    const records = Storage.getModuleRecords(currentDate, 'sport');
    const editing = editIdx !== undefined ? records[editIdx] : null;
    let currentImageId = editing?.imageId || null;

    const bodyHTML = `
      <div class="form-group">
        <label class="form-label">运动场景 / 装备图片</label>
        <div id="imageUploadArea"></div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">运动类型</label>
          <select class="form-select" id="sportType">
            ${sportTypes.map(t => `<option value="${t.name}" ${editing?.type === t.name ? 'selected' : ''}>${t.icon} ${t.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">运动时间</label>
          <input type="time" class="form-input" id="sportTime" value="${editing?.time || new Date().toTimeString().slice(0, 5)}">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">步数</label>
          <input type="number" class="form-input" id="sportSteps" placeholder="0" value="${editing?.steps || ''}">
        </div>
        <div class="form-group">
          <label class="form-label">时长 (分钟)</label>
          <input type="number" class="form-input" id="sportDuration" placeholder="0" value="${editing?.duration || ''}">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">消耗卡路里</label>
          <input type="number" class="form-input" id="sportCalories" placeholder="0" value="${editing?.calories || ''}">
        </div>
        <div class="form-group">
          <label class="form-label">距离 (公里)</label>
          <input type="number" step="0.1" class="form-input" id="sportDistance" placeholder="0.0" value="${editing?.distance || ''}">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">备注</label>
        <textarea class="form-textarea" id="sportNote" placeholder="运动感受、路线、天气等...">${editing?.note ? escapeHtml(editing.note) : ''}</textarea>
      </div>
    `;

    const { modal } = UI.showModal(editIdx !== undefined ? '编辑运动' : '记录运动', bodyHTML, {
      confirmText: editIdx !== undefined ? '更新' : '保存',
      cancelText: '取消',
      onConfirm: () => {
        const type = modal.querySelector('#sportType').value;
        const time = modal.querySelector('#sportTime').value;
        const steps = modal.querySelector('#sportSteps').value;
        const duration = modal.querySelector('#sportDuration').value;
        const calories = modal.querySelector('#sportCalories').value;
        const distance = modal.querySelector('#sportDistance').value;
        const note = modal.querySelector('#sportNote').value.trim();

        if (!type && !duration && !calories && !currentImageId) {
          UI.toast('请至少填写一项内容');
          return false;
        }

        const record = { type, time, steps, duration, calories, distance, note, imageId: currentImageId };
        if (editIdx !== undefined) {
          Storage.updateRecord(currentDate, 'sport', editIdx, record);
          UI.toast('已更新');
        } else {
          Storage.addRecord(currentDate, 'sport', record);
          UI.toast('已保存');
        }
        render(currentDate);
      }
    });

    modal.querySelector('#imageUploadArea').appendChild(
      UI.createImageUploadArea(currentImageId, (newId) => { currentImageId = newId; })
    );
  }

  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  return { render };
})();
