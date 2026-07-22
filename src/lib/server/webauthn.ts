import {
	generateAuthenticationOptions,
	generateRegistrationOptions,
	verifyAuthenticationResponse,
	verifyRegistrationResponse,
	type AuthenticationResponseJSON,
	type RegistrationResponseJSON
} from '@simplewebauthn/server';
import { env } from '$env/dynamic/private';

/**
 * Relying Party config. Defaults suit local dev; set RP_ID / ORIGIN in production to the
 * deployed host (e.g. RP_ID=mano.example.com, ORIGIN=https://mano.example.com).
 */
export function rp() {
	const rpID = env.RP_ID || 'localhost';
	const rpName = env.RP_NAME || 'Manolympics';
	// Origin must include scheme + port. Allow a comma-separated list for multi-origin dev.
	const origins = (env.ORIGIN || 'http://localhost:5173')
		.split(',')
		.map((o) => o.trim())
		.filter(Boolean);
	return { rpID, rpName, origins, origin: origins[0] };
}

function toB64Url(bytes: Uint8Array): string {
	return Buffer.from(bytes).toString('base64url');
}
function fromB64Url(s: string): Uint8Array<ArrayBuffer> {
	const buf = Buffer.from(s, 'base64url');
	const out = new Uint8Array(buf.length);
	out.set(buf);
	return out;
}

export async function registrationOptions(input: {
	userId: string;
	email: string;
	displayName: string;
	existing: { id: string; transports: string | null }[];
}) {
	const { rpID, rpName } = rp();
	// Copy into an ArrayBuffer-backed view so the type matches @simplewebauthn's Uint8Array.
	const encoded = new TextEncoder().encode(input.userId);
	const userID = new Uint8Array(encoded.length);
	userID.set(encoded);
	return generateRegistrationOptions({
		rpName,
		rpID,
		userName: input.email,
		userDisplayName: input.displayName,
		userID,
		attestationType: 'none',
		excludeCredentials: input.existing.map((c) => ({
			id: c.id,
			transports: c.transports ? (JSON.parse(c.transports) as AuthenticatorTransportList) : undefined
		})),
		authenticatorSelection: {
			residentKey: 'preferred',
			userVerification: 'preferred'
		}
	});
}

type AuthenticatorTransportList = ('ble' | 'cable' | 'hybrid' | 'internal' | 'nfc' | 'smart-card' | 'usb')[];

export async function verifyRegistration(input: {
	response: RegistrationResponseJSON;
	expectedChallenge: string;
}) {
	const { rpID, origins } = rp();
	const verification = await verifyRegistrationResponse({
		response: input.response,
		expectedChallenge: input.expectedChallenge,
		expectedOrigin: origins,
		expectedRPID: rpID,
		requireUserVerification: false
	});
	if (!verification.verified || !verification.registrationInfo) return null;
	const { credential } = verification.registrationInfo;
	return {
		id: credential.id, // base64url string
		publicKey: toB64Url(credential.publicKey),
		counter: credential.counter,
		transports: input.response.response.transports
			? JSON.stringify(input.response.response.transports)
			: null
	};
}

export async function authenticationOptions(
	allow: { id: string; transports: string | null }[]
) {
	const { rpID } = rp();
	return generateAuthenticationOptions({
		rpID,
		userVerification: 'preferred',
		allowCredentials: allow.map((c) => ({
			id: c.id,
			transports: c.transports ? (JSON.parse(c.transports) as AuthenticatorTransportList) : undefined
		}))
	});
}

export async function verifyAuthentication(input: {
	response: AuthenticationResponseJSON;
	expectedChallenge: string;
	credential: { id: string; publicKey: string; counter: number; transports: string | null };
}) {
	const { rpID, origins } = rp();
	const verification = await verifyAuthenticationResponse({
		response: input.response,
		expectedChallenge: input.expectedChallenge,
		expectedOrigin: origins,
		expectedRPID: rpID,
		requireUserVerification: false,
		credential: {
			id: input.credential.id,
			publicKey: fromB64Url(input.credential.publicKey),
			counter: input.credential.counter,
			transports: input.credential.transports
				? (JSON.parse(input.credential.transports) as AuthenticatorTransportList)
				: undefined
		}
	});
	if (!verification.verified) return null;
	return { newCounter: verification.authenticationInfo.newCounter };
}
