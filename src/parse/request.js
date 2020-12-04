const headers = require('./headers')
const postData = require('./postData')
const queryString = require('./queryString')
const state = require('./state/request')
const { emptyObject, getContentTypeValue } = require('../aid')

function request(node, spec) {
  spec.method = node.method.toUpperCase()
  spec.address = node.url

  if (node.comment) {
    spec.comment = node.comment
  }

  if (node.queryString) {
    // Filter out value pairs that are already in the request
    // Using base url, since url may be invalid (variable instead protocol)
    const url = new URL(node.url, 'https://example.com');
    const queryStringNode = node.queryString.filter(({name, value}) => {
      // decode URI before comparing, since searchParam will hold decoded values
      return url.searchParams.get(name) !== decodeURIComponent(value)
    })

    if (queryStringNode) {
      queryString(queryStringNode, spec.query)
    }
  }

  if (node.headers) {
    headers(node.headers, spec.headers)
  }
  if (node.postData && !emptyObject(node.postData)) {
    postData(node.postData, spec.post)
    contentType(node.postData.mimeType, spec.headers)
  }
  state(spec)

  if (spec.state.post.boundary) {
    addBoundary(spec.state.post.boundary, spec.headers)
  }
}

// Fallback to content type from postData
// Preserves explicit header which potentially has more information
function contentType(mimeType, headers) {
  if (!headers.has('Content-Type') && !headers.has('content-type')) {
    const item = { value: mimeType }
    const items = new Set([item])
    headers.set('content-type', items)
  }
}

function addBoundary(boundary, headers) {
  const contentType = headers.get('Content-Type') || headers.get('content-type')
  if (contentType) {
    const items = [...contentType.values()]
    const newItems = items.map((item) => {
      const value = getContentTypeValue(item.value)
      if (value === 'multipart/form-data') {
        return { value: `${value}; boundary=${boundary}` }
      }

      return item
    })

    headers.set('content-type', new Set(newItems))
  }
}

module.exports = request
