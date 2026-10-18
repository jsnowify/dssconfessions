export default function Doodle({ kind = "star", className = "" }) {
  const paths = {
    star: "m12 2 2.8 6.1L22 9l-5.3 4.9 1.4 7.1-6.1-3.5L5.9 21l1.4-7.1L2 9l7.2-.9Z",
    note: "M9 18V5l11-3v13M9 8l11-3M9 18c0 2-6 4-6 1s6-4 6-1Zm11-3c0 2-6 4-6 1s6-4 6-1Z",
    heart: "M12 21S2 15 2 8c0-6 8-7 10-2 2-5 10-4 10 2 0 7-10 13-10 13Z",
    shield: "m12 2 9 4v6c0 6-9 10-9 10S3 18 3 12V6Zm-5 10 3 3 7-7",
  };
  return (
    <svg
      className={`doodle ${className}`}
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={paths[kind] || paths.star} />
    </svg>
  );
}
