var spawn = require('child_process').spawn
var pull = require('pull-stream')
var ga   = require('graphlib-adjacency')

function git(dir, cmd, cb) {
  var data = '', n = 0
  spawn('git', cmd, {cwd: dir})
    .stdout.on('data', function (d) {
      data += d
    })
    .on('end', function () {
      if(!n++) cb(null, data)
    })
    .on('error', function (err) {
      if(!n++) cb(err)
    })
}

function revlist (dir, cb) {
  git(dir, ['rev-list', '--all', '--parents'], function (err, data) {
    if(err) return cb(err)
    var lines = data.split('\n')
    var adj = {}
    lines.forEach(function (line) {
      if(!line) return
      line = line.split(' ')
      adj[line.shift()] = line
    })
    cb(null, adj)
  })
}

function message (dir, commit, cb) {
  git(dir, ['show', '-s', '--format=%H%n%T%n%an%n%ad%n%n%s', commit], 
  function (err, data) {
    if(err) return cb(err)
    var p = data.split('\n')
    cb(null, {
      id: p.shift(), tree: p.shift(),
      author: p.shift(), date: p.shift(),
      message: p.slice(1).join('\n'),
    })
  })
}

function messages (dir, adj, cb) {
  var n = 0
  pull(
    pull.values(Object.keys(adj)),
    pull.paraMap(message.bind(null, dir), 10),
    pull.reduce(function (acc, commit) {
      acc[commit.id] = commit
      commit.parents = adj[commit.id]
      return acc
    }, {}, cb)
  )

  /*
  for(var commit in adj) {
    n++
    message(dir, commit, function (err, value) {
      if(err) {
        n = -1
        return cb(err)
      }
      value.parents = adj[commit]
      adj[commit] = value

      if(--n) return
      cb(null, adj)
    })
  }
  if(!n) cb (new Error('no commits'))  
  */
}

function toGraph (adj) {
  return ga.toGraph(adj, {
    getValue: function (val) {
      var o = {}
      for (var k in val) {
        if(k !== 'parents')
          o[k] = val[k]
      }
      return o
    }
  })
}

module.exports = function (dir, cb) {
  revlist(dir, function (err, adj) {
    if(err) return cb(err)
    messages(dir, adj, function (err, adj) {
      if(err) cb(err)
      else    cb(null, toGraph(adj))
    })
  })
}

if(!module.parent)
  module.exports(process.cwd(), function (err, adj) {
    if(err) throw err
    console.log(adj)
  })
