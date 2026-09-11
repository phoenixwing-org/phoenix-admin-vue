import { describe, expect, it } from 'vitest';
import { createPasswordLoginPayload } from './password-login-payload';

const form = {
	username: 'admin',
	password: '123456',
	captchaId: 'captcha-id',
	verifyCode: 'a1b2'
};

describe('password login payload', () => {
	it('验证码开启时发送完整校验字段', () => {
		expect(createPasswordLoginPayload(form, true)).toEqual(form);
	});

	it('验证码关闭时完全省略验证码字段', () => {
		expect(createPasswordLoginPayload({ ...form, captchaId: '', verifyCode: '' }, false)).toEqual({
			username: 'admin',
			password: '123456'
		});
	});
});
