export const onRequestGet: PagesFunction = async (context) => {
  const origin = new URL(context.request.url).origin;

  const robotsTxt = [
    'User-agent: *',
    'Allow: /',
    '',
    `Sitemap: ${origin}/sitemap.xml`,
    '',
  ].join('\n');

  return new Response(robotsTxt, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
};
