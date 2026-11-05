import {test,expect} from '@playwright/test';

test('облегчённая графика запускает игру',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/?graphics=basic');
 await page.getByRole('button',{name:/НАЧАТЬ ОХОТУ/}).click();
 await expect(page.locator('#score')).toContainText('Изгнано 0 / 15');
 expect(errors).toEqual([]);
});
test('сбой загрузки модуля отображается вместо пустого экрана',async({page})=>{
 await page.route('**/src/main.js',route=>route.abort());
 await page.goto('/');
 await expect(page.getByRole('heading',{name:'Не удалось запустить игру'})).toBeVisible();
 await expect(page.getByRole('link',{name:'Запустить с облегчённой графикой'})).toHaveAttribute('href',/graphics=basic/);
});
test('отсутствие WebGL объясняется на экране',async({page})=>{
 await page.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){if(type==='webgl2')return null;return original.call(this,type,...args);};});
 await page.goto('/');
 await expect(page.getByRole('heading',{name:'Не удалось запустить игру'})).toBeVisible();
 await expect(page.locator('.startup')).toContainText('WebGL 2');
});
