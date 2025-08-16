import React, {SVGProps} from "react";

export const PauseIcon = ({className = 'size-4'}) => (
    <svg
        className={className}
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
    >
        <path
            d="M15.75 5.25v13.5m-7.5-13.5v13.5"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
);

export const CopyIcon = ({className = 'size-4'}) => (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"
         xmlns="http://www.w3.org/2000/svg">
        <path
            d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H9.75"
            strokeLinecap="round"
            strokeLinejoin="round"/>
    </svg>
);

export const OrderIcon = ({className = 'size-4'}) => (
    <svg className={className} fill="none" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <path
            d="M28.5 35a1.5 1.5 0 0 1 1.5-1.5h36.783L79.5 47.067V89a1.5 1.5 0 0 1-1.5 1.5H30a1.5 1.5 0 0 1-1.5-1.5V35z"
            fill="none" stroke="#4A4A4A"/>
        <path d="M33 38h29v4H33zM33 45h29v4H33zM33 52h14v4H33z" fill="#3A3A3A"/>
        <path d="M14.5 77c0-7.456 6.044-13.5 13.5-13.5S41.5 69.544 41.5 77v13.5H28c-7.456 0-13.5-6.044-13.5-13.5z"
              fill="#4A4A4A" stroke="#4A4A4A"/>
        <path d="M22 83l12-12M34 83L22 71" stroke="#0A0A0A" strokeWidth="1.4"/>
    </svg>
);

export const UsersIcon = ({className = 'size-4'}) => (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"
         xmlns="http://www.w3.org/2000/svg">
        <path
            d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z"
            strokeLinecap="round"
            strokeLinejoin="round"/>
    </svg>
);

export const ArrowTopRightOnSquareIcon = ({className = 'size-4'}) => (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"
         xmlns="http://www.w3.org/2000/svg">
        <path
            d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
            strokeLinecap="round"
            strokeLinejoin="round"/>
    </svg>
);

export const ArrowRight = ({className = 'size-4'}) => (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"
         xmlns="http://www.w3.org/2000/svg">
        <path d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);

export const ChevronDoubleRightIcon = ({className = 'size-4'}) => (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"
         xmlns="http://www.w3.org/2000/svg">
        <path d="m5.25 4.5 7.5 7.5-7.5 7.5m6-15 7.5 7.5-7.5 7.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);

export const XIcon = ({className = "size-4"}) => (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"
         xmlns="http://www.w3.org/2000/svg">
        <path d="M6 18 18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);

export const HeartIcon = ({className = "size-4"}) => (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"
         xmlns="http://www.w3.org/2000/svg">
        <path
            d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z"
            strokeLinecap="round"
            strokeLinejoin="round"/>
    </svg>
);

export const ChevronUpIcon = ({className = "size-4"}) => (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"
         xmlns="http://www.w3.org/2000/svg">
        <path d="m4.5 15.75 7.5-7.5 7.5 7.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);

export const ChevronDownIcon = ({className = "size-4"}) => (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"
         xmlns="http://www.w3.org/2000/svg">
        <path d="m19.5 8.25-7.5 7.5-7.5-7.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);

export const ChevronLeftIcon = ({className = 'size-4'}) => (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"
         xmlns="http://www.w3.org/2000/svg">
        <path d="M15.75 19.5 8.25 12l7.5-7.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);

export const ChevronRightIcon = ({className = 'size-4', strokeWidth = '1.5'}) => (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={strokeWidth} viewBox="0 0 24 24"
         xmlns="http://www.w3.org/2000/svg">
        <path d="m8.25 4.5 7.5 7.5-7.5 7.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);

export const BarsArrowDownIcon = ({className = "size-4"}) => (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"
         xmlns="http://www.w3.org/2000/svg">
        <path d="M3 4.5h14.25M3 9h9.75M3 13.5h9.75m4.5-4.5v12m0 0-3.75-3.75M17.25 21 21 17.25" strokeLinecap="round"
              strokeLinejoin="round"/>
    </svg>
);

export const BarsArrowUpIcon = ({className = 'size-4'}) => (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"
         xmlns="http://www.w3.org/2000/svg">
        <path d="M3 4.5h14.25M3 9h9.75M3 13.5h5.25m5.25-.75L17.25 9m0 0L21 12.75M17.25 9v12" strokeLinecap="round"
              strokeLinejoin="round"/>
    </svg>
);

export const ArrowDownIcon = ({className = 'size-4'}) => (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"
         xmlns="http://www.w3.org/2000/svg">
        <path d="M19.5 13.5 12 21m0 0-7.5-7.5M12 21V3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);

export const PlusIcon = ({className = "size-4", stroke = "currentColor", strokeWidth = "1.5"}) => (
    <svg className={className} fill="none" stroke={stroke} strokeWidth={strokeWidth} viewBox="0 0 24 24"
         xmlns="http://www.w3.org/2000/svg">
        <path d="M12 4.5v15m7.5-7.5h-15" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);


export const Cog8ToothIcon = ({className = "size-4", stroke = "currentColor"}) => (
    <svg className={className} fill="none" stroke={stroke} strokeWidth="1.5" viewBox="0 0 24 24"
         xmlns="http://www.w3.org/2000/svg">
        <path
            d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 0 1 1.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.559.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.894.149c-.424.07-.764.383-.929.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 0 1-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.398.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 0 1-.12-1.45l.527-.737c.25-.35.272-.806.108-1.204-.165-.397-.506-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.108-1.204l-.526-.738a1.125 1.125 0 0 1 .12-1.45l.773-.773a1.125 1.125 0 0 1 1.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894Z"
            strokeLinecap="round"
            strokeLinejoin="round"/>
        <path d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);

export const SupportIcon = ({className = "size-4", stroke = "currentColor"}) => (
    <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <g color="currentColor" fill="none" stroke={stroke} strokeLinecap="round" strokeLinejoin="round"
           strokeWidth="1.5">
            <path
                d="M17 10.805c0-.346 0-.519.052-.673c.151-.448.55-.621.95-.803c.448-.205.672-.307.895-.325c.252-.02.505.034.721.155c.286.16.486.466.69.714c.943 1.146 1.415 1.719 1.587 2.35c.14.51.14 1.044 0 1.553c-.251.922-1.046 1.694-1.635 2.41c-.301.365-.452.548-.642.655a1.27 1.27 0 0 1-.721.155c-.223-.018-.447-.12-.896-.325c-.4-.182-.798-.355-.949-.803c-.052-.154-.052-.327-.052-.673zm-10 0c0-.436-.012-.827-.364-1.133c-.128-.111-.298-.188-.637-.343c-.449-.204-.673-.307-.896-.325c-.667-.054-1.026.402-1.41.87c-.944 1.145-1.416 1.718-1.589 2.35a2.94 2.94 0 0 0 0 1.553c.252.921 1.048 1.694 1.636 2.409c.371.45.726.861 1.363.81c.223-.018.447-.12.896-.325c.34-.154.509-.232.637-.343c.352-.306.364-.697.364-1.132z"/>
            <path d="M5 9c0-3.314 3.134-6 7-6s7 2.686 7 6m0 8v.8c0 1.767-1.79 3.2-4 3.2h-2"/>
        </g>
    </svg>
);

export const FullscreenIcon = ({className = "size-4"}) => (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"
         xmlns="http://www.w3.org/2000/svg">
        <path
            d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15"
            strokeLinecap="round"
            strokeLinejoin="round"/>
    </svg>
);

export const MagnifyingGlass = ({className = "size-4"}) => (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"
         xmlns="http://www.w3.org/2000/svg">
        <path d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" strokeLinecap="round"
              strokeLinejoin="round"/>
    </svg>
);

export const ArrowLeftStartOnRectangle = ({className = "size-4"}) => (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"
         xmlns="http://www.w3.org/2000/svg">
        <path
            d="M8.25 9V5.25A2.25 2.25 0 0 1 10.5 3h6a2.25 2.25 0 0 1 2.25 2.25v13.5A2.25 2.25 0 0 1 16.5 21h-6a2.25 2.25 0 0 1-2.25-2.25V15m-3 0-3-3m0 0 3-3m-3 3H15"
            strokeLinecap="round"
            strokeLinejoin="round"/>
    </svg>
);

export const StarIcon = ({className = "size-4", stroke = "currentColor", fill = "none"}) => (
    <svg className={className} fill={fill} stroke={stroke} strokeWidth="1.5" viewBox="0 0 24 24"
         xmlns="http://www.w3.org/2000/svg">
        <path
            d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z"
            strokeLinecap="round"
            strokeLinejoin="round"/>
    </svg>
);

export function FilterIcon(props: SVGProps<SVGSVGElement>) {
    return (
        <svg
            {...props}
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            viewBox="0 0 24 24"
        >
            <polygon points="3 4 21 4 14 11 14 19 10 16 10 11 3 4"/>
        </svg>
    );
}

export const GmailIcon = () => (
    <svg fill="none" height="48" viewBox="0 0 48 48" width="48" xmlns="http://www.w3.org/2000/svg">
        <g clipPath="url(#clip0_5_11420)">
            <path d="M3.27273 42.009H10.9091V23.4636L0 15.2817V38.7363C0 40.5472 1.46727 42.009 3.27273 42.009Z"
                  fill="#4285F4"/>
            <path d="M37.0918 42.009H44.7282C46.5391 42.009 48.0009 40.5417 48.0009 38.7363V15.2817L37.0918 23.4636"
                  fill="#34A853"/>
            <path d="M37.0918 9.28201V23.4638L48.0009 15.282V10.9184C48.0009 6.8711 43.3809 4.56383 40.1463 6.9911"
                  fill="#FBBC04"/>
            <path d="M10.9082 23.4636V9.28174L23.9991 19.0999L37.09 9.28174V23.4636L23.9991 33.2817" fill="#EA4335"/>
            <path d="M0 10.9184V15.282L10.9091 23.4638V9.28201L7.85455 6.9911C4.61455 4.56383 0 6.8711 0 10.9184Z"
                  fill="#C5221F"/>
        </g>
        <defs>
            <clipPath id="clip0_5_11420">
                <rect fill="white" height="48" width="48"/>
            </clipPath>
        </defs>
    </svg>

);

export const SmsIcon = () => (
    <svg fill="none" height="48" viewBox="0 0 48 48" width="48" xmlns="http://www.w3.org/2000/svg">
        <path
            d="M18.2382 0.700643L18.7769 2.88262C16.6538 3.40733 14.6218 4.24863 12.7492 5.37825L11.5968 3.44857C13.6581 2.20031 15.8976 1.27368 18.2382 0.700643ZM29.7618 0.700643L29.2231 2.88262C31.3462 3.40733 33.3782 4.24863 35.2508 5.37825L36.4168 3.44857C34.3501 2.2014 32.1063 1.27489 29.7618 0.700643ZM3.44854 11.5901C2.20144 13.6543 1.27491 15.8959 0.700615 18.2383L2.88259 18.7769C3.4073 16.6539 4.2486 14.6219 5.37822 12.7492L3.44854 11.5901ZM2.24845 24C2.24829 22.909 2.33034 21.8194 2.49392 20.7407L0.271038 20.3998C-0.0903461 22.7841 -0.0903461 25.2092 0.271038 27.5935L2.49392 27.2593C2.3306 26.1806 2.24854 25.0911 2.24845 24ZM36.4032 44.5447L35.2508 42.6218C33.3811 43.7525 31.3512 44.5939 29.2299 45.1174L29.7686 47.2994C32.1063 46.7209 34.3432 45.7921 36.4032 44.5447ZM45.7515 24C45.7515 25.0911 45.6694 26.1806 45.5061 27.2593L47.729 27.5935C48.0903 25.2092 48.0903 22.7841 47.729 20.3998L45.5061 20.7407C45.6697 21.8194 45.7517 22.909 45.7515 24ZM47.2994 29.755L45.1174 29.2163C44.5939 31.3419 43.7526 33.3764 42.6218 35.2508L44.5515 36.41C45.7998 34.3439 46.7263 32.0999 47.2994 29.755ZM27.2593 45.5061C25.0988 45.8334 22.9012 45.8334 20.7407 45.5061L20.4066 47.729C22.7886 48.0904 25.2114 48.0904 27.5934 47.729L27.2593 45.5061ZM41.5103 36.9009C40.2143 38.6584 38.6603 40.2101 36.9009 41.5035L38.2374 43.3173C40.1753 41.8907 41.8897 40.1832 43.3241 38.251L41.5103 36.9009ZM36.9009 6.48969C38.6605 7.78559 40.2144 9.33955 41.5103 11.0991L43.3241 9.74901C41.8948 7.81512 40.1849 6.10527 38.251 4.67593L36.9009 6.48969ZM6.48966 11.0991C7.78556 9.33955 9.33952 7.78559 11.0991 6.48969L9.74899 4.67593C7.81509 6.10527 6.10524 7.81512 4.6759 9.74901L6.48966 11.0991ZM44.5515 11.5901L42.6218 12.7492C43.7524 14.6189 44.5938 16.6488 45.1174 18.7701L47.2994 18.2314C46.725 15.8913 45.7985 13.6519 44.5515 11.5901ZM20.7407 2.49395C22.9012 2.16662 25.0988 2.16662 27.2593 2.49395L27.5934 0.271067C25.2114 -0.0903557 22.7886 -0.0903557 20.4066 0.271067L20.7407 2.49395ZM7.64202 43.9174L2.99851 44.9947L4.08267 40.3512L1.89388 39.8398L0.809713 44.4833C0.741878 44.7712 0.731468 45.0696 0.779078 45.3616C0.826688 45.6535 0.931384 45.9332 1.08718 46.1846C1.24297 46.436 1.4468 46.6542 1.68702 46.8268C1.92723 46.9994 2.19911 47.1229 2.48711 47.1903C2.82391 47.2653 3.1731 47.2653 3.50991 47.1903L8.15342 46.1198L7.64202 43.9174ZM2.35755 37.8351L4.55316 38.3397L5.30321 35.1213C4.20789 33.2839 3.39208 31.2938 2.88259 29.2163L0.700615 29.755C1.19141 31.7436 1.93381 33.6615 2.90986 35.4622L2.35755 37.8351ZM12.8583 42.7036L9.63989 43.4537L10.1513 45.6493L12.5174 45.097C14.3168 46.076 16.235 46.8185 18.2246 47.3062L18.7633 45.1243C16.6922 44.6081 14.7092 43.7878 12.8788 42.69L12.8583 42.7036ZM24 4.49864C13.2265 4.50546 4.50543 13.2402 4.50543 24.0068C4.51136 27.674 5.54866 31.2656 7.49883 34.3712L5.62369 42.3763L13.622 40.5012C22.7385 46.2357 34.7803 43.5014 40.5148 34.3917C46.2493 25.2819 43.5218 13.2402 34.4121 7.49885C31.2934 5.53767 27.6841 4.49764 24 4.49864Z"
            fill="#3A76F0"/>
    </svg>
);

export const TelegramIcon = () => (
    <svg fill="none" height="48" viewBox="0 0 49 48" width="49" xmlns="http://www.w3.org/2000/svg">
        <path
            d="M0.5 24C0.5 37.2548 11.2452 48 24.5 48C37.7548 48 48.5 37.2548 48.5 24C48.5 10.7452 37.7548 0 24.5 0C11.2452 0 0.5 10.7452 0.5 24Z"
            fill="#0088CC"/>
        <path
            d="M12.6499 23.5624C19.0923 20.7556 23.3883 18.9051 25.5378 18.0111C31.675 15.4584 32.9503 15.0149 33.7815 15.0001C33.9643 14.9971 34.3731 15.0424 34.6379 15.2572C34.8614 15.4386 34.9229 15.6837 34.9524 15.8557C34.9818 16.0277 35.0185 16.4195 34.9893 16.7257C34.6567 20.2201 33.2177 28.7002 32.4856 32.6141C32.1758 34.2702 31.5658 34.8254 30.9753 34.8798C29.6919 34.9979 28.7174 34.0317 27.4744 33.2169C25.5294 31.9419 24.4305 31.1482 22.5425 29.904C20.3606 28.4662 21.7751 27.6759 23.0185 26.3844C23.344 26.0464 28.9985 20.9032 29.1079 20.4366C29.1216 20.3783 29.1343 20.1608 29.0051 20.0459C28.8759 19.9311 28.6851 19.9703 28.5475 20.0016C28.3524 20.0458 25.2452 22.0996 19.2258 26.1628C18.3439 26.7685 17.545 27.0636 16.8292 27.0481C16.0402 27.0311 14.5223 26.602 13.394 26.2352C12.01 25.7853 10.91 25.5474 11.0058 24.7834C11.0557 24.3855 11.6037 23.9785 12.6499 23.5624Z"
            fill="white"/>
    </svg>
);

export const WhatsappIcon = () => (
    <svg fill="none" height="48" viewBox="0 0 48 48" width="48" xmlns="http://www.w3.org/2000/svg">
        <path
            d="M0 24C0 37.2548 10.7452 48 24 48C37.2548 48 48 37.2548 48 24C48 10.7452 37.2548 0 24 0C10.7452 0 0 10.7452 0 24Z"
            fill="#25D366"/>
        <path clipRule="evenodd"
              d="M32.4 15.45C30.15 13.2 27.15 12 24 12C17.4 12 12 17.4 12 24C12 26.1 12.6 28.2 13.65 30L12 36L18.3 34.35C20.1 35.25 22.05 35.85 24 35.85C30.6 35.85 36 30.45 36 23.85C36 20.7 34.65 17.7 32.4 15.45ZM24 33.9C22.2 33.9 20.4 33.45 18.9 32.55L18.6 32.4L14.85 33.45L15.9 29.85L15.6 29.4C14.55 27.75 14.1 25.95 14.1 24.15C14.1 18.75 18.6 14.25 24 14.25C26.7 14.25 29.1 15.3 31.05 17.1C33 19.05 33.9 21.45 33.9 24.15C33.9 29.4 29.55 33.9 24 33.9ZM29.4 26.4C29.1 26.25 27.6 25.5 27.3 25.5C27 25.35 26.85 25.35 26.7 25.65C26.55 25.95 25.95 26.55 25.8 26.85C25.65 27 25.5 27 25.2 27C24.9 26.85 24 26.55 22.8 25.5C21.9 24.75 21.3 23.7 21.15 23.4C21 23.1 21.15 22.95 21.3 22.8C21.45 22.65 21.6 22.5 21.75 22.35C21.9 22.2 21.9 22.05 22.05 21.9C22.2 21.75 22.05 21.6 22.05 21.45C22.05 21.3 21.45 19.8 21.15 19.2C21 18.75 20.7 18.75 20.55 18.75C20.4 18.75 20.25 18.75 19.95 18.75C19.8 18.75 19.5 18.75 19.2 19.05C18.9 19.35 18.15 20.1 18.15 21.6C18.15 23.1 19.2 24.45 19.35 24.75C19.5 24.9 21.45 28.05 24.45 29.25C27 30.3 27.45 30 28.05 30C28.65 30 29.85 29.25 30 28.65C30.3 27.9 30.3 27.3 30.15 27.3C30 26.55 29.7 26.55 29.4 26.4Z"
              fill="white" fillRule="evenodd"/>
    </svg>
);

export const TechnicalChartIcon = () => (
    <svg fill="none" height="98" viewBox="0 0 98 98" width="98" xmlns="http://www.w3.org/2000/svg">
        <path d="M96.358 96.358H1V1" stroke="#616161" strokeLinecap="round" strokeLinejoin="round" strokeMiterlimit="10"
              strokeWidth="1.99172"/>
        <path d="M13.2471 92.2074V24.7295H26.5706V92.2074" stroke="#616161" strokeLinecap="round" strokeLinejoin="round"
              strokeMiterlimit="10" strokeWidth="1.99172"/>
        <path d="M36.5093 92.2083V41.8135H49.8328V92.2083" stroke="#616161" strokeLinecap="round" strokeLinejoin="round"
              strokeMiterlimit="10" strokeWidth="1.99172"/>
        <path d="M59.772 92.2079V13.3418H73.0955V92.2079" stroke="#616161" strokeLinecap="round" strokeLinejoin="round"
              strokeMiterlimit="10" strokeWidth="1.99172"/>
        <path d="M83.0347 92.2077V57.7568H96.3582V92.2077" stroke="#616161" strokeLinecap="round" strokeLinejoin="round"
              strokeMiterlimit="10" strokeWidth="1.99172"/>
        <path d="M4.78711 24.7295H26.5702" stroke="#616161" strokeLinecap="round" strokeLinejoin="round"
              strokeMiterlimit="10" strokeWidth="1.99172"/>
        <path d="M49.8332 41.8135H26.5703" stroke="#616161" strokeLinecap="round" strokeLinejoin="round"
              strokeMiterlimit="10" strokeWidth="1.99172"/>
        <path d="M73.0951 13.3418H4.78711" stroke="#616161" strokeLinecap="round" strokeLinejoin="round"
              strokeMiterlimit="10" strokeWidth="1.99172"/>
        <path d="M96.358 57.7568H73.0952" stroke="#616161" strokeLinecap="round" strokeLinejoin="round"
              strokeMiterlimit="10" strokeWidth="1.99172"/>
    </svg>
);

export const DcaChartIcon = () => (
    <svg fill="none" height="83" viewBox="0 0 82 83" width="82" xmlns="http://www.w3.org/2000/svg">
        <path d="M55.2305 17.612L68.0505 4.79199H81.2909" stroke="#616161" strokeMiterlimit="10" strokeWidth="1.54384"/>
        <path d="M36.0673 1C28.0514 1 20.649 3.58661 14.6338 7.96179L36.0673 37.4624V1Z" stroke="#616161"
              strokeLinecap="round" strokeLinejoin="round" strokeMiterlimit="10" strokeWidth="1.54384"/>
        <path
            d="M61.2445 11.2675C55.2293 6.89228 47.8269 4.30566 39.811 4.30566V40.7681L74.4935 29.499C72.0951 22.1003 67.4003 15.7447 61.2445 11.2675Z"
            stroke="#616161" strokeLinecap="round" strokeLinejoin="round" strokeMiterlimit="10" strokeWidth="1.54384"/>
        <path
            d="M72.1453 34.2686L37.4629 45.5377L58.8964 75.0384C65.0522 70.5605 69.7469 64.2055 72.1453 56.8068C73.296 53.2578 73.9253 49.4729 73.9253 45.5377C73.9253 41.6025 73.296 37.8176 72.1453 34.2686Z"
            stroke="#616161" strokeLinecap="round" strokeLinejoin="round" strokeMiterlimit="10" strokeWidth="1.54384"/>
        <path
            d="M37.4631 45.5378L16.0296 16.0371C9.87378 20.5149 5.17903 26.8699 2.78001 34.2686C1.62939 37.8177 1 41.6026 1 45.5378C1 49.473 1.62939 53.2579 2.78001 56.8069C5.17903 64.2056 9.87378 70.5606 16.0296 75.0384C22.0448 79.4142 29.4472 82.0002 37.4631 82.0002C45.4789 82.0002 52.8813 79.4136 58.8965 75.0384L37.4631 45.5378Z"
            stroke="#616161" strokeLinecap="round" strokeLinejoin="round" strokeMiterlimit="10" strokeWidth="1.54384"/>
    </svg>
);

export const CalendarDayIcon = ({className = "size-4"}) => (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"
         xmlns="http://www.w3.org/2000/svg">
        <path
            d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5m-9-6h.008v.008H12v-.008ZM12 15h.008v.008H12V15Zm0 2.25h.008v.008H12v-.008ZM9.75 15h.008v.008H9.75V15Zm0 2.25h.008v.008H9.75v-.008ZM7.5 15h.008v.008H7.5V15Zm0 2.25h.008v.008H7.5v-.008Zm6.75-4.5h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V15Zm0 2.25h.008v.008h-.008v-.008Zm2.25-4.5h.008v.008H16.5v-.008Zm0 2.25h.008v.008H16.5V15Z"
            strokeLinecap="round"
            strokeLinejoin="round"/>
    </svg>
);

export const AppleIcon = ({className = "size-4"}) => (
    <svg className={className} preserveAspectRatio="xMidYMid meet" version="1.0" viewBox="0 0 64.000000 64.000000"
         xmlns="http://www.w3.org/2000/svg">
        <g fill="#ffffff" stroke="none" transform="translate(0.000000,64.000000) scale(0.100000,-0.100000)">
            <path d="M400 622 c-40 -20 -80 -74 -80 -110 0 -21 3 -23 28 -17 47 11 102 81102 129 0 20 -7 20 -50 -2z"/>
            <path
                d="M379 473 c-42 -12 -63 -12 -97 -4 -98 25 -159 1 -200 -79 -20 -39 -23 -55 -19 -118 6 -86 45 -177 99 -234 39 -42 49 -43 123 -24 42 11 57 11 95 0 25 -8 53 -14 62 -14 28 0 85 57 113 113 l26 52 -30 25 c-38 33 -51 60 -51 110 0 46 21 94 47 109 17 9 16 12 -7 35 -36 36 -94 46 -161 29z"/>
        </g>
    </svg>
);

export const PencilSquareIcon = ({className = "size-4"}) => (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"
         xmlns="http://www.w3.org/2000/svg">
        <path d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" strokeLinecap="round"
              strokeLinejoin="round"/>
    </svg>
);

export const ChatBubbleOvalLeftEllipsis = ({className = "size-4"}) => (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"
         xmlns="http://www.w3.org/2000/svg">
        <path
            d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z"
            strokeLinecap="round"
            strokeLinejoin="round"/>
    </svg>
);

export const EyeFilledIcon = ({className = "size-4"}) => (
    <svg
        aria-hidden="true"
        className={className}
        fill="none"
        focusable="false"
        role="presentation"
        viewBox="0 0 24 24"
    >
        <path
            d="M21.25 9.14969C18.94 5.51969 15.56 3.42969 12 3.42969C10.22 3.42969 8.49 3.94969 6.91 4.91969C5.33 5.89969 3.91 7.32969 2.75 9.14969C1.75 10.7197 1.75 13.2697 2.75 14.8397C5.06 18.4797 8.44 20.5597 12 20.5597C13.78 20.5597 15.51 20.0397 17.09 19.0697C18.67 18.0897 20.09 16.6597 21.25 14.8397C22.25 13.2797 22.25 10.7197 21.25 9.14969ZM12 16.0397C9.76 16.0397 7.96 14.2297 7.96 11.9997C7.96 9.76969 9.76 7.95969 12 7.95969C14.24 7.95969 16.04 9.76969 16.04 11.9997C16.04 14.2297 14.24 16.0397 12 16.0397Z"
            fill="currentColor"
        />
        <path
            d="M11.9984 9.14062C10.4284 9.14062 9.14844 10.4206 9.14844 12.0006C9.14844 13.5706 10.4284 14.8506 11.9984 14.8506C13.5684 14.8506 14.8584 13.5706 14.8584 12.0006C14.8584 10.4306 13.5684 9.14062 11.9984 9.14062Z"
            fill="currentColor"
        />
    </svg>
);

export const EyeSlashFilledIcon = ({className = "size-4"}) => (
    <svg
        aria-hidden="true"
        className={className}
        fill="none"
        focusable="false"
        role="presentation"
        viewBox="0 0 24 24"
    >
        <path
            d="M21.2714 9.17834C20.9814 8.71834 20.6714 8.28834 20.3514 7.88834C19.9814 7.41834 19.2814 7.37834 18.8614 7.79834L15.8614 10.7983C16.0814 11.4583 16.1214 12.2183 15.9214 13.0083C15.5714 14.4183 14.4314 15.5583 13.0214 15.9083C12.2314 16.1083 11.4714 16.0683 10.8114 15.8483C10.8114 15.8483 9.38141 17.2783 8.35141 18.3083C7.85141 18.8083 8.01141 19.6883 8.68141 19.9483C9.75141 20.3583 10.8614 20.5683 12.0014 20.5683C13.7814 20.5683 15.5114 20.0483 17.0914 19.0783C18.7014 18.0783 20.1514 16.6083 21.3214 14.7383C22.2714 13.2283 22.2214 10.6883 21.2714 9.17834Z"
            fill="currentColor"
        />
        <path
            d="M14.0206 9.98062L9.98062 14.0206C9.47062 13.5006 9.14062 12.7806 9.14062 12.0006C9.14062 10.4306 10.4206 9.14062 12.0006 9.14062C12.7806 9.14062 13.5006 9.47062 14.0206 9.98062Z"
            fill="currentColor"
        />
        <path
            d="M18.25 5.74969L14.86 9.13969C14.13 8.39969 13.12 7.95969 12 7.95969C9.76 7.95969 7.96 9.76969 7.96 11.9997C7.96 13.1197 8.41 14.1297 9.14 14.8597L5.76 18.2497H5.75C4.64 17.3497 3.62 16.1997 2.75 14.8397C1.75 13.2697 1.75 10.7197 2.75 9.14969C3.91 7.32969 5.33 5.89969 6.91 4.91969C8.49 3.95969 10.22 3.42969 12 3.42969C14.23 3.42969 16.39 4.24969 18.25 5.74969Z"
            fill="currentColor"
        />
        <path
            d="M14.8581 11.9981C14.8581 13.5681 13.5781 14.8581 11.9981 14.8581C11.9381 14.8581 11.8881 14.8581 11.8281 14.8381L14.8381 11.8281C14.8581 11.8881 14.8581 11.9381 14.8581 11.9981Z"
            fill="currentColor"
        />
        <path
            d="M21.7689 2.22891C21.4689 1.92891 20.9789 1.92891 20.6789 2.22891L2.22891 20.6889C1.92891 20.9889 1.92891 21.4789 2.22891 21.7789C2.37891 21.9189 2.56891 21.9989 2.76891 21.9989C2.96891 21.9989 3.15891 21.9189 3.30891 21.7689L21.7689 3.30891C22.0789 3.00891 22.0789 2.52891 21.7689 2.22891Z"
            fill="currentColor"
        />
    </svg>
);

export const GridChartIcon = () => (
    <svg
        fill="none"
        height="84"
        viewBox="0 0 86 84"
        width="86"
        xmlns="http://www.w3.org/2000/svg"
    >
        <path
            d="M83.4316 77.9067H6.5249V1"
            stroke="#616161"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeMiterlimit="10"
            strokeWidth="1.58789"
        />
        <path
            d="M1.43164 6.0933L6.52494 1L11.6182 6.0933"
            stroke="#616161"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeMiterlimit="10"
            strokeWidth="1.58789"
        />
        <path
            d="M79.1899 72.8135L84.2832 77.9068L79.1899 83.0001"
            stroke="#616161"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeMiterlimit="10"
            strokeWidth="1.58789"
        />
        <path
            d="M27.3827 51.4353C29.128 51.4353 30.5428 50.0206 30.5428 48.2753C30.5428 46.5301 29.128 45.1152 27.3827 45.1152C25.6375 45.1152 24.2227 46.5301 24.2227 48.2753C24.2227 50.0206 25.6375 51.4353 27.3827 51.4353Z"
            stroke="#616161"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeMiterlimit="10"
            strokeWidth="1.58789"
        />
        <path
            d="M41.0346 60.116C42.7798 60.116 44.1946 58.7012 44.1946 56.956C44.1946 55.2107 42.7798 53.7959 41.0346 53.7959C39.2893 53.7959 37.8745 55.2107 37.8745 56.956C37.8745 58.7012 39.2893 60.116 41.0346 60.116Z"
            stroke="#616161"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeMiterlimit="10"
            strokeWidth="1.58789"
        />
        <path
            d="M52.3222 32.3846C54.0674 32.3846 55.4822 30.9698 55.4822 29.2245C55.4822 27.4792 54.0674 26.0645 52.3222 26.0645C50.5769 26.0645 49.1621 27.4792 49.1621 29.2245C49.1621 30.9698 50.5769 32.3846 52.3222 32.3846Z"
            stroke="#616161"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeMiterlimit="10"
            strokeWidth="1.58789"
        />
        <path
            d="M70.3985 39.2776C70.3985 41.0229 68.9837 42.4377 67.239 42.4377C65.4937 42.4377 64.0796 41.0229 64.0796 39.2776C64.0796 37.5323 65.4943 36.1182 67.239 36.1182C68.9837 36.1182 70.3985 37.5329 70.3985 39.2776Z"
            stroke="#616161"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeMiterlimit="10"
            strokeWidth="1.58789"
        />
        <path
            d="M69.791 36.7455L81.7367 16.8701"
            stroke="#616161"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeMiterlimit="10"
            strokeWidth="1.58789"
        />
        <path
            d="M55.752 30.2637L63.7539 38.4611"
            stroke="#616161"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeMiterlimit="10"
            strokeWidth="1.58789"
        />
        <path
            d="M42.2451 53.7601L50.9126 32.3926"
            stroke="#616161"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeMiterlimit="10"
            strokeWidth="1.58789"
        />
        <path
            d="M30.2949 50.082L38.1775 54.9717"
            stroke="#616161"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeMiterlimit="10"
            strokeWidth="1.58789"
        />
        <path
            d="M11.6182 70.1527L25.3086 51.1533"
            stroke="#616161"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeMiterlimit="10"
            strokeWidth="1.58789"
        />
        <path
            d="M21.9921 32.1873C23.7373 32.1873 25.1521 30.7725 25.1521 29.0272C25.1521 27.282 23.7373 25.8672 21.9921 25.8672C20.2468 25.8672 18.832 27.282 18.832 29.0272C18.832 30.7725 20.2468 32.1873 21.9921 32.1873Z"
            stroke="#616161"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeMiterlimit="10"
            strokeWidth="1.58789"
        />
        <path
            d="M41.9792 37.1799C41.9792 38.9253 40.5644 40.3394 38.8197 40.3394C37.075 40.3394 35.6597 38.9246 35.6597 37.1799C35.6597 35.4346 37.0744 34.0205 38.8197 34.0205C40.5651 34.0205 41.9792 35.4346 41.9792 37.1799Z"
            stroke="#616161"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeMiterlimit="10"
            strokeWidth="1.58789"
        />
        <path
            d="M52.2244 9.96045C53.9693 9.96045 55.3838 8.54592 55.3838 6.80102C55.3838 5.05611 53.9693 3.6416 52.2244 3.6416C50.4795 3.6416 49.0649 5.05611 49.0649 6.80102C49.0649 8.54592 50.4795 9.96045 52.2244 9.96045Z"
            stroke="#616161"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeMiterlimit="10"
            strokeWidth="1.58789"
        />
        <path
            d="M75.3805 13.1575C75.3805 14.9028 73.9658 16.3169 72.2211 16.3169C70.4758 16.3169 69.061 14.9022 69.061 13.1575C69.061 11.4122 70.4758 9.99805 72.2211 9.99805C73.9664 9.99805 75.3805 11.4128 75.3805 13.1575Z"
            stroke="#616161"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeMiterlimit="10"
            strokeWidth="1.58789"
        />
        <path
            d="M55.7515 7.56445L68.7361 12.3422"
            stroke="#616161"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeMiterlimit="10"
            strokeWidth="1.58789"
        />
        <path
            d="M40.0298 33.9828L50.8147 9.96875"
            stroke="#616161"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeMiterlimit="10"
            strokeWidth="1.58789"
        />
        <path
            d="M24.9033 30.834L35.9617 35.1945"
            stroke="#616161"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeMiterlimit="10"
            strokeWidth="1.58789"
        />
        <path
            d="M11.52 40.8484L19.9173 31.9062"
            stroke="#616161"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeMiterlimit="10"
            strokeWidth="1.58789"
        />
        <path
            d="M11.6182 51.4349L37.8753 71.8936L63.0206 51.1533L81.2425 58.31"
            stroke="#616161"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeMiterlimit="10"
            strokeWidth="1.58789"
        />
    </svg>
);
