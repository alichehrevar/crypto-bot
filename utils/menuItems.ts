export const MenuItems = [
  {
    name: 'Overview',
    link: '/dashboard',
    children: []
  },
  {
    name: 'Bots',
    link: '/',
    children: [
      {
        name: 'Technical Bots',
        link: '/profile/bots/technical',
      },
      {
        name: 'DCA',
        link: '/profile/bots/dca',
      },
      {
        name: 'Grid',
        link: '/profile/bots/grid',
      }
    ]
  },
  {
    name: 'Settings',
    link: '/profile/settings',
    children: []
  },
]
