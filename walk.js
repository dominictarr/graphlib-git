var Graph = require('graphlib').Digraph

var load = require('git-fs-repo')
var walkTree = require('git-walk-tree')
var walkRefs = require('git-walk-refs')

function getId(x) {
  return 'string' === typeof x ? x : x.toString('hex')
}

function type (v) {
  if(v._data) {
    v.type = 'blob'
  }
  else if(v._members) {
    v._members.forEach(function (e) {
      e.hash = e.hash.toString('hex')
    })
    v.type = 'tree'

  }
  else if(v._attrs) {
    v.type = 'commit'
  }
  delete v._raw
  delete v._data
}
var gitGraph = 
module.exports = function gitGraph(repo, head, cb) {
  var graph = new Graph()

  var n = 0

  function find(key, parent, val) {
    key = getId(key)
    n ++

    function branch (ary, getVal) {
      if(Array.isArray(ary))
        ary.forEach(function (e) {
          find(e.hash || e, key, getVal && getVal(e))
        })
    }

    if(graph.hasNode(key))
      return next()

    repo.find(key, function g (err, obj) {
      var id = getId(obj.hash)

      if(!graph.hasNode(id)) {
        graph.addNode(id)
        type(obj)
        graph.node(id, obj)
      }

      if(parent) {
        if(parent !== id) {
          graph.addEdge(null, parent, id, val || {})
        } else
          return next()
      }
      branch(obj._members, function val (v) {
        return {label: v.name}
      })
      branch(obj._attrs && obj._attrs.parent)
      branch(obj._attrs && obj._attrs.tree)
      next()
    })
  }

  function next () {
    if(--n) return
    cb(null, graph)
  }

  find(head, null)
}


load('.git/', function (err, repo) {
  var adj = require('graphlib-adjacency')

  var master = require('fs').readFileSync('.git/refs/heads/master', 'utf8').trim()
  gitGraph(repo, master, function (err, graph) {
//    console.log(graph)
//    console.log(JSON.stringify(graph, null, 2))
    console.log(JSON.stringify(adj.toAdjacency(graph), null, 2))
  })

})
