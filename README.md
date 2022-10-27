# svelte-pen

Create Svelte component demo quickly.


```html
<script type="module" src="https://unpkg.com/svelte-pen"></script>

<svelte-pen><template>
  <button on:click={handleClick}>{count}</button>

  <script>
    let count = 0;

    function handleClick() {
      count += 1;
    }
  </script>
</template></svelte-pen>
```
