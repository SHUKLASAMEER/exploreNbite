import {
  LayoutDashboard,
  FileText,
  FolderTree,
  Files,
  Users,
  Image as ImageIcon,
  Award,
  BookOpen,
  Compass,
  Settings,
  MessageSquare,
  Mail,
} from "lucide-react";

// Single source of truth for the sidebar — mirrors the module list that
// used to live inline in app/admin/page.js's MODULES array, now organized
// into the CONTENT / SITE / COMMUNITY groups from the admin IA spec.
export const NAV_GROUPS = [
  {
    label: null,
    items: [{ href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true }],
  },
  {
    label: "Content",
    items: [
      { href: "/admin/posts", label: "Posts", icon: FileText },
      { href: "/admin/categories", label: "Categories", icon: FolderTree },
      { href: "/admin/pages", label: "Pages", icon: Files },
      { href: "/admin/authors", label: "Authors", icon: Users },
      { href: "/admin/media", label: "Media", icon: ImageIcon },
    ],
  },
  {
    label: "Site",
    items: [
      { href: "/admin/awards", label: "Awards & Accolades", icon: Award },
      { href: "/admin/books", label: "My Books", icon: BookOpen },
      { href: "/admin/menu", label: "Menu / Navigation", icon: Compass },
      { href: "/admin/settings", label: "Site Settings", icon: Settings },
    ],
  },
  {
    label: "Community",
    items: [
      { href: "/admin/comments", label: "Comments", icon: MessageSquare },
      { href: "/admin/subscribers", label: "Subscribers", icon: Mail },
    ],
  },
];

export function isNavItemActive(pathname, item) {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
