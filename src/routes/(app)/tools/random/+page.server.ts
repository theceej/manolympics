import { attendingPeople } from '$server/people';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
	const { currentEdition } = await parent();
	// Only the people actually turning up this year go in the pool.
	const attendees = await attendingPeople(currentEdition?.id);
	return { attendees };
};
