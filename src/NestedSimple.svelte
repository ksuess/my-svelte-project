<script>
  // props are declared with 'export'
  export let age = 17;
  export let name = undefined;
</script>

<div class="">
  I am a NestedSimple component. I am {age}. My name is {name}.
  {#if age>18}
    <b>Im over 18.</b>
  {/if}
</div>
