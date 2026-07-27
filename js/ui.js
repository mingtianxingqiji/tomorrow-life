/**
 * UI 通用工具层
 */
const UI = (function() {

  const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
  const weekdaysEn = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
  const months = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];

  function getWeekday(date) {
    return weekdays[new Date(date).getDay()];
  }

  function getWeekdayEn(date) {
    return weekdaysEn[new Date(date).getDay()];
  }

  function formatDate(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function formatDateDisplay(dateStr) {
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}月${d.getDate()}日`;
  }

  function formatDateFull(dateStr) {
    const d = new Date(dateStr);
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
  }

  // Toast 提示
  function toast(msg, duration = 2000) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(el._timer);
    el._timer = setTimeout(() => el.classList.remove('show'), duration);
  }

  // 模态弹窗
  function showModal(title, bodyHTML, options = {}) {
    const container = document.getElementById('modalContainer');
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    const modal = document.createElement('div');
    modal.className = 'modal';

    let footerHTML = '';
    if (options.showFooter !== false) {
      footerHTML = `
        <div class="modal-footer">
          ${options.cancelText ? `<button class="btn btn-secondary" data-action="cancel">${options.cancelText}</button>` : ''}
          <button class="btn btn-primary" data-action="confirm">${options.confirmText || '保存'}</button>
        </div>
      `;
    }

    modal.innerHTML = `
      <div class="modal-header">
        <div class="modal-title">${title}</div>
        <button class="modal-close" data-action="close">×</button>
      </div>
      <div class="modal-body">${bodyHTML}</div>
      ${footerHTML}
    `;

    container.innerHTML = '';
    container.appendChild(overlay);
    container.appendChild(modal);
    container.classList.add('active');

    const close = () => {
      container.classList.remove('active');
      setTimeout(() => container.innerHTML = '', 300);
    };

    modal.addEventListener('click', (e) => {
      const action = e.target.dataset.action;
      if (action === 'close' || action === 'cancel') {
        if (options.onCancel) options.onCancel();
        close();
      } else if (action === 'confirm') {
        if (options.onConfirm) {
          const result = options.onConfirm(modal);
          if (result !== false) close();
        } else {
          close();
        }
      }
    });
    overlay.addEventListener('click', close);

    return { modal, close };
  }

  function closeModal() {
    const container = document.getElementById('modalContainer');
    container.classList.remove('active');
    setTimeout(() => container.innerHTML = '', 300);
  }

  // 图片查看器
  function showImage(url) {
    const viewer = document.getElementById('imageViewer');
    const img = document.getElementById('viewerImg');
    img.src = url;
    viewer.classList.add('active');
  }

  function hideImage() {
    document.getElementById('imageViewer').classList.remove('active');
  }

  // 确认对话框
  function confirm(message, onConfirm) {
    showModal('提示', `<p style="text-align:center;padding:20px 0;font-size:15px;">${message}</p>`, {
      showFooter: true,
      confirmText: '确定',
      cancelText: '取消',
      onConfirm: () => { onConfirm(); }
    });
  }

  // 图片选择器（调用系统图库）
  function pickImage(callback) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.style.display = 'none';
    document.body.appendChild(input);

    input.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      document.body.removeChild(input);
      if (file) {
        callback(file);
      }
    });
    input.click();
  }

  // 创建图片预览区域
  function createImageUploadArea(currentImageId, onImageChange) {
    const wrap = document.createElement('div');
    wrap.className = 'image-upload-area';
    wrap.innerHTML = `
      <svg viewBox="0 0 24 24" width="32" height="32" style="margin:0 auto 8px;display:block;opacity:0.4;">
        <path fill="currentColor" d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
      </svg>
      <div>点击上传图片</div>
    `;

    if (currentImageId) {
      loadImagePreview(wrap, currentImageId, onImageChange);
    }

    wrap.addEventListener('click', () => {
      pickImage(async (file) => {
        const imageId = await Storage.storeImageFile(file);
        onImageChange(imageId);
        loadImagePreview(wrap, imageId, onImageChange);
      });
    });

    return wrap;
  }

  async function loadImagePreview(wrap, imageId, onImageChange) {
    const url = await Storage.getImageURL(imageId);
    if (url) {
      wrap.classList.add('has-image');
      wrap.innerHTML = `
        <div class="image-preview-wrap">
          <img src="${url}" alt="预览">
          <button class="image-remove-btn" type="button">×</button>
        </div>
      `;
      wrap.querySelector('.image-remove-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        Storage.deleteImage(imageId);
        onImageChange(null);
        wrap.classList.remove('has-image');
        wrap.innerHTML = `
          <svg viewBox="0 0 24 24" width="32" height="32" style="margin:0 auto 8px;display:block;opacity:0.4;">
            <path fill="currentColor" d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
          </svg>
          <div>点击上传图片</div>
        `;
      });
    }
  }

  // 创建标签输入器
  function createTagInput(tags = [], onChange) {
    const wrap = document.createElement('div');
    wrap.className = 'tag-input-wrap';

    function render() {
      wrap.innerHTML = '';
      tags.forEach((tag, i) => {
        const el = document.createElement('span');
        el.className = 'tag';
        el.innerHTML = `${tag}<span class="tag-remove" data-idx="${i}">×</span>`;
        wrap.appendChild(el);
      });
      const input = document.createElement('input');
      input.className = 'tag-input';
      input.placeholder = '输入后回车添加';
      input.type = 'text';
      wrap.appendChild(input);

      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && input.value.trim()) {
          e.preventDefault();
          tags.push(input.value.trim());
          input.value = '';
          render();
          if (onChange) onChange(tags);
        } else if (e.key === 'Backspace' && !input.value && tags.length > 0) {
          tags.pop();
          render();
          if (onChange) onChange(tags);
        }
      });

      wrap.querySelectorAll('.tag-remove').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const idx = parseInt(e.target.dataset.idx);
          tags.splice(idx, 1);
          render();
          if (onChange) onChange(tags);
        });
      });
    }
    render();
    return wrap;
  }

  // 空状态
  function emptyState(text) {
    return `
      <div class="empty-state">
        <svg viewBox="0 0 24 24"><path fill="currentColor" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14H7v-2h5v2zm5-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>
        <p>${text}</p>
      </div>
    `;
  }

  return {
    weekdays,
    weekdaysEn,
    months,
    getWeekday,
    getWeekdayEn,
    formatDate,
    formatDateDisplay,
    formatDateFull,
    toast,
    showModal,
    closeModal,
    showImage,
    hideImage,
    confirm,
    pickImage,
    createImageUploadArea,
    createTagInput,
    emptyState
  };
})();
