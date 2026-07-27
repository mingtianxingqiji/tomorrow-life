/**
 * 穿搭日记模块
 */
const OutfitModule = (function() {

  let currentDate = null;

  function render(date) {
    currentDate = date;
    const main = document.getElementById('mainContent');
    const records = Storage.getModuleRecords(date, 'outfit');

    main.innerHTML = `
      <div class="fade-in">
        <div class="card" style="display:flex;justify-content:space-between;align-items:center;">
          <div>
            <div style="font-size:13px;color:var(--text-secondary);">${UI.formatDateFull(date)}</div>
            <div style="font-size:15px;font-weight:600;margin-top:4px;">${UI.getWeekday(date)}</div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:28px;font-weight:700;color:var(--primary);">${records.length}</div>
            <div style="font-size:12px;color:var(--text-hint);">套穿搭</div>
          </div>
        </div>

        <div class="section-title">今日穿搭</div>
        <div id="outfitList"></div>
      </div>
    `;

    renderList(records);
    document.getElementById('fab').style.display = 'flex';
    document.getElementById('fab').onclick = () => showAddModal();
  }

  async function renderList(records) {
    const container = document.getElementById('outfitList');
    if (records.length === 0) {
      container.innerHTML = UI.emptyState('点击右下角 + 记录今日穿搭');
      return;
    }

    container.innerHTML = '';
    for (let i = 0; i < records.length; i++) {
      const r = records[i];
      const div = document.createElement('div');
      div.className = 'outfit-card';

      let imgHTML = '';
      if (r.imageId) {
        const url = await Storage.getImageURL(r.imageId);
        if (url) {
          imgHTML = `<img class="outfit-img" src="${url}" alt="穿搭">`;
        } else {
          imgHTML = `<div class="outfit-img"></div>`;
        }
      } else {
        imgHTML = `<div class="outfit-img" style="display:flex;align-items:center;justify-content:center;color:var(--text-hint);font-size:13px;">暂无图片</div>`;
      }

      const tagsHTML = (r.tags || []).map(t => `<span class="outfit-tag">${escapeHtml(t)}</span>`).join('');
      const occasionHTML = r.occasion ? `<span class="outfit-tag" style="background:#FFF3E0;color:#E65100;">${escapeHtml(r.occasion)}</span>` : '';

      div.innerHTML = `
        ${imgHTML}
        <div class="outfit-info">
          ${tagsHTML || occasionHTML ? `<div class="outfit-tags">${occasionHTML}${tagsHTML}</div>` : ''}
          ${r.note ? `<div class="outfit-note">${escapeHtml(r.note)}</div>` : ''}
          <div class="outfit-footer">
            <span class="outfit-time">${r.time || ''}</span>
            <div style="display:flex;gap:4px;">
              <button class="plan-action-btn" data-action="edit" data-idx="${i}">
                <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
              </button>
              <button class="plan-action-btn" data-action="delete" data-idx="${i}">
                <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
              </button>
            </div>
          </div>
        </div>
      `;
      container.appendChild(div);

      const img = div.querySelector('.outfit-img');
      if (img && img.tagName === 'IMG') {
        img.addEventListener('click', () => UI.showImage(img.src));
      }
    }

    container.querySelectorAll('[data-action="edit"]').forEach(btn => {
      btn.addEventListener('click', () => showAddModal(parseInt(btn.dataset.idx)));
    });
    container.querySelectorAll('[data-action="delete"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx);
        UI.confirm('确定删除这条穿搭记录吗？', () => {
          Storage.deleteRecord(currentDate, 'outfit', idx);
          render(currentDate);
          UI.toast('已删除');
        });
      });
    });
  }

  function showAddModal(editIdx) {
    const records = Storage.getModuleRecords(currentDate, 'outfit');
    const editing = editIdx !== undefined ? records[editIdx] : null;
    let currentImageId = editing?.imageId || null;
    let currentTags = editing?.tags ? [...editing.tags] : [];

    const bodyHTML = `
      <div class="form-group">
        <label class="form-label">穿搭实拍图</label>
        <div id="imageUploadArea"></div>
      </div>
      <div class="form-group">
        <label class="form-label">穿着场合</label>
        <select class="form-select" id="outfitOccasion">
          <option value="">请选择</option>
          <option value="日常通勤" ${editing?.occasion === '日常通勤' ? 'selected' : ''}>日常通勤</option>
          <option value="商务正式" ${editing?.occasion === '商务正式' ? 'selected' : ''}>商务正式</option>
          <option value="休闲居家" ${editing?.occasion === '休闲居家' ? 'selected' : ''}>休闲居家</option>
          <option value="约会聚会" ${editing?.occasion === '约会聚会' ? 'selected' : ''}>约会聚会</option>
          <option value="运动健身" ${editing?.occasion === '运动健身' ? 'selected' : ''}>运动健身</option>
          <option value="旅行出游" ${editing?.occasion === '旅行出游' ? 'selected' : ''}>旅行出游</option>
          <option value="其他" ${editing?.occasion === '其他' ? 'selected' : ''}>其他</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">风格标签</label>
        <div id="tagInputArea"></div>
      </div>
      <div class="form-group">
        <label class="form-label">搭配单品 / 备注</label>
        <textarea class="form-textarea" id="outfitNote" placeholder="记录搭配的单品、颜色、材质等...">${editing?.note ? escapeHtml(editing.note) : ''}</textarea>
      </div>
    `;

    const { modal } = UI.showModal(editIdx !== undefined ? '编辑穿搭' : '记录穿搭', bodyHTML, {
      confirmText: editIdx !== undefined ? '更新' : '保存',
      cancelText: '取消',
      onConfirm: () => {
        const occasion = modal.querySelector('#outfitOccasion').value;
        const note = modal.querySelector('#outfitNote').value.trim();

        if (!currentImageId && !note && !occasion) {
          UI.toast('请至少填写一项内容');
          return false;
        }

        const record = {
          imageId: currentImageId,
          occasion,
          tags: currentTags,
          note,
          time: editing?.time || new Date().toTimeString().slice(0, 5)
        };
        if (editIdx !== undefined) {
          Storage.updateRecord(currentDate, 'outfit', editIdx, record);
          UI.toast('已更新');
        } else {
          Storage.addRecord(currentDate, 'outfit', record);
          UI.toast('已保存');
        }
        render(currentDate);
      }
    });

    const uploadArea = modal.querySelector('#imageUploadArea');
    uploadArea.appendChild(UI.createImageUploadArea(currentImageId, (newId) => { currentImageId = newId; }));

    const tagArea = modal.querySelector('#tagInputArea');
    tagArea.appendChild(UI.createTagInput(currentTags, (tags) => { currentTags = tags; }));
  }

  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  return { render };
})();
