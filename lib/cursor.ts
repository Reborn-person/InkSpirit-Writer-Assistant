
/**
 * Returns the {top, left} coordinates of the caret in a textarea/input
 * relative to the element's top-left corner.
 */
export function getCaretCoordinates(element: HTMLTextAreaElement | HTMLInputElement, position: number) {
  const isFirefox = (typeof window !== 'undefined' && (window as any).mozInnerScreenX != null);

  // Mirror div creation
  const div = document.createElement('div');
  div.id = 'input-textarea-caret-position-mirror-div';
  document.body.appendChild(div);

  const style = div.style;
  const computed = window.getComputedStyle(element);

  // Default style for mirror div
  style.whiteSpace = 'pre-wrap';
  if (element.nodeName === 'INPUT') style.whiteSpace = 'nowrap';
  style.position = 'absolute';
  style.visibility = 'hidden';

  // Copy properties from element to mirror div
  const properties = [
    'direction',
    'boxSizing',
    'width',
    'height',
    'overflowX',
    'overflowY',
    'borderTopWidth',
    'borderRightWidth',
    'borderBottomWidth',
    'borderLeftWidth',
    'paddingTop',
    'paddingRight',
    'paddingBottom',
    'paddingLeft',
    'fontStyle',
    'fontVariant',
    'fontWeight',
    'fontStretch',
    'fontSize',
    'fontSizeAdjust',
    'lineHeight',
    'fontFamily',
    'textAlign',
    'textTransform',
    'textIndent',
    'textDecoration',
    'letterSpacing',
    'wordSpacing',
    'tabSize',
    'MozTabSize'
  ];

  properties.forEach(prop => {
    // @ts-ignore
    style[prop] = computed[prop];
  });

  if (isFirefox) {
    if (element.scrollHeight > parseInt(computed.height)) style.overflowY = 'scroll';
  } else {
    style.overflow = 'hidden';
  }

  div.textContent = element.value.substring(0, position);
  
  // The second special handling for input type="text" vs textarea:
  if (element.nodeName === 'INPUT') {
    div.textContent = div.textContent.replace(/\s/g, '\u00a0');
  }

  const span = document.createElement('span');
  span.textContent = element.value.substring(position) || '.';
  div.appendChild(span);

  const coordinates = {
    top: span.offsetTop + parseInt(computed.borderTopWidth),
    left: span.offsetLeft + parseInt(computed.borderLeftWidth),
    height: parseInt(computed.lineHeight)
  };

  if (isNaN(coordinates.height)) {
      // Fallback if lineHeight is 'normal'
      const fontSize = parseInt(computed.fontSize);
      coordinates.height = Math.ceil(fontSize * 1.2); 
  }

  document.body.removeChild(div);

  return coordinates;
}
