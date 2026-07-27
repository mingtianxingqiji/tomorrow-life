/**
 * 三餐日记模块
 */
const MealModule = (function() {

  let currentDate = null;
  const mealTypes = [
    { key: 'breakfast', name: '早餐', icon: '🌅', color: '#FFF3E0', textColor: '#E65100' },
    { key: 'lunch', name: '午餐', icon: '☀️', color: '#E8F5E9', textColor: '#2E7D32' },
    { key: 'dinner', name: '晚餐', icon: '🌙', color: '#F3E5F5', textColor: '#6A1B9A' }
  ];

  function render(date) {
    currentDate = date;
    const main = document.getElementById('mainContent');
    const dayMeal = Storage.getDayRecords(date).meal || { breakfast: [], lunch: [], dinner: [] };
    let totalCal = 0;
    mealTypes.forEach(t => {
      (dayMeal[t.key] || []).forEach(r => {
        totalCal += parseInt(r.calories) || 0;
      });
    });

    main.innerHTML = `
      <div class="fade-in">
        <div class="card" style="display:flex;justify-content:space-between;align-items:center;">
          <div>
            <div style="font-size:13px;color:var(--text-secondary);">${UI.formatDateFull(date)}</div>
            <div style="font-size:15px;font-weight:600;margin-top:4px;">${UI.getWeekday(date)}</div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:28px;font-weight:700;color:var(--accent);">${totalCal}</div>
            <div style="font-size:12px;color:var(--text-hint);">千卡</div>
          </div>
        </div>

        ${mealTypes.map(t => `
          <div class="meal-section">
            <div class="meal-header">
              <div class="meal-icon" style="background:${t.color};">${t.icon}</div>
              <div class="meal-title">${t.name}</div>
              <div class="meal-cal-total">${(dayMeal[t.key] || []).reduce((s, r) => s + (parseInt(r.calories) || 0), 0)} kcal</div>
            </div>
            <div id="mealList_${t.key}"></div>
          </div>
        `).join('')}
      </div>
    `;

    mealTypes.forEach(t => renderMealList(t, dayMeal[t.key] || []));
    document.getElementById('fab').style.display = 'flex';
    document.getElementById('fab').onclick = () => showAddModal();
  }

  async function renderMealList(mealType, records) {
    const container = document.getElementById('mealList_' + mealType.key);
    if (records.length === 0) {
      container.innerHTML = `
        <div class="card" style="text-align:center;padding:24px;color:var(--text-hint);font-size:13px;cursor:pointer;" data-meal="${mealType.key}">
          + 添加${mealType.name}
        </div>
      `;
      container.querySelector('[data-meal]').addEventListener('click', () => {
        showAddModal(null, mealType.key);
      });
      return;
    }

    container.innerHTML = '';
    for (let i = 0; i < records.length; i++) {
      const r = records[i];
      const div = document.createElement('div');
      div.className = 'meal-card';

      let thumbHTML = '';
      if (r.imageId) {
        const url = await Storage.getImageURL(r.imageId);
        if (url) {
          thumbHTML = `<img class="meal-thumb" src="${url}" alt="">`;
        } else {
          thumbHTML = `<div class="meal-thumb" style="display:flex;align-items:center;justify-content:center;">🍽️</div>`;
        }
      } else {
        thumbHTML = `<div class="meal-thumb" style="display:flex;align-items:center;justify-content:center;">🍽️</div>`;
      }

      div.innerHTML = `
        ${thumbHTML}
        <div class="meal-detail">
          <div class="meal-name">${escapeHtml(r.name || mealType.name)}</div>
          ${r.ingredients ? `<div class="meal-info-row">食材: ${escapeHtml(r.ingredients)}</div>` : ''}
          ${r.calories ? `<div class="meal-info-row">热量: ${r.calories} kcal</div>` : ''}
          ${r.feel ? `<div class="meal-feel">"${escapeHtml(r.feel)}"</div>` : ''}
          <div style="display:flex;gap:4px;margin-top:8px;">
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

      const thumb = div.querySelector('.meal-thumb');
      if (thumb && thumb.tagName === 'IMG') {
        thumb.addEventListener('click', () => UI.showImage(thumb.src));
      }
    }

    container.querySelectorAll('[data-action="edit"]').forEach(btn => {
      btn.addEventListener('click', () => showAddModal(parseInt(btn.dataset.idx), mealType.key));
    });
    container.querySelectorAll('[data-action="delete"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx);
        UI.confirm('确定删除这条记录吗？', () => {
          const records = Storage.getMealRecords(currentDate, mealType.key);
          if (records[idx]?.imageId) Storage.deleteImage(records[idx].imageId);
          records.splice(idx, 1);
          Storage.saveMealRecords(currentDate, mealType.key, records);
          render(currentDate);
          UI.toast('已删除');
        });
      });
    });
  }

  function showAddModal(editIdx, mealKey) {
    if (!mealKey) mealKey = 'breakfast';
    const records = Storage.getMealRecords(currentDate, mealKey);
    const editing = editIdx !== undefined ? records[editIdx] : null;
    let currentImageId = editing?.imageId || null;
    const mealType = mealTypes.find(t => t.key === mealKey);

    const bodyHTML = `
      <div class="form-group">
        <label class="form-label">餐食图片</label>
        <div id="imageUploadArea"></div>
      </div>
      <div class="form-group">
        <label class="form-label">食物名称</label>
        <input type="text" class="form-input" id="mealName" placeholder="如：燕麦粥、鸡胸肉沙拉" value="${editing ? escapeHtml(editing.name || '') : ''}">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">食材</label>
          <input type="text" class="form-input" id="mealIngredients" placeholder="主要食材" value="${editing?.ingredients ? escapeHtml(editing.ingredients) : ''}">
        </div>
        <div class="form-group">
          <label class="form-label">热量 (kcal)</label>
          <input type="number" class="form-input" id="mealCalories" placeholder="0" value="${editing?.calories || ''}">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">食用感受</label>
        <textarea class="form-textarea" id="mealFeel" placeholder="味道、口感、饱腹感...">${editing?.feel ? escapeHtml(editing.feel) : ''}</textarea>
      </div>
    `;

    const { modal } = UI.showModal(`${editing ? '编辑' : '添加'}${mealType.name}`, bodyHTML, {
      confirmText: editing ? '更新' : '保存',
      cancelText: '取消',
      onConfirm: () => {
        const name = modal.querySelector('#mealName').value.trim();
        const ingredients = modal.querySelector('#mealIngredients').value.trim();
        const calories = modal.querySelector('#mealCalories').value;
        const feel = modal.querySelector('#mealFeel').value.trim();

        if (!name && !currentImageId && !ingredients) {
          UI.toast('请至少填写一项内容');
          return false;
        }

        const record = { name, ingredients, calories, feel, imageId: currentImageId };
        const currentRecords = Storage.getMealRecords(currentDate, mealKey);
        if (editIdx !== undefined) {
          currentRecords[editIdx] = record;
          UI.toast('已更新');
        } else {
          currentRecords.push(record);
          UI.toast('已保存');
        }
        Storage.saveMealRecords(currentDate, mealKey, currentRecords);
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
