import { createApp } from 'vue';
import App from './App.vue';
import { bootstrap } from './cool';
import 'phoenix-wing/style.css';

const app = createApp(App);

// 启动
bootstrap(app)
	.then(() => {
		app.mount('#app');
	})
	.catch(err => {
		console.error('Phoenix Admin 启动失败', err);
	});
