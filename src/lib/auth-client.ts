import { startAuthentication, startRegistration } from '@simplewebauthn/browser';

async function postJson(url: string, body?: unknown) {
	const res = await fetch(url, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: body ? JSON.stringify(body) : undefined
	});
	if (!res.ok) {
		const msg = await res.text().catch(() => '');
		throw new Error(msg || `Request failed (${res.status})`);
	}
	return res.json();
}

export function passkeysSupported(): boolean {
	return typeof window !== 'undefined' && !!window.PublicKeyCredential;
}

export async function registerPasskey(input: {
	email: string;
	displayName: string;
	invite?: string;
}): Promise<void> {
	const options = await postJson('/api/auth/register/options', input);
	const attResp = await startRegistration({ optionsJSON: options });
	await postJson('/api/auth/register/verify', attResp);
}

export async function loginPasskey(): Promise<void> {
	const options = await postJson('/api/auth/login/options');
	const authResp = await startAuthentication({ optionsJSON: options });
	await postJson('/api/auth/login/verify', authResp);
}

export async function logout(): Promise<void> {
	await postJson('/api/auth/logout');
}
