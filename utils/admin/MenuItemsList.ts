import {NavItem} from "@/types/admin/SidebarItems";

export const menuItemsList: NavItem[] = [
    { label: "Dashboard", href: "/admin" },
    {
        label: "Users",
        children: [
            { label: "List", href: "/admin/users" },
            { label: "Role", href: "/admin/users/role" }
        ]
    }
];

export const pageTitles = [
    {
        title: 'dashboard',
        url: '/admin'
    },
    {
        title: 'users',
        url: '/admin/users'
    },
    {
        title: 'user role',
        url: '/admin/users/role'
    },
    {
        title: 'bots list',
        url: '/admin/users/[id]/bots'
    },
    {
        title: 'bot details',
        url: '/admin/bots/[id]'
    },
    {
        title: 'bot logs',
        url: '/admin/bots/[id]/logs'
    }
]
