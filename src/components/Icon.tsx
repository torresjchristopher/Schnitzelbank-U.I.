export type IconName =
  | 'archive'
  | 'folder'
  | 'file'
  | 'settings'
  | 'users'
  | 'user'
  | 'tag'
  | 'clock'
  | 'calendar'
  | 'image'
  | 'video'
  | 'audio'
  | 'document'
  | 'text'
  | 'download'
  | 'export'
  | 'chevronRight'
  | 'close'
  | 'openExternal';

type Props = {
  name: IconName | string;
  className?: string;
};

const base = 'w-5 h-5';

export default function Icon({ name, className }: Props) {
  const cn = className || base;

  switch (name) {
    case 'archive':
      return (
        <svg className={cn} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M4 7h16v13H4V7Z" stroke="currentColor" strokeWidth="1.6" />
          <path d="M3 4h18v3H3V4Z" stroke="currentColor" strokeWidth="1.6" />
          <path d="M10 11h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      );
    case 'folder':
      return (
        <svg className={cn} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M3.5 7.5A2.5 2.5 0 0 1 6 5h4l2 2h6A2.5 2.5 0 0 1 20.5 9.5v9A2.5 2.5 0 0 1 18 21H6A2.5 2.5 0 0 1 3.5 18.5v-11Z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'file':
      return (
        <svg className={cn} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M7 3.5h7l3 3V20.5H7V3.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M14 3.5v3h3" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        </svg>
      );
    case 'settings':
      return (
        <svg className={cn} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M12 14.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"
            stroke="currentColor"
            strokeWidth="1.6"
          />
          <path
            d="M19.4 15a8.7 8.7 0 0 0 .1-1l2-1.2-2-3.5-2.3.5a8 8 0 0 0-1.7-1l-.3-2.3H10.8l-.3 2.3c-.6.2-1.2.6-1.7 1L6.5 9.3l-2 3.5 2 1.2a8.7 8.7 0 0 0 .1 1l-2 1.2 2 3.5 2.3-.5c.5.4 1.1.8 1.7 1l.3 2.3h4.4l.3-2.3c.6-.2 1.2-.6 1.7-1l2.3.5 2-3.5-2-1.2Z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'users':
      return (
        <svg className={cn} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M16 11a3 3 0 1 0-6 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M18.5 19.5c0-3-2.6-5.5-6.5-5.5s-6.5 2.5-6.5 5.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      );
    case 'user':
      return (
        <svg className={cn} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z" stroke="currentColor" strokeWidth="1.6" />
          <path d="M4.5 20c0-4 3.2-6.5 7.5-6.5S19.5 16 19.5 20" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      );
    case 'tag':
      return (
        <svg className={cn} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M3.5 12.2V4.8A1.8 1.8 0 0 1 5.3 3h7.4l8 8-7.4 7.4-8-8Z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path d="M7.5 7.5h.01" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
      );
    case 'clock':
      return (
        <svg className={cn} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 21a9 9 0 1 0-9-9 9 9 0 0 0 9 9Z" stroke="currentColor" strokeWidth="1.6" />
          <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'calendar':
      return (
        <svg className={cn} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M6 4v3M18 4v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M4.5 8.5h15" stroke="currentColor" strokeWidth="1.6" />
          <path d="M5 6.5h14A2 2 0 0 1 21 8.5v12A2 2 0 0 1 19 22.5H5A2 2 0 0 1 3 20.5v-12A2 2 0 0 1 5 6.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        </svg>
      );
    case 'image':
      return (
        <svg className={cn} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M5 5h14v14H5V5Z" stroke="currentColor" strokeWidth="1.6" />
          <path d="M8 15l2.5-3 2.5 3 2-2 2 2" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M9 9h.01" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
      );
    case 'video':
      return (
        <svg className={cn} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M4.5 7.5h10v9h-10v-9Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M14.5 10l5-2.5v9L14.5 14V10Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        </svg>
      );
    case 'audio':
      return (
        <svg className={cn} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M9 17a2 2 0 1 0 0-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M9 13V6l10-2v11" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M19 15a2 2 0 1 0 0-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      );
    case 'document':
      return <Icon name="file" className={cn} />;
    case 'text':
      return (
        <svg className={cn} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M6 6h12M6 10h12M6 14h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      );
    case 'download':
      return (
        <svg className={cn} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 3v10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M8 10l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M5 20h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      );
    case 'export':
      return (
        <svg className={cn} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 3v10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M16 7l-4-4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M5 13v7h14v-7" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        </svg>
      );
    case 'chevronRight':
      return (
        <svg className={cn} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'close':
      return (
        <svg className={cn} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case 'openExternal':
      return (
        <svg className={cn} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M14 5h5v5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M10 14 19 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M19 14v5H5V5h5" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        </svg>
      );
    default:
      return <span className={cn} />;
  }
}
