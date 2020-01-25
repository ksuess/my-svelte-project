<script>
  let m = { x: 0, y: 0 };

  function handleMousemove(event) {
    m.x = event.clientX;
    m.y = event.clientY;
  }
</script>

<style>
  div { width: 100%; height: 100%; min-height: 100px;
    background-color: #eee;
    margin-bottom: 1rem;
  }
</style>

<div on:mousemove={handleMousemove}>
  The mouse position is {m.x} x {m.y}
</div>
