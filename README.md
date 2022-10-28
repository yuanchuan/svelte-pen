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

## A pen on CodePen as a single Svelte component


```html
<svelte-pen><textarea>
  <Percent value={20} />

  <script>
    import Percent from '/yuanchuan/pen/RwJPoNr.svelte';
  </script>
</textarea></svelte-pen>
```
