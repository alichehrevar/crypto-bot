export const MenuItems = [
    {
        name: 'Overview',
        link: '/dashboard',
        children: []
    },
    {
        name: 'Bots',
        link: '/bots',
        children: [
            {
                name: 'All Bots',
                link: '/bots',
            },
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
            },
            {
                name: 'AI',
                link: '/bots/ai',
                className: 'ai-text'
            }
        ]
    },
    {
        name: 'Portfolio',
        link: '/portfolio',
        children: [ ]
    },
    {
        name: 'Trade',
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
        link: '/market',
        children: []
    },
    {
        name: 'Academy',
        link: '/academy',
        children: []
    },
    {
        name: 'Community',
        link: '/profile/community',
        children: []
    }
]
