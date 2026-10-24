// Source: https://github.com/uiastra/astraicons (MIT), original SVGs in vendor/astraicons.
import type { SVGProps } from "react";
import type { ReactNode } from "react";
function icon(children: ReactNode) {
  return function AstraIcon(props: SVGProps<SVGSVGElement>) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        {...props}
      >
        {children}
      </svg>
    );
  };
}
export const HomeIcon = icon(
  <>
    <path
      d="M9 18C10.8167 16.7889 13.1833 16.7889 15 18"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path
      d="M3 11.9961C3 10.2515 3.72503 8.59694 4.97899 7.48003L8.47898 4.36255C10.5186 2.54582 13.4814 2.54582 15.521 4.36255L19.021 7.48002C20.275 8.59693 21 10.2515 21 11.9961V15.1213C21 18.368 18.5376 21 15.5 21H8.5C5.46243 21 3 18.368 3 15.1213V11.9961Z"
      stroke="currentColor"
      strokeWidth="1.5"
    />
  </>,
);
export const ActivityIcon = icon(
  <>
    <path
      d="M8.40039 13.3501C8.40039 13.3501 10.1931 10.8589 10.2587 10.7678C10.3242 10.6767 10.4563 10.6672 10.5342 10.7479C10.6122 10.8286 12.9551 13.2546 12.9551 13.2546C13.0323 13.3346 13.1628 13.3262 13.2291 13.2369C13.2953 13.1477 15.1504 10.6501 15.1504 10.6501"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path
      d="M14.5 3H12H7.5C5.01472 3 3 5.01472 3 7.5V16.5C3 18.9853 5.01472 21 7.5 21H16.5C18.9853 21 21 18.9853 21 16.5V12V9.1875"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <circle
      cx="18.7504"
      cy="5.2499"
      r="1.35"
      stroke="currentColor"
      strokeWidth="1.5"
    />
  </>,
);
export const BookIcon = icon(
  <>
    <path
      d="M21 7.63559V16.5C21 18.9853 18.9853 21 16.5 21H7.5C5.01472 21 3 18.9853 3 16.5V7.5C3 5.01472 5.01472 3 7.5 3H15"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path
      d="M15.6715 3.09666L20.884 7.44046C21.1318 7.64694 20.9563 8 20.6059 8H15.3933C15.1761 8 15 7.85325 15 7.67223V3.32843C15 3.03642 15.4237 2.89017 15.6715 3.09666Z"
      stroke="currentColor"
      strokeWidth="1.5"
    />
    <line
      x1="6.75"
      y1="13.25"
      x2="11.25"
      y2="13.25"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <line
      x1="6.75"
      y1="16.25"
      x2="8.25"
      y2="16.25"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </>,
);
export const UserIcon = icon(
  <>
    <circle cx="12" cy="5" r="3" stroke="currentColor" strokeWidth="1.5" />
    <path
      d="M4 14.6364C4 12.6281 5.79086 11 8 11H16C18.2091 11 20 12.6281 20 14.6364V16C20 18.7614 17.5376 21 14.5 21H9.5C6.46243 21 4 18.7614 4 16V14.6364Z"
      stroke="currentColor"
      strokeWidth="1.5"
    />
  </>,
);
export const UsersIcon = icon(
  <>
    <circle cx="12" cy="7" r="3" stroke="currentColor" strokeWidth="1.5" />
    <path
      d="M4 20V16.9161C4 14.7533 5.79086 13 8 13H16C18.2091 13 20 14.7533 20 16.9161V20"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </>,
);
export const SettingsIcon = icon(
  <>
    <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.5" />
    <path
      d="M10.4959 4.20228C10.858 2.59924 13.142 2.59924 13.5041 4.20228L13.632 4.7684C13.8667 5.80733 15.0589 6.30116 15.9595 5.73247L16.4502 5.42259C17.8398 4.54511 19.4549 6.16021 18.5774 7.54977L18.2675 8.0405C17.6988 8.94107 18.1927 10.1333 19.2316 10.368L19.7977 10.4959C21.4008 10.858 21.4008 13.142 19.7977 13.5041L19.2316 13.632C18.1927 13.8667 17.6988 15.0589 18.2675 15.9595L18.5774 16.4502C19.4549 17.8398 17.8398 19.4549 16.4502 18.5774L15.9595 18.2675C15.0589 17.6988 13.8667 18.1927 13.632 19.2316L13.5041 19.7977C13.142 21.4008 10.858 21.4008 10.4959 19.7977L10.368 19.2316C10.1333 18.1927 8.94107 17.6988 8.0405 18.2675L7.54977 18.5774C6.16021 19.4549 4.54512 17.8398 5.42259 16.4502L5.73247 15.9595C6.30116 15.0589 5.80732 13.8667 4.76839 13.632L4.20228 13.5041C2.59924 13.142 2.59924 10.858 4.20228 10.4959L4.7684 10.368C5.80733 10.1333 6.30116 8.94107 5.73247 8.0405L5.42259 7.54977C4.54511 6.1602 6.16021 4.54512 7.54977 5.42259L8.0405 5.73247C8.94107 6.30116 10.1333 5.80732 10.368 4.76839L10.4959 4.20228Z"
      stroke="currentColor"
      strokeWidth="1.5"
    />
  </>,
);
export const LogoutIcon = icon(
  <>
    <path
      d="M7.55664 15.5554L4.62962 12.6284C4.28249 12.2813 4.28249 11.7185 4.62962 11.3714L7.55664 8.44434"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M15.5566 12L4.88997 12"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M10.2222 20.2745C11.1262 21.1115 12.4124 21.0912 13.2951 20.226L18.9487 14.6848C20.3587 13.3028 20.3489 10.7742 18.9283 9.4039L12.9464 3.63411C12.2265 2.93971 10.9368 2.93377 10.2222 3.63411"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </>,
);
export const PlusIcon = icon(
  <>
    <path
      d="M12 21C16.9706 21 21 16.9706 21 12C21 7.02944 16.9706 3 12 3C7.02944 3 3 7.02944 3 12C3 16.9706 7.02944 21 12 21Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeMiterlimit="10"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M9 12H15"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M12 15V9"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </>,
);
export const SearchIcon = icon(
  <>
    <path
      d="M11 19C15.4183 19 19 15.4183 19 11C19 6.58172 15.4183 3 11 3C6.58172 3 3 6.58172 3 11C3 15.4183 6.58172 19 11 19Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeMiterlimit="10"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M17.5703 17.4329L20.4299 20.567"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </>,
);
export const MoonIcon = icon(
  <>
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M11.5821 12.4193C9.45086 10.2309 9.34019 6.52456 10.6821 3.78037C10.7661 3.58059 10.7278 3.35035 10.5837 3.18848C10.4396 3.02662 10.2153 2.96194 10.0072 3.02221C8.40437 3.43537 6.94133 4.27003 5.76998 5.43956C2.14451 8.97163 2.06797 14.7739 5.599 18.4003C9.22503 21.9318 15.027 21.8558 18.5593 18.2305C19.7294 17.0599 20.5645 15.597 20.9776 13.9942C21.0382 13.7858 20.9734 13.5611 20.8112 13.4169C20.649 13.2727 20.4183 13.2347 20.2184 13.3193C17.4755 14.6606 13.7697 14.5493 11.5821 12.4193Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </>,
);
export const SunIcon = icon(
  <>
    <circle
      cx="11.9996"
      cy="11.9999"
      r="5.4"
      stroke="currentColor"
      strokeWidth="1.5"
    />
    <path
      d="M12 3.8999L12 2.9999"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path
      d="M12 21L12 20.1"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path
      d="M3.89844 12L2.99844 12"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path
      d="M21 12L20.1 12"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path
      d="M6.42969 17.5686L5.63419 18.3641"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path
      d="M18.4199 5.25L17.6244 6.0455"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path
      d="M6.42969 6.43115L5.63419 5.63566"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path
      d="M18.4199 18.4211L17.6244 17.6256"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </>,
);
export const CalendarIcon = icon(
  <>
    <rect
      x="3"
      y="3"
      width="18"
      height="18"
      rx="4.5"
      stroke="currentColor"
      strokeWidth="1.5"
    />
    <path
      d="M12 8V13.3846L16 15"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </>,
);
export const CloseIcon = icon(
  <>
    <path
      d="M7.00195 7.00195L16.9991 16.9991"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M7.00286 16.9991L17 7.00195"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </>,
);
export const TrashIcon = icon(
  <>
    <path
      d="M5 9V17.5C5 19.9853 7.01472 22 9.5 22H14.5C16.9853 22 19 19.9853 19 17.5V9"
      stroke="currentColor"
      strokeWidth="1.5"
    />
    <path
      d="M20 8H13.12H9.94667H6.77333H4"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path
      d="M7 6C7 4.34315 8.34315 3 10 3H14C15.6569 3 17 4.34315 17 6"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path
      d="M8.99998 17L9 13"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path
      d="M15 17L15 13"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path
      d="M12 17L12 13"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </>,
);
export const ArrowRightIcon = icon(
  <>
    <path
      d="M13 6L18.2929 11.2929C18.6834 11.6834 18.6834 12.3166 18.2929 12.7071L13 18"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M5 12L18 12"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </>,
);
export const EyeIcon = icon(
  <>
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M3 12C3.00088 11.3371 3.15344 10.6833 3.446 10.0884C5.10138 6.90783 8.41437 4.93765 12 5.00151C15.5856 4.93765 18.8986 6.90783 20.554 10.0884C21.1487 11.2934 21.1487 12.7066 20.554 13.9116C18.8986 17.0922 15.5856 19.0623 12 18.9985C8.41437 19.0623 5.10138 17.0922 3.446 13.9116C3.15344 13.3167 3.00088 12.6629 3 12Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" />
  </>,
);
export const EditIcon = icon(
  <>
    <path
      d="M21 18V18.5C21 19.8807 19.8807 21 18.5 21H5.5C4.11929 21 3 19.8807 3 18.5V18"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M7.4048 12.1062L13.0741 3.99909C13.4236 3.49921 13.9636 3.15449 14.5753 3.04075C15.1869 2.92701 15.82 3.05359 16.3355 3.39262L18.9697 5.12543C20.0429 5.83143 20.3229 7.24759 19.595 8.28853L13.9257 16.3956C13.5761 16.8955 13.0361 17.2402 12.4245 17.354L9.06104 17.9794C8.42423 18.0978 7.809 17.6931 7.6869 17.0755L7.04201 13.8134C6.92475 13.2202 7.05525 12.6061 7.4048 12.1062Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <line
      x1="10.85"
      y1="13.5496"
      x2="11.15"
      y2="13.1496"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <line
      x1="11.1092"
      y1="7.63042"
      x2="16.6813"
      y2="11.0967"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </>,
);
export const DownloadIcon = icon(
  <>
    <path
      d="M20 11.2192V14.2192C20 16.7045 17.9853 18.7192 15.5 18.7192H8.5C6.01472 18.7192 4 16.7045 4 14.2192V11.2192"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path
      d="M15 13.0239L11.988 16L9 13"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M12 6L12 16"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </>,
);
export const MenuIcon = icon(
  <>
    <path
      d="M4 5L20 5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path
      d="M4 19L12 19"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path
      d="M4 12H16"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </>,
);
export const FolderIcon = icon(
  <>
    <path
      d="M16.5 21H7.5C5.01472 21 3 18.9853 3 16.5V5.8125C3 4.2592 4.2592 3 5.8125 3H7.32296C8.75678 3 9.89276 4.02835 10.6434 5.25C11.0734 5.9498 11.3046 6.42005 12 6.85714C13.0877 7.54086 15.5536 7.68013 17.6297 7.66016C19.4407 7.64274 21 9.06385 21 10.875V16.5C21 18.9853 18.9853 21 16.5 21Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path
      d="M3 11H21"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path
      d="M15 15L17 15"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </>,
);
export const CheckIcon = icon(
  <>
    <path
      d="M5 12L9.99529 17L19 7"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </>,
);
export const ArrowLeftIcon = icon(
  <>
    <path
      d="M11 18L5.70711 12.7071C5.31658 12.3166 5.31658 11.6834 5.70711 11.2929L11 6"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M19 12L6 12"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </>,
);
export const RefreshIcon = icon(
  <>
    <path
      d="M20.9014 12C20.9014 16.968 16.8694 21 11.9014 21C6.93339 21 3.90039 15.996 3.90039 15.996M3.90039 15.996H7.96839M3.90039 15.996V20.496"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M3 11.7192C3 6.75124 6.996 2.71924 12 2.71924C18.003 2.71924 21 7.72324 21 7.72324M21 7.72324V3.22324M21 7.72324H17.004"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </>,
);
export const LockIcon = icon(
  <>
    <path
      d="M3 14.625C3 11.5184 5.5184 9 8.625 9H15.375C18.4816 9 21 11.5184 21 14.625V15C21 18.3137 18.3137 21 15 21H9C5.68629 21 3 18.3137 3 15V14.625Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path
      d="M8 9V6C8 4.34315 9.34315 3 11 3H13.1516C14.7247 3 16 4.27525 16 5.84835V9"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path
      d="M12 16.4946V13.9946"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </>,
);
