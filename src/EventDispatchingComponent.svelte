<script>
	import { createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher();

	function sayHello() {
		dispatch('componentsmessageevent', {
			text: 'Hello!',
			color: 'orange',
		});
	}
</script>

<button on:click={sayHello}>
	Click to say hello with a dispatched event
</button>
