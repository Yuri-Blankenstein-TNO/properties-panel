import Description from '../Description';

import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'preact/hooks';

import { forwardRef } from 'preact/compat';

import classnames from 'classnames';

import { isFunction, isString } from 'min-dash';

import {
  useShowEntryEvent,
  useError,
  useStaticCallback
} from '../../../hooks';

import CodeEditor from './LspEditor';
import { LspIndicator } from './LspIndicator';
import LspIcon from './LspIcon';

import { LSP_POPUP_WIDTH } from './LspPopup';

import { LspPopupContext } from './context';

import Tooltip from '../Tooltip';

const noop = () => {};

function LspTextfieldComponent(props) {
  const {
    debounce,
    id,
    element,
    label,
    onInput,
    onError,
    placeholder,
    lsp,
    value = '',
    prefix,
    suffix,
    languageId,
    languageSupport,
    documentUri,
    rootUri,
    serverUri,
    disabled = false,
    tooltipContainer,
    OptionalComponent = OptionalLspInput,
    tooltip
  } = props;

  const [ localValue, _setLocalValue ] = useState(value);

  const editorRef = useShowEntryEvent(id);
  const containerRef = useRef();

  const lspActive = (isString(localValue) && localValue.startsWith('=')) || lsp === 'required';
  const lspOnlyValue = (isString(localValue) && localValue.startsWith('=')) ? localValue.substring(1) : localValue;

  const [ focus, _setFocus ] = useState(undefined);

  const {
    open: openPopup,
    source: popupSource
  } = useContext(LspPopupContext);

  const popuOpen = popupSource === id;

  const setFocus = (offset = 0) => {
    const hasFocus = containerRef.current.contains(document.activeElement);

    // Keep caret position if it is already focused, otherwise focus at the end
    const position = hasFocus ? document.activeElement.selectionStart : Infinity;

    _setFocus(position + offset);
  };

  const handleInputCallback = useMemo(() => {
    return debounce((newValue) => {
      onInput(newValue);
    });
  }, [ onInput, debounce ]);

  const setLocalValue = newValue => {
    _setLocalValue(newValue);

    if (typeof newValue === 'undefined' || newValue === '' || newValue === '=') {
      handleInputCallback(undefined);
    } else {
      handleInputCallback(newValue);
    }

  };

  const handleLspToggle = useStaticCallback(() => {
    if (lsp === 'required') {
      return;
    }

    if (!lspActive) {
      setLocalValue('=' + localValue);
    } else {
      setLocalValue(lspOnlyValue);
    }
  });

  const handleLocalInput = (newValue) => {
    if (lspActive) {
      newValue = '=' + newValue;
    }

    if (newValue === localValue) {
      return;
    }

    setLocalValue(newValue);

    if (!lspActive && isString(newValue) && newValue.startsWith('=')) {

      // focus is behind `=` sign that will be removed
      setFocus(-1);
    }
  };

  const handleLint = useStaticCallback((lint = []) => {

    const syntaxError = lint.some(report => report.severity === 'error');

    if (syntaxError) {
      onError('Unparsable syntax.');
    } else {
      onError(undefined);
    }
  });

  const handlePopupOpen = () => {
    const popupOptions = {
      id,
      onInput: handleLocalInput,
      position: calculatePopupPosition(containerRef.current),
      title: getPopupTitle(element, label),
      tooltipContainer,
      value: lspOnlyValue,
      prefix,
      suffix,
      languageId,
      languageSupport,
      documentUri,
      rootUri,
      serverUri
    };

    openPopup(id, popupOptions, editorRef.current);
  };

  useEffect(() => {
    if (typeof focus !== 'undefined') {
      editorRef.current.focus(focus);
      _setFocus(undefined);
    }
  }, [ focus ]);

  useEffect(() => {
    if (value === localValue) {
      return;
    }

    // External value change removed content => keep LSP configuration
    if (!value) {
      setLocalValue(lspActive ? '=' : '');
      return;
    }

    setLocalValue(value);
  }, [ value ]);


  // copy-paste integration
  useEffect(() => {
    const copyHandler = event => {
      if (!lspActive) {
        return;
      }
      event.clipboardData.setData(`application/${languageId}`, event.clipboardData.getData('text'));
    };

    const pasteHandler = event => {
      if (lspActive || popuOpen) {
        return;
      }

      const data = event.clipboardData.getData(`application/${languageId}`);

      if (data) {
        setTimeout(() => {
          handleLspToggle();
          setFocus();
        });
      }
    };
    containerRef.current.addEventListener('copy', copyHandler);
    containerRef.current.addEventListener('cut', copyHandler);
    containerRef.current.addEventListener('paste', pasteHandler);

    return () => {
      containerRef.current.removeEventListener('copy', copyHandler);
      containerRef.current.removeEventListener('cut', copyHandler);
      containerRef.current.removeEventListener('paste', pasteHandler);
    };
  }, [ containerRef, lspActive, handleLspToggle, setFocus ]);

  return (
    <div class={ classnames(
      'bio-properties-panel-feel-entry',
      { 'lsp-active': lspActive }
    ) }>
      <label for={ prefixId(id) } class="bio-properties-panel-label" onClick={ () => setFocus() }>
        <Tooltip value={ tooltip } forId={ id } element={ props.element }>
          {label}
        </Tooltip>
        <LspIcon
          label={ label }
          lsp={ lsp }
          onClick={ handleLspToggle }
          active={ lspActive }></LspIcon>
      </label>

      <div class="bio-properties-panel-feel-container" ref={ containerRef }>
        <LspIndicator
          active={ lspActive }
          disabled={ lsp !== 'optional' || disabled }
          onClick={ handleLspToggle }
        />
        {lspActive ?
          <CodeEditor
            name={ id }
            onInput={ handleLocalInput }
            contentAttributes={ { 'id': prefixId(id), 'aria-label': label } }
            disabled={ disabled }
            popupOpen={ popuOpen }
            onLspToggle={ () => { handleLspToggle(); setFocus(true); } }
            onLint={ handleLint }
            onPopupOpen={ handlePopupOpen }
            placeholder={ placeholder }
            value={ lspOnlyValue }
            prefix={ prefix }
            suffix={ suffix }
            languageId={ languageId }
            languageSupport={ languageSupport }
            documentUri={ documentUri }
            rootUri={ rootUri }
            serverUri={ serverUri }
            ref={ editorRef }
            tooltipContainer={ tooltipContainer }
          /> :
          <OptionalComponent
            { ...props }
            popupOpen={ popuOpen }
            onInput={ handleLocalInput }
            contentAttributes={ { 'id': prefixId(id), 'aria-label': label } }
            value={ localValue }
            ref={ editorRef }
            onPopupOpen={ handlePopupOpen }
            containerRef={ containerRef }
          />
        }
      </div>
    </div>
  );
}

const LspTextfield = withAutoClosePopup(LspTextfieldComponent);

const OptionalLspInput = forwardRef((props, ref) => {
  const {
    id,
    disabled,
    onInput,
    value,
    onFocus,
    onBlur,
    placeholder
  } = props;

  const inputRef = useRef();

  // To be consistent with the LSP editor, set focus at start of input
  // this ensures clean editing experience when switching with the keyboard
  ref.current = {
    focus: (position) => {
      const input = inputRef.current;
      if (!input) {
        return;
      }

      input.focus();
      if (typeof position === 'number') {
        if (position > value.length) {
          position = value.length;
        }
        input.setSelectionRange(position, position);
      }

    }
  };

  return <input
    id={ prefixId(id) }
    type="text"
    ref={ inputRef }
    name={ id }
    spellCheck="false"
    autoComplete="off"
    disabled={ disabled }
    class="bio-properties-panel-input"
    onInput={ e => onInput(e.target.value) }
    onFocus={ onFocus }
    onBlur={ onBlur }
    placeholder={ placeholder }
    value={ value || '' } />;
});

const OptionalLspTextArea = forwardRef((props, ref) => {
  const {
    id,
    disabled,
    onInput,
    value,
    onFocus,
    onBlur,
    placeholder,
    autoResize = false,
  } = props;

  const inputRef = useRef();

  // To be consistent with the LSP editor, set focus at start of input
  // this ensures clean editing experience when switching with the keyboard
  ref.current = {
    focus: () => {
      const input = inputRef.current;
      if (!input) {
        return;
      }

      input.focus();
      input.setSelectionRange(0, 0);
    }
  };

  const guessRows = function(value) {
    return value.split('\n').length;
  };

  return <textarea
    rows={ autoResize ? guessRows(value) : 2 }
    id={ prefixId(id) }
    type="text"
    ref={ inputRef }
    name={ id }
    spellCheck="false"
    autoComplete="off"
    disabled={ disabled }
    class="bio-properties-panel-input"
    onInput={ e => onInput(e.target.value) }
    onFocus={ onFocus }
    onBlur={ onBlur }
    placeholder={ placeholder }
    value={ value || '' }
    data-gramm="false"
  />;
});

/**
 * @param {Object} props
 * @param {Object} props.element
 * @param {String} props.id
 * @param {String} props.description
 * @param {Boolean} props.debounce
 * @param {Boolean} props.disabled
 * @param {Boolean} props.lsp
 * @param {String} props.label
 * @param {Function} props.getValue
 * @param {Function} props.setValue
 * @param {string} props.prefix
 * @param {string} props.suffix
 * @param {string} props.languageId
 * @param {LanguageSupport} props.languageSupport
 * @param {string} props.documentUri
 * @param {string} props.rootUri
 * @param {string} props.serverUri
 * @param {Function} props.tooltipContainer
 * @param {Function} props.validate
 * @param {Function} props.show
 * @param {Function} props.onFocus
 * @param {Function} props.onBlur
 * @param {string} [props.placeholder]
 * @param {string|import('preact').Component} props.tooltip
 */
export default function LspEntry(props) {
  const {
    element,
    id,
    description,
    debounce,
    disabled,
    lsp,
    label,
    getValue,
    setValue,
    prefix,
    suffix,
    languageId,
    languageSupport,
    documentUri,
    rootUri,
    serverUri,
    tooltipContainer,
    validate,
    show = noop,
    onFocus,
    onBlur,
    placeholder,
    tooltip
  } = props;

  const [ validationError, setValidationError ] = useState(null);
  const [ localError, setLocalError ] = useState(null);

  let value = getValue(element);

  useEffect(() => {
    if (isFunction(validate)) {
      const newValidationError = validate(value) || null;

      setValidationError(newValidationError);
    }
  }, [ value, validate ]);

  const onInput = useStaticCallback((newValue) => {
    let newValidationError = null;

    if (isFunction(validate)) {
      newValidationError = validate(newValue) || null;
    }

    // don't create multiple commandStack entries for the same value
    if (newValue !== value) {
      setValue(newValue, newValidationError);
    }

    setValidationError(newValidationError);
  });

  const onError = useCallback(err => {
    setLocalError(err);
  }, []);

  const temporaryError = useError(id);

  const error = temporaryError || localError || validationError;

  return (
    <div
      class={ classnames(
        props.class,
        'bio-properties-panel-entry',
        error ? 'has-error' : '')
      }
      data-entry-id={ id }>
      <LspTextfield
        { ...props }
        debounce={ debounce }
        disabled={ disabled }
        lsp={ lsp }
        id={ id }
        key={ element }
        label={ label }
        onInput={ onInput }
        onError={ onError }
        onFocus={ onFocus }
        onBlur={ onBlur }
        placeholder={ placeholder }
        show={ show }
        value={ value }
        prefix={ prefix }
        suffix={ suffix }
        languageId={ languageId }
        languageSupport={ languageSupport }
        documentUri={ documentUri }
        rootUri={ rootUri }
        serverUri={ serverUri }
        tooltipContainer={ tooltipContainer }
        OptionalComponent={ props.OptionalComponent }
        tooltip={ tooltip } />
      {error && <div class="bio-properties-panel-error">{error}</div>}
      <Description forId={ id } element={ element } value={ description } />
    </div>
  );
}

/**
 * @param {Object} props
 * @param {Object} props.element
 * @param {String} props.id
 * @param {String} props.description
 * @param {Boolean} props.debounce
 * @param {Boolean} props.disabled
 * @param {Boolean} props.lsp
 * @param {String} props.label
 * @param {Function} props.getValue
 * @param {Function} props.setValue
 * @param {Boolean} props.autoResize
 * @param {string} props.prefix
 * @param {string} props.suffix
 * @param {string} props.languageId
 * @param {LanguageSupport} props.languageSupport
 * @param {string} props.documentUri
 * @param {string} props.rootUri
 * @param {string} props.serverUri
 * @param {Function} props.tooltipContainer
 * @param {Function} props.validate
 * @param {Function} props.show
 * @param {Function} props.onFocus
 * @param {Function} props.onBlur
 * @param {string} [props.placeholder]
 */
export function LspTextAreaEntry(props) {
  return <LspEntry class="bio-properties-panel-feel-textarea" OptionalComponent={ OptionalLspTextArea } { ...props } />;
}

export function isEdited(node) {
  if (!node) {
    return false;
  }

  return !!node.value || node.classList.contains('edited');
}


// helpers /////////////////

function prefixId(id) {
  return `bio-properties-panel-${id}`;
}

function calculatePopupPosition(element) {
  const { top, left } = element.getBoundingClientRect();

  return {
    left: left - LSP_POPUP_WIDTH - 20,
    top: top
  };
}

// todo(pinussilvestrus): make this configurable in the future
function getPopupTitle(element, label) {
  let popupTitle = '';

  if (element && element.type) {
    popupTitle = `${element.type} / `;
  }

  return `${popupTitle}${label}`;
}


function withAutoClosePopup(Component) {
  return function(props) {
    const { id } = props;
    const {
      close
    } = useContext(LspPopupContext);

    const closePopup = useStaticCallback(close);

    useEffect(() => {
      return () => {
        closePopup({ id });
      };
    }, []);

    return <Component { ...props } />;
  };
}

