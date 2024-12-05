import {
  useCallback,
  useEffect,
  useRef,
  useState
} from 'preact/hooks';

import { LspPopupContext } from './context';

import { usePrevious } from '../../../hooks';

import { Popup } from '../../Popup';

import CodeEditor from './LspEditor';

import { LaunchIcon } from '../../icons';

const LSP_POPUP_WIDTH = 700;
const LSP_POPUP_HEIGHT = 250;


/**
 * LSP popup component, built as a singleton. Emits lifecycle events as follows:
 *  - `lspPopup.open` - fired before the popup is mounted
 *  - `lspPopup.opened` - fired after the popup is mounted. Event context contains the DOM node of the popup
 *  - `lspPopup.close` - fired before the popup is unmounted. Event context contains the DOM node of the popup
 *  - `lspPopup.closed` - fired after the popup is unmounted
 */
export default function LSPPopupRoot(props) {
  const {
    element,
    eventBus = { fire() {}, on() {}, off() {} },
    popupContainer,
    getPopupLinks = () => []
  } = props;

  const prevElement = usePrevious(element);

  const [ popupConfig, setPopupConfig ] = useState({});
  const [ open, setOpen ] = useState(false);
  const [ source, setSource ] = useState(null);
  const [ sourceElement, setSourceElement ] = useState(null);

  const emit = (type, context) => {
    eventBus.fire('lspPopup.' + type, context);
  };

  const isOpen = useCallback(() => {
    return !!open;
  }, [ open ]);

  useUpdateEffect(() => {
    if (!open) {
      emit('closed');
    }
  }, [ open ]);

  const handleOpen = (entryId, config, _sourceElement) => {
    setSource(entryId);
    setPopupConfig(config);
    setOpen(true);
    setSourceElement(_sourceElement);
    emit('open');
  };

  const handleClose = (event = {}) => {
    const { id } = event;
    if (id && id !== source) {
      return;
    }

    setOpen(false);
    setSource(null);
  };

  const lspPopupContext = {
    open: handleOpen,
    close: handleClose,
    source
  };

  // close popup on element change, cf. https://github.com/bpmn-io/properties-panel/issues/270
  useEffect(() => {
    if (element && prevElement && element !== prevElement) {
      handleClose();
    }
  }, [ element ]);

  // allow close and open via events
  useEffect(() => {

    const handlePopupOpen = (context) => {
      const {
        entryId,
        popupConfig,
        sourceElement
      } = context;

      handleOpen(entryId, popupConfig, sourceElement);
    };

    const handleIsOpen = () => {
      return isOpen();
    };

    eventBus.on('lspPopup._close', handleClose);
    eventBus.on('lspPopup._open', handlePopupOpen);
    eventBus.on('lspPopup._isOpen', handleIsOpen);

    return () => {
      eventBus.off('lspPopup._close', handleClose);
      eventBus.off('lspPopup._open', handleOpen);
      eventBus.off('lspPopup._isOpen', handleIsOpen);
    };

  }, [ eventBus, isOpen ]);

  return (
    <LspPopupContext.Provider value={ lspPopupContext }>
      {open && (
        <LspPopupComponent
          onClose={ handleClose }
          container={ popupContainer }
          getLinks={ getPopupLinks }
          sourceElement={ sourceElement }
          emit={ emit }
          { ...popupConfig } />
      )}
      {props.children}
    </LspPopupContext.Provider>
  );
}

function LspPopupComponent(props) {
  const {
    container,
    getLinks,
    id,
    onInput,
    onClose,
    position,
    sourceElement,
    title,
    tooltipContainer,
    value,
    prefix,
    suffix,
    languageId,
    languageSupport,
    documentUri,
    rootUri,
    serverUri,
    emit
  } = props;

  const editorRef = useRef();
  const popupRef = useRef();

  const isAutoCompletionOpen = useRef(false);

  const handleSetReturnFocus = () => {
    sourceElement && sourceElement.focus();
  };

  const onKeyDownCapture = (event) => {

    // we use capture here to make sure we handle the event before the editor does
    if (event.key === 'Escape') {
      isAutoCompletionOpen.current = autoCompletionOpen(event.target);
    }
  };

  const onKeyDown = (event) => {

    if (event.key === 'Escape') {

      // close popup only if auto completion is not open
      // we need to do check this because the editor is not
      // stop propagating the keydown event
      // cf. https://discuss.codemirror.net/t/how-can-i-replace-the-default-autocompletion-keymap-v6/3322/5
      if (!isAutoCompletionOpen.current) {
        onClose();
        isAutoCompletionOpen.current = false;
      }
    }
  };

  useEffect(() => {
    emit('opened', { domNode: popupRef.current });
    return () => emit('close', { domNode: popupRef.current });
  }, []);

  useEffect(() => {

    // Set focus on editor when popup is opened
    if (editorRef.current) {
      editorRef.current.focus();
    }
  }, [ editorRef ]);

  return (
    <Popup
      container={ container }
      className="bio-properties-panel-feel-popup"
      emit={ emit }
      position={ position }
      title={ title }
      onClose={ onClose }

      // handle focus manually on deactivate
      returnFocus={ false }
      closeOnEscape={ false }
      delayInitialFocus={ false }
      onPostDeactivate={ handleSetReturnFocus }
      height={ position.height || LSP_POPUP_HEIGHT }
      width={ position.width || LSP_POPUP_WIDTH }
      ref={ popupRef }
    >
      <Popup.Title
        title={ title }
        emit={ emit }
        showCloseButton={ true }
        closeButtonTooltip="Save and close"
        onClose={ onClose }
        draggable>
        <>
          {
            getLinks(languageId).map((link, index) => {
              return <a key={ index } rel="noreferrer" href={ link.href } target="_blank" class="bio-properties-panel-feel-popup__title-link">
                { link.title}
                <LaunchIcon />
              </a>;
            })
          }
        </>
      </Popup.Title>
      <Popup.Body>
        <div
          onKeyDownCapture={ onKeyDownCapture }
          onKeyDown={ onKeyDown }
          class="bio-properties-panel-feel-popup__body">
          <CodeEditor
            enableGutters={ true }
            id={ prefixId(id) }
            name={ id }
            onInput={ onInput }
            value={ value }
            prefix={ prefix }
            suffix={ suffix }
            languageId={ languageId }
            languageSupport={ languageSupport }
            documentUri={ documentUri }
            rootUri={ rootUri }
            serverUri={ serverUri }
            ref={ editorRef }
            tooltipContainer={ tooltipContainer }
          />
        </div>
      </Popup.Body>
    </Popup>
  );
}

// helpers /////////////////

function prefixId(id) {
  return `bio-properties-panel-${id}`;
}

function autoCompletionOpen(element) {
  return element.closest('.cm-editor').querySelector('.cm-tooltip-autocomplete');
}

/**
 * This hook behaves like useEffect, but does not trigger on the first render.
 *
 * @param {Function} effect
 * @param {Array} deps
 */
function useUpdateEffect(effect, deps) {
  const isMounted = useRef(false);

  useEffect(() => {
    if (isMounted.current) {
      return effect();
    } else {
      isMounted.current = true;
    }
  }, deps);
}