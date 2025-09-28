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
                name: 'Technical Bot',
                link: '/bots/technical',
            },
            {
                name: 'DCA Bot',
                link: '/bots/dca',
            },
            {
                name: 'Grid Bot',
                link: '/bots/grid',
            },
            {
                name: 'Custom AI Bot',
                link: '/bots/custom-ai',
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
        link: '/manual-trading',
        children: []
    },
    {
        name: 'Strategy Tester',
        link: '/strategy-tester',
        children: []
    },
    {
        name: 'Market',
        link: '/market',
        children: []
    },
    {
        name: 'Learn',
        link: '#',
        children: [
            {
                name: 'Academy',
                link: '/learn/academy',
            },
            {
                name: 'News',
                link: '/learn/news',
            },
        ]
    },
    {
        name: 'Community',
        link: '/profile/community',
        children: []
    }
]
