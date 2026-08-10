function svgIcon(inner, size = 20) {
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
}

export function cameraIconSvg(active = true, size = 20) {
  const slash = active ? '' : '<line x1="3" y1="3" x2="21" y2="21"></line>';
  return svgIcon(
    `<path d="M8 7l1.4-2.5h5.2L16 7"></path>
     <rect x="3" y="7" width="18" height="13" rx="2.5"></rect>
     <circle cx="12" cy="13.5" r="3.3"></circle>
     ${slash}`,
    size
  );
}

export function flaskIconSvg(size = 20) {
  return svgIcon(
    `<path d="M9 3h6"></path>
     <path d="M10 3v5.7L4.6 17.9A2 2 0 0 0 6.4 21h11.2a2 2 0 0 0 1.8-3.1L14 8.7V3"></path>
     <path d="M7.5 15h9"></path>`,
    size
  );
}

export function archiveIconSvg(size = 20) {
  return svgIcon(
    `<rect x="3" y="4" width="18" height="4.5" rx="1.2"></rect>
     <path d="M5 8.5V18a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8.5"></path>
     <path d="M10 13h4"></path>`,
    size
  );
}

export function bookIconSvg(size = 20) {
  return svgIcon(
    `<path d="M3.5 5.2A2.2 2.2 0 0 1 5.7 3H12v18H5.7a2.2 2.2 0 0 1-2.2-2.2z"></path>
     <path d="M20.5 5.2A2.2 2.2 0 0 0 18.3 3H12v18h6.3a2.2 2.2 0 0 0 2.2-2.2z"></path>`,
    size
  );
}

export function downloadIconSvg(size = 20) {
  return svgIcon(
    `<path d="M12 3v12"></path>
     <path d="M7.5 10.5 12 15l4.5-4.5"></path>
     <path d="M4.5 19h15"></path>`,
    size
  );
}

export function editIconSvg(size = 20) {
  return svgIcon(
    `<path d="M12.5 20.5h8"></path>
     <path d="M16.9 4.4a2.1 2.1 0 0 1 3 3L8.5 18.8l-4.2 1.1 1.1-4.2Z"></path>`,
    size
  );
}

export function printerIconSvg(size = 20) {
  return svgIcon(
    `<path d="M6.5 9V3.5h11V9"></path>
     <rect x="4" y="9" width="16" height="7.5" rx="1.5"></rect>
     <path d="M6.5 16.5V20h11v-3.5"></path>`,
    size
  );
}

export function closeIconSvg(size = 20) {
  return svgIcon(
    `<path d="M5.5 5.5l13 13"></path>
     <path d="M18.5 5.5l-13 13"></path>`,
    size
  );
}

export function uploadIconSvg(size = 20) {
  return svgIcon(
    `<path d="M12 15V3"></path>
     <path d="M7.5 7.5 12 3l4.5 4.5"></path>
     <path d="M4.5 19h15"></path>`,
    size
  );
}

export function restoreIconSvg(size = 20) {
  return svgIcon(
    `<path d="M4.5 12a7.5 7.5 0 1 1 2.4 5.5"></path>
     <path d="M4.5 16.5V12h4.5"></path>`,
    size
  );
}

export function warningIconSvg(size = 20) {
  return svgIcon(
    `<path d="M12 3.3 21.3 20H2.7Z"></path>
     <path d="M12 9.5v4.2"></path>
     <circle cx="12" cy="17" r="0.9" fill="currentColor" stroke="none"></circle>`,
    size
  );
}
