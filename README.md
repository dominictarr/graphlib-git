# graphlib-git

read git commits into a graphlib format.

``` js
var ggraph = require('graphlib-git')

ggraph(process.cwd(), function (err, graph) {
  if(err) throw err
  console.log(graph)
})
```

## License

MIT
