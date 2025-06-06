export const NAV_LINKS = [
  {
    title: 'Product',
    sublinks: [
      {
        title: 'Product 1',
        href: '#',
      },
      {
        title: 'Product 2',
        href: '#',
      },
      {
        title: 'Product 3',
        href: '#',
      },
      {
        title: 'Product 4',
        href: '#',
      },
    ],
  },
  {
    title: 'Solutions',
    sublinks: [
      {
        title: 'Solutions 1',
        href: '#',
      },
      {
        title: 'Solutions 2',
        href: '#',
      },
      {
        title: 'Solutions 3',
        href: '#',
      },
    ],
  },
  {
    title: 'Documentation',
    sublinks: [
      {
        title: 'Docs 1',
        href: '#',
      },
      {
        title: 'Docs 2',
        href: '#',
      },
    ],
  },
  {
    title: 'Media',
    sublinks: [
      {
        title: 'Media 1',
        href: '#',
      },
      {
        title: 'Media 2',
        href: '#',
      },
      {
        title: 'Media 3',
        href: '#',
      },
    ],
  },
  {
    title: 'Pricing',
    sublinks: [
      {
        title: 'Pricing 1',
        href: '#',
      },
      {
        title: 'Pricing 2',
        href: '#',
      },
      {
        title: 'Pricing 3',
        href: '#',
      },
    ],
  },
];

export type LinkType = {
  title: string;
  sublinks: { title: string; href: string }[];
};
