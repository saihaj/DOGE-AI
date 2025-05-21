/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';
import { cn } from '@/lib/utils';
import { ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { memo } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

const components: Partial<Components> = {
  code: ({ node, children, className, ...props }) => (
    <code
      className={cn(
        'text-sm bg-zinc-100 dark:bg-zinc-800 py-0.5 px-1 rounded-md',
        className,
      )}
      {...props}
    >
      {children}
    </code>
  ),
  pre: ({ node, children, ...props }) => (
    <pre
      className="bg-zinc-100 dark:bg-zinc-800 p-4 rounded-md overflow-auto"
      {...props}
    >
      {children}
    </pre>
  ),
  ol: ({ node, children, ...props }) => (
    <ol className="list-decimal list-outside ml-6" {...props}>
      {children}
    </ol>
  ),
  ul: ({ node, children, ...props }) => (
    <ul className="list-disc list-outside ml-6" {...props}>
      {children}
    </ul>
  ),
  li: ({ node, children, ...props }) => (
    <li className="py-1" {...props}>
      {children}
    </li>
  ),
  strong: ({ node, children, ...props }) => (
    <span className="font-semibold" {...props}>
      {children}
    </span>
  ),
  a: ({ node, children, href, ...props }) => (
    <Link
      href={href || '#'}
      className="text-blue-500 hover:underline inline-flex items-center gap-1"
      target="_blank"
      rel="noopener noreferrer"
      {...props}
    >
      {children}
      <ExternalLink className="w-4 h-4" aria-hidden="true" />
    </Link>
  ),
  h1: ({ node, children, ...props }) => (
    <h1 className="text-3xl font-semibold mt-6 mb-2" {...props}>
      {children}
    </h1>
  ),
  h2: ({ node, children, ...props }) => (
    <h2 className="text-2xl font-semibold mt-6 mb-2" {...props}>
      {children}
    </h2>
  ),
  h3: ({ node, children, ...props }) => (
    <h3 className="text-xl font-semibold mt-6 mb-2" {...props}>
      {children}
    </h3>
  ),
  h4: ({ node, children, ...props }) => (
    <h4 className="text-lg font-semibold mt-6 mb-2" {...props}>
      {children}
    </h4>
  ),
  h5: ({ node, children, ...props }) => (
    <h5 className="text-base font-semibold mt-6 mb-2" {...props}>
      {children}
    </h5>
  ),
  h6: ({ node, children, ...props }) => (
    <h6 className="text-sm font-semibold mt-6 mb-2" {...props}>
      {children}
    </h6>
  ),
  p: ({ node, children, ...props }) => (
    <p className="mb-2 last-of-type:mb-0" {...props}>
      {children}
    </p>
  ),
};

const remarkPlugins = [remarkGfm];

const NonMemoizedMarkdown = ({
  children,
  className,
}: {
  children: string;
  className?: string;
}) => {
  return (
    <div className={cn(className)}>
      <ReactMarkdown remarkPlugins={remarkPlugins} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  );
};

export const Markdown = memo(
  NonMemoizedMarkdown,
  (prevProps, nextProps) =>
    prevProps.children === nextProps.children &&
    prevProps.className === nextProps.className,
);
