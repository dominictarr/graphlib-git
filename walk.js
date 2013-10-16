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
function short (s) {
  return s && s.substring(0, 8)
}

var gitGraph = 
module.exports = function gitGraph(repo, head, cb) {
  var graph = new Graph()

  var n = 0

  function find(key, parent, val) {
    key = getId(key)
    parent = short(parent)
    n ++

    function branch (ary, _getVal) {
      var getVal = _getVal
      if('function' !== typeof getVal)
        getVal = function () {return _getVal}
      if(Array.isArray(ary))
        ary.forEach(function (e) {
          find(e.hash || e, key, getVal(e))
        })
    }

    if(graph.hasNode(key))
      return next()

    repo.find(key, function g (err, obj) {
      var id = getId(obj.hash)
      var _id = short(id)
      if(!graph.hasNode(_id)) {
        graph.addNode(_id)
        type(obj)
        graph.node(_id, obj)
      }

      if(parent) {
        if(parent !== _id) {
          if(!graph.hasEdge(parent+'-'+_id))
            graph.addEdge(parent+'-'+_id, parent, _id, val || {})
        } else
          return next()
      }
      branch(obj._members, function val (v) {
        return {label: v.name}
      })
      branch(obj._attrs && obj._attrs.parent, {label: 'parent'})
      branch(obj._attrs && obj._attrs.tree, {label: 'tree'})
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
  var DOT = require('graphlib-dot')
  var master = require('fs').readFileSync('.git/refs/heads/master', 'utf8').trim()
  gitGraph(repo, master, function (err, graph) {
//    console.log(graph)
//    console.log(JSON.stringify(graph, null, 2))
//    console.log(JSON.stringify(adj.toAdjacency(graph), null, 2))
    console.log(DOT.encode(graph))
  })

})
