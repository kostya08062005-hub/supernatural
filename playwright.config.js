import { defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';
export default defineConfig({testDir:'./tests',workers:1,use:{viewport:{width:800,height:600},baseURL:'http://127.0.0.1:5173',headless:true,launchOptions:{...(existsSync('/usr/bin/chromium')?{executablePath:'/usr/bin/chromium'}:{}),args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}},webServer:{command:'npm run dev -- --port 5173',url:'http://127.0.0.1:5173',reuseExistingServer:false}});
