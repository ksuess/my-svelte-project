<script>
    let count = 0;
    // reactive declarations
    $: doubled = 2 * count;
    $: sixth = 3 * doubled;

    function handleClick() {
        count += 1;
    }
    // reactive statement
    $: if(count >= 3) {
        console.log("count >= 3");
    }
</script>

<button on:click={handleClick}>
    clicked {count} {count===1 ? 'time' : 'times'}
</button>

<p>{count} doubled is {doubled}.</p>
<p>{count} six times is {sixth}.</p>
