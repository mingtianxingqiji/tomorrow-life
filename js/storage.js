/**
 * 存储模块
 * - 普通数据使用 localStorage
 * - 图片数据使用 IndexedDB（Base64 存储在 localStorage 会爆容量）
 */
const Storage = (function() {

  const DB_NAME = 'tomorrow-app-db';
  const DB_VERSION = 1;
  const STORE_IMAGES = 'images';
  const STORE_DATA = 'appData';
  let db = null;

  function openDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onerror = () => reject(req.error);
      req.onsuccess = () => { db = req.result; resolve(db); };
      req.onupgradeneeded = (e) => {
        const database = e.target.result;
        if (!database.objectStoreNames.contains(STORE_IMAGES)) {
          database.createObjectStore(STORE_IMAGES, { keyPath: 'id' });
        }
        if (!database.objectStoreNames.contains(STORE_DATA)) {
          database.createObjectStore(STORE_DATA, { keyPath: 'key' });
        }
      };
    });
  }

  // ===== 图片存储 =====
  async function saveImage(id, blob) {
    if (!db) await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_IMAGES], 'readwrite');
      const store = tx.objectStore(STORE_IMAGES);
      const record = { id, blob, createdAt: Date.now() };
      const req = store.put(record);
      req.onsuccess = () => resolve(id);
      req.onerror = () => reject(req.error);
    });
  }

  async function getImage(id) {
    if (!db) await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_IMAGES], 'readonly');
      const store = tx.objectStore(STORE_IMAGES);
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result ? req.result.blob : null);
      req.onerror = () => reject(req.error);
    });
  }

  async function deleteImage(id) {
    if (!db) await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_IMAGES], 'readwrite');
      const store = tx.objectStore(STORE_IMAGES);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  // 把 File/Blob 转为可存储的 Blob，返回 imageId
  async function storeImageFile(file) {
    const id = 'img_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
    // 压缩图片
    const compressedBlob = await compressImage(file);
    await saveImage(id, compressedBlob);
    return id;
  }

  // 获取图片 ObjectURL
  async function getImageURL(id) {
    if (!id) return null;
    const blob = await getImage(id);
    return blob ? URL.createObjectURL(blob) : null;
  }

  // 图片压缩
  function compressImage(file, maxSize = 1280, quality = 0.8) {
    return new Promise((resolve) => {
      if (!file.type.startsWith('image/')) {
        resolve(file);
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let { width, height } = img;
          if (width > maxSize || height > maxSize) {
            if (width > height) {
              height = (height / width) * maxSize;
              width = maxSize;
            } else {
              width = (width / height) * maxSize;
              height = maxSize;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => {
            resolve(blob || file);
          }, 'image/jpeg', quality);
        };
        img.onerror = () => resolve(file);
        img.src = e.target.result;
      };
      reader.onerror = () => resolve(file);
      reader.readAsDataURL(file);
    });
  }

  // ===== 数据存储（JSON 结构） =====
  function getData(key, defaultVal = null) {
    try {
      const val = localStorage.getItem('tmr_' + key);
      return val ? JSON.parse(val) : defaultVal;
    } catch (e) {
      return defaultVal;
    }
  }

  function setData(key, value) {
    try {
      localStorage.setItem('tmr_' + key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error('存储失败:', e);
      return false;
    }
  }

  function deleteData(key) {
    localStorage.removeItem('tmr_' + key);
  }

  // ===== 按模块/日期管理记录 =====
  // 数据结构: { "2026-07-27": { plan: [...], outfit: [...], meal: {...}, drink: [...], sport: [...] } }

  function getAllRecords() {
    return getData('records', {});
  }

  function getDayRecords(date) {
    const all = getAllRecords();
    return all[date] || { plan: [], outfit: [], meal: { breakfast: [], lunch: [], dinner: [] }, drink: [], sport: [] };
  }

  function saveDayRecords(date, data) {
    const all = getAllRecords();
    all[date] = data;
    setData('records', all);
  }

  function getModuleRecords(date, module) {
    const day = getDayRecords(date);
    if (module === 'meal') return day.meal || { breakfast: [], lunch: [], dinner: [] };
    return day[module] || [];
  }

  function saveModuleRecords(date, module, records) {
    const day = getDayRecords(date);
    day[module] = records;
    saveDayRecords(date, day);
  }

  function addRecord(date, module, record) {
    let records = getModuleRecords(date, module);
    if (module === 'meal') return; // 三餐单独处理
    records.push(record);
    saveModuleRecords(date, module, records);
  }

  function updateRecord(date, module, index, record) {
    let records = getModuleRecords(date, module);
    if (module === 'meal') return;
    records[index] = record;
    saveModuleRecords(date, module, records);
  }

  function deleteRecord(date, module, index) {
    let records = getModuleRecords(date, module);
    if (module === 'meal') return;
    // 删除关联图片
    if (records[index] && records[index].imageId) {
      deleteImage(records[index].imageId);
    }
    records.splice(index, 1);
    saveModuleRecords(date, module, records);
  }

  // 三餐专用
  function getMealRecords(date, mealType) {
    const day = getDayRecords(date);
    const meals = day.meal || { breakfast: [], lunch: [], dinner: [] };
    return meals[mealType] || [];
  }

  function saveMealRecords(date, mealType, records) {
    const day = getDayRecords(date);
    if (!day.meal) day.meal = { breakfast: [], lunch: [], dinner: [] };
    day.meal[mealType] = records;
    saveDayRecords(date, day);
  }

  // 获取所有有记录的日期
  function getAllDates() {
    const all = getAllRecords();
    return Object.keys(all).sort().reverse();
  }

  // 获取某日期的记录总数
  function getDayRecordCount(date) {
    const day = getDayRecords(date);
    let count = 0;
    count += (day.plan || []).length;
    count += (day.outfit || []).length;
    count += (day.meal?.breakfast || []).length;
    count += (day.meal?.lunch || []).length;
    count += (day.meal?.dinner || []).length;
    count += (day.drink || []).length;
    count += (day.sport || []).length;
    return count;
  }

  // 计算连续记录天数
  function getStreakDays() {
    const dates = getAllDates();
    if (dates.length === 0) return 0;
    let streak = 0;
    let checkDate = new Date();
    for (let i = 0; i < 365; i++) {
      const dateStr = formatDate(checkDate);
      if (dates.includes(dateStr)) {
        streak++;
      } else if (i > 0) {
        break;
      }
      checkDate.setDate(checkDate.getDate() - 1);
    }
    return streak;
  }

  function formatDate(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  return {
    openDB,
    storeImageFile,
    getImageURL,
    getImage,
    deleteImage,
    getData,
    setData,
    deleteData,
    getAllRecords,
    getDayRecords,
    saveDayRecords,
    getModuleRecords,
    saveModuleRecords,
    addRecord,
    updateRecord,
    deleteRecord,
    getMealRecords,
    saveMealRecords,
    getAllDates,
    getDayRecordCount,
    getStreakDays,
    formatDate
  };
})();
