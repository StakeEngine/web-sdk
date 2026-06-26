<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	const { Story } = defineMeta({
		title: 'MODE_BONUS/bookEvent',
	});
</script>

<script lang="ts">
	import { StoryGameTemplate, StoryLocale, type TemplateArgs, templateArgs } from 'components-storybook';

	import Game from '../components/Game.svelte';
	import { setContext } from '../game/context';
	import { playBookEvent } from '../game/utils';
	import events from './data/bonus_events';

	setContext();

	const eventStories = [
		{ name: 'reveal', data: events.reveal },
		{ name: 'freeSpinTrigger', data: events.freeSpinTrigger },
		{ name: 'magnetActivated', data: events.magnetActivated },
		{ name: 'clusterSeriesUpdate', data: events.clusterSeriesUpdate },
		{ name: 'superSeriesCarry', data: events.superSeriesCarry },
		{ name: 'winInfo', data: events.winInfo },
		{ name: 'setWin', data: events.setWin },
		{ name: 'freeSpinEnd', data: events.freeSpinEnd },
		{ name: 'finalWin', data: events.finalWin },
	];
</script>

{#snippet template(args: TemplateArgs<any>)}
	<StoryGameTemplate skipLoadingScreen={args.skipLoadingScreen} action={async () => { await args.action?.(args.data); }}>
		<StoryLocale lang="en">
			<Game />
		</StoryLocale>
	</StoryGameTemplate>
{/snippet}

{#each eventStories as eventStory}
	<Story
		name={eventStory.name}
		args={templateArgs({ skipLoadingScreen: true, data: eventStory.data, action: async (data) => await playBookEvent(data, { bookEvents: [] }) })}
		{template}
	/>
{/each}
