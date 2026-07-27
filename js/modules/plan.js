/**
 * 每日计划模块
 */
const PlanModule = (function() {

  let currentDate = null;

  function render(date) {
    currentDate = date;
    const main = document.getElementById('mainContent');
    const records = Storage.getModuleRecords(date, 'plan');
    const doneCount = records.filter(r => r.done).length;

    main.innerHTML = `
      <div class="fade-in">
        <div class="card" style="display:flex;justify-content:space-between;align-items:center;">
          <div>
            <div style="font-size:13px;color:var(--text-secondary);">${UI.formatDateFull(date)}</div>
            <div style="font-size:15px;font-weight:600;margin-top:4px;">${UI.getWeekday(date)}</div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:28px;font-weight:700;color:var(--primary);">${doneCount}<span style="font-size:16px;color:var(--text-hint);">/${records.length}</span></div>
            <div style="font-size:12px;color:var(--text-hint);">已完成</div>
          </div>
        </div>

        <div class="section-title">待办事项</div>
        <div id="planList"></div>
      </div>
    `;

    renderList(records);

    // 显示 FAB
    document.getElementById('fab').style.display = 'flex';
    document.getElementById('fab').onclick = () => showAddModal();
  }

  async function renderList(records) {
    const container = document.getElementById('planList');
    if (records.length === 0) {
      container.innerHTML = UI.emptyState('点击右下角 + 添加今日计划');
      return;
    }

    container.innerHTML = '';
    for (let i = 0; i < records.length; i++) {
      const r = records[i];
      const div = document.createElement('div');
      div.className = 'plan-item' + (r.done ? ' done' : '');
      let thumbHTML = '';
      if (r.imageId) {
        const url = await Storage.getImageURL(r.imageId);
        if (url) {
          thumbHTML = `<img class="plan-thumb" src="${url}" alt="">`;
        }
      }
      div.innerHTML = `
        <div class="plan-check ${r.done ? 'done' : ''}" data-idx="${i}">
          <svg viewBox="0 0 24 24"><path fill="currentColor" d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
        </div>
        <div class="plan-content">
          <div class="plan-title">${escapeHtml(r.title)}</div>
          <div class="plan-meta">
            ${r.reminder ? `<span class="plan-meta-item">⏰ ${r.reminder}</span>` : ''}
            ${r.note ? `<span class="plan-meta-item">📝 ${escapeHtml(r.note)}</span>` : ''}
          </div>
          ${thumbHTML}
        </div>
        <div class="plan-actions">
          <button class="plan-action-btn" data-action="edit" data-idx="${i}">
            <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
          </button>
          <button class="plan-action-btn" data-action="delete" data-idx="${i}">
            <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
          </button>
        </div>
      `;
      container.appendChild(div);

      // 缩略图点击
      const thumb = div.querySelector('.plan-thumb');
      if (thumb) {
        thumb.addEventListener('click', () => UI.showImage(thumb.src));
      }
    }

    // 绑定事件
    container.querySelectorAll('.plan-check').forEach(check => {
      check.addEventListener('click', () => {
        const idx = parseInt(check.dataset.idx);
        toggleDone(idx);
      });
    });
    container.querySelectorAll('[data-action="edit"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx);
        showAddModal(idx);
      });
    });
    container.querySelectorAll('[data-action="delete"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx);
        UI.confirm('确定删除这条计划吗？', () => {
          Storage.deleteRecord(currentDate, 'plan', idx);
          render(currentDate);
          UI.toast('已删除');
        });
      });
    });
  }

  function toggleDone(idx) {
    const records = Storage.getModuleRecords(currentDate, 'plan');
    records[idx].done = !records[idx].done;
    Storage.saveModuleRecords(currentDate, 'plan', records);
    render(currentDate);
  }

  function showAddModal(editIdx) {
    const records = Storage.getModuleRecords(currentDate, 'plan');
    const editing = editIdx !== undefined ? records[editIdx] : null;
    let currentImageId = editing?.imageId || null;
    let currentTags = editing?.tags ? [...editing.tags] : [];

    const bodyHTML = `
      <div class="form-group">
        <label class="form-label">计划内容</label>
        <input type="text" class="form-input" id="planTitle" placeholder="今天要做什么？" value="${editing ? escapeHtml(editing.title) : ''}">
      </div>
      <div class="form-group">
        <label class="form-label">提醒时间</label>
        <input type="time" class="form-input" id="planReminder" value="${editing?.reminder || ''}">
      </div>
      <div class="form-group">
        <label class="form-label">备注</label>
        <textarea class="form-textarea" id="planNote" placeholder="补充说明...">${editing?.note ? escapeHtml(editing.note) : ''}</textarea>
      </div>
      <div class="form-group">
        <label class="form-label">配图</label>
        <div id="imageUploadArea"></div>
      </div>
    `;

    const { modal } = UI.showModal(editIdx !== undefined ? '编辑计划' : '添加计划', bodyHTML, {
      confirmText: editIdx !== undefined ? '更新' : '添加',
      cancelText: '取消',
      onConfirm: () => {
        const title = modal.querySelector('#planTitle').value.trim();
        if (!title) {
          UI.toast('请输入计划内容');
          return false;
        }
        const reminder = modal.querySelector('#planReminder').value;
        const note = modal.querySelector('#planNote').value.trim();

        const record = { title, reminder, note, imageId: currentImageId, done: editing?.done || false };
        if (editIdx !== undefined) {
          Storage.updateRecord(currentDate, 'plan', editIdx, record);
          UI.toast('已更新');
        } else {
          Storage.addRecord(currentDate, 'plan', record);
          UI.toast('已添加');
        }
        render(currentDate);

        // 设置提醒
        if (reminder) {
          scheduleReminder(title, reminder);
        }
      }
    });

    // 图片上传
    const uploadArea = modal.querySelector('#imageUploadArea');
    const uploadWidget = UI.createImageUploadArea(currentImageId, (newId) => {
      currentImageId = newId;
    });
    uploadArea.appendChild(uploadWidget);
  }

  function scheduleReminder(title, time) {
    // 使用 Notification API（需用户授权）
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') {
      _createNotification(title, time);
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          _createNotification(title, time);
        }
      });
    }
  }

  function _createNotification(title, time) {
    const now = new Date();
    const [h, m] = time.split(':').map(Number);
    const target = new Date(now);
    target.setHours(h, m, 0, 0);
    if (target <= now) return; // 已过时间不提醒

    const delay = target.getTime() - now.getTime();
    setTimeout(() => {
      try {
        new Notification('明天星期几', {
          body: title,
          icon: 'assets/icons/icon-192.png',
          tag: 'plan_' + Date.now()
        });
      } catch (e) {
        console.warn('通知创建失败', e);
      }
    }, delay);
    UI.toast(`已设置 ${time} 提醒`);
  }

  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  return { render };
})();
