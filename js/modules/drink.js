/**
 * 饮品日记模块
 */
const DrinkModule = (function() {

  let currentDate = null;
  const sweetnessLevels = ['无糖', '微糖', '半糖', '全糖', '多糖'];
  const drinkTypes = [
    { name: '咖啡', icon: '☕' },
    { name: '奶茶', icon: '🧋' },
    { name: '果汁', icon: '🧃' },
    { name: '茶饮', icon: '🍵' },
    { name: '汽水', icon: '🥤' },
    { name: '水', icon: '💧' },
    { name: '其他', icon: '🥛' }
  ];

  function render(date) {
    currentDate = date;
    const main = document.getElementById('mainContent');
    const records = Storage.getModuleRecords(date, 'drink');
    let totalCal = records.reduce((s, r) => s + (parseInt(r.calories) || 0), 0);
    let totalMl = records.reduce((s, r) => s + (parseInt(r.volume) || 0), 0);

    main.innerHTML = `
      <div class="fade-in">
        <div class="module-calendar" id="drinkCalendar"></div>

        <div class="card" style="display:flex;justify-content:space-between;align-items:center;">
          <div>
            <div style="font-size:13px;color:var(--text-secondary);">${UI.formatDateFull(date)}</div>
            <div style="font-size:15px;font-weight:600;margin-top:4px;">${UI.getWeekday(date)}</div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:28px;font-weight:700;color:var(--accent);">${totalMl}<span style="font-size:14px;">ml</span></div>
            <div style="font-size:12px;color:var(--text-hint);">${totalCal} kcal</div>
          </div>
        </div>

        <div class="section-title">今日饮品</div>
        <div id="drinkList"></div>
      </div>
    `;

    renderList(records);
    document.getElementById('fab').style.display = 'flex';
    document.getElementById('fab').onclick = () => showAddModal();

    UI.renderModuleCalendar('drinkCalendar', date, 'drink', (newDate) => {
      render(newDate);
    });
  }

  async function renderList(records) {
    const container = document.getElementById('drinkList');
    if (records.length === 0) {
      container.innerHTML = UI.emptyState('点击右下角 + 记录今日饮品');
      return;
    }

    container.innerHTML = '';
    for (let i = 0; i < records.length; i++) {
      const r = records[i];
      const div = document.createElement('div');
      div.className = 'drink-card';

      let thumbHTML = '';
      if (r.imageId) {
        const url = await Storage.getImageURL(r.imageId);
        if (url) {
          thumbHTML = `<img class="drink-thumb" src="${url}" alt="">`;
        }
      }
      if (!thumbHTML) {
        const type = drinkTypes.find(t => t.name === r.type) || drinkTypes[drinkTypes.length - 1];
        thumbHTML = `<div class="drink-thumb" style="display:flex;align-items:center;justify-content:center;background:var(--primary-bg);font-size:28px;">${type.icon}</div>`;
      }

      div.innerHTML = `
        ${thumbHTML}
        <div class="drink-info">
          <div class="drink-name">${escapeHtml(r.name || r.type || '饮品')}</div>
          <div class="drink-meta">
            ${r.type ? `<span class="drink-meta-item">${escapeHtml(r.type)}</span>` : ''}
            ${r.sweetness ? `<span class="drink-meta-item">🍯 ${escapeHtml(r.sweetness)}</span>` : ''}
            ${r.volume ? `<span class="drink-meta-item">📏 ${r.volume}ml</span>` : ''}
            ${r.calories ? `<span class="drink-meta-item">🔥 ${r.calories}kcal</span>` : ''}
            ${r.time ? `<span class="drink-meta-item">⏰ ${r.time}</span>` : ''}
          </div>
          <div style="display:flex;gap:4px;margin-top:6px;">
            <button class="plan-action-btn" data-action="edit" data-idx="${i}" style="width:28px;height:28px;">
              <svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
            </button>
            <button class="plan-action-btn" data-action="delete" data-idx="${i}" style="width:28px;height:28px;">
              <svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
            </button>
          </div>
        </div>
      `;
      container.appendChild(div);

      const thumb = div.querySelector('.drink-thumb');
      if (thumb && thumb.tagName === 'IMG') {
        thumb.addEventListener('click', () => UI.showImage(thumb.src));
      }
    }

    container.querySelectorAll('[data-action="edit"]').forEach(btn => {
      btn.addEventListener('click', () => showAddModal(parseInt(btn.dataset.idx)));
    });
    container.querySelectorAll('[data-action="delete"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx);
        UI.confirm('确定删除这条饮品记录吗？', () => {
          Storage.deleteRecord(currentDate, 'drink', idx);
          render(currentDate);
          UI.toast('已删除');
        });
      });
    });
  }

  function showAddModal(editIdx) {
    const records = Storage.getModuleRecords(currentDate, 'drink');
    const editing = editIdx !== undefined ? records[editIdx] : null;
    let currentImageId = editing?.imageId || null;

    const bodyHTML = `
      <div class="form-group">
        <label class="form-label">饮品图片</label>
        <div id="imageUploadArea"></div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">饮品名称</label>
          <input type="text" class="form-input" id="drinkName" placeholder="如：拿铁、满杯红柚" value="${editing ? escapeHtml(editing.name || '') : ''}">
        </div>
        <div class="form-group">
          <label class="form-label">饮品类型</label>
          <select class="form-select" id="drinkType">
            <option value="">选择类型</option>
            ${drinkTypes.map(t => `<option value="${t.name}" ${editing?.type === t.name ? 'selected' : ''}>${t.icon} ${t.name}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">甜度</label>
          <select class="form-select" id="drinkSweetness">
            <option value="">选择甜度</option>
            ${sweetnessLevels.map(s => `<option value="${s}" ${editing?.sweetness === s ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">饮用时间</label>
          <input type="time" class="form-input" id="drinkTime" value="${editing?.time || new Date().toTimeString().slice(0, 5)}">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">容量 (ml)</label>
          <input type="number" class="form-input" id="drinkVolume" placeholder="0" value="${editing?.volume || ''}">
        </div>
        <div class="form-group">
          <label class="form-label">热量 (kcal)</label>
          <input type="number" class="form-input" id="drinkCalories" placeholder="0" value="${editing?.calories || ''}">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">备注</label>
        <textarea class="form-textarea" id="drinkNote" placeholder="口味、感受等...">${editing?.note ? escapeHtml(editing.note) : ''}</textarea>
      </div>
    `;

    const { modal } = UI.showModal(editIdx !== undefined ? '编辑饮品' : '记录饮品', bodyHTML, {
      confirmText: editIdx !== undefined ? '更新' : '保存',
      cancelText: '取消',
      onConfirm: () => {
        const name = modal.querySelector('#drinkName').value.trim();
        const type = modal.querySelector('#drinkType').value;
        const sweetness = modal.querySelector('#drinkSweetness').value;
        const time = modal.querySelector('#drinkTime').value;
        const volume = modal.querySelector('#drinkVolume').value;
        const calories = modal.querySelector('#drinkCalories').value;
        const note = modal.querySelector('#drinkNote').value.trim();

        if (!name && !type && !currentImageId) {
          UI.toast('请至少填写一项内容');
          return false;
        }

        const record = { name, type, sweetness, time, volume, calories, note, imageId: currentImageId };
        if (editIdx !== undefined) {
          Storage.updateRecord(currentDate, 'drink', editIdx, record);
          UI.toast('已更新');
        } else {
          Storage.addRecord(currentDate, 'drink', record);
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
