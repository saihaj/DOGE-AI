'use client';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import {
  BookIcon,
  Home,
  MessageCircle,
  PencilIcon,
  Reply,
  ReplyAll,
} from 'lucide-react';
import Link from 'next/link';
import { Settings } from './settings';

const items = [
  {
    title: 'Home',
    url: '/',
    icon: Home,
  },
  {
    title: 'User Chat',
    url: '/userchat',
    icon: MessageCircle,
  },
  {
    title: 'Engage',
    url: '/engage',
    icon: Reply,
  },
  {
    title: 'Reply',
    url: '/reply',
    icon: ReplyAll,
  },
  {
    title: 'Knowledge Base',
    url: '/manual-kb',
    icon: BookIcon,
  },
  {
    title: 'Prompt Editor',
    url: '/prompts',
    icon: PencilIcon,
  },
];

export function AppSidebar() {
  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>DOGEai Management</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map(item => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem className="flex gap-2">
            <SidebarMenuButton asChild>
              <Settings />
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
