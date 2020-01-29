<script>
  let todos = [
    {done: false, text: "Doku schreiben"},
    {done: false, text: "Tests schreiben"},
  ]
  $: remaining = todos.filter(t => !t.done).length;

  function add() {
    todos = todos.concat({done:false, text: ""})
  }

  function clear() {
    todos = todos.filter(t => !t.done);
  }
</script>

<h3>Todos</h3>
{#each todos as todo}
  <div class="todo">
    <input type="checkbox" bind:checked={todo.done}>
    <input type="text" placeholder="What needs to be done?" bind:value="{todo.text}">
  </div>
{:else}
  <div>nothing to do</div>
{/each}

<div>{remaining} remaining todos</div>

<div>
  <button on:click={add}>Add new</button>
  <button on:click={clear}>Clear completed</button>
</div>

<style type="less">
  .todo {
    display: flex;
    input[type="checkbox"] {
      margin-right: .3em;
    }
    input[type="text"] {
      flex-grow: 1;
    }
  }
</style>
