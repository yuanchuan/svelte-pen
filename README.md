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

### Import another pen as Svelte component on CodePen.

See example: https://codepen.io/yuanchuan/pen/RwJPoNr

```html
<svelte-pen><textarea>
  <Percent value={20} />

  <script>
    import Percent from '/yuanchuan/pen/WNybLmE.svelte';
  </script>
</textarea></svelte-pen>
```

### Pass component attributes to Svelte.

```html
<svelte-pen name="svelte"><textarea>
  <p>
    Hello {name}!
  </p>

  <script>
    export let name
  </script>
</textarea></svelte-pen>
```

### Use different Svelte version.

The default version is `3.52.0` but you can specify a different version through `svelte:version` attribute.

```html
<svelte-pen svelte:version="latest">

</svelte-pen>
```
