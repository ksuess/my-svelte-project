<script>
    let count = 0;
    $: doubled = 2 * count;
    $: sixth = 3 * doubled;

    function handleClick() {
        count += 1;
    }
</script>

<button on:click={handleClick}>
    clicked {count} {count===1 ? 'time' : 'times'}
</button>

<p>{count} doubled is {doubled}</p>
<p>{count} sixth is {sixth}</p>
