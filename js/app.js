/**
 * 主应用控制器
 */
const App = (function() {

  const modules = {
    home: HomeModule,
    plan: PlanModule,
    outfit: OutfitModule,
    meal: MealModule,
    drink: DrinkModule,
    sport: SportModule
  };

  const moduleTitles = {
    home: '明天星期几',
    plan: '每日计划',
    outfit: '穿搭日记',
    meal: '三餐日记',
    drink: '饮品日记',
    sport: '运动日记'
  };

  let currentModule = 'home';
  let currentDate = UI.formatDate(new Date());

  async function init() {
    // 初始化数据库
    await Storage.openDB();

    // 更新侧边栏日期
    updateSidebarDate();

    // 初始化日期选择器
    const dateSelector = document.getElementById('dateSelector');
    dateSelector.value = currentDate;
    dateSelector.addEventListener('change', (e) => {
      currentDate = e.target.value;
      updateSidebarDate();
      if (currentModule !== 'home') {
        modules[currentModule].render(currentDate);
      } else {
        modules[currentModule].render();
      }
    });

    // 日期切换
    document.getElementById('prevDate').addEventListener('click', () => shiftDate(-1));
    document.getElementById('nextDate').addEventListener('click', () => shiftDate(1));

    // 侧边栏开关
    document.getElementById('menuBtn').addEventListener('click', toggleSidebar);
    document.getElementById('overlay').addEventListener('click', closeSidebar);

    // 导航项点击
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const module = item.dataset.module;
        switchModule(module);
        closeSidebar();
      });
    });

    // 今天按钮
    document.getElementById('todayBtn').addEventListener('click', () => {
      currentDate = UI.formatDate(new Date());
      dateSelector.value = currentDate;
      updateSidebarDate();
      switchModule('home');
      UI.toast('回到今天');
    });

    // 图片查看器关闭
    document.getElementById('viewerClose').addEventListener('click', UI.hideImage);
    document.getElementById('imageViewer').addEventListener('click', (e) => {
      if (e.target.id === 'imageViewer') UI.hideImage();
    });

    // 更新统计
    updateStats();

    // 渲染默认模块
    modules.home.render();

    // 请求通知权限
    if ('Notification' in window && Notification.permission === 'default') {
      // 不主动弹窗，等用户设置提醒时再请求
    }
  }

  function switchModule(module) {
    if (!modules[module]) return;
    currentModule = module;

    // 更新导航激活状态
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.module === module);
    });

    // 更新标题
    document.getElementById('pageTitle').textContent = moduleTitles[module];

    // 隐藏 FAB（首页不需要）
    if (module === 'home') {
      document.getElementById('fab').style.display = 'none';
    }

    // 渲染模块
    if (module === 'home') {
      modules.home.render();
    } else {
      modules[module].render(currentDate);
    }

    updateStats();
  }

  function toggleSidebar() {
    document.getElementById('sidebar').classList.add('open');
    document.getElementById('overlay').classList.add('active');
  }

  function closeSidebar() {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('overlay').classList.remove('active');
  }

  function shiftDate(delta) {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + delta);
    currentDate = UI.formatDate(d);
    document.getElementById('dateSelector').value = currentDate;
    updateSidebarDate();
    if (currentModule !== 'home') {
      modules[currentModule].render(currentDate);
    }
  }

  function setCurrentDate(date) {
    currentDate = date;
    document.getElementById('dateSelector').value = date;
    updateSidebarDate();
  }

  function updateSidebarDate() {
    const el = document.getElementById('sidebarDate');
    const d = new Date(currentDate);
    el.textContent = `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 · ${UI.getWeekday(currentDate)}`;
  }

  function updateStats() {
    document.getElementById('totalRecords').textContent =
      Storage.getAllDates().reduce((sum, date) => sum + Storage.getDayRecordCount(date), 0);
    document.getElementById('streakDays').textContent = Storage.getStreakDays();
  }

  return {
    init,
    switchModule,
    setCurrentDate
  };
})();

document.addEventListener('DOMContentLoaded', App.init);
