<script>
    import Hero from './Hero.svelte';
    import SimpleFooter from './Footer.svelte';
    import ReactivityClickCounter from './ReactivityClickCounter.svelte';

    export let name;
</script>

<Hero/>
<main>
    <h1>Hello {name}!</h1>
    <p>Visit the <a href="https://svelte.dev/tutorial" target="_blank">Svelte tutorial</a> to learn how to build Svelte apps.</p>
    <p>Maecenas faucibus mollis interdum. Maecenas faucibus mollis interdum. Donec id elit non mi porta gravida at eget metus. Vestibulum id ligula porta felis euismod semper. Vivamus sagittis lacus vel augue laoreet rutrum faucibus dolor auctor. Aenean lacinia bibendum nulla sed consectetur. Praesent commodo cursus magna, vel scelerisque nisl consectetur et.</p>
    <ReactivityClickCounter/>
</main>
<SimpleFooter/>

<style lang="less">
    main {
        padding: 1em; /* TODO how to create less variable that can be used in multiple components? */
        max-width: 640px;
        margin: 0 auto;
    }

</style>
