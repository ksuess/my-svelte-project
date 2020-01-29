<script>
    import Hero from './Hero.svelte';
    import SimpleFooter from './Footer.svelte';
    import ReactivityClickCounter from './ReactivityClickCounter.svelte';
    import NestedSimple from './NestedSimple.svelte';
    import AsynchronousRandomNumber from './AsynchronousRandomNumber.svelte';
    import EventMouseOver from './EventMouseOver.svelte'
    import EventDispatchingComponent from './EventDispatchingComponent.svelte'
    import Todos from './Todos.svelte'
    import Keypad from './Keypad.svelte'
    import {count} from './stores.js'

    export let name;

    const personaldata = {
        age: 23,
        name: 'Pia',
    }

    // Component bindings
    // Keypad component
    // provide value by user input
    // component is dispatching an event 'submit'. We are listening with an event handler handleSubmit
    let telnr = '';
    // $: telinfo = telnr ? telnr: 'Please enter your phone number!';
    function handleSubmit() {
      alert(`submitted pin: ${telnr}`)
    }
</script>

<Hero/>
<main>
    <h1>Hello {name}!</h1>
    <p>Visit the <a href="https://svelte.dev/tutorial" target="_blank">Svelte tutorial</a> to learn how to build Svelte apps.</p>
    <p>Maecenas faucibus mollis interdum. Maecenas faucibus mollis interdum. Donec id elit non mi porta gravida at eget metus. Vestibulum id ligula porta felis euismod semper. Vivamus sagittis lacus vel augue laoreet rutrum faucibus dolor auctor. Aenean lacinia bibendum nulla sed consectetur. Praesent commodo cursus magna, vel scelerisque nisl consectetur et.</p>

    <h2>Stores</h2>

    <div class="component">
      <h3>The count is {$count}</h3>
      <button on:click={count.increment}>+</button>
      <button on:click={count.decrement}>-</button>
      <button on:click={count.reset}>reset</button>
      <input type="number" bind:value={$count}>
    </div>

    <h2>Bindings</h2>

    <h3>{telnr ? telnr: 'Please enter your phone number!'}</h3>
    <Keypad bind:valuepiep={telnr} on:submit={handleSubmit} />

    <div class="todos">
      <Todos/>
    </div>

    <EventDispatchingComponent on:componentsmessageevent="{event => alert(`My message: ${event.detail.text} in color ${event.detail.color}`)}"/>

    <EventMouseOver/>
    <AsynchronousRandomNumber/>

    <NestedSimple {...personaldata}/>
    <NestedSimple name={'Horst'}/>
    <NestedSimple age={62} name={'Lisa'}/>
    <NestedSimple/>

    <ReactivityClickCounter/>
</main>
<SimpleFooter/>

<style lang="less">
    .component {
      background-color: lighten(orange, 40%);
      margin: 1rem 0;
      padding: 1rem;
    }
    main {
        padding: 1em; /* TODO how to create less variable that can be used in multiple components? */
        max-width: 640px;
        margin: 0 auto;
    }
    .todos {
      .component();
    }

    // styling a consumed component
    .todos :global(.todo) {
      background-color: orange;
      padding: 0.3rem;
    }
</style>
