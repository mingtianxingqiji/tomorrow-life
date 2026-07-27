/**
 * Service Worker 注册（PWA 离线能力）
 */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js', { scope: './' }).then(reg => {
      console.log('Service Worker 已注册', reg.scope);
    }).catch(err => {
      console.warn('Service Worker 注册失败:', err);
    });
  });
}

// 添加 CSS 动画用于加载旋转
const style = document.createElement('style');
style.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
document.head.appendChild(style);
