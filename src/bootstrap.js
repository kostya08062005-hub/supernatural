// Keep startup failures visible even if the game or its stylesheet cannot load.
const app = document.querySelector('#app');
let failed = false;
function showFailure(error) {
  if (failed) return;
  failed = true;
  app.replaceChildren();
  const panel = document.createElement('section');
  panel.className = 'startup';
  const title = document.createElement('h1');
  title.textContent = 'Не удалось запустить игру';
  const info = document.createElement('p');
  info.textContent = 'Попробуйте облегчённую графику или обновите страницу. Для игры нужен браузер с WebGL 2 и аппаратным ускорением.';
  const link = document.createElement('a');
  const url = new URL(location.href);url.searchParams.set('graphics','basic');
  link.href = url.href;link.textContent = 'Запустить с облегчённой графикой';
  const reload = document.createElement('button');reload.textContent = 'Обновить страницу';reload.onclick=()=>location.reload();
  const detail = document.createElement('details');
  const summary = document.createElement('summary');summary.textContent = 'Текст ошибки';
  const pre = document.createElement('pre');pre.textContent = String(error?.message || error || 'Неизвестная ошибка');
  detail.append(summary,pre);panel.append(title,info,link,reload,detail);app.append(panel);
}
window.addEventListener('error', e=>showFailure(e.error || e.message));
window.addEventListener('unhandledrejection',e=>showFailure(e.reason));
import('./main.js').catch(showFailure);
