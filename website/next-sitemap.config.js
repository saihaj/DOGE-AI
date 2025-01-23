/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: 'https://dogeai.info',
  generateRobotsTxt: true,
  generateIndexSitemap: false,
  robotsTxtOptions: {
    policies: [
      {
        userAgent: '*',
        allow: '/',
      },
    ],
  },
  changefreq: 'daily',
  priority: 1.0,
};
