import { MetadataRoute } from 'next';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://swaryoga.com';
  
  // Static pages
  const staticPages = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 1,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/workshops`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/community`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/community/experiences`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.7,
    },
    {
      url: `${baseUrl}/community/questions`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.7,
    },
    {
      url: `${baseUrl}/community/tips`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.7,
    },
    {
      url: `${baseUrl}/community/transformations`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.7,
    },
    {
      url: `${baseUrl}/community/recordings`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    },
    {
      url: `${baseUrl}/life-planner`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/panchang`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    },
    {
      url: `${baseUrl}/faq`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.8,
    },
  ];

  // Dynamic pages - fetch from database
  let dynamicPages: MetadataRoute.Sitemap = [];

  try {
    // Fetch workshops
    const workshopsRes = await fetch(`${baseUrl}/api/workshops`, {
      next: { revalidate: 3600 }, // Revalidate every hour
    }).catch(() => null);

    if (workshopsRes?.ok) {
      const workshopsData = await workshopsRes.json();
      const workshops = workshopsData.workshops || [];
      
      dynamicPages = dynamicPages.concat(
        workshops.map((workshop: any) => ({
          url: `${baseUrl}/workshops/${workshop.slug || workshop._id}`,
          lastModified: new Date(workshop.updatedAt || workshop.createdAt),
          changeFrequency: 'weekly' as const,
          priority: 0.7,
        }))
      );
    }

    // Fetch blog posts (when implemented)
    const blogRes = await fetch(`${baseUrl}/api/blog`, {
      next: { revalidate: 3600 },
    }).catch(() => null);

    if (blogRes?.ok) {
      const blogData = await blogRes.json();
      const posts = blogData.posts || [];
      
      dynamicPages = dynamicPages.concat(
        posts.map((post: any) => ({
          url: `${baseUrl}/blog/${post.slug || post._id}`,
          lastModified: new Date(post.updatedAt || post.createdAt),
          changeFrequency: 'weekly' as const,
          priority: 0.6,
        }))
      );
    }
  } catch (error) {
    console.error('Error generating sitemap:', error);
  }

  return [...staticPages, ...dynamicPages];
}
