export const MenuItems = [
  {
    name: 'Overview',
    link: '/dashboard',
    children: []
  },
  {
    name: 'Bots',
    link: '/profile/bots',
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
    name: 'Manual Trading',
    link: '/profile/manual-trading',
    children: []
  },
  {
    name: 'Strategy Tester',
    link: '/profile/strategy-tester',
    children: []
  },
  {
    name: 'Market',
    link: '/profile/market',
    children: []
  },
  {
    name: 'Academy',
    link: '/profile/academy',
    children: []
  }
]
