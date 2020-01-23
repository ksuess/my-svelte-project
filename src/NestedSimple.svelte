<script>
    export let age = 17;
    export let name;
</script>

<div class="">
    I am a NestedSimple. I am {age}. My name is {name}.
    {#if age>18}
        <b>Im over 18.</b>
    {/if}
</div>
