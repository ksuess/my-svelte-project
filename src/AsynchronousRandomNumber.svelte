<!-- CORS prevents loading data see example on svelte.dev -->
<script>
  let promise = getRandomNumber();

  async function getRandomNumber() {
    const res = await fetch('/random-number');
    const text = await res.text();

    if (res.ok) {
      return text;
    } else {
      throw new Error(text);
    }
  }

  function handleClick() {
    promise = getRandomNumber();
  }
</script>

<button on:click={handleClick}>
  generate random number
</button>

{#await promise}
  <p>...waiting</p>
{:then numberPiepResult}
  <p>The number is {numberPiepResult}</p>
{:catch error}
  <p>There's an error:</p>
  <p style="color: red">{error.message}</p>
{/await}
