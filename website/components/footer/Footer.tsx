import React from 'react';
import { SiInstagram, SiX, SiYoutube } from 'react-icons/si';
import { IconType } from 'react-icons';
import Link from 'next/link';
import { LogoSmall } from '../navigation/Logo';
import { NAV_LINKS } from '../navigation/constants';
import { Logo } from '../logo';

export const Footer = () => {
  return (
    <div className="bg-white">
      <footer className="relative mx-auto max-w-6xl overflow-hidden py-12">
        <div className="md:px4 grid grid-cols-12 gap-x-1.5 gap-y-6 px-2">
          <LogoColumn />
          <GenericColumn title="Product" links={NAV_LINKS[0].sublinks} />
          <GenericColumn
            title="Company"
            links={[...NAV_LINKS[3].sublinks, ...NAV_LINKS[4].sublinks]}
          />
          <GenericColumn
            title="Legal"
            links={[
              {
                title: 'Terms & Conditions',
                href: '/#',
              },
              {
                title: 'Privacy Policy',
                href: '/#',
              },
              {
                title: 'Refund Policy',
                href: '/#',
              },
            ]}
          />

          <GenericColumn
            title="Socials"
            links={[
              {
                title: '',
                href: 'https://x.com/dogeai_gov',
                Icon: SiX,
              },
            ]}
          />
        </div>
      </footer>
    </div>
  );
};

const LogoColumn = () => {
  return (
    <div className="col-span-6 md:col-span-4">
      <Logo className="h-[50px] w-[50px] rounded-full" />
      <span className="mt-3 inline-block text-xs">
        © To The Moon Labs Inc. - All rights reserved.
      </span>
    </div>
  );
};

const GenericColumn = ({
  title,
  links,
}: {
  title: string;
  links: { title: string; href: string; Icon?: IconType }[];
}) => {
  return (
    <div className="col-span-6 space-y-2 text-sm md:col-span-2">
      <span className="block font-bold">{title}</span>
      {links.map(l => (
        <Link
          key={l.title}
          href={l.href}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 transition-colors hover:text-indigo-600 hover:underline"
        >
          {l.Icon && <l.Icon />}
          {l.title}
        </Link>
      ))}
    </div>
  );
};
