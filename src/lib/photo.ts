/**
 * Resize/crop an image File to a small square JPEG data URL, entirely client-side. Keeps
 * avatars tiny (~a few KB) so they fit comfortably in SQLite and back up with the DB.
 */
export async function resizeImageToDataUrl(file: File, size = 256, quality = 0.8): Promise<string> {
	const bitmap = await createImageBitmap(file);
	const side = Math.min(bitmap.width, bitmap.height);
	const sx = (bitmap.width - side) / 2;
	const sy = (bitmap.height - side) / 2;

	const canvas = document.createElement('canvas');
	canvas.width = size;
	canvas.height = size;
	const ctx = canvas.getContext('2d');
	if (!ctx) throw new Error('Canvas not supported');
	ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, size, size);
	bitmap.close?.();
	return canvas.toDataURL('image/jpeg', quality);
}
