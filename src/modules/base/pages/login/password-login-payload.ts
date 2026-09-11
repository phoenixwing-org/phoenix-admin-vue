export interface PasswordLoginForm {
	username: string;
	password: string;
	captchaId: string;
	verifyCode: string;
}

export function createPasswordLoginPayload(form: PasswordLoginForm, captchaRequired: boolean) {
	const credentials = {
		username: form.username,
		password: form.password
	};

	return captchaRequired
		? {
				...credentials,
				captchaId: form.captchaId,
				verifyCode: form.verifyCode
			}
		: credentials;
}
