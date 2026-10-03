// www.tetracube.fun → https://tetracube.fun, one 301, path and query kept.
// Pages' _redirects can't match on host, so this runs as middleware. public/_routes.json limits
// Functions to the pages and the API, so assets never pay for an invocation; www asset URLs aren't
// linked from anywhere once the page itself has moved.
export const onRequest = ({ request, next }) => {
  const url = new URL(request.url);
  if (url.hostname === 'www.tetracube.fun') {
    url.hostname = 'tetracube.fun'; url.protocol = 'https:'; url.port = '';
    return Response.redirect(url.toString(), 301);
  }
  return next();
};
