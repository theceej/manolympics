/** Client-side helpers for passing an invite code around (People + Settings both use these). */

export function joinUrl(code: string): string {
	const origin = typeof window !== 'undefined' ? window.location.origin : '';
	return `${origin}/register?invite=${code}`;
}

export function inviteMessage(code: string, name?: string | null): string {
	const who = name ? `${name}, you're in! ` : '';
	return `${who}Join our Manolympics! 🏅 Tap to set up your login: ${joinUrl(code)}`;
}

/** Native share sheet where available, WhatsApp as the desktop fallback. */
export async function shareInvite(code: string, name?: string | null): Promise<void> {
	if (typeof navigator !== 'undefined' && navigator.share) {
		try {
			await navigator.share({ title: 'Manolympics invite', text: inviteMessage(code, name) });
		} catch {
			/* user cancelled */
		}
		return;
	}
	whatsappInvite(code, name);
}

export function whatsappInvite(code: string, name?: string | null): void {
	window.open(`https://wa.me/?text=${encodeURIComponent(inviteMessage(code, name))}`, '_blank');
}

export async function copyInvite(code: string): Promise<boolean> {
	try {
		await navigator.clipboard.writeText(joinUrl(code));
		return true;
	} catch {
		return false;
	}
}
