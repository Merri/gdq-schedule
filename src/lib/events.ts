import { getId } from './getId'
import { format } from 'date-fns/format'

const options = { useAdditionalDayOfYearTokens: true }

interface GDQEvent {
	name: string
	shortName: string
}

export const events: [eventId: number, gdqEvent: GDQEvent][] = [
	[46, { name: 'Awesome Games Done Quick 2024', shortName: 'AGDQ 2024' }],
]

export interface GDQ_event {
	type: 'event'
	id: number
	short: string
	name: string
	hashtag: string
	datetime: string
	timezone: string
	use_one_step_screening: boolean
}

interface GDQ_run {
	type: 'speedrun'
	id: number
	name: string
	display_name: string
	description: string
	category: string
	console: string
	runners: {
		type: 'runner'
		id: number
		name: string
		stream: string
		twitter: string
		youtube: string
		platform: string
		pronouns: string
	}[]
	hosts: {
		type: 'headset'
		id: number
		name: string
		pronouns: string
	}[]
	commentators: {
		type: 'headset'
		id: number
		name: string
		pronouns: string
	}[]
	starttime: string
	endtime: string
	order: number
	run_time: string
	setup_time: string
	anchor_time: null
	video_links: {
		id: number
		link_type: 'youtube'
		url: string
	}[]
}

interface GDQ_interview {
	type: 'interview'
	id: number
	order: number
	suborder: number
	social_media: boolean
	interviewers: string
	topic: string
	public: boolean
	prerecorded: boolean
	producer: string
	length: string
	subjects: string
	camera_operator: string
}

interface Segment {
	type: 'segment'
	id: string
	items: GDQ_interview[]
	starttime: string
}

interface Schedule extends Omit<GDQ_event, 'type'> {
	type: 'schedule',
	days: {
		id: string,
		date: string,
		segments: (GDQ_run | Segment)[]
	}[]
}

export async function getEvents(): Promise<GDQ_event[]> {
	return fetch(`https://gamesdonequick.com/tracker/api/v2/events/`)
		.then((data) => data.json())
		.then((json) => json.results)
		.catch(() => [])
}

export async function getRuns(eventId: number): Promise<GDQ_run[]> {
	return fetch(`https://gamesdonequick.com/tracker/api/v2/events/${eventId}/runs/`)
		.then((data) => data.json())
		.then((json: { results: GDQ_run[] }) => json.results.sort((a, b) => a.order - b.order))
		.catch(() => [])
}

export async function getInterviews(eventId: number): Promise<GDQ_interview[]> {
	return fetch(`https://gamesdonequick.com/tracker/api/v2/events/${eventId}/interviews/`)
		.then((data) => data.json())
		.then((json) => json.results)
		.catch(() => [])
}

export async function getEventSchedule(eventId: number) {
	// just guessing we won't ever get to 1000 events while the current GDQ API is in use
	if (isNaN(eventId) || eventId < 17 || eventId >= 1000) {
		throw new Error('eventId must be a value from range 17 to 999')
	}

	const info = (await getEvents()).find(({ id }) => id === eventId)
	if (!info) throw new Error(`No event available for eventId ${eventId}`)

	const runs = await getRuns(eventId)
	const interviews = runs.length === 0 ? [] : await getInterviews(eventId)
	const schedule: Schedule = { ...info, type: 'schedule', days: [] }

	let currentDay: string | undefined
	let currentSegments: (GDQ_run | Segment)[] = []
	let prevEndTime = ''

	runs.forEach((run) => {
		const day = format(run.starttime.slice(0, 19), 'EEEE D', options)

		if (currentDay !== day) {
			currentDay = day
			currentSegments = []
			schedule.days.push({ id: getId(day), date: run.starttime, segments: currentSegments })
		}

		const iviews = interviews.filter((iview) => iview.order === run.order)

		if (iviews.length) {
			currentSegments.push({
				type: 'segment',
				id: `segment-${run.order}`,
				items: iviews.sort((a, b) => a.order - b.order || a.suborder - b.suborder),
				starttime: prevEndTime,
			})
		}

		prevEndTime = run.endtime

		currentSegments.push(run)
	})

	return schedule
}
