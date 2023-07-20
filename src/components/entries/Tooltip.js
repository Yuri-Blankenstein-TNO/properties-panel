import { useRef } from 'preact/hooks';
import {
  useEffect,
  useState
} from 'react';

/**
 * @param {Object} props
 * @param {String} props.labelId
 * @param {String} props.value
 */
export default function TooltipWrapper(props) {

  if (!props.value) {
    return props.children;
  }

  return <Tooltip { ...props } />;
}

function Tooltip(props) {
  const {
    value,
    labelId
  } = props;

  const [ visible, setShow ] = useState(false);

  let timeout = null;

  const wrapperRef = useRef(null);
  const tooltipRef = useRef(null);

  const showTooltip = async (event) => {
    const show = () => !visible && setShow(true);

    if (event instanceof MouseEvent) {
      timeout = setTimeout(show, 200);
    } else {
      show();
    }
  };

  const hideTooltip = () => setShow(false);

  const hideTooltipViaEscape = (e) => {
    e.code === 'Escape' && hideTooltip();
  };

  const isTooltipHovered = ({ x, y }) => {
    const tooltip = tooltipRef.current;
    const wrapper = wrapperRef.current;

    return tooltip && (
      inBounds(x, y, wrapper.getBoundingClientRect()) ||
      inBounds(x, y, tooltip.getBoundingClientRect())
    );
  };

  useEffect(() => {
    const { current } = wrapperRef;

    if (!current) {
      return;
    }

    const hideHoveredTooltip = (e) => {
      const isFocused = document.activeElement === wrapperRef.current
                        || document.activeElement.closest('.bio-properties-panel-tooltip');

      if (visible && !isTooltipHovered({ x: e.x, y: e.y }) && !isFocused) {
        hideTooltip();
      }
    };

    const hideFocusedTooltip = (e) => {
      const { relatedTarget } = e;
      const isTooltipChild = (el) => el && !!el.closest('.bio-properties-panel-tooltip');

      if (visible && !isHovered(wrapperRef.current) && !isTooltipChild(relatedTarget)) {
        hideTooltip();
      }
    };

    document.addEventListener('focusout', hideFocusedTooltip);
    document.addEventListener('mousemove', hideHoveredTooltip);

    return () => {

      document.removeEventListener('mousemove', hideHoveredTooltip);
      document.removeEventListener('focusout', hideFocusedTooltip);
    };
  }, [ wrapperRef.current, visible ]);

  return (
    <div class="bio-properties-panel-tooltip-wrapper" tabIndex="0"
      ref={ wrapperRef }
      onMouseEnter={ showTooltip }
      onMouseLeave={ ()=> clearTimeout(timeout) }
      onFocus={ showTooltip }
      onKeyDown={ hideTooltipViaEscape }>
      {props.children}
      {visible ?
        <div
          class="bio-properties-panel-tooltip"
          role="tooltip"
          id="bio-properties-panel-tooltip"
          aria-labelledby={ labelId }
          style={ getTooltipPosition(wrapperRef.current) }
          ref={ tooltipRef }
          onClick={ (e)=> e.stopPropagation() }
        >
          <div class="bio-properties-panel-tooltip-content">
            {value}
          </div>
          <div class="bio-properties-panel-tooltip-arrow" />
        </div>
        : null
      }
    </div>
  );
}


// helper
function inBounds(x, y, bounds) {
  const { top, right, bottom, left } = bounds;
  return x >= left && x <= right && y >= top && y <= bottom;
}

function getTooltipPosition(refElement) {
  const refPosition = refElement.getBoundingClientRect();

  const right = `calc(100% - ${refPosition.x}px)`;
  const top = `${refPosition.top - 10}px`;

  return `right: ${right}; top: ${top};`;
}

function isHovered(element) {
  return element.matches(':hover');
}