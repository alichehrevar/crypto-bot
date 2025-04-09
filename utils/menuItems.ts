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
        link: '/bots/technical',
      },
      {
        name: 'DCA',
        link: '/bots/dca',
      },
      {
        name: 'Grid',
        link: '/bots/grid',
      }
    ]
  },
  {
    name: 'Settings',
    link: '/profile/settings',
    children: []
  },
]
