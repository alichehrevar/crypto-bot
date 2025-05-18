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
    name: 'Market Watch',
    link: '/profile/market',
    children: []
  },
  {
    name: 'My Brokers',
    link: '/profile/brokers',
    children: []
  },
  {
    name: 'Academy',
    link: '/profile/academy',
    children: []
  }
]
