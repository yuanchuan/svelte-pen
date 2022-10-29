# svelte-pen

Create Svelte component demo quickly.


```html
<script type="module" src="https://unpkg.com/svelte-pen"></script>

<svelte-pen><textarea>
  <button on:click={handleClick}>{count}</button>

  <script>
    let count = 0;

    function handleClick() {
      count += 1;
    }
  </script>
</textarea></svelte-pen>
```

#### Import another pen as Svelte component on CodePen.

```html
<svelte-pen><textarea>
  <Percent value={20} />

  <script>
    import Percent from '/yuanchuan/pen/WNybLmE.svelte';
  </script>
</textarea></svelte-pen>
```
