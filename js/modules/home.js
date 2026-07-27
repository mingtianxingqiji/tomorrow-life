/**
 * 首页模块
 */
const HomeModule = (function() {

  function render() {
    const main = document.getElementById('mainContent');
    const today = new Date();
    const dateStr = UI.formatDate(today);
    const day = today.getDate();
    const month = UI.months[today.getMonth()];
    const weekday = UI.weekdays[today.getDay()];
    const weekdayEn = UI.weekdaysEn[today.getDay()];

    // 明天
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowWeekday = UI.weekdays[tomorrow.getDay()];
    const tomorrowDate = `${tomorrow.getMonth() + 1}月${tomorrow.getDate()}日`;

    // 各模块记录数
    const planCount = Storage.getModuleRecords(dateStr, 'plan').length;
    const planDone = Storage.getModuleRecords(dateStr, 'plan').filter(p => p.done).length;
    const outfitCount = Storage.getModuleRecords(dateStr, 'outfit').length;
    const mealDay = Storage.getDayRecords(dateStr).meal || {};
    const mealCount = (mealDay.breakfast || []).length + (mealDay.lunch || []).length + (mealDay.dinner || []).length;
    const drinkCount = Storage.getModuleRecords(dateStr, 'drink').length;
    const sportCount = Storage.getModuleRecords(dateStr, 'sport').length;

    main.innerHTML = `
      <div class="fade-in">
        <div class="home-hero">
          <div class="home-date">${day}</div>
          <div class="home-month">${month}</div>
          <div class="home-weekday">${weekday}</div>
          <div class="home-weekday-en">${weekdayEn}</div>
        </div>

        <div class="home-tomorrow">
          <div>
            <div class="home-tomorrow-label">明天 · ${tomorrowDate}</div>
            <div class="home-tomorrow-value">${tomorrowWeekday}</div>
          </div>
          <svg viewBox="0 0 24 24" width="28" height="28" style="color:var(--primary);">
            <path fill="currentColor" d="M5.5 5l1.5-1.5L13 9.5 19.5 3.5 21 5l-8 8z" transform="rotate(-90 12 12)"/>
          </svg>
        </div>

        <div class="section-title">今日概览</div>
        <div class="overview-grid">
          <a class="overview-card" data-module="plan">
            <div class="overview-icon" style="background:#E8F5E9;color:#43A047;">
              <svg viewBox="0 0 24 24"><path fill="currentColor" d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
            </div>
            <div class="overview-count">${planDone}/${planCount}</div>
            <div class="overview-label">每日计划</div>
          </a>
          <a class="overview-card" data-module="outfit">
            <div class="overview-icon" style="background:#F3E5F5;color:#8E24AA;">
              <svg viewBox="0 0 24 24"><path fill="currentColor" d="M21 7l-1.5-3h-3l-2 2h-3l-2-2h-3L5 7v4l2 1v9h10v-9l2-1V7h2z"/></svg>
            </div>
            <div class="overview-count">${outfitCount}</div>
            <div class="overview-label">穿搭日记</div>
          </a>
          <a class="overview-card" data-module="meal">
            <div class="overview-icon" style="background:#FFF3E0;color:#FB8C00;">
              <svg viewBox="0 0 24 24"><path fill="currentColor" d="M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7z"/></svg>
            </div>
            <div class="overview-count">${mealCount}</div>
            <div class="overview-label">三餐日记</div>
          </a>
          <a class="overview-card" data-module="drink">
            <div class="overview-icon" style="background:#E1F5FE;color:#0288D1;">
              <svg viewBox="0 0 24 24"><path fill="currentColor" d="M3 2l2.21 18.5C5.4 21.37 6.11 22 7 22h10c.89 0 1.6-.63 1.79-1.5L21 2H3z"/></svg>
            </div>
            <div class="overview-count">${drinkCount}</div>
            <div class="overview-label">饮品日记</div>
          </a>
        </div>

        <div class="section-title">运动数据</div>
        <a class="overview-card" data-module="sport" style="margin-bottom:20px;">
          <div style="display:flex;align-items:center;gap:12px;">
            <div class="overview-icon" style="background:#FFEBEE;color:#E53935;margin:0;">
              <svg viewBox="0 0 24 24"><path fill="currentColor" d="M13.49 5.48c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm-3.6 13.9l1-4.4 2.1 2v6h2v-7.5l-2.1-2 .6-3c1.3 1.5 3.3 2.5 5.5 2.5v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1l-5.2 2.2v4.7h2v-3.4l1.8-.7-1.6 8.1-4.9-1-.4 2 6.9 1.4z"/></svg>
            </div>
            <div>
              <div class="overview-count" style="margin:0;">${sportCount}</div>
              <div class="overview-label">运动记录</div>
            </div>
          </div>
        </a>

        <div class="section-title">历史记录</div>
        <div id="historyList"></div>
      </div>
    `;

    // 绑定概览卡片点击
    main.querySelectorAll('.overview-card').forEach(card => {
      card.addEventListener('click', (e) => {
        e.preventDefault();
        App.switchModule(card.dataset.module);
      });
    });

    // 渲染历史记录
    renderHistory();
  }

  function renderHistory() {
    const container = document.getElementById('historyList');
    const dates = Storage.getAllDates().slice(0, 10);
    if (dates.length === 0) {
      container.innerHTML = UI.emptyState('还没有记录，开始记录今天吧');
      return;
    }
    container.innerHTML = '<div class="history-list">' + dates.map(date => {
      const count = Storage.getDayRecordCount(date);
      return `
        <a class="history-item" data-date="${date}">
          <div>
            <div class="history-date">${UI.formatDateDisplay(date)}</div>
            <div class="history-weekday">${UI.getWeekday(date)}</div>
          </div>
          <div class="history-count">${count} 条</div>
        </a>
      `;
    }).join('') + '</div>';

    container.querySelectorAll('.history-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        App.setCurrentDate(item.dataset.date);
        App.switchModule('plan');
      });
    });
  }

  return { render };
})();
