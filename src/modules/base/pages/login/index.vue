<template>
	<div
		class="page-login"
		:class="[
			`pah-login--${branding.login.presentation}`,
			{ 'is-plugin-brand': !brandStore.isHostDefault }
		]"
	>
		<section class="pah-login-hero" :aria-label="branding.login.title" :style="heroStyle">
			<div class="pah-aurora pah-aurora--warm"></div>
			<div class="pah-aurora pah-aurora--cool"></div>
			<div class="pah-grid"></div>

			<div class="pah-hero-content">
				<div class="pah-mark-stage" aria-hidden="true">
					<div class="pah-orbit pah-orbit--outer"></div>
					<div class="pah-orbit pah-orbit--inner"></div>
					<span class="pah-spark pah-spark--one"></span>
					<span class="pah-spark pah-spark--two"></span>
					<span class="pah-spark pah-spark--three"></span>
					<img :src="branding.assets.logoDark.url" alt="" />
				</div>

				<p class="pah-eyebrow"><span></span> {{ branding.login.eyebrow }}</p>
				<h1>{{ branding.login.title }}</h1>
				<p class="pah-hero-copy">{{ branding.login.subtitle }}</p>

				<ul class="pah-capabilities" aria-label="宿主能力">
					<li><span>01</span> Ribbon 工作台</li>
					<li><span>02</span> 大分组侧栏</li>
					<li><span>03</span> 统一权限与审计</li>
				</ul>
			</div>

			<div v-if="brandStore.isHostDefault" class="pah-origin">
				<span>PHOENIX ADMIN / 8.x</span>
				<span class="pah-origin-line"></span>
				<span>POSTGRESQL READY</span>
			</div>
		</section>

		<section class="pah-login-panel">
			<div class="pah-login-card">
				<div class="pah-mobile-brand">
					<img :src="branding.assets.compactLogo.url" alt="" />
					<strong>{{ branding.appName }}</strong>
				</div>

				<p class="pah-console-label"><span></span> SECURE ADMIN CONSOLE</p>
				<h2>欢迎回来</h2>
				<p class="pah-login-intro">{{ branding.login.prompt }}</p>

				<div class="form">
					<el-form label-position="top" class="form" :disabled="saving">
						<el-form-item :label="$t('用户名')">
							<el-input
								v-model="form.username"
								:placeholder="$t('请输入用户名')"
								maxlength="20"
							/>
						</el-form-item>

						<el-form-item :label="$t('密码')">
							<el-input
								v-model="form.password"
								type="password"
								:placeholder="$t('请输入密码')"
								maxlength="20"
								show-password
								autocomplete="new-password"
							/>
						</el-form-item>

						<el-form-item v-if="captchaRequired" :label="$t('验证码')">
							<el-input
								v-model="form.verifyCode"
								:placeholder="$t('验证码')"
								maxlength="4"
								@keyup.enter="toLogin"
							>
								<template #suffix>
									<pic-captcha
										:ref="setRefs('picCaptcha')"
										v-model="form.captchaId"
										@change="
											() => {
												form.verifyCode = '';
											}
										"
									/>
								</template>
							</el-input>
						</el-form-item>

						<div class="op">
							<el-button type="primary" :loading="saving" @click="toLogin">
								{{ $t('登录') }}
							</el-button>
						</div>
					</el-form>
				</div>

				<div v-if="feishuMethod" class="pah-external-login">
					<div class="pah-login-divider"><span>或</span></div>
					<el-button
						class="pah-feishu-login"
						:loading="feishuSaving"
						:disabled="saving"
						@click="toFeishuLogin"
					>
						{{ feishuMethod.buttonText || '使用飞书登录' }}
					</el-button>
				</div>
				<p v-else-if="policyNotice" class="pah-login-notice" role="status">
					{{ policyNotice }}
				</p>

				<div v-if="brandStore.isHostDefault" class="pah-fork-note">
					<span>MIT LICENSE</span>
					<a href="https://gitee.com/phoenixwing/phoenix-admin-vue" target="_blank">
						PhoenixWing 维护分叉 · 基于 Cool Admin 8.x
					</a>
				</div>
			</div>
		</section>
	</div>
</template>

<script lang="ts" setup>
defineOptions({
	name: 'login'
});

import { computed, onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { useCool } from '/@/cool';
import { useBase } from '/$/base';
import { storage } from '/@/cool/utils';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';
import { pahIdentityApi, type PahLoginPolicy } from '/@/pah/PahIdentityApi';
import { pahIsAllowedAuthorizationUrl, pahNormalizeIdentityReturnTo } from '/@/pah/PahIdentityFlow';
import PicCaptcha from './components/pic-captcha.vue';
import { usePahPublicLoginBrandStore } from '/@/pah/PahPublicLoginBrandStore';
import { createPasswordLoginPayload } from './password-login-payload';

const { refs, setRefs, router, service } = useCool();
const { user, app } = useBase();
const { t } = useI18n();
const route = useRoute();
const brandStore = usePahPublicLoginBrandStore();
const branding = computed(() => brandStore.current);
const heroStyle = computed(() => {
	const background = branding.value.assets.background;
	return background
		? {
				backgroundImage: `linear-gradient(rgb(9 19 31 / 72%), rgb(9 19 31 / 88%)), url("${background.url}")`
			}
		: undefined;
});

// 状态
const saving = ref(false);
const feishuSaving = ref(false);
const loginPolicy = ref<PahLoginPolicy>();
const policyNotice = ref('');
const feishuMethod = computed(() => {
	if (!loginPolicy.value?.enabledMethods.includes('feishu')) return undefined;
	return loginPolicy.value.methods.find(
		method => method.id === 'feishu' && method.enabled && method.ready
	);
});
const captchaRequired = computed(() => loginPolicy.value?.captchaRequired !== false);

// 表单数据
const form = reactive({
	username: storage.get('username') || '',
	password: '',
	captchaId: '',
	verifyCode: ''
});

// 演示模式
if (import.meta.env.MODE == 'demo') {
	form.username = 'admin';
	form.password = '123456';
}

onMounted(loadLoginPolicy);

async function loadLoginPolicy() {
	try {
		loginPolicy.value = await pahIdentityApi.loginPolicy();
		policyNotice.value = '';
	} catch {
		policyNotice.value = '其他登录方式暂时不可用，您仍可使用账号密码登录。';
	}
}

async function toFeishuLogin() {
	if (!feishuMethod.value || feishuSaving.value) return;
	feishuSaving.value = true;
	try {
		const requestedReturnTo = Array.isArray(route.query.returnTo)
			? route.query.returnTo[0]
			: route.query.returnTo || route.query.redirect;
		const returnTo = pahNormalizeIdentityReturnTo(requestedReturnTo);
		const result = await pahIdentityApi.startFeishu(returnTo);
		if (!pahIsAllowedAuthorizationUrl(result.authorizationUrl)) {
			throw new Error('飞书授权地址不可信，请联系管理员');
		}
		window.location.assign(result.authorizationUrl);
	} catch (error) {
		ElMessageBox.alert((error as Error).message || '飞书登录暂时不可用', {
			title: t('提示'),
			type: 'error'
		});
		feishuSaving.value = false;
	}
}

// 登录
async function toLogin() {
	if (!form.username) {
		return ElMessage.error(t('用户名不能为空'));
	}

	if (!form.password) {
		return ElMessage.error(t('密码不能为空'));
	}

	if (captchaRequired.value && !form.verifyCode) {
		return ElMessage.error(t('图片验证码不能为空'));
	}

	saving.value = true;

	try {
		// 登录
		await service.base.open
			.login(createPasswordLoginPayload(form, captchaRequired.value))
			.then(user.setToken);

		// token 事件
		await Promise.all(app.events.hasToken.map(e => e()));

		// 设置缓存
		storage.set('username', form.username);

		// 跳转首页
		router.push('/');
	} catch (err) {
		// 刷新验证码
		refs.picCaptcha?.refresh?.();

		// 提示错误
		ElMessageBox.alert((err as Error).message, {
			title: t('提示'),
			type: 'error'
		});
	}

	saving.value = false;
}
</script>

<style lang="scss" scoped>
.page-login {
	display: grid;
	grid-template-columns: minmax(460px, 1.08fr) minmax(420px, 0.92fr);
	width: 100%;
	height: 100%;
	min-height: 620px;
	overflow: hidden;
	background: #f8fafc;
	color: #111827;

	&.is-plugin-brand .pah-login-hero {
		background:
			radial-gradient(circle at 16% 24%, rgb(43 211 209 / 24%), transparent 26%),
			linear-gradient(145deg, #15356d 0%, #2764d4 56%, #4d55bd 100%);
	}

	&.pah-login--centered {
		grid-template-columns: 1fr;

		.pah-login-hero {
			display: none;
		}

		.pah-mobile-brand {
			display: flex;
		}
	}
}

.pah-login-hero {
	position: relative;
	display: flex;
	align-items: center;
	justify-content: center;
	overflow: hidden;
	padding: 64px clamp(42px, 7vw, 112px);
	background: #09131f;
	color: #f8fafc;
	isolation: isolate;
	background-position: center;
	background-size: cover;
}

.pah-grid {
	position: absolute;
	inset: 0;
	z-index: -2;
	background-image:
		linear-gradient(rgb(255 255 255 / 4%) 1px, transparent 1px),
		linear-gradient(90deg, rgb(255 255 255 / 4%) 1px, transparent 1px);
	background-size: 48px 48px;
	mask-image: linear-gradient(to bottom, #000 20%, transparent 90%);
}

.pah-aurora {
	position: absolute;
	z-index: -1;
	width: 520px;
	height: 520px;
	border-radius: 50%;
	filter: blur(90px);
	opacity: 0.22;
	animation: pah-aurora 11s ease-in-out infinite alternate;

	&--warm {
		left: -240px;
		bottom: -220px;
		background: #ff5b21;
	}

	&--cool {
		right: -280px;
		top: -220px;
		background: #15d8dc;
		animation-delay: -4s;
	}
}

.pah-hero-content {
	width: min(580px, 100%);
}

.pah-mark-stage {
	position: relative;
	display: grid;
	place-items: center;
	width: 190px;
	height: 190px;
	margin-bottom: 34px;

	img {
		position: relative;
		z-index: 2;
		width: 126px;
		height: 126px;
		filter: drop-shadow(0 20px 30px rgb(255 91 33 / 22%));
		animation: pah-float 4.8s ease-in-out infinite;
	}
}

.pah-orbit {
	position: absolute;
	border: 1px solid rgb(255 255 255 / 15%);
	border-radius: 50%;
	animation: pah-spin 14s linear infinite;

	&::after {
		position: absolute;
		top: -3px;
		left: 50%;
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: #24dce0;
		box-shadow: 0 0 12px #24dce0;
		content: '';
	}

	&--outer {
		inset: 0;
	}

	&--inner {
		inset: 18px;
		border-style: dashed;
		animation-direction: reverse;
		animation-duration: 10s;

		&::after {
			background: #ff8a1f;
			box-shadow: 0 0 12px #ff8a1f;
		}
	}
}

.pah-spark {
	position: absolute;
	width: 4px;
	height: 4px;
	border-radius: 50%;
	background: #fff;
	box-shadow: 0 0 12px #fff;
	animation: pah-pulse 2.4s ease-in-out infinite;

	&--one {
		left: 14px;
		top: 54px;
	}

	&--two {
		right: 18px;
		bottom: 38px;
		animation-delay: -0.8s;
	}

	&--three {
		right: 35px;
		top: 25px;
		animation-delay: -1.6s;
	}
}

.pah-eyebrow,
.pah-console-label {
	display: flex;
	align-items: center;
	gap: 9px;
	margin: 0;
	font-size: 10px;
	font-weight: 700;
	letter-spacing: 0.18em;

	span {
		width: 26px;
		height: 2px;
		background: linear-gradient(90deg, #ff6b18, #26dce0);
	}
}

.pah-hero-content h1 {
	margin: 14px 0 20px;
	font-size: clamp(40px, 4vw, 56px);
	font-weight: 680;
	line-height: 1.04;
	letter-spacing: -0.045em;
}

.pah-hero-copy {
	max-width: 540px;
	margin: 0;
	color: #a9b7c8;
	font-size: 15px;
	line-height: 1.8;
}

.pah-capabilities {
	display: grid;
	grid-template-columns: repeat(3, 1fr);
	gap: 10px;
	margin: 38px 0 0;
	padding: 0;

	li {
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding: 14px;
		border: 1px solid rgb(255 255 255 / 9%);
		border-radius: 10px;
		background: rgb(255 255 255 / 4%);
		color: #d8e0ea;
		font-size: 11px;
		list-style: none;
		backdrop-filter: blur(8px);

		span {
			color: #57dfe2;
			font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
			font-size: 10px;
		}
	}
}

.pah-origin {
	position: absolute;
	right: clamp(32px, 6vw, 88px);
	bottom: 28px;
	left: clamp(32px, 6vw, 88px);
	display: flex;
	align-items: center;
	gap: 12px;
	color: #6f8194;
	font-size: 9px;
	letter-spacing: 0.12em;
}

.pah-origin-line {
	flex: 1;
	height: 1px;
	background: rgb(255 255 255 / 9%);
}

.pah-login-panel {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 48px clamp(36px, 6vw, 88px);
	background: radial-gradient(circle at 100% 0%, rgb(21 216 220 / 8%), transparent 35%), #f8fafc;
}

.pah-login-card {
	width: min(390px, 100%);
}

.pah-mobile-brand {
	display: none;
	align-items: center;
	gap: 8px;
	margin-bottom: 34px;

	img {
		width: 34px;
		height: 34px;
	}
}

.pah-console-label {
	color: #64748b;
}

.pah-login-card h2 {
	margin: 14px 0 8px;
	font-size: 32px;
	letter-spacing: -0.03em;
}

.pah-login-intro {
	margin: 0 0 34px;
	color: #64748b;
	font-size: 13px;
}

.form {
	width: 100%;

	:deep(.el-form-item) {
		margin-bottom: 19px;
	}

	:deep(.el-form-item__label) {
		height: auto;
		padding: 0 0 7px 1px;
		color: #475569;
		font-size: 12px;
		font-weight: 600;
		line-height: 1.2;
	}

	:deep(.el-input__wrapper) {
		min-height: 48px;
		padding: 0 14px;
		border: 1px solid #dbe3ec;
		border-radius: 9px;
		background: #fff;
		box-shadow: 0 1px 2px rgb(15 23 42 / 4%);
		transition:
			border-color 160ms ease,
			box-shadow 160ms ease;

		&.is-focus {
			border-color: #198ee8;
			box-shadow: 0 0 0 3px rgb(25 142 232 / 10%);
		}
	}

	:deep(.el-input__inner) {
		color: #172033;
		font-size: 14px;
	}

	:deep(.pic-captcha) {
		position: absolute;
		right: -12px;
		top: 0;
	}
}

.op {
	margin-top: 30px;

	:deep(.el-button) {
		width: 100%;
		height: 48px;
		border: 0;
		border-radius: 9px;
		background: linear-gradient(105deg, #126ec9 0%, #168fdd 55%, #14aeb8 100%);
		box-shadow: 0 10px 20px rgb(20 124 197 / 18%);
		font-size: 14px;
		font-weight: 650;
		letter-spacing: 0.08em;
	}
}

.pah-external-login {
	margin-top: 20px;
}

.pah-login-divider {
	display: flex;
	align-items: center;
	gap: 12px;
	margin-bottom: 16px;
	color: #94a3b8;
	font-size: 11px;

	&::before,
	&::after {
		flex: 1;
		height: 1px;
		background: #e2e8f0;
		content: '';
	}
}

.pah-feishu-login {
	width: 100%;
	height: 46px;
	border-color: #d7dee8;
	border-radius: 9px;
	font-weight: 600;
}

.pah-login-notice {
	margin: 18px 0 0;
	color: #64748b;
	font-size: 12px;
	line-height: 1.6;
}

.pah-fork-note {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 8px;
	margin-top: 36px;
	padding-top: 18px;
	border-top: 1px solid #e2e8f0;
	font-size: 10px;

	span {
		padding: 3px 6px;
		border: 1px solid #cbd5e1;
		border-radius: 4px;
		color: #64748b;
		font-weight: 700;
		letter-spacing: 0.08em;
	}

	a {
		color: #64748b;
		text-decoration: none;

		&:hover {
			color: #168fdd;
		}
	}
}

@keyframes pah-spin {
	to {
		transform: rotate(360deg);
	}
}

@keyframes pah-float {
	0%,
	100% {
		transform: translateY(0) scale(1);
	}
	50% {
		transform: translateY(-8px) scale(1.02);
	}
}

@keyframes pah-pulse {
	0%,
	100% {
		opacity: 0.35;
		transform: scale(0.8);
	}
	50% {
		opacity: 1;
		transform: scale(1.4);
	}
}

@keyframes pah-aurora {
	to {
		transform: translate3d(50px, -30px, 0) scale(1.12);
	}
}

@media screen and (max-width: 980px) {
	.page-login {
		grid-template-columns: 1fr;
		min-height: 100%;
		overflow-y: auto;
	}

	.pah-login-hero {
		display: none;
	}

	.pah-login-panel {
		min-height: 100%;
	}

	.pah-mobile-brand {
		display: flex;
	}
}

@media screen and (max-width: 520px) {
	.pah-login-panel {
		align-items: flex-start;
		padding: 40px 24px;
	}
}

@media (prefers-reduced-motion: reduce) {
	.pah-aurora,
	.pah-mark-stage img,
	.pah-orbit,
	.pah-spark {
		animation: none;
	}
}
</style>
