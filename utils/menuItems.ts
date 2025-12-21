export const MenuItems = [
    {
        name: 'Overview',
        link: '/my-account',
        children: []
    },
    {
        name: 'Bots',
        link: '/bots',
        children: [
            {
                name: 'All Bots',
                link: '/my-account/bots',
            },
            {
                name: 'Technical Bot',
                link: '/my-account/bots/technical',
            },
            {
                name: 'DCA Bot',
                link: '/my-account/bots/dca',
            },
            {
                name: 'Grid Bot',
                link: '/my-account/bots/grid',
            },
            {
                name: 'Custom AI Bot',
                link: '/my-account/bots/custom-ai',
                className: 'ai-text'
            }
        ]
    },
    {
        name: 'Portfolio',
        link: '/my-account/portfolio',
        children: [ ]
    },
    {
        name: 'Trade',
        link: '/my-account/manual-trading',
        children: []
    },
    {
        name: 'Strategy Tester',
        link: '/my-account/strategy-tester',
        children: []
    },
    {
        name: 'Market',
        link: '/my-account/market',
        children: []
    },
    {
        name: 'Learn',
        link: '#',
        children: [
            {
                name: 'Academy',
                link: '/my-account/learn/academy',
            },
            {
                name: 'News',
                link: '/my-account/learn/news',
            },
        ]
    },
    {
        name: 'Community',
        link: '/my-account/profile/community',
        children: []
    }
]
